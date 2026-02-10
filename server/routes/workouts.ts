import { Router, type Request, type Response } from "express";
import crypto from "node:crypto";
import { z } from "zod";
import { query, withTransaction } from "../db";
import { asyncHandler, getUserId } from "../utils";

const router = Router();

const getOrCreateExerciseId = async (
  client: { query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<{ id: number }> }> },
  userId: string,
  name: string,
) => {
  const normalized = name.trim();
  const existing = await client.query(
    `
    SELECT id
    FROM exercises
    WHERE lower(name) = lower($1)
      AND created_by_user_id = $2
    LIMIT 1;
    `,
    [normalized, userId],
  );
  if (existing.rows[0]?.id) return existing.rows[0].id;
  const created = await client.query(
    `
    INSERT INTO exercises (name, category, created_by_user_id, is_custom)
    VALUES ($1, $2, $3, true)
    RETURNING id;
    `,
    [normalized, "Custom", userId],
  );
  return created.rows[0].id;
};

const createPlanSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

router.post(
  "/plans",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const payload = createPlanSchema.parse(req.body);
    const result = await withTransaction((client) =>
      client.query(
        `
        INSERT INTO workout_plans (user_id, name, sort_order)
        VALUES ($1, $2, $3)
        RETURNING *;
        `,
        [userId, payload.name, payload.sortOrder ?? 0],
      ),
    );
    res.status(201).json({ plan: result.rows[0] });
  }),
);

router.get(
  "/plans",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const result = await withTransaction(async (client) => {
      const plans = await client.query(
        `
        SELECT id, name, sort_order
        FROM workout_plans
        WHERE user_id = $1 AND deleted_at IS NULL
        ORDER BY sort_order ASC, created_at DESC;
        `,
        [userId],
      );

      const planIds = plans.rows.map((row) => row.id);
      if (!planIds.length) return { plans: [] };

      const templates = await client.query(
        `
        SELECT id, plan_id, name, last_performed_at, sort_order
        FROM workout_templates
        WHERE plan_id = ANY($1::uuid[]) AND deleted_at IS NULL
        ORDER BY sort_order ASC, created_at DESC;
        `,
        [planIds],
      );

      const templateIds = templates.rows.map((row) => row.id);
      const exercises = templateIds.length
        ? await client.query(
            `
            SELECT id, template_id, exercise_name, item_order
            FROM workout_template_exercises
            WHERE template_id = ANY($1::uuid[])
            ORDER BY template_id, item_order ASC;
            `,
            [templateIds],
          )
        : { rows: [] };

      return { plans: plans.rows, templates: templates.rows, exercises: exercises.rows };
    });

    res.json(result);
  }),
);

router.patch(
  "/plans/:planId",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const planId = req.params.planId;
    const payload = z
      .object({ name: z.string().min(1).optional(), sortOrder: z.number().int().optional() })
      .parse(req.body);
    const result = await withTransaction((client) =>
      client.query(
        `
        UPDATE workout_plans
        SET
          name = COALESCE($3, name),
          sort_order = COALESCE($4, sort_order),
          updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING *;
        `,
        [planId, userId, payload.name ?? null, payload.sortOrder ?? null],
      ),
    );
    res.json({ plan: result.rows[0] });
  }),
);

router.delete(
  "/plans/:planId",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const planId = req.params.planId;
    await withTransaction((client) =>
      client.query(
        `
        UPDATE workout_plans
        SET deleted_at = now()
        WHERE id = $1 AND user_id = $2;
        `,
        [planId, userId],
      ),
    );
    res.json({ ok: true });
  }),
);

const createTemplateSchema = z.object({
  planId: z.string().uuid(),
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

router.post(
  "/templates",
  asyncHandler(async (req: Request, res: Response) => {
    const payload = createTemplateSchema.parse(req.body);
    const result = await withTransaction((client) =>
      client.query(
        `
        INSERT INTO workout_templates (plan_id, name, sort_order)
        VALUES ($1, $2, $3)
        RETURNING *;
        `,
        [payload.planId, payload.name, payload.sortOrder ?? 0],
      ),
    );
    res.status(201).json({ template: result.rows[0] });
  }),
);

router.patch(
  "/templates/:templateId",
  asyncHandler(async (req: Request, res: Response) => {
    const templateId = req.params.templateId;
    const payload = z
      .object({ name: z.string().min(1).optional(), sortOrder: z.number().int().optional() })
      .parse(req.body);
    const result = await withTransaction((client) =>
      client.query(
        `
        UPDATE workout_templates
        SET
          name = COALESCE($2, name),
          sort_order = COALESCE($3, sort_order),
          updated_at = now()
        WHERE id = $1
        RETURNING *;
        `,
        [templateId, payload.name ?? null, payload.sortOrder ?? null],
      ),
    );
    res.json({ template: result.rows[0] });
  }),
);

router.delete(
  "/templates/:templateId",
  asyncHandler(async (req: Request, res: Response) => {
    const templateId = req.params.templateId;
    await withTransaction(async (client) => {
      await client.query(
        "DELETE FROM workout_template_exercises WHERE template_id = $1;",
        [templateId],
      );
      await client.query("DELETE FROM workout_templates WHERE id = $1;", [
        templateId,
      ]);
    });
    res.json({ ok: true });
  }),
);

router.post(
  "/templates/:templateId/complete",
  asyncHandler(async (req: Request, res: Response) => {
    const templateId = req.params.templateId;
    const result = await withTransaction((client) =>
      client.query(
        `
        UPDATE workout_templates
        SET last_performed_at = now()
        WHERE id = $1
        RETURNING *;
        `,
        [templateId],
      ),
    );
    res.json({ template: result.rows[0] });
  }),
);

const exerciseSchema = z.object({
  exerciseId: z.number().int().optional(),
  exerciseName: z.string().min(1),
  groupId: z.string().uuid().optional(),
  groupType: z.enum(["straight_set", "superset", "circuit", "giant_set"]).optional(),
  groupOrder: z.number().int().optional(),
  itemOrder: z.number().int(),
  targetSets: z.number().int().optional(),
  notes: z.string().optional(),
});

router.put(
  "/templates/:templateId/exercises",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const templateId = req.params.templateId;
    const payload = z.object({ exercises: z.array(exerciseSchema) }).parse(req.body);

    await withTransaction(async (client) => {
      await client.query(
        "DELETE FROM workout_template_exercises WHERE template_id = $1;",
        [templateId],
      );

      if (!payload.exercises.length) return;

      const values: string[] = [];
      const params: unknown[] = [];
      let index = 1;

      for (const exercise of payload.exercises) {
        const resolvedId =
          exercise.exerciseId ??
          (await getOrCreateExerciseId(client, userId, exercise.exerciseName));
        values.push(
          `($${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++})`,
        );
        params.push(
          templateId,
          resolvedId ?? null,
          exercise.exerciseName,
          exercise.groupId ?? null,
          exercise.groupType ?? "straight_set",
          exercise.groupOrder ?? 0,
          exercise.itemOrder,
          exercise.targetSets ?? 3,
          exercise.notes ?? null,
        );
      }

      await client.query(
        `
        INSERT INTO workout_template_exercises (
          template_id,
          exercise_id,
          exercise_name,
          group_id,
          group_type,
          group_order,
          item_order,
          target_sets,
          notes
        )
        VALUES ${values.join(", ")};
        `,
        params,
      );
    });

    res.json({ ok: true });
  }),
);

const exerciseMediaSchema = z.object({
  exerciseName: z.string().min(1),
  userId: z.string().uuid().optional().nullable(),
  sourceType: z.enum(["cloudinary", "youtube", "external"]),
  mediaUrl: z.string().url(),
  thumbUrl: z.string().url().optional().nullable(),
  isPrimary: z.boolean().optional(),
});

const exerciseMediaOwnerSchema = z.object({
  userId: z.string().uuid(),
});

const exerciseOverrideSchema = z.object({
  exerciseName: z.string().min(1),
  userId: z.string().uuid(),
  steps: z.array(z.string()).optional().nullable(),
  guideUrl: z.string().url().optional().nullable(),
});

router.get(
  "/exercise-media",
  asyncHandler(async (req: Request, res: Response) => {
    const exerciseName = z.string().min(1).parse(req.query.exerciseName);
    const userId = req.query.userId ? String(req.query.userId) : null;
    const params: unknown[] = [exerciseName];
    let sql = `
      SELECT *
      FROM exercise_media
      WHERE exercise_name = $1
    `;
    if (userId) {
      params.push(userId);
      sql += " AND (user_id = $2 OR user_id IS NULL)";
    } else {
      sql += " AND user_id IS NULL";
    }
    sql += " ORDER BY is_primary DESC, created_at DESC";
    const result = await query(sql, params);
    res.json({ media: result.rows });
  }),
);

router.get(
  "/exercise-media/signature",
  asyncHandler(async (_req, res) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET ?? null;
    if (!cloudName || !apiKey) {
      const error = new Error("Cloudinary credentials are not configured.");
      (error as Error & { status?: number }).status = 500;
      throw error;
    }
    if (!apiSecret) {
      if (!uploadPreset) {
        const error = new Error("Cloudinary credentials are not configured.");
        (error as Error & { status?: number }).status = 500;
        throw error;
      }
      res.json({
        apiKey,
        cloudName,
        uploadPreset,
        unsigned: true,
      });
      return;
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const params: string[] = [`timestamp=${timestamp}`];
    if (uploadPreset) params.push(`upload_preset=${uploadPreset}`);
    const signature = crypto
      .createHash("sha1")
      .update(`${params.join("&")}${apiSecret}`)
      .digest("hex");
    res.json({ timestamp, signature, apiKey, cloudName, uploadPreset, unsigned: false });
  }),
);

router.post(
  "/exercise-media",
  asyncHandler(async (req: Request, res: Response) => {
    const userIdHeader = getUserId(req);
    const payload = exerciseMediaSchema.parse(req.body);
    const isPrimary = payload.isPrimary ?? false;
    if (!payload.userId) {
      const result = await query<{ email: string | null }>(
        "SELECT email FROM users WHERE id = $1;",
        [userIdHeader],
      );
      if (result.rows[0]?.email !== "ahoin001@gmail.com") {
        const error = new Error("Not authorized.");
        (error as Error & { status?: number }).status = 403;
        throw error;
      }
    }
    const result = await withTransaction(async (client) => {
      if (isPrimary) {
        await client.query(
          `
          UPDATE exercise_media
          SET is_primary = false
          WHERE exercise_name = $1
            AND (user_id = $2 OR ($2 IS NULL AND user_id IS NULL));
          `,
          [payload.exerciseName, payload.userId ?? null],
        );
      }
      return client.query(
        `
        INSERT INTO exercise_media (
          exercise_name,
          user_id,
          source_type,
          media_url,
          thumb_url,
          is_primary
        )
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *;
        `,
        [
          payload.exerciseName,
          payload.userId ?? null,
          payload.sourceType,
          payload.mediaUrl,
          payload.thumbUrl ?? null,
          isPrimary,
        ],
      );
    });
    res.status(201).json({ media: result.rows[0] });
  }),
);

router.patch(
  "/exercise-media/:mediaId/primary",
  asyncHandler(async (req: Request, res: Response) => {
    const mediaId = z.string().uuid().parse(req.params.mediaId);
    const payload = exerciseMediaOwnerSchema.parse(req.body);
    const result = await withTransaction(async (client) => {
      const media = await client.query(
        `
        SELECT id, exercise_name, user_id
        FROM exercise_media
        WHERE id = $1;
        `,
        [mediaId],
      );
      if (!media.rows[0]) {
        const error = new Error("Media not found.");
        (error as Error & { status?: number }).status = 404;
        throw error;
      }
      if (media.rows[0].user_id !== payload.userId) {
        const error = new Error("Not allowed to update this media.");
        (error as Error & { status?: number }).status = 403;
        throw error;
      }
      await client.query(
        `
        UPDATE exercise_media
        SET is_primary = false
        WHERE exercise_name = $1 AND user_id = $2;
        `,
        [media.rows[0].exercise_name, payload.userId],
      );
      const updated = await client.query(
        `
        UPDATE exercise_media
        SET is_primary = true
        WHERE id = $1
        RETURNING *;
        `,
        [mediaId],
      );
      return updated.rows[0];
    });
    res.json({ media: result });
  }),
);

router.delete(
  "/exercise-media/:mediaId",
  asyncHandler(async (req: Request, res: Response) => {
    const mediaId = z.string().uuid().parse(req.params.mediaId);
    const payload = exerciseMediaOwnerSchema.parse(req.body);
    const result = await query(
      `
      DELETE FROM exercise_media
      WHERE id = $1 AND user_id = $2
      RETURNING *;
      `,
      [mediaId, payload.userId],
    );
    if (!result.rows[0]) {
      const error = new Error("Media not found.");
      (error as Error & { status?: number }).status = 404;
      throw error;
    }
    res.json({ ok: true });
  }),
);

router.get(
  "/exercise-overrides",
  asyncHandler(async (req: Request, res: Response) => {
    const exerciseName = z.string().min(1).parse(req.query.exerciseName);
    const userId = z.string().uuid().parse(req.query.userId);
    const result = await query(
      `
      SELECT *
      FROM exercise_overrides
      WHERE exercise_name = $1 AND user_id = $2
      LIMIT 1;
      `,
      [exerciseName, userId],
    );
    res.json({ override: result.rows[0] ?? null });
  }),
);

router.post(
  "/exercise-overrides",
  asyncHandler(async (req: Request, res: Response) => {
    const payload = exerciseOverrideSchema.parse(req.body);
    const result = await query(
      `
      INSERT INTO exercise_overrides (
        exercise_name,
        user_id,
        steps,
        guide_url
      )
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, exercise_name)
      DO UPDATE SET
        steps = EXCLUDED.steps,
        guide_url = EXCLUDED.guide_url,
        updated_at = now()
      RETURNING *;
      `,
      [
        payload.exerciseName,
        payload.userId,
        payload.steps ?? null,
        payload.guideUrl ?? null,
      ],
    );
    res.status(201).json({ override: result.rows[0] });
  }),
);

export default router;
