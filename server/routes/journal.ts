import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { withTransaction } from "../db";
import { asyncHandler, getUserId } from "../utils";

const router = Router();

const MEASUREMENT_TYPES = [
  "body_weight",
  "neck",
  "shoulders",
  "chest",
  "left_bicep",
  "right_bicep",
  "left_forearm",
  "right_forearm",
  "waist",
  "hips",
  "left_thigh",
  "right_thigh",
  "left_calf",
  "right_calf",
] as const;

const measurementTypeSchema = z.enum(MEASUREMENT_TYPES);

/** GET /api/journal/measurements?type=optional – list entries, optionally by type (latest per type for dashboard or full history) */
router.get(
  "/measurements",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const type = req.query.type
      ? measurementTypeSchema.parse(req.query.type)
      : null;
    const limit = Math.min(z.coerce.number().int().min(1).max(500).catch(100).parse(req.query.limit ?? 100), 500);

    const result = await withTransaction((client) =>
      type
        ? client.query(
            `
            SELECT id, measurement_type, value, unit, logged_at, notes, created_at
            FROM body_measurements
            WHERE user_id = $1 AND measurement_type = $2
            ORDER BY logged_at DESC
            LIMIT $3;
            `,
            [userId, type, limit],
          )
        : client.query(
            `
            SELECT id, measurement_type, value, unit, logged_at, notes, created_at
            FROM body_measurements
            WHERE user_id = $1
            ORDER BY logged_at DESC
            LIMIT $2;
            `,
            [userId, limit],
          ),
    );

    res.json({
      items: result.rows.map((row) => ({
        id: row.id,
        measurement_type: row.measurement_type,
        value: Number(row.value),
        unit: row.unit,
        logged_at: row.logged_at,
        notes: row.notes ?? undefined,
        created_at: row.created_at,
      })),
    });
  }),
);

/** POST /api/journal/measurements – create one entry */
router.post(
  "/measurements",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const payload = z
      .object({
        measurement_type: measurementTypeSchema,
        value: z.number().finite().positive(),
        unit: z.string().min(1).max(10).default("cm"),
        logged_at: z.string().datetime().optional(),
        notes: z.string().max(500).optional(),
      })
      .parse(req.body);

    const loggedAt = payload.logged_at
      ? new Date(payload.logged_at).toISOString()
      : new Date().toISOString();

    const result = await withTransaction((client) =>
      client.query(
        `
        INSERT INTO body_measurements (user_id, measurement_type, value, unit, logged_at, notes)
        VALUES ($1, $2, $3, $4, $5::timestamptz, $6)
        RETURNING id, measurement_type, value, unit, logged_at, notes, created_at;
        `,
        [
          userId,
          payload.measurement_type,
          payload.value,
          payload.unit,
          loggedAt,
          payload.notes ?? null,
        ],
      ),
    );

    const row = result.rows[0];
    res.status(201).json({
      entry: {
        id: row.id,
        measurement_type: row.measurement_type,
        value: Number(row.value),
        unit: row.unit,
        logged_at: row.logged_at,
        notes: row.notes ?? undefined,
        created_at: row.created_at,
      },
    });
  }),
);

/** GET /api/journal/measurements/latest – one latest value per type (for dashboard “Latest Stats”) */
router.get(
  "/measurements/latest",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);

    const result = await withTransaction((client) =>
      client.query(
        `
        WITH ranked AS (
          SELECT id, measurement_type, value, unit, logged_at,
                 ROW_NUMBER() OVER (PARTITION BY measurement_type ORDER BY logged_at DESC) AS rn
          FROM body_measurements
          WHERE user_id = $1
        )
        SELECT id, measurement_type, value, unit, logged_at
        FROM ranked
        WHERE rn = 1
        ORDER BY measurement_type;
        `,
        [userId],
      ),
    );

    res.json({
      items: result.rows.map((row) => ({
        id: row.id,
        measurement_type: row.measurement_type,
        value: Number(row.value),
        unit: row.unit,
        logged_at: row.logged_at,
      })),
    });
  }),
);

/** GET /api/journal/photos – list progress photos, newest first */
router.get(
  "/photos",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const limit = Math.min(z.coerce.number().int().min(1).max(100).catch(50).parse(req.query.limit ?? 50), 100);

    const result = await withTransaction((client) =>
      client.query(
        `
        SELECT id, image_url, taken_at, note, created_at
        FROM progress_photos
        WHERE user_id = $1
        ORDER BY taken_at DESC
        LIMIT $2;
        `,
        [userId, limit],
      ),
    );

    res.json({
      items: result.rows.map((row) => ({
        id: row.id,
        image_url: row.image_url,
        taken_at: row.taken_at,
        note: row.note ?? undefined,
        created_at: row.created_at,
      })),
    });
  }),
);

/** POST /api/journal/photos – add progress photo (client uploads to Cloudinary then sends URL) */
router.post(
  "/photos",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const payload = z
      .object({
        image_url: z.string().url(),
        taken_at: z.string().datetime().optional(),
        note: z.string().max(500).optional(),
      })
      .parse(req.body);

    const takenAt = payload.taken_at
      ? new Date(payload.taken_at).toISOString()
      : new Date().toISOString();

    const result = await withTransaction((client) =>
      client.query(
        `
        INSERT INTO progress_photos (user_id, image_url, taken_at, note)
        VALUES ($1, $2, $3::timestamptz, $4)
        RETURNING id, image_url, taken_at, note, created_at;
        `,
        [userId, payload.image_url, takenAt, payload.note ?? null],
      ),
    );

    const row = result.rows[0];
    res.status(201).json({
      photo: {
        id: row.id,
        image_url: row.image_url,
        taken_at: row.taken_at,
        note: row.note ?? undefined,
        created_at: row.created_at,
      },
    });
  }),
);

/** DELETE /api/journal/photos/:id */
router.delete(
  "/photos/:id",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const id = z.string().uuid().parse(req.params.id);

    const result = await withTransaction((client) =>
      client.query(
        `
        DELETE FROM progress_photos
        WHERE id = $1 AND user_id = $2
        RETURNING id;
        `,
        [id, userId],
      ),
    );

    if (result.rowCount === 0) {
      const err = new Error("Photo not found.");
      (err as Error & { status?: number }).status = 404;
      throw err;
    }
    res.status(204).send();
  }),
);

export default router;
