import { Router } from "express";
import { z } from "zod";
import { withTransaction } from "../db";
import { asyncHandler, getUserId } from "../utils";
import { createCache } from "../cache";

const router = Router();
const dayCache = createCache<{ entries: unknown[]; items: unknown[] }>({
  ttlMs: 60_000,
  maxEntries: 200,
});

const itemSchema = z.object({
  foodId: z.string().uuid().optional(),
  foodName: z.string().min(1),
  portionLabel: z.string().optional(),
  portionGrams: z.number().optional(),
  quantity: z.number().positive().default(1),
  kcal: z.number().nonnegative().default(0),
  carbsG: z.number().nonnegative().default(0),
  proteinG: z.number().nonnegative().default(0),
  fatG: z.number().nonnegative().default(0),
  micronutrients: z.record(z.any()).optional(),
  sortOrder: z.number().int().nonnegative().optional(),
});

const createEntrySchema = z.object({
  localDate: z.string().min(1),
  mealTypeId: z.string().uuid().optional(),
  notes: z.string().optional(),
  items: z.array(itemSchema).min(1),
});

const updateItemSchema = z.object({
  quantity: z.number().positive().optional(),
  kcal: z.number().nonnegative().optional(),
  carbsG: z.number().nonnegative().optional(),
  proteinG: z.number().nonnegative().optional(),
  fatG: z.number().nonnegative().optional(),
  portionLabel: z.string().optional(),
  portionGrams: z.number().optional(),
  micronutrients: z.record(z.any()).optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = createEntrySchema.parse(req.body);

    const entry = await withTransaction(async (client) => {
      const entryResult = await client.query(
        `
        INSERT INTO meal_entries (user_id, local_date, meal_type_id, notes)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
        `,
        [userId, payload.localDate, payload.mealTypeId ?? null, payload.notes ?? null],
      );

      const entryId = entryResult.rows[0].id as string;
      const values: string[] = [];
      const params: unknown[] = [];
      let index = 1;

      for (const [position, item] of payload.items.entries()) {
        const sortOrder = item.sortOrder ?? position;
        values.push(
          `($${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++})`,
        );
        params.push(
          entryId,
          item.foodId ?? null,
          item.foodName,
          item.portionLabel ?? null,
          item.portionGrams ?? null,
          item.quantity,
          item.kcal,
          item.carbsG,
          item.proteinG,
          item.fatG,
          item.micronutrients ?? {},
          sortOrder,
        );
      }

      const itemsResult = await client.query(
        `
        INSERT INTO meal_entry_items (
          meal_entry_id,
          food_id,
          food_name,
          portion_label,
          portion_grams,
          quantity,
          kcal,
          carbs_g,
          protein_g,
          fat_g,
          micronutrients,
          sort_order
        )
        VALUES ${values.join(", ")}
        RETURNING *;
        `,
        params,
      );

      const historyMap = new Map<string, number>();
      for (const item of payload.items) {
        if (!item.foodId) continue;
        historyMap.set(item.foodId, (historyMap.get(item.foodId) ?? 0) + 1);
      }

      if (historyMap.size > 0) {
        const values: string[] = [];
        const historyParams: unknown[] = [];
        let idx = 1;
        for (const [foodId, count] of historyMap.entries()) {
          values.push(`($${idx++}, $${idx++}, now(), $${idx++})`);
          historyParams.push(userId, foodId, count);
        }
        await client.query(
          `
          INSERT INTO user_food_history (user_id, food_id, last_logged_at, times_logged)
          VALUES ${values.join(", ")}
          ON CONFLICT (user_id, food_id)
          DO UPDATE SET
            last_logged_at = EXCLUDED.last_logged_at,
            times_logged = user_food_history.times_logged + EXCLUDED.times_logged;
          `,
          historyParams,
        );
      }

      return { entry: entryResult.rows[0], items: itemsResult.rows };
    });

    dayCache.clear();
    res.status(201).json(entry);
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const localDate = typeof req.query.localDate === "string" ? req.query.localDate : null;
    if (!localDate) {
      res.status(400).json({ error: "localDate is required." });
      return;
    }

    const cacheKey = `meal-entries:${userId}:${localDate}`;
    const cached = dayCache.get(cacheKey);
    if (cached) {
      res.setHeader("Cache-Control", "private, max-age=30");
      res.json(cached);
      return;
    }

    const entriesResult = await withTransaction(async (client) => {
      const entries = await client.query(
        `
        SELECT *
        FROM meal_entries
        WHERE user_id = $1 AND local_date = $2
        ORDER BY logged_at ASC;
        `,
        [userId, localDate],
      );

      const entryIds = entries.rows.map((row) => row.id);
      if (!entryIds.length) return { entries: [], items: [] };

      const items = await client.query(
        `
        SELECT meal_entry_items.*, foods.image_url
        FROM meal_entry_items
        LEFT JOIN foods ON foods.id = meal_entry_items.food_id
        WHERE meal_entry_id = ANY($1::uuid[])
        ORDER BY meal_entry_id, sort_order ASC;
        `,
        [entryIds],
      );

      return { entries: entries.rows, items: items.rows };
    });

    dayCache.set(cacheKey, entriesResult);
    res.setHeader("Cache-Control", "private, max-age=30");
    res.json(entriesResult);
  }),
);

router.patch(
  "/items/:itemId",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const itemId = req.params.itemId;
    const payload = updateItemSchema.parse(req.body);

    const result = await withTransaction((client) =>
      client.query(
        `
        UPDATE meal_entry_items
        SET
          quantity = COALESCE($1, quantity),
          kcal = COALESCE($2, kcal),
          carbs_g = COALESCE($3, carbs_g),
          protein_g = COALESCE($4, protein_g),
          fat_g = COALESCE($5, fat_g),
          portion_label = COALESCE($6, portion_label),
          portion_grams = COALESCE($7, portion_grams),
          micronutrients = COALESCE($8, micronutrients)
        FROM meal_entries
        WHERE meal_entry_items.id = $9
          AND meal_entry_items.meal_entry_id = meal_entries.id
          AND meal_entries.user_id = $10
        RETURNING meal_entry_items.*;
        `,
        [
          payload.quantity ?? null,
          payload.kcal ?? null,
          payload.carbsG ?? null,
          payload.proteinG ?? null,
          payload.fatG ?? null,
          payload.portionLabel ?? null,
          payload.portionGrams ?? null,
          payload.micronutrients ?? null,
          itemId,
          userId,
        ],
      ),
    );

    dayCache.clear();
    res.json({ item: result.rows[0] ?? null });
  }),
);

router.delete(
  "/items/:itemId",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const itemId = req.params.itemId;
    const result = await withTransaction((client) =>
      client.query(
        `
        DELETE FROM meal_entry_items
        USING meal_entries
        WHERE meal_entry_items.id = $1
          AND meal_entry_items.meal_entry_id = meal_entries.id
          AND meal_entries.user_id = $2
        RETURNING meal_entry_items.id;
        `,
        [itemId, userId],
      ),
    );

    dayCache.clear();
    res.json({ deleted: result.rows[0]?.id ?? null });
  }),
);

export default router;
