import { Router } from "express";
import { z } from "zod";
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
    const userId = req.header("x-user-id") ?? null;

    const cacheKey = `foods:search:${userId ?? "anon"}:${q}:${limit}`;
    const cached = searchCache.get(cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "private, max-age=30");
      res.json(cached);
      return;
    }

    const result = await query(
      `
      SELECT
        id,
        name,
        brand,
        barcode,
        source,
        is_global,
        created_by_user_id,
        parent_food_id,
        portion_label,
        portion_grams,
        kcal,
        carbs_g,
        protein_g,
        fat_g,
        micronutrients
      FROM foods
      WHERE
        (is_global = true OR ($2::uuid IS NOT NULL AND created_by_user_id = $2))
        AND ($1 = '' OR to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(brand, ''))
             @@ plainto_tsquery('simple', $1))
      ORDER BY is_global DESC, name ASC
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
        id,
        name,
        brand,
        barcode,
        source,
        is_global,
        created_by_user_id,
        parent_food_id,
        portion_label,
        portion_grams,
        kcal,
        carbs_g,
        protein_g,
        fat_g,
        micronutrients
      FROM foods
      WHERE barcode = $1
        AND (is_global = true OR ($2::uuid IS NOT NULL AND created_by_user_id = $2))
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
      SELECT f.*
      FROM user_food_favorites fav
      JOIN foods f ON f.id = fav.food_id
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
      SELECT f.*, h.last_logged_at, h.times_logged
      FROM user_food_history h
      JOIN foods f ON f.id = h.food_id
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

const createFoodSchema = z.object({
  name: z.string().min(1),
  brand: z.string().optional(),
  barcode: z.string().optional(),
  source: z.string().optional(),
  portionLabel: z.string().optional(),
  portionGrams: z.number().optional(),
  kcal: z.number().default(0),
  carbsG: z.number().default(0),
  proteinG: z.number().default(0),
  fatG: z.number().default(0),
  micronutrients: z.record(z.any()).optional(),
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
        micronutrients
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        false,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        $12
      )
      RETURNING *;
      `,
      [
        payload.name,
        payload.brand ?? null,
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
      ],
    );

    searchCache.clear();
    listCache.clear();
    res.status(201).json({ item: result.rows[0] });
  }),
);

export default router;
