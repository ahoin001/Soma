import { Router } from "express";
import { z } from "zod";
import { query } from "../db";
import { asyncHandler, getUserId } from "../utils";
import { createCache } from "../cache";

const router = Router();
const searchCache = createCache<{ items: unknown[] }>({
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

    const payload = { items: result.rows };
    searchCache.set(cacheKey, payload);
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
    res.status(201).json({ item: result.rows[0] });
  }),
);

export default router;
