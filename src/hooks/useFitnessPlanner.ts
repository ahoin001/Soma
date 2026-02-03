import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ActiveSession,
  Exercise,
  Routine,
  RoutineExercise,
  SessionHistory,
  SessionSet,
} from "@/types/fitness";
import {
  addFitnessRoutineExercise,
  createFitnessRoutine,
  deleteFitnessRoutine,
  ensureUser,
  fetchActiveFitnessSession,
  fetchFitnessRoutines,
  fetchFitnessSessionHistory,
  finishFitnessSession,
  logFitnessSet,
  removeFitnessRoutineExercise,
  renameFitnessRoutine,
  startFitnessSession,
  updateFitnessRoutineExercise,
} from "@/lib/api";

export const useFitnessPlanner = () => {
  const [routines, setRoutines] = useState<Routine[]>([]);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(null);
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(null);
  const [history, setHistory] = useState<SessionHistory[]>([]);
  const [sessionExercises, setSessionExercises] = useState<
    Array<{ id: string; exercise_id: number | null; exercise_name: string; item_order: number }>
  >([]);

  const refresh = useCallback(async () => {
    await ensureUser();
    const [routinesRes, activeRes, historyRes] = await Promise.all([
      fetchFitnessRoutines(),
      fetchActiveFitnessSession(),
      fetchFitnessSessionHistory(),
    ]);

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
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const createRoutine = useCallback(
    async (name: string) => {
      const result = await createFitnessRoutine(name.trim());
      await refresh();
      setActiveRoutineId(result.routine.id);
      return {
        id: result.routine.id,
        name,
        exercises: [],
        updatedAt: Date.now(),
      };
    },
    [refresh],
  );

  const renameRoutine = useCallback(
    async (routineId: string, name: string) => {
      await renameFitnessRoutine(routineId, name.trim());
      await refresh();
    },
    [refresh],
  );

  const removeRoutine = useCallback(
    async (routineId: string) => {
      await deleteFitnessRoutine(routineId);
      await refresh();
    },
    [refresh],
  );

  const addExerciseToRoutine = useCallback(
    async (routineId: string, exercise: Exercise) => {
      await addFitnessRoutineExercise(routineId, {
        exerciseId: exercise.id,
        name: exercise.name,
      });
      await refresh();
    },
    [refresh],
  );

  const removeExerciseFromRoutine = useCallback(
    async (routineId: string, routineExerciseId: string) => {
      await removeFitnessRoutineExercise(routineId, routineExerciseId);
      await refresh();
    },
    [refresh],
  );

  const updateRoutineExercise = useCallback(
    async (routineId: string, routineExerciseId: string, patch: Partial<RoutineExercise>) => {
      await updateFitnessRoutineExercise(routineId, routineExerciseId, {
        targetSets: patch.targetSets,
        notes: patch.notes,
      });
      await refresh();
    },
    [refresh],
  );

  const startSession = useCallback(
    async (routineId: string) => {
      const response = await startFitnessSession({ routineId });
      await refresh();
      return response.session;
    },
    [refresh],
  );

  const startSessionFromTemplate = useCallback(
    async (name: string, exercises: string[]) => {
      const response = await startFitnessSession({ exercises });
      await refresh();
      return response.session;
    },
    [refresh],
  );

  const logSet = useCallback(
    async (exerciseId: number, weight: number, reps: number) => {
      if (!activeSession) return;
      const sessionExercise = sessionExercises.find(
        (exercise) => exercise.exercise_id === exerciseId,
      );
      if (!sessionExercise) return;
      await logFitnessSet({
        sessionId: activeSession.id,
        sessionExerciseId: sessionExercise.id,
        weight,
        reps,
      });
      await refresh();
    },
    [activeSession, refresh, sessionExercises],
  );

  const advanceExercise = useCallback(() => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      return { ...prev, currentExerciseIndex: prev.currentExerciseIndex + 1 };
    });
  }, []);

  const finishSession = useCallback(async () => {
    if (!activeSession) return;
    await finishFitnessSession(activeSession.id);
    await refresh();
    setActiveSession(null);
  }, [activeSession, refresh]);

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
    }),
    [
      routines,
      activeRoutineId,
      activeRoutine,
      activeSession,
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
    ],
  );
};
