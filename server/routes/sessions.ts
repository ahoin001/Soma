import { Router } from "express";
import { z } from "zod";
import { withTransaction } from "../db";
import { asyncHandler, getUserId } from "../utils";

const router = Router();

const startSessionSchema = z.object({
  routineId: z.string().uuid().optional(),
  templateId: z.string().uuid().optional(),
  notes: z.string().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = startSessionSchema.parse(req.body);
    if (!payload.routineId && !payload.templateId) {
      res.status(400).json({ error: "routineId or templateId is required." });
      return;
    }

    const result = await withTransaction((client) =>
      client.query(
        `
        INSERT INTO workout_sessions (user_id, routine_id, template_id, notes)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
        `,
        [userId, payload.routineId ?? null, payload.templateId ?? null, payload.notes ?? null],
      ),
    );

    res.status(201).json({ session: result.rows[0] });
  }),
);

router.post(
  "/:sessionId/finish",
  asyncHandler(async (req, res) => {
    const sessionId = req.params.sessionId;
    const finishedAt =
      typeof req.body?.endedAt === "string" ? req.body.endedAt : null;
    const result = await withTransaction((client) =>
      client.query(
        `
        UPDATE workout_sessions
        SET ended_at = COALESCE($2, now())
        WHERE id = $1
        RETURNING *;
        `,
        [sessionId, finishedAt],
      ),
    );
    res.json({ session: result.rows[0] });
  }),
);

const logSetSchema = z.object({
  sessionExerciseId: z.string().uuid(),
  weight: z.number().optional(),
  reps: z.number().int().optional(),
  rir: z.number().optional(),
  notes: z.string().optional(),
});

router.post(
  "/:sessionId/sets",
  asyncHandler(async (req, res) => {
    const payload = logSetSchema.parse(req.body);
    const result = await withTransaction((client) =>
      client.query(
        `
        INSERT INTO session_sets (session_exercise_id, weight, reps, rir, notes)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *;
        `,
        [
          payload.sessionExerciseId,
          payload.weight ?? null,
          payload.reps ?? null,
          payload.rir ?? null,
          payload.notes ?? null,
        ],
      ),
    );
    res.status(201).json({ set: result.rows[0] });
  }),
);

export default router;
