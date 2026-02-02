import { useCallback, useEffect, useMemo, useState } from "react";
import type { WorkoutPlan, WorkoutTemplate } from "@/types/fitness";
import { workoutPlans as seedPlans } from "@/data/fitnessMock";

const CACHE_KEY = "ironflow-workout-plans-v1";

type PlansCache = {
  plans: WorkoutPlan[];
  activePlanId: string | null;
  lastWorkoutByPlan: Record<string, string | null>;
};

const loadCache = (): PlansCache => {
  if (typeof window === "undefined") {
    return {
      plans: seedPlans,
      activePlanId: seedPlans[0]?.id ?? null,
      lastWorkoutByPlan: {},
    };
  }
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) {
      return {
        plans: seedPlans,
        activePlanId: seedPlans[0]?.id ?? null,
        lastWorkoutByPlan: {},
      };
    }
    const parsed = JSON.parse(raw) as PlansCache;
    const plans = parsed.plans?.length ? parsed.plans : seedPlans;
    return {
      plans,
      activePlanId: parsed.activePlanId ?? plans[0]?.id ?? null,
      lastWorkoutByPlan: parsed.lastWorkoutByPlan ?? {},
    };
  } catch {
    return {
      plans: seedPlans,
      activePlanId: seedPlans[0]?.id ?? null,
      lastWorkoutByPlan: {},
    };
  }
};

const persistCache = (cache: PlansCache) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
};

export const useWorkoutPlans = () => {
  const [workoutPlans, setWorkoutPlans] = useState<WorkoutPlan[]>(() =>
    loadCache().plans,
  );
  const [activePlanId, setActivePlanId] = useState<string | null>(() =>
    loadCache().activePlanId,
  );
  const [lastWorkoutByPlan, setLastWorkoutByPlan] = useState<
    Record<string, string | null>
  >(() => loadCache().lastWorkoutByPlan);

  useEffect(() => {
    persistCache({ plans: workoutPlans, activePlanId, lastWorkoutByPlan });
  }, [workoutPlans, activePlanId, lastWorkoutByPlan]);

  const updateWorkoutPlan = useCallback(
    (planId: string, patch: Partial<WorkoutPlan>) => {
      setWorkoutPlans((prev) =>
        prev.map((plan) => (plan.id === planId ? { ...plan, ...patch } : plan)),
      );
    },
    [],
  );

  const deleteWorkoutPlan = useCallback((planId: string) => {
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

  const updateWorkoutTemplate = useCallback(
    (
      planId: string,
      workoutId: string,
      patch: Partial<WorkoutTemplate>,
    ) => {
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

  const recordWorkoutCompleted = useCallback(
    (planId: string, workoutId: string) => {
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
    }),
    [
      workoutPlans,
      activePlanId,
      lastWorkoutByPlan,
      updateWorkoutPlan,
      updateWorkoutTemplate,
      recordWorkoutCompleted,
      deleteWorkoutPlan,
    ],
  );
};
