import { Router } from "express";
import { z } from "zod";
import { withTransaction } from "../db";
import { asyncHandler, getUserId } from "../utils";

const router = Router();

router.get(
  "/nutrition",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const days = z.coerce.number().int().min(7).max(90).parse(req.query.days ?? 28);

    const result = await withTransaction((client) =>
      client.query(
        `
        WITH days AS (
          SELECT generate_series(
            (current_date - ($2::int - 1))::date,
            current_date,
            interval '1 day'
          )::date AS day
        ),
        totals AS (
          SELECT meal_entries.local_date AS day,
                 COALESCE(SUM(kcal), 0) AS kcal
          FROM meal_entry_items
          JOIN meal_entries ON meal_entries.id = meal_entry_items.meal_entry_id
          WHERE meal_entries.user_id = $1
            AND meal_entries.local_date >= (current_date - ($2::int - 1))::date
          GROUP BY meal_entries.local_date
        )
        SELECT days.day, COALESCE(totals.kcal, 0) AS kcal
        FROM days
        LEFT JOIN totals ON totals.day = days.day
        ORDER BY days.day ASC;
        `,
        [userId, days],
      ),
    );

    const values = result.rows.map((row) => Number(row.kcal ?? 0));
    const average =
      values.length > 0 ? Math.round(values.reduce((sum, val) => sum + val, 0) / values.length) : 0;

    res.json({ days, items: result.rows, average });
  }),
);

router.get(
  "/training",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const weeks = z.coerce.number().int().min(4).max(26).parse(req.query.weeks ?? 8);

    const result = await withTransaction((client) =>
      client.query(
        `
        WITH weeks AS (
          SELECT date_trunc('week', current_date) - (interval '1 week' * g) AS week_start
          FROM generate_series(0, $2::int - 1) AS g
        ),
        totals AS (
          SELECT date_trunc('week', ws.ended_at) AS week_start,
                 COALESCE(SUM(COALESCE(ss.weight_kg, ss.weight) * ss.reps), 0) AS volume,
                 COUNT(ss.id) AS total_sets
          FROM workout_sessions ws
          LEFT JOIN session_exercises se ON se.session_id = ws.id
          LEFT JOIN session_sets ss ON ss.session_exercise_id = se.id
          WHERE ws.user_id = $1 AND ws.ended_at IS NOT NULL
            AND ws.ended_at >= date_trunc('week', current_date) - (interval '1 week' * ($2::int - 1))
          GROUP BY date_trunc('week', ws.ended_at)
        )
        SELECT weeks.week_start::date AS week_start,
               COALESCE(totals.volume, 0) AS volume,
               COALESCE(totals.total_sets, 0) AS total_sets
        FROM weeks
        LEFT JOIN totals ON totals.week_start = weeks.week_start
        ORDER BY weeks.week_start ASC;
        `,
        [userId, weeks],
      ),
    );

    res.json({ weeks, items: result.rows });
  }),
);

router.get(
  "/exercise",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const exerciseId = z.coerce.number().int().parse(req.query.exerciseId);
    const days = z.coerce.number().int().min(7).max(180).parse(req.query.days ?? 84);

    const result = await withTransaction((client) =>
      client.query(
        `
        WITH days AS (
          SELECT generate_series(
            (current_date - ($3::int - 1))::date,
            current_date,
            interval '1 day'
          )::date AS day
        )
        SELECT days.day,
               COALESCE(stats.total_sets, 0) AS total_sets,
               COALESCE(stats.total_volume_kg, 0) AS total_volume_kg,
               COALESCE(stats.max_weight_kg, 0) AS max_weight_kg,
               COALESCE(stats.est_one_rm_kg, 0) AS est_one_rm_kg
        FROM days
        LEFT JOIN exercise_stats_daily stats
          ON stats.day = days.day
         AND stats.user_id = $1
         AND stats.exercise_id = $2
        ORDER BY days.day ASC;
        `,
        [userId, exerciseId, days],
      ),
    );

    res.json({ days, items: result.rows });
  }),
);

router.get(
  "/muscles",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const days = z.coerce.number().int().min(7).max(180).parse(req.query.days ?? 84);

    const result = await withTransaction((client) =>
      client.query(
        `
        SELECT day,
               muscle,
               total_sets,
               total_volume_kg
        FROM muscle_stats_daily
        WHERE user_id = $1
          AND day >= (current_date - ($2::int - 1))::date
        ORDER BY day ASC, muscle ASC;
        `,
        [userId, days],
      ),
    );

    res.json({ days, items: result.rows });
  }),
);

export default router;
