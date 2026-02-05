import { Router } from "express";
import { z } from "zod";
import { withTransaction } from "../db";
import { asyncHandler, getUserId } from "../utils";

const router = Router();

const weightSchema = z.object({
  localDate: z.string().min(1),
  weight: z.number().positive(),
  unit: z.string().default("kg"),
  notes: z.string().optional(),
});

router.post(
  "/weight",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = weightSchema.parse(req.body);
    const result = await withTransaction((client) =>
      client.query(
        `
        INSERT INTO weight_logs (user_id, local_date, weight, unit, notes)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (user_id, local_date)
        DO UPDATE SET weight = EXCLUDED.weight, unit = EXCLUDED.unit, notes = EXCLUDED.notes
        RETURNING *;
        `,
        [userId, payload.localDate, payload.weight, payload.unit, payload.notes ?? null],
      ),
    );
    res.status(201).json({ entry: result.rows[0] });
  }),
);

router.get(
  "/weight/latest",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await withTransaction((client) =>
      client.query(
        `
        SELECT local_date, weight, unit, logged_at
        FROM weight_logs
        WHERE user_id = $1
        ORDER BY local_date DESC, logged_at DESC
        LIMIT 1;
        `,
        [userId],
      ),
    );
    res.json({ entry: result.rows[0] ?? null });
  }),
);

router.get(
  "/weight",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const start = typeof req.query.start === "string" ? req.query.start : null;
    const end = typeof req.query.end === "string" ? req.query.end : null;
    const limitRaw = typeof req.query.limit === "string" ? req.query.limit : "";
    const limit = Math.min(Math.max(Number(limitRaw || 120), 1), 365);

    const result = await withTransaction((client) =>
      client.query(
        `
        SELECT local_date, weight, unit, logged_at
        FROM weight_logs
        WHERE user_id = $1
          AND ($2::date IS NULL OR local_date >= $2::date)
          AND ($3::date IS NULL OR local_date <= $3::date)
        ORDER BY local_date ASC
        LIMIT $4;
        `,
        [userId, start, end, limit],
      ),
    );

    res.json({ items: result.rows });
  }),
);

router.get(
  "/goals",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await withTransaction((client) =>
      client.query(
        `
        SELECT steps_goal, water_goal_ml, weight_unit
        FROM user_activity_goals
        WHERE user_id = $1;
        `,
        [userId],
      ),
    );
    res.json({ goals: result.rows[0] ?? null });
  }),
);

router.post(
  "/goals",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = z
      .object({
        stepsGoal: z.number().int().positive().optional(),
        waterGoalMl: z.number().int().positive().optional(),
        weightUnit: z.string().optional(),
      })
      .parse(req.body);

    const result = await withTransaction((client) =>
      client.query(
        `
        INSERT INTO user_activity_goals (user_id, steps_goal, water_goal_ml, weight_unit)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id)
        DO UPDATE SET
          steps_goal = COALESCE(EXCLUDED.steps_goal, user_activity_goals.steps_goal),
          water_goal_ml = COALESCE(EXCLUDED.water_goal_ml, user_activity_goals.water_goal_ml),
          weight_unit = COALESCE(EXCLUDED.weight_unit, user_activity_goals.weight_unit),
          updated_at = now()
        RETURNING *;
        `,
        [userId, payload.stepsGoal ?? null, payload.waterGoalMl ?? null, payload.weightUnit ?? null],
      ),
    );
    res.json({ goals: result.rows[0] });
  }),
);

const waterSchema = z.object({
  localDate: z.string().min(1),
  amountMl: z.number().int().positive(),
  source: z.string().optional(),
});

router.post(
  "/water",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = waterSchema.parse(req.body);
    const result = await withTransaction((client) =>
      client.query(
        `
        INSERT INTO water_logs (user_id, local_date, amount_ml, source)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
        `,
        [userId, payload.localDate, payload.amountMl, payload.source ?? null],
      ),
    );
    res.status(201).json({ entry: result.rows[0] });
  }),
);

router.get(
  "/water",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const localDate =
      typeof req.query.localDate === "string" ? req.query.localDate : null;
    const result = await withTransaction((client) =>
      client.query(
        `
        SELECT local_date, amount_ml, source, logged_at
        FROM water_logs
        WHERE user_id = $1
          AND ($2::date IS NULL OR local_date = $2::date)
        ORDER BY logged_at DESC;
        `,
        [userId, localDate],
      ),
    );
    res.json({ items: result.rows });
  }),
);

const stepsSchema = z.object({
  localDate: z.string().min(1),
  steps: z.number().int().nonnegative(),
  source: z.string().optional(),
});

router.post(
  "/steps",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = stepsSchema.parse(req.body);
    const result = await withTransaction((client) =>
      client.query(
        `
        INSERT INTO steps_logs (user_id, local_date, steps, source)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id, local_date, coalesce(source, ''))
        DO UPDATE SET steps = EXCLUDED.steps
        RETURNING *;
        `,
        [userId, payload.localDate, payload.steps, payload.source ?? null],
      ),
    );
    res.status(201).json({ entry: result.rows[0] });
  }),
);

router.get(
  "/steps",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const localDate =
      typeof req.query.localDate === "string" ? req.query.localDate : null;
    const result = await withTransaction((client) =>
      client.query(
        `
        SELECT local_date, steps, source, logged_at
        FROM steps_logs
        WHERE user_id = $1
          AND ($2::date IS NULL OR local_date = $2::date)
        ORDER BY logged_at DESC;
        `,
        [userId, localDate],
      ),
    );
    res.json({ items: result.rows });
  }),
);

export default router;
