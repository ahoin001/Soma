import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ActiveSession,
  Exercise,
  Routine,
  RoutineExercise,
  SessionHistory,
  SessionSet,
} from "@/types/fitness";
import { toast } from "sonner";
import {
  addFitnessRoutineExercise,
  createFitnessRoutine,
  deleteFitnessRoutine,
  ensureUser,
  fetchActiveFitnessSession,
  fetchFitnessRoutines,
  fetchFitnessSessionHistory,
  fetchActivityGoals,
  finishFitnessSession,
  logFitnessSet,
  removeFitnessRoutineExercise,
  renameFitnessRoutine,
  startFitnessSession,
  updateFitnessRoutineExercise,
} from "@/lib/api";
import { getFitnessPlannerCache, setFitnessPlannerCache } from "@/lib/fitnessCache";

export const useFitnessPlanner = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [sessionExercises, setSessionExercises] = useState<
    Array<{ id: string; exercise_id: number | null; exercise_name: string; item_order: number }>
  >([]);
  const [weightUnit, setWeightUnit] = useState<"lb" | "kg">("lb");
  const createTempId = () =>
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `session_${Math.random().toString(36).slice(2, 9)}`;

  const applyPlannerData = useCallback(
    (
      routinesRes: Awaited<ReturnType<typeof fetchFitnessRoutines>>,
      activeRes: Awaited<ReturnType<typeof fetchActiveFitnessSession>>,
      historyRes: Awaited<ReturnType<typeof fetchFitnessSessionHistory>>,
      goalsRes: Awaited<ReturnType<typeof fetchActivityGoals>>,
    ) => {
      const routineMap = new Map<string, Routine>();
      routinesRes.routines.forEach((routine) => {
        routineMap.set(routine.id, {
          id: routine.id,
          name: routine.name,
          exercises: [],
          updatedAt: new Date(routine.updated_at).getTime(),
        });
      });

      routinesRes.exercises.forEach((exercise) => {
        const routine = routineMap.get(exercise.routine_id);
        if (!routine) return;
        routine.exercises.push({
          id: exercise.id,
          exerciseId: exercise.exercise_id ?? 0,
          name: exercise.exercise_name,
          targetSets: exercise.target_sets ?? 3,
          notes: exercise.notes ?? undefined,
        });
      });

      const nextRoutines = Array.from(routineMap.values());
      setRoutines(nextRoutines);
      setActiveRoutineId((prev) => prev ?? nextRoutines[0]?.id ?? null);

      if (activeRes.session) {
        setSessionExercises(activeRes.exercises);
        const sets: SessionSet[] = activeRes.sets.map((set) => ({
          id: set.id,
          exerciseId:
            activeRes.exercises.find((ex) => ex.id === set.session_exercise_id)
              ?.exercise_id ?? 0,
          weight: Number(set.weight ?? 0),
          reps: Number(set.reps ?? 0),
          completedAt: Date.now(),
        }));
        setActiveSession({
          id: activeRes.session.id,
          routineId: activeRes.session.routine_id ?? "",
          startedAt: new Date(activeRes.session.started_at).getTime(),
          currentExerciseIndex: 0,
          sets,
        });
      } else {
        setSessionExercises([]);
        setActiveSession(null);
      }

      setHistory(
        historyRes.items.map((item) => ({
          id: item.id,
          routineId: item.routine_id ?? "",
          startedAt: new Date(item.started_at).getTime(),
          endedAt: new Date(item.ended_at).getTime(),
          totalSets: Number(item.total_sets ?? 0),
          totalVolume: Number(item.total_volume ?? 0),
        })),
      );

      setWeightUnit(goalsRes.goals?.weight_unit === "kg" ? "kg" : "lb");
    },
    [],
  );

  const refresh = useCallback(
    async (force = false) => {
      if (!force) {
        const cached = getFitnessPlannerCache();
        if (cached) {
          applyPlannerData(
            cached.routinesRes,
            cached.activeRes,
            cached.historyRes,
            cached.goalsRes,
          );
          return;
        }
      }
      await ensureUser();
      const [routinesRes, activeRes, historyRes, goalsRes] = await Promise.all([
        fetchFitnessRoutines(),
        fetchActiveFitnessSession(),
        fetchFitnessSessionHistory(),
        fetchActivityGoals(),
      ]);

      applyPlannerData(routinesRes, activeRes, historyRes, goalsRes);
      setFitnessPlannerCache({ routinesRes, activeRes, historyRes, goalsRes });
    },
    [applyPlannerData],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createRoutine = useCallback(
    async (name: string) => {
      const trimmed = name.trim();
      const optimisticId = `routine_${Math.random().toString(36).slice(2, 8)}`;
      const previousActive = activeRoutineId;
      const optimistic: Routine = {
        id: optimisticId,
        name: trimmed,
        exercises: [],
        updatedAt: Date.now(),
      };
      setRoutines((prev) => [optimistic, ...prev]);
      setActiveRoutineId(optimisticId);
      try {
        const result = await createFitnessRoutine(name.trim());
        setRoutines((prev) =>
          prev.map((item) =>
            item.id === optimisticId
              ? {
                  id: result.routine.id,
                  name: result.routine.name,
                  exercises: [],
                  updatedAt: Date.now(),
                }
              : item,
          ),
        );
        setActiveRoutineId(result.routine.id);
        void refresh(true);
        return {
          id: result.routine.id,
          name: result.routine.name,
          exercises: [],
          updatedAt: Date.now(),
        };
      } catch (error) {
        setRoutines((prev) => prev.filter((item) => item.id !== optimisticId));
        setActiveRoutineId(previousActive ?? null);
        toast("Unable to create routine", {
          action: {
            label: "Retry",
            onClick: () => void createRoutine(name),
          },
        });
        void refresh(true);
        throw error;
      }
    },
    [activeRoutineId, refresh],
  );

  const renameRoutine = useCallback(
    async (routineId: string, name: string) => {
      const trimmed = name.trim();
      let previousName = "";
      setRoutines((prev) =>
        prev.map((routine) => {
          if (routine.id !== routineId) return routine;
          previousName = routine.name;
          return { ...routine, name: trimmed, updatedAt: Date.now() };
        }),
      );
      try {
        await renameFitnessRoutine(routineId, trimmed);
        void refresh(true);
      } catch (error) {
        if (previousName) {
          setRoutines((prev) =>
            prev.map((routine) =>
              routine.id === routineId
                ? { ...routine, name: previousName, updatedAt: Date.now() }
                : routine,
            ),
          );
        }
        toast("Unable to rename routine", {
          action: {
            label: "Retry",
            onClick: () => void renameRoutine(routineId, name),
          },
        });
        void refresh(true);
        throw error;
      }
    },
    [refresh],
  );

  const removeRoutine = useCallback(
    async (routineId: string) => {
      let removed: Routine | null = null;
      const wasActive = activeRoutineId === routineId;
      setRoutines((prev) => prev.filter((routine) => routine.id !== routineId));
      setActiveRoutineId((prev) => (prev === routineId ? null : prev));
      setRoutines((prev) => {
        const existing = prev.find((routine) => routine.id === routineId) ?? null;
        if (existing) removed = existing;
        return prev.filter((routine) => routine.id !== routineId);
      });
      try {
        await deleteFitnessRoutine(routineId);
        void refresh(true);
      } catch (error) {
        if (removed) {
          setRoutines((prev) => [removed as Routine, ...prev]);
        }
        if (wasActive && removed) {
          setActiveRoutineId(removed.id);
        }
        toast("Unable to delete routine", {
          action: {
            label: "Retry",
            onClick: () => void removeRoutine(routineId),
          },
        });
        void refresh(true);
        throw error;
      }
    },
    [activeRoutineId, refresh],
  );

  const addExerciseToRoutine = useCallback(
    async (routineId: string, exercise: Exercise) => {
      const optimistic: RoutineExercise = {
        id: `routine_ex_${Math.random().toString(36).slice(2, 8)}`,
        exerciseId: exercise.id,
        name: exercise.name,
        targetSets: 3,
      };
      setRoutines((prev) =>
        prev.map((routine) =>
          routine.id === routineId
            ? {
                ...routine,
                exercises: [...routine.exercises, optimistic],
                updatedAt: Date.now(),
              }
            : routine,
        ),
      );
      try {
        await addFitnessRoutineExercise(routineId, {
          exerciseId: exercise.id,
          name: exercise.name,
        });
        void refresh(true);
      } catch (error) {
        setRoutines((prev) =>
          prev.map((routine) =>
            routine.id === routineId
              ? {
                  ...routine,
                  exercises: routine.exercises.filter(
                    (entry) => entry.id !== optimistic.id,
                  ),
                  updatedAt: Date.now(),
                }
              : routine,
          ),
        );
        toast("Unable to add exercise", {
          action: {
            label: "Retry",
            onClick: () => void addExerciseToRoutine(routineId, exercise),
          },
        });
        void refresh(true);
        throw error;
      }
    },
    [refresh],
  );

  const removeExerciseFromRoutine = useCallback(
    async (routineId: string, routineExerciseId: string) => {
      let removed: RoutineExercise | null = null;
      setRoutines((prev) =>
        prev.map((routine) =>
          routine.id === routineId
            ? {
                ...routine,
                exercises: routine.exercises.filter((exercise) => {
                  if (exercise.id === routineExerciseId) {
                    removed = exercise;
                    return false;
                  }
                  return true;
                }),
                updatedAt: Date.now(),
              }
            : routine,
        ),
      );
      try {
        await removeFitnessRoutineExercise(routineId, routineExerciseId);
        void refresh(true);
      } catch (error) {
        if (removed) {
          setRoutines((prev) =>
            prev.map((routine) =>
              routine.id === routineId
                ? {
                    ...routine,
                    exercises: [...routine.exercises, removed as RoutineExercise],
                    updatedAt: Date.now(),
                  }
                : routine,
            ),
          );
        }
        toast("Unable to remove exercise", {
          action: {
            label: "Retry",
            onClick: () => void removeExerciseFromRoutine(routineId, routineExerciseId),
          },
        });
        void refresh(true);
        throw error;
      }
    },
    [refresh],
  );

  const updateRoutineExercise = useCallback(
    async (routineId: string, routineExerciseId: string, patch: Partial<RoutineExercise>) => {
      let previous: RoutineExercise | null = null;
      setRoutines((prev) =>
        prev.map((routine) =>
          routine.id === routineId
            ? {
                ...routine,
                exercises: routine.exercises.map((exercise) =>
                  exercise.id === routineExerciseId
                    ? (() => {
                        previous = exercise;
                        return { ...exercise, ...patch };
                      })()
                    : exercise,
                ),
                updatedAt: Date.now(),
              }
            : routine,
        ),
      );
      try {
        await updateFitnessRoutineExercise(routineId, routineExerciseId, {
          targetSets: patch.targetSets,
          notes: patch.notes,
        });
        void refresh(true);
      } catch (error) {
        if (previous) {
          setRoutines((prev) =>
            prev.map((routine) =>
              routine.id === routineId
                ? {
                    ...routine,
                    exercises: routine.exercises.map((exercise) =>
                      exercise.id === routineExerciseId ? previous : exercise,
                    ),
                    updatedAt: Date.now(),
                  }
                : routine,
            ),
          );
        }
        toast("Unable to update exercise", {
          action: {
            label: "Retry",
            onClick: () => void updateRoutineExercise(routineId, routineExerciseId, patch),
          },
        });
        void refresh(true);
        throw error;
      }
    },
    [refresh],
  );

  const startSession = useCallback(
    async (routineId: string) => {
      const previousSession = activeSession;
      const previousExercises = sessionExercises;
      const routine = routines.find((item) => item.id === routineId);
      const tempId = createTempId();
      if (routine) {
        setSessionExercises(
          routine.exercises.map((exercise, index) => ({
            id: `session_ex_${tempId}_${index}`,
            exercise_id: exercise.exerciseId ?? null,
            exercise_name: exercise.name,
            item_order: index,
          })),
        );
      }
      setActiveSession({
        id: tempId,
        routineId,
        startedAt: Date.now(),
        currentExerciseIndex: 0,
        sets: [],
      });
      try {
        const response = await startFitnessSession({ routineId });
        void refresh(true);
        return response.session;
      } catch (error) {
        setActiveSession(previousSession);
        setSessionExercises(previousExercises);
        toast("Unable to start session", {
          action: {
            label: "Retry",
            onClick: () => void startSession(routineId),
          },
        });
        void refresh();
        throw error;
      }
    },
    [activeSession, refresh, routines, sessionExercises],
  );

  const startSessionFromTemplate = useCallback(
    async (name: string, exercises: string[]) => {
      const previousSession = activeSession;
      const previousExercises = sessionExercises;
      const tempId = createTempId();
      setSessionExercises(
        exercises.map((exercise, index) => ({
          id: `session_ex_${tempId}_${index}`,
          exercise_id: null,
          exercise_name: exercise,
          item_order: index,
        })),
      );
      setActiveSession({
        id: tempId,
        routineId: tempId,
        startedAt: Date.now(),
        currentExerciseIndex: 0,
        sets: [],
      });
      try {
        await startFitnessSession({ exercises });
        await refresh(true);
        return;
      } catch (error) {
        setActiveSession(previousSession);
        setSessionExercises(previousExercises);
        toast("Unable to start session", {
          action: {
            label: "Retry",
            onClick: () => void startSessionFromTemplate(name, exercises),
          },
        });
        void refresh(true);
        throw error;
      }
    },
    [activeSession, refresh, sessionExercises],
  );

  const logSet = useCallback(
    async (exerciseId: number, weight: number, reps: number) => {
      if (!activeSession) return;
      const sessionExercise = sessionExercises.find(
        (exercise) => exercise.exercise_id === exerciseId,
      );
      if (!sessionExercise) return;
      const localId =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `set_${Math.random().toString(36).slice(2, 9)}`;
      setActiveSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          sets: [
            ...prev.sets,
            {
              id: localId,
              exerciseId,
              weight,
              reps,
              completedAt: Date.now(),
            },
          ],
        };
      });
      try {
        await logFitnessSet({
          sessionId: activeSession.id,
          sessionExerciseId: sessionExercise.id,
          weightDisplay: weight,
          unitUsed: weightUnit,
          reps,
        });
        void refresh(true);
      } catch (error) {
        setActiveSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            sets: prev.sets.filter((entry) => entry.id !== localId),
          };
        });
        toast("Unable to log set", {
          action: {
            label: "Retry",
            onClick: () => void logSet(exerciseId, weight, reps),
          },
        });
        void refresh(true);
        throw error;
      }
    },
    [activeSession, refresh, sessionExercises, weightUnit],
  );

  const advanceExercise = useCallback(() => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      return { ...prev, currentExerciseIndex: prev.currentExerciseIndex + 1 };
    });
  }, []);

  const finishSession = useCallback(async () => {
    if (!activeSession) return;
    const previousSession = activeSession;
    setActiveSession(null);
    try {
      await finishFitnessSession(activeSession.id);
      void refresh(true);
    } catch (error) {
      setActiveSession(previousSession);
      toast("Unable to finish session", {
        action: {
          label: "Retry",
          onClick: () => void finishSession(),
        },
      });
      void refresh(true);
      throw error;
    }
  }, [activeSession, refresh]);

  type TemplateSetPayload = Array<{
    sessionExerciseId: string;
    sets: Array<{
      weight: number;
      reps: number;
      rpe?: number;
      restSeconds?: number;
    }>;
  }>;

  const persistTemplateSessionSets = useCallback(
    async (payload: TemplateSetPayload) => {
      if (!activeSession) return;
      for (const entry of payload) {
        for (const set of entry.sets) {
          await logFitnessSet({
            sessionId: activeSession.id,
            sessionExerciseId: entry.sessionExerciseId,
            weightDisplay: set.weight,
            unitUsed: weightUnit,
            reps: set.reps,
            rpe: set.rpe,
            restSeconds: set.restSeconds,
          });
        }
      }
      void refresh(true);
    },
    [activeSession, weightUnit, refresh],
  );

  const activeRoutine = useMemo(() => {
    const routine = routines.find((item) => item.id === activeRoutineId) ?? null;
    if (routine) return routine;
    if (activeSession && sessionExercises.length) {
      return {
        id: activeSession.routineId || activeSession.id,
        name: "Workout",
        exercises: sessionExercises.map((exercise) => ({
          id: exercise.id,
          exerciseId: exercise.exercise_id ?? 0,
          name: exercise.exercise_name,
          targetSets: 3,
        })),
        updatedAt: Date.now(),
      };
    }
    return null;
  }, [activeRoutineId, activeSession, routines, sessionExercises]);

  return useMemo(
    () => ({
      routines,
      activeRoutineId,
      activeRoutine,
      activeSession,
      sessionExercises,
      history,
      createRoutine,
      renameRoutine,
      removeRoutine,
      addExerciseToRoutine,
      removeExerciseFromRoutine,
      updateRoutineExercise,
      setActiveRoutineId,
      startSession,
      startSessionFromTemplate,
      logSet,
      advanceExercise,
      finishSession,
      persistTemplateSessionSets,
      weightUnit,
    }),
    [
      routines,
      activeRoutineId,
      activeRoutine,
      activeSession,
      sessionExercises,
      history,
      createRoutine,
      renameRoutine,
      removeRoutine,
      addExerciseToRoutine,
      removeExerciseFromRoutine,
      updateRoutineExercise,
      setActiveRoutineId,
      startSession,
      startSessionFromTemplate,
      logSet,
      advanceExercise,
      finishSession,
      persistTemplateSessionSets,
      weightUnit,
    ],
  );
};
