import { Router } from "express";
import { withTransaction } from "../db.js";
import { asyncHandler, getUserId } from "../utils.js";

const router = Router();

const defaultMeals = [
  { label: "Breakfast", emoji: "☕", sortOrder: 0 },
  { label: "Lunch", emoji: "🥪", sortOrder: 1 },
  { label: "Dinner", emoji: "🐟", sortOrder: 2 },
  { label: "Snack", emoji: "🍓", sortOrder: 3 },
];

router.post(
  "/ensure",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    await withTransaction(async (client) => {
      for (const meal of defaultMeals) {
        await client.query(
          `
          INSERT INTO meal_types (user_id, label, emoji, sort_order)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (user_id, label) DO NOTHING;
          `,
          [userId, meal.label, meal.emoji, meal.sortOrder],
        );
      }
    });
    res.json({ ok: true });
  }),
);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const userId = getUserId(req);
    const result = await withTransaction((client) =>
      client.query(
        `
        SELECT id, label, emoji, sort_order
        FROM meal_types
        WHERE user_id = $1
        ORDER BY sort_order ASC;
        `,
        [userId],
      ),
    );
    res.json({ items: result.rows });
  }),
);

export default router;
