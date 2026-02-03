import { Router } from "express";
import { z } from "zod";
import { query, withTransaction } from "../db";
import { asyncHandler, getUserId } from "../utils";

const router = Router();

const WGER_BASE_URL = "https://wger.de/api/v2";

type WgerExerciseTranslation = {
  language?: number;
  name?: string;
  description?: string;
};

type WgerExerciseInfo = {
  id: number;
  category?: { name?: string } | null;
  muscles?: Array<{ name?: string; name_en?: string }>;
  muscles_secondary?: Array<{ name?: string; name_en?: string }>;
  equipment?: Array<{ name?: string }>;
  translations?: WgerExerciseTranslation[];
  images?: Array<{ image?: string; is_main?: boolean }>;
};

const fetchWger = async (queryValue: string) => {
  const params = new URLSearchParams({
    language: "2",
    limit: "10",
    offset: "0",
    search: queryValue,
  });
  const response = await fetch(
    `${WGER_BASE_URL}/exerciseinfo/?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error("Exercise API request failed.");
  }
  const data = (await response.json()) as { results?: WgerExerciseInfo[] };
  const normalized = queryValue.trim().toLowerCase();
  return (data.results ?? []).filter((item) => {
    const translation = getPrimaryTranslation(item.translations);
    if (!translation?.name) return false;
    const nameMatch = translation.name.toLowerCase().includes(normalized);
    const descriptionMatch = translation.description
      ? translation.description.toLowerCase().includes(normalized)
      : false;
    return nameMatch || descriptionMatch;
  });
};

const fetchWgerPage = async (page: number, limit: number) => {
  const params = new URLSearchParams({
    language: "2",
    limit: String(limit),
    offset: String(page * limit),
  });
  const response = await fetch(
    `${WGER_BASE_URL}/exerciseinfo/?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error("Exercise API request failed.");
  }
  const data = (await response.json()) as { results?: WgerExerciseInfo[] };
  return data.results ?? [];
};

const getPrimaryTranslation = (translations?: WgerExerciseTranslation[]) => {
  if (!translations?.length) return null;
  return (
    translations.find((translation) => translation.language === 2) ??
    translations[0]
  );
};

const getMuscleNames = (
  muscles?: Array<{ name?: string; name_en?: string }>,
) =>
  (muscles ?? [])
    .map((muscle) => muscle.name_en || muscle.name)
    .filter((value): value is string => Boolean(value));

const getImageUrl = (images?: Array<{ image?: string; is_main?: boolean }>) => {
  const main = images?.find((image) => image.is_main && image.image)?.image;
  return main ?? images?.find((image) => image.image)?.image ?? null;
};

const seedExercises = async (pages: number, limit: number) => {
  let total = 0;
  await withTransaction(async (client) => {
    for (let page = 0; page < pages; page += 1) {
      const results = await fetchWgerPage(page, limit);
      if (!results.length) break;
      for (const item of results) {
        const translation = getPrimaryTranslation(item.translations);
        if (!translation?.name?.trim()) continue;
        await client.query(
          `
          INSERT INTO exercises (id, name, description, category, equipment, muscles, image_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            equipment = EXCLUDED.equipment,
            muscles = EXCLUDED.muscles,
            image_url = EXCLUDED.image_url,
            updated_at = now();
          `,
          [
            item.id,
            translation.name.trim(),
            cleanDescription(translation.description ?? ""),
            item.category?.name ?? "General",
            item.equipment?.map((equip) => equip.name ?? "").filter(Boolean) ?? [],
            getMuscleNames(item.muscles),
            getImageUrl(item.images),
          ],
        );
      }
      total += results.length;
    }
  });
  return total;
};

const cleanDescription = (value: string) =>
  value.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();

const getUserEmail = async (userId: string) => {
  const result = await query<{ email: string | null }>(
    "SELECT email FROM users WHERE id = $1;",
    [userId],
  );
  return result.rows[0]?.email ?? null;
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

const fetchWgerImage = async (exerciseId: number) => {
  const params = new URLSearchParams({
    limit: "1",
    offset: "0",
    exercise: String(exerciseId),
  });
  const response = await fetch(`${WGER_BASE_URL}/exerciseimage/?${params.toString()}`);
  if (!response.ok) return null;
  const data = (await response.json()) as { results?: Array<{ image?: string }> };
  return data.results?.[0]?.image ?? null;
};

const imageCache = new Map<number, { url: string | null; updatedAt: number }>();
const IMAGE_TTL_MS = 1000 * 60 * 60 * 24;

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const queryValue = z.string().min(1).parse(req.query.query);
    const seed = req.query.seed === "true";
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
            ? "created_by_user_id = $2"
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

    if (local.rows.length > 0 || !seed) {
      res.json({ items: local.rows });
      return;
    }

    const fetched = await fetchWger(queryValue);
    if (!fetched.length) {
      res.json({ items: [] });
      return;
    }

    await withTransaction(async (client) => {
      for (const item of fetched) {
        const translation = getPrimaryTranslation(item.translations);
        if (!translation?.name?.trim()) continue;
        await client.query(
          `
          INSERT INTO exercises (id, name, description, category, equipment, muscles, image_url)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (id) DO UPDATE SET
            name = EXCLUDED.name,
            description = EXCLUDED.description,
            category = EXCLUDED.category,
            equipment = EXCLUDED.equipment,
            muscles = EXCLUDED.muscles,
            image_url = EXCLUDED.image_url,
            updated_at = now();
          `,
          [
            item.id,
            translation.name.trim(),
            cleanDescription(translation.description ?? ""),
            item.category?.name ?? "General",
            item.equipment?.map((equip) => equip.name ?? "").filter(Boolean) ?? [],
            getMuscleNames(item.muscles),
            getImageUrl(item.images),
          ],
        );
      }
    });

    const seeded = await query(
      `
      SELECT id, name, description, category, equipment, muscles, image_url
      FROM exercises
      WHERE id = ANY($1::bigint[])
      ORDER BY name ASC;
      `,
      [fetched.map((item) => item.id)],
    );

    res.json({ items: seeded.rows });
  }),
);

router.get(
  "/images",
  asyncHandler(async (req, res) => {
    const idsRaw = z.string().min(1).parse(req.query.ids);
    const ids = Array.from(
      new Set(
        idsRaw
          .split(",")
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value)),
      ),
    ).slice(0, 24);
    const images: Record<string, string> = {};
    const now = Date.now();
    for (const id of ids) {
      const cached = imageCache.get(id);
      if (cached && now - cached.updatedAt < IMAGE_TTL_MS) {
        if (cached.url) images[String(id)] = cached.url;
        continue;
      }
      const url = await fetchWgerImage(id);
      imageCache.set(id, { url, updatedAt: now });
      if (url) images[String(id)] = url;
    }
    res.json({ images });
  }),
);

router.get(
  "/by-name",
  asyncHandler(async (req, res) => {
    const name = z.string().min(1).parse(req.query.name);
    const userId = req.header("x-user-id") ?? null;
    const result = await query(
      `
      SELECT id, name, description, category, equipment, muscles, image_url
      FROM exercises
      WHERE lower(name) = lower($1)
        AND (created_by_user_id IS NULL OR created_by_user_id = $2)
      LIMIT 1;
      `,
      [name, userId],
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
        created_by_user_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
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
  "/:exerciseId",
  asyncHandler(async (req, res) => {
    const exerciseId = z.coerce.number().int().parse(req.params.exerciseId);
    const userId = req.header("x-user-id") ?? null;
    const result = await query(
      `
      SELECT id, name, description, category, equipment, muscles, image_url, created_by_user_id
      FROM exercises
      WHERE id = $1
        AND (created_by_user_id IS NULL OR created_by_user_id = $2);
      `,
      [exerciseId, userId],
    );
    res.json({ exercise: result.rows[0] ?? null });
  }),
);

router.patch(
  "/:exerciseId",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const exerciseId = z.coerce.number().int().parse(req.params.exerciseId);
    const ownerId = await getExerciseOwner(exerciseId);
    if (!ownerId) {
      await ensureAdmin(userId);
    } else if (ownerId !== userId) {
      const error = new Error("Not authorized.");
      (error as Error & { status?: number }).status = 403;
      throw error;
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

router.post(
  "/sync",
  asyncHandler(async (req, res) => {
    const authKey = process.env.EXERCISE_SYNC_KEY ?? null;
    if (authKey) {
      const provided = req.header("x-sync-key");
      if (!provided || provided !== authKey) {
        res.status(403).json({ error: "Unauthorized." });
        return;
      }
    }

    const pages = z.coerce.number().int().min(1).max(20).parse(req.query.pages ?? 4);
    const limit = z.coerce.number().int().min(10).max(200).parse(req.query.limit ?? 50);
    const total = await seedExercises(pages, limit);
    res.json({ seeded: total, pages, limit });
  }),
);

export default router;
