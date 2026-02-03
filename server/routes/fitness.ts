import { Router } from "express";
import { z } from "zod";
import { withTransaction } from "../db";
import { asyncHandler, getUserId } from "../utils";

const router = Router();

const hashExerciseId = (name: string) => {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) + 1000;
};

router.get(
  "/routines",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await withTransaction(async (client) => {
      const routines = await client.query(
        `
        SELECT id, name, updated_at
        FROM routines
        WHERE user_id = $1 AND deleted_at IS NULL
        ORDER BY updated_at DESC;
        `,
        [userId],
      );
      const routineIds = routines.rows.map((row) => row.id);
      if (!routineIds.length) return { routines: [], exercises: [] };
      const exercises = await client.query(
        `
        SELECT id, routine_id, exercise_id, exercise_name, target_sets, notes
        FROM routine_exercises
        WHERE routine_id = ANY($1::uuid[])
        ORDER BY routine_id, item_order ASC;
        `,
        [routineIds],
      );
      return { routines: routines.rows, exercises: exercises.rows };
    });
    res.json(result);
  }),
);

router.post(
  "/routines",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = z.object({ name: z.string().min(1) }).parse(req.body);
    const result = await withTransaction((client) =>
      client.query(
        `
        INSERT INTO routines (user_id, name, updated_at)
        VALUES ($1, $2, now())
        RETURNING *;
        `,
        [userId, payload.name],
      ),
    );
    res.status(201).json({ routine: result.rows[0] });
  }),
);

router.patch(
  "/routines/:routineId",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const routineId = req.params.routineId;
    const payload = z.object({ name: z.string().min(1) }).parse(req.body);
    const result = await withTransaction((client) =>
      client.query(
        `
        UPDATE routines
        SET name = $2, updated_at = now()
        WHERE id = $1 AND user_id = $3
        RETURNING *;
        `,
        [routineId, payload.name, userId],
      ),
    );
    res.json({ routine: result.rows[0] });
  }),
);

router.delete(
  "/routines/:routineId",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const routineId = req.params.routineId;
    await withTransaction((client) =>
      client.query(
        `
        UPDATE routines
        SET deleted_at = now()
        WHERE id = $1 AND user_id = $2;
        `,
        [routineId, userId],
      ),
    );
    res.json({ ok: true });
  }),
);

router.post(
  "/routines/:routineId/exercises",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const routineId = req.params.routineId;
    const payload = z
      .object({
        exerciseId: z.number().int().optional(),
        name: z.string().min(1),
      })
      .parse(req.body);
    const result = await withTransaction((client) =>
      client.query(
        `
        INSERT INTO routine_exercises (routine_id, exercise_id, exercise_name, target_sets, item_order)
        SELECT $1, $2, $3, 3, (
          SELECT COALESCE(MAX(item_order), 0) + 1 FROM routine_exercises WHERE routine_id = $1
        )
        FROM routines
        WHERE id = $1 AND user_id = $4
        RETURNING *;
        `,
        [routineId, payload.exerciseId ?? null, payload.name, userId],
      ),
    );
    res.status(201).json({ exercise: result.rows[0] });
  }),
);

router.patch(
  "/routines/:routineId/exercises/:routineExerciseId",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const routineExerciseId = req.params.routineExerciseId;
    const payload = z
      .object({
        targetSets: z.number().int().optional(),
        notes: z.string().optional(),
      })
      .parse(req.body);
    const result = await withTransaction((client) =>
      client.query(
        `
        UPDATE routine_exercises
        SET
          target_sets = COALESCE($3, target_sets),
          notes = COALESCE($4, notes)
        WHERE id = $1
          AND routine_id IN (SELECT id FROM routines WHERE user_id = $2)
        RETURNING *;
        `,
        [routineExerciseId, userId, payload.targetSets ?? null, payload.notes ?? null],
      ),
    );
    res.json({ exercise: result.rows[0] });
  }),
);

router.delete(
  "/routines/:routineId/exercises/:routineExerciseId",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const routineExerciseId = req.params.routineExerciseId;
    await withTransaction((client) =>
      client.query(
        `
        DELETE FROM routine_exercises
        WHERE id = $1
          AND routine_id IN (SELECT id FROM routines WHERE user_id = $2);
        `,
        [routineExerciseId, userId],
      ),
    );
    res.json({ ok: true });
  }),
);

router.get(
  "/sessions/active",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await withTransaction(async (client) => {
      const session = await client.query(
        `
        SELECT *
        FROM workout_sessions
        WHERE user_id = $1 AND ended_at IS NULL
        ORDER BY started_at DESC
        LIMIT 1;
        `,
        [userId],
      );
      if (!session.rows[0]) {
        return { session: null, exercises: [], sets: [] };
      }
      const sessionId = session.rows[0].id;
      const exercises = await client.query(
        `
        SELECT *
        FROM session_exercises
        WHERE session_id = $1
        ORDER BY item_order ASC;
        `,
        [sessionId],
      );
      const sets = await client.query(
        `
        SELECT *
        FROM session_sets
        WHERE session_exercise_id = ANY($1::uuid[])
        ORDER BY completed_at ASC;
        `,
        [exercises.rows.map((row) => row.id)],
      );
      return { session: session.rows[0], exercises: exercises.rows, sets: sets.rows };
    });
    res.json(result);
  }),
);

router.get(
  "/sessions/history",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await withTransaction((client) =>
      client.query(
        `
        SELECT ws.id,
               ws.routine_id,
               ws.started_at,
               ws.ended_at,
               COUNT(ss.id) AS total_sets,
               COALESCE(SUM(ss.weight * ss.reps), 0) AS total_volume
        FROM workout_sessions ws
        LEFT JOIN session_exercises se ON se.session_id = ws.id
        LEFT JOIN session_sets ss ON ss.session_exercise_id = se.id
        WHERE ws.user_id = $1 AND ws.ended_at IS NOT NULL
        GROUP BY ws.id
        ORDER BY ws.ended_at DESC
        LIMIT 20;
        `,
        [userId],
      ),
    );
    res.json({ items: result.rows });
  }),
);

router.post(
  "/sessions",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = z
      .object({
        routineId: z.string().uuid().optional(),
        templateId: z.string().uuid().optional(),
        exercises: z.array(z.string()).optional(),
      })
      .parse(req.body);

    const result = await withTransaction(async (client) => {
      const session = await client.query(
        `
        INSERT INTO workout_sessions (user_id, routine_id, template_id)
        VALUES ($1, $2, $3)
        RETURNING *;
        `,
        [userId, payload.routineId ?? null, payload.templateId ?? null],
      );

      const sessionId = session.rows[0].id;
      if (payload.routineId) {
        const routineExercises = await client.query(
          `
          SELECT exercise_id, exercise_name, item_order
          FROM routine_exercises
          WHERE routine_id = $1
          ORDER BY item_order ASC;
          `,
          [payload.routineId],
        );
        for (const [index, exercise] of routineExercises.rows.entries()) {
          await client.query(
            `
            INSERT INTO session_exercises (session_id, exercise_id, exercise_name, item_order)
            VALUES ($1, $2, $3, $4);
            `,
            [sessionId, exercise.exercise_id, exercise.exercise_name, index],
          );
        }
      } else if (payload.exercises?.length) {
        for (const [index, name] of payload.exercises.entries()) {
          await client.query(
            `
            INSERT INTO session_exercises (session_id, exercise_id, exercise_name, item_order)
            VALUES ($1, $2, $3, $4);
            `,
            [sessionId, hashExerciseId(name), name, index],
          );
        }
      }

      return session.rows[0];
    });

    res.status(201).json({ session: result });
  }),
);

router.post(
  "/sessions/:sessionId/sets",
  asyncHandler(async (req, res) => {
    const sessionId = req.params.sessionId;
    const payload = z
      .object({
        sessionExerciseId: z.string().uuid(),
        weight: z.number().optional(),
        reps: z.number().int().optional(),
      })
      .parse(req.body);
    const result = await withTransaction((client) =>
      client.query(
        `
        INSERT INTO session_sets (session_exercise_id, weight, reps)
        VALUES ($1, $2, $3)
        RETURNING *;
        `,
        [payload.sessionExerciseId, payload.weight ?? null, payload.reps ?? null],
      ),
    );
    res.status(201).json({ set: result.rows[0] });
  }),
);

router.post(
  "/sessions/:sessionId/finish",
  asyncHandler(async (req, res) => {
    const sessionId = req.params.sessionId;
    const result = await withTransaction((client) =>
      client.query(
        `
        UPDATE workout_sessions
        SET ended_at = now()
        WHERE id = $1
        RETURNING *;
        `,
        [sessionId],
      ),
    );
    res.json({ session: result.rows[0] });
  }),
);

export default router;
