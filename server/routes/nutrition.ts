import { Router } from "express";
import { z } from "zod";
import { withTransaction } from "../db.js";
import { asyncHandler, getUserId } from "../utils.js";

const router = Router();

router.get(
  "/summary",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const localDate = typeof req.query.localDate === "string" ? req.query.localDate : null;
    if (!localDate) {
      res.status(400).json({ error: "localDate is required." });
      return;
    }

    const result = await withTransaction(async (client) => {
      const totals = await client.query(
        `
        SELECT
          COALESCE(SUM(kcal), 0) AS kcal,
          COALESCE(SUM(carbs_g), 0) AS carbs_g,
          COALESCE(SUM(protein_g), 0) AS protein_g,
          COALESCE(SUM(fat_g), 0) AS fat_g
        FROM meal_entry_items
        JOIN meal_entries ON meal_entries.id = meal_entry_items.meal_entry_id
        WHERE meal_entries.user_id = $1 AND meal_entries.local_date = $2;
        `,
        [userId, localDate],
      );

      const targets = await client.query(
        `
        SELECT kcal_goal, carbs_g, protein_g, fat_g
        FROM daily_nutrition_targets
        WHERE user_id = $1 AND local_date = $2;
        `,
        [userId, localDate],
      );

      const settings = await client.query(
        `
        SELECT kcal_goal, carbs_g, protein_g, fat_g
        FROM user_nutrition_settings
        WHERE user_id = $1;
        `,
        [userId],
      );

      return {
        totals: totals.rows[0],
        targets: targets.rows[0] ?? null,
        settings: settings.rows[0] ?? null,
      };
    });

    res.json({ localDate, ...result });
  }),
);

router.get(
  "/weekly",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const start = typeof req.query.start === "string" ? req.query.start : null;
    if (!start) {
      res.status(400).json({ error: "start is required." });
      return;
    }

    const result = await withTransaction((client) =>
      client.query(
        `
        WITH days AS (
          SELECT generate_series($2::date, $2::date + interval '6 days', interval '1 day')::date AS day
        ),
        totals AS (
          SELECT meal_entries.local_date AS day,
                 COALESCE(SUM(kcal), 0) AS kcal
          FROM meal_entry_items
          JOIN meal_entries ON meal_entries.id = meal_entry_items.meal_entry_id
          WHERE meal_entries.user_id = $1
            AND meal_entries.local_date BETWEEN $2::date AND ($2::date + interval '6 days')::date
          GROUP BY meal_entries.local_date
        )
        SELECT days.day, COALESCE(totals.kcal, 0) AS kcal
        FROM days
        LEFT JOIN totals ON totals.day = days.day
        ORDER BY days.day ASC;
        `,
        [userId, start],
      ),
    );

    res.json({ items: result.rows });
  }),
);

router.get(
  "/streak",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await withTransaction((client) =>
      client.query(
        `
        SELECT DISTINCT local_date
        FROM meal_entries
        WHERE user_id = $1
        ORDER BY local_date ASC;
        `,
        [userId],
      ),
    );

    const dates = result.rows.map((row) => row.local_date as string);
    const dateSet = new Set(dates);
    const toKey = (value: Date) => value.toISOString().slice(0, 10);

    let current = 0;
    let cursor = new Date();
    while (dateSet.has(toKey(cursor))) {
      current += 1;
      cursor.setDate(cursor.getDate() - 1);
    }

    let best = 0;
    let streak = 0;
    let prev: string | null = null;
    for (const date of dates) {
      if (!prev) {
        streak = 1;
      } else {
        const prevDate = new Date(prev);
        const next = new Date(prevDate);
        next.setDate(prevDate.getDate() + 1);
        streak = date === toKey(next) ? streak + 1 : 1;
      }
      best = Math.max(best, streak);
      prev = date;
    }

    res.json({ current, best });
  }),
);

const targetsSchema = z.object({
  localDate: z.string().min(1),
  kcalGoal: z.number().positive().optional(),
  carbsG: z.number().nonnegative().optional(),
  proteinG: z.number().nonnegative().optional(),
  fatG: z.number().nonnegative().optional(),
});

router.post(
  "/targets",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = targetsSchema.parse(req.body);

    const result = await withTransaction((client) =>
      client.query(
        `
        INSERT INTO daily_nutrition_targets (user_id, local_date, kcal_goal, carbs_g, protein_g, fat_g)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, local_date)
        DO UPDATE SET
          kcal_goal = EXCLUDED.kcal_goal,
          carbs_g = EXCLUDED.carbs_g,
          protein_g = EXCLUDED.protein_g,
          fat_g = EXCLUDED.fat_g,
          updated_at = now()
        RETURNING *;
        `,
        [
          userId,
          payload.localDate,
          payload.kcalGoal ?? null,
          payload.carbsG ?? null,
          payload.proteinG ?? null,
          payload.fatG ?? null,
        ],
      ),
    );

    res.json({ target: result.rows[0] });
  }),
);

router.get(
  "/settings",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await withTransaction((client) =>
      client.query(
        `
        SELECT kcal_goal, carbs_g, protein_g, fat_g
        FROM user_nutrition_settings
        WHERE user_id = $1;
        `,
        [userId],
      ),
    );
    res.json({ settings: result.rows[0] ?? null });
  }),
);

router.post(
  "/settings",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = z
      .object({
        kcalGoal: z.number().positive().optional(),
        carbsG: z.number().nonnegative().optional(),
        proteinG: z.number().nonnegative().optional(),
        fatG: z.number().nonnegative().optional(),
      })
      .parse(req.body);

    const result = await withTransaction((client) =>
      client.query(
        `
        INSERT INTO user_nutrition_settings (user_id, kcal_goal, carbs_g, protein_g, fat_g)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id)
        DO UPDATE SET
          kcal_goal = COALESCE(EXCLUDED.kcal_goal, user_nutrition_settings.kcal_goal),
          carbs_g = COALESCE(EXCLUDED.carbs_g, user_nutrition_settings.carbs_g),
          protein_g = COALESCE(EXCLUDED.protein_g, user_nutrition_settings.protein_g),
          fat_g = COALESCE(EXCLUDED.fat_g, user_nutrition_settings.fat_g),
          updated_at = now()
        RETURNING *;
        `,
        [
          userId,
          payload.kcalGoal ?? null,
          payload.carbsG ?? null,
          payload.proteinG ?? null,
          payload.fatG ?? null,
        ],
      ),
    );

    res.json({ settings: result.rows[0] });
  }),
);

export default router;
