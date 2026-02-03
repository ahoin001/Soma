import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkoutPlan, WorkoutTemplate } from "@/types/fitness";
import {
  completeWorkoutTemplate,
  createWorkoutPlan as createWorkoutPlanApi,
  createWorkoutTemplate as createWorkoutTemplateApi,
  deleteWorkoutTemplate as deleteWorkoutTemplateApi,
  deleteWorkoutPlan as deleteWorkoutPlanApi,
  ensureUser,
  fetchWorkoutPlans,
  updateWorkoutPlan as updateWorkoutPlanApi,
  updateWorkoutTemplate as updateWorkoutTemplateApi,
  updateWorkoutTemplateExercises,
} from "@/lib/api";

export const useWorkoutPlans = () => {
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [lastWorkoutByPlan, setLastWorkoutByPlan] = useState<
    Record<string, string | null>
  >({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (loaded) return;
    await ensureUser();
    const data = await fetchWorkoutPlans();
    const templatesByPlan = new Map<string, WorkoutTemplate[]>();
    for (const template of data.templates) {
      const list = templatesByPlan.get(template.plan_id) ?? [];
      list.push({
        id: template.id,
        name: template.name,
        exercises: [],
        lastPerformed: template.last_performed_at ?? undefined,
      });
      templatesByPlan.set(template.plan_id, list);
    }
    const exercisesByTemplate = new Map<string, { id: string; name: string; item_order: number }[]>();
    for (const exercise of data.exercises) {
      const list = exercisesByTemplate.get(exercise.template_id) ?? [];
      list.push(exercise);
      exercisesByTemplate.set(exercise.template_id, list);
    }

    const plans = data.plans.map((plan) => {
      const workouts = (templatesByPlan.get(plan.id) ?? []).map((template) => ({
        ...template,
        exercises: (exercisesByTemplate.get(template.id) ?? []).map((exercise) => ({
          id: exercise.id,
          name: exercise.exercise_name,
        })),
      }));
      return { id: plan.id, name: plan.name, workouts };
    });

    setWorkoutPlans(plans);
    setActivePlanId((prev) => prev ?? plans[0]?.id ?? null);
    setLoaded(true);
  }, [loaded]);

  useEffect(() => {
    if (!loaded) {
      void load();
    }
  }, [load, loaded]);

  const updateWorkoutPlan = useCallback(
    (planId: string, patch: Partial<WorkoutPlan>) => {
      if (patch.name) {
        void updateWorkoutPlanApi(planId, { name: patch.name });
      }
      setWorkoutPlans((prev) =>
        prev.map((plan) => (plan.id === planId ? { ...plan, ...patch } : plan)),
      );
    },
    [],
  );

  const deleteWorkoutPlan = useCallback((planId: string) => {
    void deleteWorkoutPlanApi(planId);
    setWorkoutPlans((prev) => {
      const remaining = prev.filter((plan) => plan.id !== planId);
      setActivePlanId((active) => {
        if (active !== planId) return active;
        return remaining[0]?.id ?? null;
      });
      return remaining;
    });
    setLastWorkoutByPlan((prev) => {
      const next = { ...prev };
      delete next[planId];
      return next;
    });
  }, []);

  const createWorkoutPlan = useCallback(async (name: string) => {
    await ensureUser();
    const response = await createWorkoutPlanApi({ name });
    const plan = { id: response.plan.id, name: response.plan.name, workouts: [] };
    setWorkoutPlans((prev) => [...prev, plan]);
    setActivePlanId((prev) => prev ?? plan.id);
    return plan;
  }, []);

  const createWorkoutTemplate = useCallback(
    async (planId: string, name: string) => {
      const response = await createWorkoutTemplateApi({ planId, name });
      const workout = {
        id: response.template.id,
        name: response.template.name,
        exercises: [],
        lastPerformed: undefined,
      };
      setWorkoutPlans((prev) =>
        prev.map((plan) =>
          plan.id === planId
            ? { ...plan, workouts: [...plan.workouts, workout] }
            : plan,
        ),
      );
      return workout;
    },
    [],
  );

  const updateWorkoutTemplate = useCallback(
    (
      planId: string,
      workoutId: string,
      patch: Partial<WorkoutTemplate>,
    ) => {
      if (patch.name) {
        void updateWorkoutTemplateApi(workoutId, { name: patch.name });
      }
      if (patch.exercises) {
        void updateWorkoutTemplateExercises(
          workoutId,
          patch.exercises.map((exercise, index) => ({
            name: exercise.name,
            itemOrder: index,
          })),
        );
      }
      setWorkoutPlans((prev) =>
        prev.map((plan) =>
          plan.id === planId
            ? {
                ...plan,
                workouts: plan.workouts.map((workout) =>
                  workout.id === workoutId ? { ...workout, ...patch } : workout,
                ),
              }
            : plan,
        ),
      );
    },
    [],
  );

  const deleteWorkoutTemplate = useCallback(
    (planId: string, workoutId: string) => {
      void deleteWorkoutTemplateApi(workoutId);
      setWorkoutPlans((prev) =>
        prev.map((plan) =>
          plan.id === planId
            ? {
                ...plan,
                workouts: plan.workouts.filter((workout) => workout.id !== workoutId),
              }
            : plan,
        ),
      );
    },
    [],
  );

  const recordWorkoutCompleted = useCallback(
    (planId: string, workoutId: string) => {
      void completeWorkoutTemplate(workoutId);
      setLastWorkoutByPlan((prev) => ({
        ...prev,
        [planId]: workoutId,
      }));
    },
    [],
  );

  return useMemo(
    () => ({
      workoutPlans,
      activePlanId,
      setActivePlanId,
      lastWorkoutByPlan,
      updateWorkoutPlan,
      updateWorkoutTemplate,
      recordWorkoutCompleted,
      deleteWorkoutPlan,
      deleteWorkoutTemplate,
      createWorkoutPlan,
      createWorkoutTemplate,
    }),
    [
      workoutPlans,
      activePlanId,
      lastWorkoutByPlan,
      updateWorkoutPlan,
      updateWorkoutTemplate,
      recordWorkoutCompleted,
      deleteWorkoutPlan,
      deleteWorkoutTemplate,
      createWorkoutPlan,
      createWorkoutTemplate,
    ],
  );
};
