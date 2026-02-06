import { Router } from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";
import { asyncHandler, getUserId } from "../utils";

const router = Router();

const cleanDescription = (value: string) =>
  value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const getUserEmail = async (userId: string) => {
  const result = await query<{ email: string | null }>(
    "SELECT email FROM users WHERE id = $1;",
    [userId],
  );
  return result.rows[0]?.email ?? null;
};

const isAdminUser = async (userId: string) => {
  const email = await getUserEmail(userId);
  return email === "ahoin001@gmail.com";
};

const ensureAdmin = async (userId: string) => {
  const email = await getUserEmail(userId);
  if (email !== "ahoin001@gmail.com") {
    const error = new Error("Not authorized.");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
};

const getExerciseOwner = async (exerciseId: number) => {
  const result = await query<{ created_by_user_id: string | null }>(
    "SELECT created_by_user_id FROM exercises WHERE id = $1;",
    [exerciseId],
  );
  return result.rows[0]?.created_by_user_id ?? null;
};

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const queryValue = z.string().min(1).parse(req.query.query);
    const scope = req.query.scope === "mine" ? "mine" : "all";
    const userId = scope === "mine" ? getUserId(req) : req.header("x-user-id") ?? null;

    const local = await query(
      `
      SELECT id, name, description, category, equipment, muscles, image_url
      FROM exercises
      WHERE to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(category, ''))
            @@ plainto_tsquery('simple', $1)
        AND ${
          scope === "mine"
            ? "created_by_user_id = $2 AND is_custom = true"
            : "(created_by_user_id IS NULL OR created_by_user_id = $2)"
        }
      ORDER BY name ASC
      LIMIT 50;
      `,
      [queryValue, userId],
    );

    if (scope === "mine") {
      res.json({ items: local.rows });
      return;
    }

    res.json({ items: local.rows });
  }),
);


router.get(
  "/by-name",
  asyncHandler(async (req, res) => {
    const name = z.string().min(1).parse(req.query.name);
    const userId = req.header("x-user-id") ?? null;
    const admin = userId ? await isAdminUser(userId) : false;
    const result = await query(
      admin
        ? `
      SELECT id, name, description, category, equipment, muscles, image_url
      FROM exercises
      WHERE lower(name) = lower($1)
      LIMIT 1;
      `
        : `
      SELECT id, name, description, category, equipment, muscles, image_url
      FROM exercises
      WHERE lower(name) = lower($1)
        AND (created_by_user_id IS NULL OR created_by_user_id = $2)
      LIMIT 1;
      `,
      admin ? [name] : [name, userId],
    );
    res.json({ exercise: result.rows[0] ?? null });
  }),
);

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = z
      .object({
        name: z.string().min(1),
        description: z.string().optional().nullable(),
        category: z.string().optional().nullable(),
        equipment: z.array(z.string()).optional().nullable(),
        muscles: z.array(z.string()).optional().nullable(),
        imageUrl: z.string().url().optional().nullable(),
      })
      .parse(req.body);
    const result = await query(
      `
      INSERT INTO exercises (
        name,
        description,
        category,
        equipment,
        muscles,
        image_url,
        created_by_user_id,
        is_custom
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, true)
      RETURNING id, name, description, category, equipment, muscles, image_url;
      `,
      [
        payload.name.trim(),
        payload.description ?? null,
        payload.category ?? "General",
        payload.equipment ?? [],
        payload.muscles ?? [],
        payload.imageUrl ?? null,
        userId,
      ],
    );
    res.status(201).json({ exercise: result.rows[0] });
  }),
);

router.get(
  "/admin",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const admin = await isAdminUser(userId);
    if (!admin) {
      res.status(403).json({ error: "Not authorized." });
      return;
    }
    const queryValue =
      typeof req.query.query === "string" ? req.query.query.trim() : "";
    const limit = z.coerce
      .number()
      .int()
      .min(1)
      .max(200)
      .parse(req.query.limit ?? 120);
    const result = await query(
      `
      SELECT id, name, category, image_url
      FROM exercises
      WHERE $1 = ''
         OR to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(category, ''))
            @@ plainto_tsquery('simple', $1)
         OR lower(name) LIKE '%' || lower($1) || '%'
      ORDER BY name ASC
      LIMIT $2;
      `,
      [queryValue, limit],
    );
    res.json({ items: result.rows });
  }),
);

router.get(
  "/:exerciseId",
  asyncHandler(async (req, res) => {
    const exerciseId = z.coerce.number().int().parse(req.params.exerciseId);
    const userId = req.header("x-user-id") ?? null;
    const admin = userId ? await isAdminUser(userId) : false;
    const result = await query(
      admin
        ? `
      SELECT id, name, description, category, equipment, muscles, image_url, created_by_user_id
      FROM exercises
      WHERE id = $1;
      `
        : `
      SELECT id, name, description, category, equipment, muscles, image_url, created_by_user_id
      FROM exercises
      WHERE id = $1
        AND (created_by_user_id IS NULL OR created_by_user_id = $2);
      `,
      admin ? [exerciseId] : [exerciseId, userId],
    );
    res.json({ exercise: result.rows[0] ?? null });
  }),
);

router.patch(
  "/:exerciseId",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const exerciseId = z.coerce.number().int().parse(req.params.exerciseId);
    const admin = await isAdminUser(userId);
    const ownerId = await getExerciseOwner(exerciseId);
    if (!admin) {
      if (!ownerId || ownerId !== userId) {
        const error = new Error("Not authorized.");
        (error as Error & { status?: number }).status = 403;
        throw error;
      }
    }
    const payload = z
      .object({
        name: z.string().min(1).optional(),
        description: z.string().optional().nullable(),
        category: z.string().optional().nullable(),
        equipment: z.array(z.string()).optional().nullable(),
        muscles: z.array(z.string()).optional().nullable(),
        imageUrl: z.string().url().optional().nullable(),
      })
      .parse(req.body);
    const result = await query(
      `
      UPDATE exercises
      SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        category = COALESCE($4, category),
        equipment = COALESCE($5, equipment),
        muscles = COALESCE($6, muscles),
        image_url = COALESCE($7, image_url),
        updated_at = now()
      WHERE id = $1
      RETURNING id, name, description, category, equipment, muscles, image_url;
      `,
      [
        exerciseId,
        payload.name ?? null,
        payload.description ?? null,
        payload.category ?? null,
        payload.equipment ?? null,
        payload.muscles ?? null,
        payload.imageUrl ?? null,
      ],
    );
    res.json({ exercise: result.rows[0] });
  }),
);

router.delete(
  "/:exerciseId",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    await ensureAdmin(userId);
    const exerciseId = z.coerce.number().int().parse(req.params.exerciseId);
    const result = await query(
      "DELETE FROM exercises WHERE id = $1 RETURNING id;",
      [exerciseId],
    );
    if (result.rowCount === 0) {
      res.status(404).json({ error: "Exercise not found." });
      return;
    }
    res.json({ ok: true });
  }),
);

export default router;
