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

export default router;
