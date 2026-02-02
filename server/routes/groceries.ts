import { Router } from "express";
import { z } from "zod";
import { query } from "../db";
import { asyncHandler, getUserId } from "../utils";

const router = Router();

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await query(
      `
      SELECT id, name, bucket, macro_group, category, created_at
      FROM grocery_bag_items
      WHERE user_id = $1
      ORDER BY created_at DESC;
      `,
      [userId],
    );
    res.json({ items: result.rows });
  }),
);

const createItemSchema = z.object({
  name: z.string().min(1),
  bucket: z.enum(["staples", "rotation", "special"]),
  macroGroup: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const payload = createItemSchema.parse(req.body);

    const result = await query(
      `
      INSERT INTO grocery_bag_items (user_id, name, bucket, macro_group, category)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id, lower(name), bucket) DO NOTHING
      RETURNING id, name, bucket, macro_group, category, created_at;
      `,
      [
        userId,
        payload.name,
        payload.bucket,
        payload.macroGroup ?? null,
        payload.category ?? null,
      ],
    );

    if (result.rows[0]) {
      res.status(201).json({ item: result.rows[0] });
      return;
    }

    const existing = await query(
      `
      SELECT id, name, bucket, macro_group, category, created_at
      FROM grocery_bag_items
      WHERE user_id = $1 AND lower(name) = lower($2) AND bucket = $3
      LIMIT 1;
      `,
      [userId, payload.name, payload.bucket],
    );

    res.json({ item: existing.rows[0] });
  }),
);

router.delete(
  "/:itemId",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const itemId = req.params.itemId;
    await query(
      `
      DELETE FROM grocery_bag_items
      WHERE id = $1 AND user_id = $2;
      `,
      [itemId, userId],
    );
    res.status(204).send();
  }),
);

export default router;
