import { Router } from "express";
import { z } from "zod";
import crypto from "node:crypto";
import { query } from "../db";
import { asyncHandler, getUserId } from "../utils";
import { createCache } from "../cache";
import {
  dedupeFoodInserts,
  fetchOffBarcode,
  fetchOffSearch,
  fetchUsdaFoods,
  filterOffLowQuality,
  upsertGlobalFoods,
} from "../services/foodProviders";

const router = Router();
const searchCache = createCache<{ items?: unknown[]; item?: unknown | null }>({
  ttlMs: 60_000,
  maxEntries: 200,
});
const listCache = createCache<{ items: unknown[] }>({
  ttlMs: 60_000,
  maxEntries: 200,
});

router.get(
  "/search",
  asyncHandler(async (req, res) => {
    const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
    const limitRaw = typeof req.query.limit === "string" ? req.query.limit : "";
    const limit = Math.min(Math.max(Number(limitRaw || 20), 1), 50);
    const external =
      typeof req.query.external === "string"
        ? req.query.external !== "false"
        : true;
    const userId = req.header("x-user-id") ?? null;

    const cacheKey = `foods:search:${userId ?? "anon"}:${q}:${limit}:${external ? "api" : "local"}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "private, max-age=30");
      res.json(cached);
      return;
    }

    const result = await query(
      `
      SELECT
        f.*,
        b.name AS brand_name,
        b.logo_url AS brand_logo_url
      FROM foods f
      LEFT JOIN brands b ON b.id = f.brand_id
      WHERE
        (f.is_global = true OR ($2::uuid IS NOT NULL AND f.created_by_user_id = $2))
        AND ($1 = '' OR to_tsvector('simple', coalesce(f.name, '') || ' ' || coalesce(f.brand, '') || ' ' || coalesce(b.name, ''))
             @@ plainto_tsquery('simple', $1))
      ORDER BY f.is_global DESC, f.name ASC
      LIMIT $3;
      `,
      [q, userId, limit],
    );

    if (result.rows.length > 0 || !q) {
      const payload = { items: result.rows };
      searchCache.set(cacheKey, payload);
      res.setHeader("Cache-Control", "private, max-age=30");
      res.json(payload);
      return;
    }

    if (!external) {
      const payload = { items: [] };
      searchCache.set(cacheKey, payload);
      res.setHeader("Cache-Control", "private, max-age=30");
      res.json(payload);
      return;
    }

    const usdaResults = await fetchUsdaFoods(q, limit);
    const offResults = await fetchOffSearch(q, limit);
    const cleanedOff = filterOffLowQuality(offResults);
    const externalResults = dedupeFoodInserts([
      ...usdaResults,
      ...cleanedOff,
    ]);

    const saved = await upsertGlobalFoods(externalResults);
    const payload = { items: saved };
    searchCache.set(cacheKey, payload);
    res.setHeader("Cache-Control", "private, max-age=30");
    res.json(payload);
  }),
);

router.get(
  "/barcode/:code",
  asyncHandler(async (req, res) => {
    const code = req.params.code;
    const userId = req.header("x-user-id") ?? null;
    const cacheKey = `foods:barcode:${userId ?? "anon"}:${code}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "private, max-age=30");
      res.json(cached);
      return;
    }

    const local = await query(
      `
      SELECT
        f.*,
        b.name AS brand_name,
        b.logo_url AS brand_logo_url
      FROM foods f
      LEFT JOIN brands b ON b.id = f.brand_id
      WHERE f.barcode = $1
        AND (f.is_global = true OR ($2::uuid IS NOT NULL AND f.created_by_user_id = $2))
      LIMIT 1;
      `,
      [code, userId],
    );

    if (local.rows[0]) {
      const payload = { item: local.rows[0] };
      searchCache.set(cacheKey, payload);
      res.setHeader("Cache-Control", "private, max-age=30");
      res.json(payload);
      return;
    }

    const offItem = await fetchOffBarcode(code);
    if (!offItem) {
      const payload = { item: null };
      searchCache.set(cacheKey, payload);
      res.setHeader("Cache-Control", "private, max-age=30");
      res.json(payload);
      return;
    }

    const saved = await upsertGlobalFoods([offItem]);
    const payload = { item: saved[0] ?? null };
    searchCache.set(cacheKey, payload);
    res.setHeader("Cache-Control", "private, max-age=30");
    res.json(payload);
  }),
);

router.get(
  "/favorites",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const cacheKey = `foods:favorites:${userId}`;
    const cached = listCache.get(cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "private, max-age=30");
      res.json(cached);
      return;
    }

    const result = await query(
      `
      SELECT f.*, b.name AS brand_name, b.logo_url AS brand_logo_url
      FROM user_food_favorites fav
      JOIN foods f ON f.id = fav.food_id
      LEFT JOIN brands b ON b.id = f.brand_id
      WHERE fav.user_id = $1
      ORDER BY fav.created_at DESC;
      `,
      [userId],
    );
    const payload = { items: result.rows };
    listCache.set(cacheKey, payload);
    res.setHeader("Cache-Control", "private, max-age=30");
    res.json(payload);
  }),
);

router.post(
  "/favorites",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const body = z
      .object({ foodId: z.string().uuid(), favorite: z.boolean() })
      .parse(req.body);

    if (body.favorite) {
      await query(
        `
        INSERT INTO user_food_favorites (user_id, food_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, food_id) DO NOTHING;
        `,
        [userId, body.foodId],
      );
    } else {
      await query(
        `
        DELETE FROM user_food_favorites
        WHERE user_id = $1 AND food_id = $2;
        `,
        [userId, body.foodId],
      );
    }

    listCache.clear();
    res.json({ ok: true });
  }),
);

router.get(
  "/history",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const limitRaw = typeof req.query.limit === "string" ? req.query.limit : "";
    const limit = Math.min(Math.max(Number(limitRaw || 20), 1), 100);
    const cacheKey = `foods:history:${userId}:${limit}`;
    const cached = listCache.get(cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "private, max-age=30");
      res.json(cached);
      return;
    }

    const result = await query(
      `
      SELECT f.*, h.last_logged_at, h.times_logged, b.name AS brand_name, b.logo_url AS brand_logo_url
      FROM user_food_history h
      JOIN foods f ON f.id = h.food_id
      LEFT JOIN brands b ON b.id = f.brand_id
      WHERE h.user_id = $1
      ORDER BY h.last_logged_at DESC
      LIMIT $2;
      `,
      [userId, limit],
    );
    const payload = { items: result.rows };
    listCache.set(cacheKey, payload);
    res.setHeader("Cache-Control", "private, max-age=30");
    res.json(payload);
  }),
);

router.get(
  "/:foodId/servings",
  asyncHandler(async (req, res) => {
    const foodId = req.params.foodId;
    const result = await query(
      `
      SELECT id, food_id, label, grams
      FROM food_servings
      WHERE food_id = $1
      ORDER BY label ASC;
      `,
      [foodId],
    );
    res.json({ servings: result.rows });
  }),
);

const createServingSchema = z.object({
  label: z.string().min(1),
  grams: z.number().min(0.1),
});

router.post(
  "/:foodId/servings",
  asyncHandler(async (req, res) => {
    getUserId(req);
    const foodId = req.params.foodId;
    const payload = createServingSchema.parse(req.body);
    const result = await query(
      `
      INSERT INTO food_servings (food_id, label, grams)
      VALUES ($1, $2, $3)
      RETURNING id, food_id, label, grams;
      `,
      [foodId, payload.label, payload.grams],
    );
    res.status(201).json({ serving: result.rows[0] });
  }),
);

const createFoodSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  brandId: z.string().uuid().optional(),
  barcode: z.string().optional(),
  source: z.string().optional(),
  portionLabel: z.string().optional(),
  portionGrams: z.number().optional(),
  kcal: z.number().default(0),
  carbsG: z.number().default(0),
  proteinG: z.number().default(0),
  fatG: z.number().default(0),
  micronutrients: z.record(z.any()).optional(),
  imageUrl: z.string().url().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = createFoodSchema.parse(req.body);
    const result = await query(
      `
      INSERT INTO foods (
        name,
        brand,
        brand_id,
        barcode,
        source,
        is_global,
        created_by_user_id,
        portion_label,
        portion_grams,
        kcal,
        carbs_g,
        protein_g,
        fat_g,
        micronutrients,
        image_url
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        false,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        $14
      )
      RETURNING *;
      `,
      [
        payload.name,
        payload.brand ?? null,
        payload.brandId ?? null,
        payload.barcode ?? null,
        payload.source ?? "user",
        userId,
        payload.portionLabel ?? null,
        payload.portionGrams ?? null,
        payload.kcal,
        payload.carbsG,
        payload.proteinG,
        payload.fatG,
        payload.micronutrients ?? {},
        payload.imageUrl ?? null,
      ],
    );

    searchCache.clear();
    listCache.clear();
    res.status(201).json({ item: result.rows[0] });
  }),
);

const imageSchema = z.object({
  imageUrl: z.string().url(),
});

const updateFoodSchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().nullable().optional(),
  brandId: z.string().uuid().nullable().optional(),
  portionLabel: z.string().nullable().optional(),
  portionGrams: z.number().nullable().optional(),
  kcal: z.number().min(0).optional(),
  carbsG: z.number().min(0).optional(),
  proteinG: z.number().min(0).optional(),
  fatG: z.number().min(0).optional(),
  micronutrients: z.record(z.union([z.number(), z.string()])).optional(),
});

const assertAdmin = async (userId: string) => {
  const result = await query<{ email: string | null }>(
    "SELECT email FROM users WHERE id = $1;",
    [userId],
  );
  if (result.rows[0]?.email !== "ahoin001@gmail.com") {
    const error = new Error("Not authorized.");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
};

router.get(
  "/image/signature",
  asyncHandler(async (req, res) => {
    getUserId(req);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET ?? null;
    if (!cloudName || !apiKey || !apiSecret) {
      const error = new Error("Cloudinary credentials are not configured.");
      (error as Error & { status?: number }).status = 500;
      throw error;
    }
    const timestamp = Math.floor(Date.now() / 1000);
    const params: string[] = [`timestamp=${timestamp}`];
    if (uploadPreset) params.push(`upload_preset=${uploadPreset}`);
    const signature = crypto
      .createHash("sha1")
      .update(`${params.join("&")}${apiSecret}`)
      .digest("hex");
    res.json({ timestamp, signature, apiKey, cloudName, uploadPreset });
  }),
);

router.patch(
  "/:foodId/image",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    await assertAdmin(userId);
    const payload = imageSchema.parse(req.body);
    const result = await query(
      `
      UPDATE foods
      SET image_url = $2,
          updated_at = now()
      WHERE id = $1
      RETURNING *;
      `,
      [req.params.foodId, payload.imageUrl],
    );
    searchCache.clear();
    listCache.clear();
    res.json({ item: result.rows[0] ?? null });
  }),
);

router.patch(
  "/:foodId",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    await assertAdmin(userId);
    const payload = updateFoodSchema.parse(req.body);
    const result = await query(
      `
      UPDATE foods
      SET
        name = COALESCE($2, name),
        brand = COALESCE($3, brand),
        brand_id = COALESCE($4, brand_id),
        portion_label = COALESCE($5, portion_label),
        portion_grams = COALESCE($6, portion_grams),
        kcal = COALESCE($7, kcal),
        carbs_g = COALESCE($8, carbs_g),
        protein_g = COALESCE($9, protein_g),
        fat_g = COALESCE($10, fat_g),
        micronutrients = COALESCE($11, micronutrients),
        updated_at = now()
      WHERE id = $1
      RETURNING *;
      `,
      [
        req.params.foodId,
        payload.name ?? null,
        payload.brand ?? null,
        payload.brandId ?? null,
        payload.portionLabel ?? null,
        payload.portionGrams ?? null,
        payload.kcal ?? null,
        payload.carbsG ?? null,
        payload.proteinG ?? null,
        payload.fatG ?? null,
        payload.micronutrients ?? null,
      ],
    );
    searchCache.clear();
    listCache.clear();
    res.json({ item: result.rows[0] ?? null });
  }),
);

export default router;
