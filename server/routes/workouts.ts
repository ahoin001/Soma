import { Router } from "express";
import { z } from "zod";
import { withTransaction } from "../db";
import { asyncHandler, getUserId } from "../utils";

const router = Router();

const createPlanSchema = z.object({
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

router.post(
  "/plans",
  asyncHandler(async (req, res) => {
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

const createTemplateSchema = z.object({
  planId: z.string().uuid(),
  name: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

router.post(
  "/templates",
  asyncHandler(async (req, res) => {
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
  asyncHandler(async (req, res) => {
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
        values.push(
          `($${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++}, $${index++})`,
        );
        params.push(
          templateId,
          exercise.exerciseId ?? null,
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

export default router;
