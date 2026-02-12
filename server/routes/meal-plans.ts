import { Router, type Request, type Response } from "express";
import { z } from "zod";
import { withTransaction } from "../db";
import { asyncHandler, getUserId } from "../utils";

const router = Router();

const slotSchema = z.enum(["protein", "carbs", "balance"]);

router.get(
  "/",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const result = await withTransaction(async (client) => {
      const groups = await client.query(
        `
        SELECT id, user_id, name, sort_order, created_at, updated_at
        FROM meal_plan_groups
        WHERE user_id = $1
        ORDER BY sort_order ASC, created_at ASC;
        `,
        [userId],
      );

      const days = await client.query(
        `
        SELECT
          id,
          user_id,
          name,
          target_kcal,
          target_protein_g,
          target_carbs_g,
          target_fat_g,
          group_id,
          created_at,
          updated_at
        FROM meal_plan_days
        WHERE user_id = $1
        ORDER BY updated_at DESC, created_at DESC;
        `,
        [userId],
      );

      const dayIds = days.rows.map((row) => row.id as string);
      if (dayIds.length === 0) {
        const weekAssignments = await client.query(
          `
          SELECT user_id, weekday, day_id, updated_at
          FROM meal_plan_week_assignments
          WHERE user_id = $1
          ORDER BY weekday ASC;
          `,
          [userId],
        );
        return {
          groups: groups.rows,
          days: [],
          meals: [],
          items: [],
          weekAssignments: weekAssignments.rows,
        };
      }

      const meals = await client.query(
        `
        SELECT
          id,
          day_id,
          label,
          emoji,
          sort_order,
          created_at,
          updated_at
        FROM meal_plan_meals
        WHERE day_id = ANY($1::uuid[])
        ORDER BY day_id, sort_order ASC, created_at ASC;
        `,
        [dayIds],
      );

      const mealIds = meals.rows.map((row) => row.id as string);
      const items =
        mealIds.length > 0
          ? await client.query(
              `
              SELECT
                id,
                meal_id,
                food_id,
                food_name,
                quantity,
                slot,
                kcal,
                protein_g,
                carbs_g,
                fat_g,
                sort_order,
                created_at,
                updated_at
              FROM meal_plan_items
              WHERE meal_id = ANY($1::uuid[])
              ORDER BY meal_id, sort_order ASC, created_at ASC;
              `,
              [mealIds],
            )
          : { rows: [] as unknown[] };

      const weekAssignments = await client.query(
        `
        SELECT user_id, weekday, day_id, updated_at
        FROM meal_plan_week_assignments
        WHERE user_id = $1
        ORDER BY weekday ASC;
        `,
        [userId],
      );

      return {
        groups: groups.rows,
        days: days.rows,
        meals: meals.rows,
        items: items.rows,
        weekAssignments: weekAssignments.rows,
      };
    });

    res.json(result);
  }),
);

const createGroupSchema = z.object({
  name: z.string().min(1),
});

router.post(
  "/groups",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const payload = createGroupSchema.parse(req.body);
    const result = await withTransaction(async (client) => {
      const count = await client.query(
        `SELECT COUNT(*) AS n FROM meal_plan_groups WHERE user_id = $1;`,
        [userId],
      );
      const sortOrder = Number(count.rows[0]?.n ?? 0);
      const group = await client.query(
        `
        INSERT INTO meal_plan_groups (user_id, name, sort_order)
        VALUES ($1, $2, $3)
        RETURNING *;
        `,
        [userId, payload.name, sortOrder],
      );
      return group.rows[0];
    });
    res.status(201).json({ group: result });
  }),
);

const patchGroupSchema = z.object({
  name: z.string().min(1).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

router.patch(
  "/groups/:groupId",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const groupId = req.params.groupId;
    const payload = patchGroupSchema.parse(req.body);
    const result = await withTransaction((client) =>
      client.query(
        `
        UPDATE meal_plan_groups
        SET
          name = COALESCE($3, name),
          sort_order = COALESCE($4, sort_order),
          updated_at = now()
        WHERE id = $1 AND user_id = $2
        RETURNING *;
        `,
        [groupId, userId, payload.name ?? null, payload.sortOrder ?? null],
      ),
    );
    res.json({ group: result.rows[0] ?? null });
  }),
);

router.delete(
  "/groups/:groupId",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const groupId = req.params.groupId;
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE meal_plan_days SET group_id = NULL WHERE group_id = $1 AND user_id = $2;`,
        [groupId, userId],
      );
      await client.query(
        `DELETE FROM meal_plan_groups WHERE id = $1 AND user_id = $2;`,
        [groupId, userId],
      );
    });
    res.status(204).send();
  }),
);

const createDaySchema = z.object({
  name: z.string().min(1),
  groupId: z.string().uuid().nullable().optional(),
  targets: z
    .object({
      kcal: z.number().nonnegative().optional(),
      protein: z.number().nonnegative().optional(),
      carbs: z.number().nonnegative().optional(),
      fat: z.number().nonnegative().optional(),
    })
    .optional(),
});

router.post(
  "/days",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const payload = createDaySchema.parse(req.body);
    const result = await withTransaction(async (client) => {
      const day = await client.query(
        `
        INSERT INTO meal_plan_days (
          user_id,
          name,
          target_kcal,
          target_protein_g,
          target_carbs_g,
          target_fat_g,
          group_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
        `,
        [
          userId,
          payload.name,
          payload.targets?.kcal ?? 0,
          payload.targets?.protein ?? 0,
          payload.targets?.carbs ?? 0,
          payload.targets?.fat ?? 0,
          payload.groupId ?? null,
        ],
      );

      const dayId = day.rows[0].id as string;
      const defaultMeals = [
        { label: "Breakfast", emoji: "🍳", sortOrder: 0 },
        { label: "Lunch", emoji: "🥗", sortOrder: 1 },
        { label: "Dinner", emoji: "🍽️", sortOrder: 2 },
        { label: "Snack", emoji: "🥤", sortOrder: 3 },
      ];

      const meals = await Promise.all(
        defaultMeals.map((meal) =>
          client.query(
            `
            INSERT INTO meal_plan_meals (day_id, label, emoji, sort_order)
            VALUES ($1, $2, $3, $4)
            RETURNING *;
            `,
            [dayId, meal.label, meal.emoji, meal.sortOrder],
          ),
        ),
      );

      return {
        day: day.rows[0],
        meals: meals.map((entry) => entry.rows[0]),
      };
    });

    res.status(201).json(result);
  }),
);

const patchDaySchema = z.object({
  name: z.string().min(1).optional(),
  groupId: z.string().uuid().nullable().optional(),
  targets: z
    .object({
      kcal: z.number().nonnegative().optional(),
      protein: z.number().nonnegative().optional(),
      carbs: z.number().nonnegative().optional(),
      fat: z.number().nonnegative().optional(),
    })
    .optional(),
});

router.patch(
  "/days/:dayId",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const dayId = req.params.dayId;
    const payload = patchDaySchema.parse(req.body);

    const result = await withTransaction(async (client) => {
      await client.query(
        `
        UPDATE meal_plan_days
        SET
          name = COALESCE($3, name),
          target_kcal = COALESCE($4, target_kcal),
          target_protein_g = COALESCE($5, target_protein_g),
          target_carbs_g = COALESCE($6, target_carbs_g),
          target_fat_g = COALESCE($7, target_fat_g),
          updated_at = now()
        WHERE id = $1 AND user_id = $2;
        `,
        [
          dayId,
          userId,
          payload.name ?? null,
          payload.targets?.kcal ?? null,
          payload.targets?.protein ?? null,
          payload.targets?.carbs ?? null,
          payload.targets?.fat ?? null,
        ],
      );
      if (Object.prototype.hasOwnProperty.call(payload, "groupId")) {
        await client.query(
          `
          UPDATE meal_plan_days
          SET group_id = $3, updated_at = now()
          WHERE id = $1 AND user_id = $2;
          `,
          [dayId, userId, payload.groupId],
        );
      }
      const updated = await client.query(
        `SELECT * FROM meal_plan_days WHERE id = $1 AND user_id = $2 LIMIT 1;`,
        [dayId, userId],
      );
      return updated.rows[0] ?? null;
    });

    res.json({ day: result });
  }),
);

const duplicateDaySchema = z.object({
  name: z.string().min(1).optional(),
});

router.post(
  "/days/:dayId/duplicate",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const dayId = req.params.dayId;
    const payload = duplicateDaySchema.parse(req.body ?? {});

    const result = await withTransaction(async (client) => {
      const sourceDay = await client.query(
        `
        SELECT *
        FROM meal_plan_days
        WHERE id = $1 AND user_id = $2
        LIMIT 1;
        `,
        [dayId, userId],
      );

      if (!sourceDay.rows[0]) {
        const error = new Error("Meal plan day not found.");
        (error as Error & { status?: number }).status = 404;
        throw error;
      }

      const source = sourceDay.rows[0];
      const nextName = payload.name ?? `${source.name} copy`;

      const day = await client.query(
        `
        INSERT INTO meal_plan_days (
          user_id,
          name,
          target_kcal,
          target_protein_g,
          target_carbs_g,
          target_fat_g,
          group_id
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *;
        `,
        [
          userId,
          nextName,
          source.target_kcal,
          source.target_protein_g,
          source.target_carbs_g,
          source.target_fat_g,
          source.group_id ?? null,
        ],
      );

      const sourceMeals = await client.query(
        `
        SELECT *
        FROM meal_plan_meals
        WHERE day_id = $1
        ORDER BY sort_order ASC, created_at ASC;
        `,
        [dayId],
      );

      const duplicatedMeals = [] as unknown[];
      const duplicatedItems = [] as unknown[];

      for (const sourceMeal of sourceMeals.rows) {
        const nextMeal = await client.query(
          `
          INSERT INTO meal_plan_meals (day_id, label, emoji, sort_order)
          VALUES ($1, $2, $3, $4)
          RETURNING *;
          `,
          [day.rows[0].id, sourceMeal.label, sourceMeal.emoji, sourceMeal.sort_order],
        );
        const duplicatedMeal = nextMeal.rows[0];
        duplicatedMeals.push(duplicatedMeal);

        const sourceItems = await client.query(
          `
          SELECT *
          FROM meal_plan_items
          WHERE meal_id = $1
          ORDER BY sort_order ASC, created_at ASC;
          `,
          [sourceMeal.id],
        );

        for (const sourceItem of sourceItems.rows) {
          const nextItem = await client.query(
            `
            INSERT INTO meal_plan_items (
              meal_id,
              food_id,
              food_name,
              quantity,
              slot,
              kcal,
              protein_g,
              carbs_g,
              fat_g,
              sort_order
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *;
            `,
            [
              duplicatedMeal.id,
              sourceItem.food_id,
              sourceItem.food_name,
              sourceItem.quantity,
              sourceItem.slot,
              sourceItem.kcal,
              sourceItem.protein_g,
              sourceItem.carbs_g,
              sourceItem.fat_g,
              sourceItem.sort_order,
            ],
          );
          duplicatedItems.push(nextItem.rows[0]);
        }
      }

      return {
        day: day.rows[0],
        meals: duplicatedMeals,
        items: duplicatedItems,
      };
    });

    res.status(201).json(result);
  }),
);

router.delete(
  "/days/:dayId",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const dayId = req.params.dayId;
    await withTransaction(async (client) => {
      await client.query(
        `
        UPDATE meal_plan_week_assignments
        SET day_id = NULL, updated_at = now()
        WHERE user_id = $1 AND day_id = $2;
        `,
        [userId, dayId],
      );
      await client.query(
        `
        DELETE FROM meal_plan_days
        WHERE id = $1 AND user_id = $2;
        `,
        [dayId, userId],
      );
    });
    res.status(204).send();
  }),
);

const createItemSchema = z.object({
  foodId: z.string().uuid().nullable().optional(),
  foodName: z.string().min(1),
  quantity: z.number().positive().optional(),
  slot: slotSchema,
  kcal: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
});

router.post(
  "/meals/:mealId/items",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const mealId = req.params.mealId;
    const payload = createItemSchema.parse(req.body);

    const result = await withTransaction(async (client) => {
      const meal = await client.query(
        `
        SELECT meal_plan_meals.id
        FROM meal_plan_meals
        JOIN meal_plan_days ON meal_plan_days.id = meal_plan_meals.day_id
        WHERE meal_plan_meals.id = $1
          AND meal_plan_days.user_id = $2
        LIMIT 1;
        `,
        [mealId, userId],
      );
      if (!meal.rows[0]) {
        const error = new Error("Meal not found.");
        (error as Error & { status?: number }).status = 404;
        throw error;
      }

      const sort = await client.query(
        `
        SELECT COALESCE(MAX(sort_order), -1) + 1 AS next_sort
        FROM meal_plan_items
        WHERE meal_id = $1;
        `,
        [mealId],
      );
      const nextSort = Number(sort.rows[0]?.next_sort ?? 0);

      const item = await client.query(
        `
        INSERT INTO meal_plan_items (
          meal_id,
          food_id,
          food_name,
          quantity,
          slot,
          kcal,
          protein_g,
          carbs_g,
          fat_g,
          sort_order
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *;
        `,
        [
          mealId,
          payload.foodId ?? null,
          payload.foodName,
          payload.quantity ?? 1,
          payload.slot,
          payload.kcal,
          payload.proteinG,
          payload.carbsG,
          payload.fatG,
          nextSort,
        ],
      );
      return item.rows[0];
    });

    res.status(201).json({ item: result });
  }),
);

const patchItemSchema = z.object({
  quantity: z.number().positive().optional(),
  slot: slotSchema.optional(),
});

router.patch(
  "/items/:itemId",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const itemId = req.params.itemId;
    const payload = patchItemSchema.parse(req.body);
    const result = await withTransaction((client) =>
      client.query(
        `
        UPDATE meal_plan_items
        SET
          quantity = COALESCE($3, quantity),
          slot = COALESCE($4, slot),
          updated_at = now()
        WHERE id = $1
          AND EXISTS (
            SELECT 1
            FROM meal_plan_meals
            JOIN meal_plan_days ON meal_plan_days.id = meal_plan_meals.day_id
            WHERE meal_plan_meals.id = meal_plan_items.meal_id
              AND meal_plan_days.user_id = $2
          )
        RETURNING *;
        `,
        [itemId, userId, payload.quantity ?? null, payload.slot ?? null],
      ),
    );
    res.json({ item: result.rows[0] ?? null });
  }),
);

router.delete(
  "/items/:itemId",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const itemId = req.params.itemId;
    await withTransaction((client) =>
      client.query(
        `
        DELETE FROM meal_plan_items
        WHERE id = $1
          AND EXISTS (
            SELECT 1
            FROM meal_plan_meals
            JOIN meal_plan_days ON meal_plan_days.id = meal_plan_meals.day_id
            WHERE meal_plan_meals.id = meal_plan_items.meal_id
              AND meal_plan_days.user_id = $2
          );
        `,
        [itemId, userId],
      ),
    );
    res.status(204).send();
  }),
);

const reorderMealsSchema = z.object({
  mealIds: z.array(z.string().uuid()).min(1),
});

router.patch(
  "/days/:dayId/meals/reorder",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const dayId = req.params.dayId;
    const payload = reorderMealsSchema.parse(req.body);

    const updated = await withTransaction(async (client) => {
      const ownedDay = await client.query(
        `
        SELECT id
        FROM meal_plan_days
        WHERE id = $1 AND user_id = $2
        LIMIT 1;
        `,
        [dayId, userId],
      );
      if (!ownedDay.rows[0]) {
        const error = new Error("Meal plan day not found.");
        (error as Error & { status?: number }).status = 404;
        throw error;
      }

      const meals = await client.query(
        `
        SELECT id
        FROM meal_plan_meals
        WHERE day_id = $1;
        `,
        [dayId],
      );
      const existingIds = meals.rows.map((row) => row.id as string);
      const existingSet = new Set(existingIds);
      const incomingSet = new Set(payload.mealIds);
      if (existingIds.length !== payload.mealIds.length) {
        const error = new Error("Reorder payload does not match day meals.");
        (error as Error & { status?: number }).status = 400;
        throw error;
      }
      for (const id of payload.mealIds) {
        if (!existingSet.has(id)) {
          const error = new Error("Reorder payload includes invalid meal ids.");
          (error as Error & { status?: number }).status = 400;
          throw error;
        }
      }
      if (incomingSet.size !== payload.mealIds.length) {
        const error = new Error("Reorder payload includes duplicate meal ids.");
        (error as Error & { status?: number }).status = 400;
        throw error;
      }

      for (let index = 0; index < payload.mealIds.length; index += 1) {
        await client.query(
          `
          UPDATE meal_plan_meals
          SET sort_order = $2, updated_at = now()
          WHERE id = $1;
          `,
          [payload.mealIds[index], index],
        );
      }

      const reordered = await client.query(
        `
        SELECT *
        FROM meal_plan_meals
        WHERE day_id = $1
        ORDER BY sort_order ASC, created_at ASC;
        `,
        [dayId],
      );
      return reordered.rows;
    });

    res.json({ meals: updated });
  }),
);

const reorderItemsSchema = z.object({
  itemIds: z.array(z.string().uuid()).min(1),
});

router.patch(
  "/meals/:mealId/items/reorder",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const mealId = req.params.mealId;
    const payload = reorderItemsSchema.parse(req.body);

    const updated = await withTransaction(async (client) => {
      const meal = await client.query(
        `
        SELECT meal_plan_meals.id
        FROM meal_plan_meals
        JOIN meal_plan_days ON meal_plan_days.id = meal_plan_meals.day_id
        WHERE meal_plan_meals.id = $1
          AND meal_plan_days.user_id = $2
        LIMIT 1;
        `,
        [mealId, userId],
      );
      if (!meal.rows[0]) {
        const error = new Error("Meal not found.");
        (error as Error & { status?: number }).status = 404;
        throw error;
      }

      const items = await client.query(
        `
        SELECT id
        FROM meal_plan_items
        WHERE meal_id = $1;
        `,
        [mealId],
      );
      const existingIds = items.rows.map((row) => row.id as string);
      const existingSet = new Set(existingIds);
      const incomingSet = new Set(payload.itemIds);
      if (existingIds.length !== payload.itemIds.length) {
        const error = new Error("Reorder payload does not match meal items.");
        (error as Error & { status?: number }).status = 400;
        throw error;
      }
      for (const id of payload.itemIds) {
        if (!existingSet.has(id)) {
          const error = new Error("Reorder payload includes invalid item ids.");
          (error as Error & { status?: number }).status = 400;
          throw error;
        }
      }
      if (incomingSet.size !== payload.itemIds.length) {
        const error = new Error("Reorder payload includes duplicate item ids.");
        (error as Error & { status?: number }).status = 400;
        throw error;
      }

      for (let index = 0; index < payload.itemIds.length; index += 1) {
        await client.query(
          `
          UPDATE meal_plan_items
          SET sort_order = $2, updated_at = now()
          WHERE id = $1;
          `,
          [payload.itemIds[index], index],
        );
      }

      const reordered = await client.query(
        `
        SELECT *
        FROM meal_plan_items
        WHERE meal_id = $1
        ORDER BY sort_order ASC, created_at ASC;
        `,
        [mealId],
      );
      return reordered.rows;
    });

    res.json({ items: updated });
  }),
);

const applyWeekSchema = z.object({
  dayId: z.string().uuid().nullable(),
  weekdays: z.array(z.number().int().min(0).max(6)).min(1),
});

router.post(
  "/week-assignments",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const payload = applyWeekSchema.parse(req.body);

    const result = await withTransaction(async (client) => {
      if (payload.dayId) {
        const day = await client.query(
          `
          SELECT id
          FROM meal_plan_days
          WHERE id = $1 AND user_id = $2
          LIMIT 1;
          `,
          [payload.dayId, userId],
        );
        if (!day.rows[0]) {
          const error = new Error("Meal plan day not found.");
          (error as Error & { status?: number }).status = 404;
          throw error;
        }
      }

      const assignments = [] as unknown[];
      for (const weekday of payload.weekdays) {
        const entry = await client.query(
          `
          INSERT INTO meal_plan_week_assignments (user_id, weekday, day_id)
          VALUES ($1, $2, $3)
          ON CONFLICT (user_id, weekday)
          DO UPDATE SET day_id = EXCLUDED.day_id, updated_at = now()
          RETURNING *;
          `,
          [userId, weekday, payload.dayId],
        );
        assignments.push(entry.rows[0]);
      }
      return assignments;
    });

    res.json({ assignments: result });
  }),
);

router.delete(
  "/week-assignments/:weekday",
  asyncHandler(async (req: Request, res: Response) => {
    const userId = getUserId(req);
    const weekday = Number(req.params.weekday);
    if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6) {
      res.status(400).json({ error: "weekday must be between 0 and 6." });
      return;
    }

    await withTransaction((client) =>
      client.query(
        `
        INSERT INTO meal_plan_week_assignments (user_id, weekday, day_id)
        VALUES ($1, $2, NULL)
        ON CONFLICT (user_id, weekday)
        DO UPDATE SET day_id = NULL, updated_at = now();
        `,
        [userId, weekday],
      ),
    );
    res.status(204).send();
  }),
);

export default router;
