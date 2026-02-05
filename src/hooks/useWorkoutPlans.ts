import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { toast } from "sonner";

const createTempId = (prefix: string) => {
  if (typeof globalThis.crypto !== "undefined" && "randomUUID" in globalThis.crypto) {
    return `${prefix}_${globalThis.crypto.randomUUID()}`;
  }
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
};

export const useWorkoutPlans = () => {
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>([]);
  const [activePlanId, setActivePlanId] = useState<string | null>(null);
  const [lastWorkoutByPlan, setLastWorkoutByPlan] = useState<
    Record<string, string | null>
  >({});
  const [loaded, setLoaded] = useState(false);
  const plansRef = useRef<WorkoutPlan[]>([]);
  const activePlanRef = useRef<string | null>(null);
  const lastWorkoutRef = useRef<Record<string, string | null>>({});

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

  useEffect(() => {
    plansRef.current = workoutPlans;
  }, [workoutPlans]);

  useEffect(() => {
    activePlanRef.current = activePlanId;
  }, [activePlanId]);

  useEffect(() => {
    lastWorkoutRef.current = lastWorkoutByPlan;
  }, [lastWorkoutByPlan]);

  const rollback = (
    previousPlans: WorkoutPlan[],
    previousActive: string | null,
    previousLast: Record<string, string | null>,
  ) => {
    setWorkoutPlans(previousPlans);
    setActivePlanId(previousActive);
    setLastWorkoutByPlan(previousLast);
  };

  const updateWorkoutPlan = useCallback(async (planId: string, patch: Partial<WorkoutPlan>) => {
    const previousPlans = plansRef.current;
    const previousActive = activePlanRef.current;
    const previousLast = lastWorkoutRef.current;
    setWorkoutPlans((prev) =>
      prev.map((plan) => (plan.id === planId ? { ...plan, ...patch } : plan)),
    );
    try {
      if (patch.name) {
        await updateWorkoutPlanApi(planId, { name: patch.name });
      }
    } catch (error) {
      rollback(previousPlans, previousActive, previousLast);
      toast("Unable to update plan", {
        action: {
          label: "Retry",
          onClick: () => void updateWorkoutPlan(planId, patch),
        },
      });
      throw error;
    }
  }, []);

  const deleteWorkoutPlan = useCallback(async (planId: string) => {
    const previousPlans = plansRef.current;
    const previousActive = activePlanRef.current;
    const previousLast = lastWorkoutRef.current;
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
    try {
      await deleteWorkoutPlanApi(planId);
    } catch (error) {
      rollback(previousPlans, previousActive, previousLast);
      toast("Unable to delete plan", {
        action: {
          label: "Retry",
          onClick: () => void deleteWorkoutPlan(planId),
        },
      });
      throw error;
    }
  }, []);

  const createWorkoutPlan = useCallback(async (name: string) => {
    const trimmed = name.trim() || "New plan";
    const optimisticId = createTempId("plan");
    const previousActive = activePlanRef.current;
    const optimistic: WorkoutPlan = {
      id: optimisticId,
      name: trimmed,
      workouts: [],
    };
    setWorkoutPlans((prev) => [...prev, optimistic]);
    setActivePlanId((prev) => prev ?? optimisticId);
    try {
      await ensureUser();
      const response = await createWorkoutPlanApi({ name: trimmed });
      const plan = { id: response.plan.id, name: response.plan.name, workouts: [] };
      setWorkoutPlans((prev) =>
        prev.map((item) => (item.id === optimisticId ? plan : item)),
      );
      setActivePlanId((prev) => (prev === optimisticId ? plan.id : prev));
      return plan;
    } catch (error) {
      setWorkoutPlans((prev) => prev.filter((plan) => plan.id !== optimisticId));
      setActivePlanId(previousActive ?? null);
      toast("Unable to create plan", {
        action: {
          label: "Retry",
          onClick: () => void createWorkoutPlan(name),
        },
      });
      throw error;
    }
  }, []);

  const createWorkoutTemplate = useCallback(async (planId: string, name: string) => {
    const trimmed = name.trim() || "New workout";
    const optimisticId = createTempId("workout");
    const optimistic: WorkoutTemplate = {
      id: optimisticId,
      name: trimmed,
      exercises: [],
      lastPerformed: undefined,
    };
    setWorkoutPlans((prev) =>
      prev.map((plan) =>
        plan.id === planId
          ? { ...plan, workouts: [...plan.workouts, optimistic] }
          : plan,
      ),
    );
    try {
      const response = await createWorkoutTemplateApi({ planId, name: trimmed });
      const workout = {
        id: response.template.id,
        name: response.template.name,
        exercises: [],
        lastPerformed: undefined,
      };
      setWorkoutPlans((prev) =>
        prev.map((plan) =>
          plan.id === planId
            ? {
                ...plan,
                workouts: plan.workouts.map((item) =>
                  item.id === optimisticId ? workout : item,
                ),
              }
            : plan,
        ),
      );
      return workout;
    } catch (error) {
      setWorkoutPlans((prev) =>
        prev.map((plan) =>
          plan.id === planId
            ? {
                ...plan,
                workouts: plan.workouts.filter((item) => item.id !== optimisticId),
              }
            : plan,
        ),
      );
      toast("Unable to create workout", {
        action: {
          label: "Retry",
          onClick: () => void createWorkoutTemplate(planId, name),
        },
      });
      throw error;
    }
  }, []);

  const updateWorkoutTemplate = useCallback(async (
    planId: string,
    workoutId: string,
    patch: Partial<WorkoutTemplate>,
  ) => {
    const previousPlans = plansRef.current;
    const previousActive = activePlanRef.current;
    const previousLast = lastWorkoutRef.current;
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
    try {
      const tasks: Promise<unknown>[] = [];
      if (patch.name) {
        tasks.push(updateWorkoutTemplateApi(workoutId, { name: patch.name }));
      }
      if (patch.exercises) {
        tasks.push(
          updateWorkoutTemplateExercises(
            workoutId,
            patch.exercises.map((exercise, index) => ({
              name: exercise.name,
              itemOrder: index,
            })),
          ),
        );
      }
      if (tasks.length) {
        await Promise.all(tasks);
      }
    } catch (error) {
      rollback(previousPlans, previousActive, previousLast);
      toast("Unable to update workout", {
        action: {
          label: "Retry",
          onClick: () => void updateWorkoutTemplate(planId, workoutId, patch),
        },
      });
      throw error;
    }
  }, []);

  const deleteWorkoutTemplate = useCallback(async (planId: string, workoutId: string) => {
    const previousPlans = plansRef.current;
    const previousActive = activePlanRef.current;
    const previousLast = lastWorkoutRef.current;
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
    try {
      await deleteWorkoutTemplateApi(workoutId);
    } catch (error) {
      rollback(previousPlans, previousActive, previousLast);
      toast("Unable to delete workout", {
        action: {
          label: "Retry",
          onClick: () => void deleteWorkoutTemplate(planId, workoutId),
        },
      });
      throw error;
    }
  }, []);

  const recordWorkoutCompleted = useCallback(async (planId: string, workoutId: string) => {
    const previousLast = lastWorkoutRef.current;
    setLastWorkoutByPlan((prev) => ({
      ...prev,
      [planId]: workoutId,
    }));
    try {
      await completeWorkoutTemplate(workoutId);
    } catch (error) {
      setLastWorkoutByPlan(previousLast);
      toast("Unable to complete workout", {
        action: {
          label: "Retry",
          onClick: () => void recordWorkoutCompleted(planId, workoutId),
        },
      });
      throw error;
    }
  }, []);

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
