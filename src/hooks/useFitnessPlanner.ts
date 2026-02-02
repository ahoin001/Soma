import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  ActiveSession,
  Exercise,
  Routine,
  RoutineExercise,
  SessionHistory,
  SessionSet,
} from "@/types/fitness";

type FitnessCache = {
  routines: Routine[];
  activeRoutineId: string | null;
  activeSession: ActiveSession | null;
  history: SessionHistory[];
};

const CACHE_KEY = "ironflow-fitness-v1";

const emptyCache: FitnessCache = {
  routines: [],
  activeRoutineId: null,
  activeSession: null,
  history: [],
};

const isBrowser = typeof window !== "undefined";

const loadCache = (): FitnessCache => {
  if (!isBrowser) return emptyCache;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return emptyCache;
    const parsed = JSON.parse(raw) as FitnessCache;
    return {
      routines: parsed.routines ?? [],
      activeRoutineId: parsed.activeRoutineId ?? null,
      activeSession: parsed.activeSession ?? null,
      history: parsed.history ?? [],
    };
  } catch {
    return emptyCache;
  }
};

const persistCache = (cache: FitnessCache) => {
  if (!isBrowser) return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
};

const createId = () => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id_${Math.random().toString(36).slice(2, 10)}${Date.now()}`;
};

const hashExerciseId = (name: string) => {
  let hash = 0;
  for (let index = 0; index < name.length; index += 1) {
    hash = (hash * 31 + name.charCodeAt(index)) | 0;
  }
  return Math.abs(hash) + 1000;
};

const buildRoutineExercise = (exercise: Exercise): RoutineExercise => ({
  id: createId(),
  exerciseId: exercise.id,
  name: exercise.name,
  targetSets: 3,
});

export const useFitnessPlanner = () => {
  const initialCache = useMemo(() => loadCache(), []);
  const [routines, setRoutines] = useState<Routine[]>(() => initialCache.routines);
  const [activeRoutineId, setActiveRoutineId] = useState<string | null>(
    () => initialCache.activeRoutineId,
  );
  const [activeSession, setActiveSession] = useState<ActiveSession | null>(
    () => initialCache.activeSession,
  );
  const [history, setHistory] = useState<SessionHistory[]>(
    () => initialCache.history,
  );

  useEffect(() => {
    persistCache({ routines, activeRoutineId, activeSession, history });
  }, [routines, activeRoutineId, activeSession, history]);

  const createRoutine = useCallback((name: string) => {
    const routine: Routine = {
      id: createId(),
      name: name.trim(),
      exercises: [],
      updatedAt: Date.now(),
    };
    setRoutines((prev) => [routine, ...prev]);
    setActiveRoutineId(routine.id);
    return routine;
  }, []);

  const renameRoutine = useCallback((routineId: string, name: string) => {
    setRoutines((prev) =>
      prev.map((routine) =>
        routine.id === routineId
          ? { ...routine, name: name.trim(), updatedAt: Date.now() }
          : routine,
      ),
    );
  }, []);

  const removeRoutine = useCallback((routineId: string) => {
    setRoutines((prev) => prev.filter((routine) => routine.id !== routineId));
    setHistory((prev) => prev.filter((entry) => entry.routineId !== routineId));
    setActiveRoutineId((prev) => (prev === routineId ? null : prev));
    setActiveSession((prev) => (prev?.routineId === routineId ? null : prev));
  }, []);

  const addExerciseToRoutine = useCallback(
    (routineId: string, exercise: Exercise) => {
      setRoutines((prev) =>
        prev.map((routine) => {
          if (routine.id !== routineId) return routine;
          const exists = routine.exercises.some(
            (item) => item.exerciseId === exercise.id,
          );
          if (exists) return routine;
          return {
            ...routine,
            exercises: [...routine.exercises, buildRoutineExercise(exercise)],
            updatedAt: Date.now(),
          };
        }),
      );
    },
    [],
  );

  const removeExerciseFromRoutine = useCallback(
    (routineId: string, routineExerciseId: string) => {
      setRoutines((prev) =>
        prev.map((routine) =>
          routine.id === routineId
            ? {
                ...routine,
                exercises: routine.exercises.filter(
                  (item) => item.id !== routineExerciseId,
                ),
                updatedAt: Date.now(),
              }
            : routine,
        ),
      );
    },
    [],
  );

  const updateRoutineExercise = useCallback(
    (routineId: string, routineExerciseId: string, patch: Partial<RoutineExercise>) => {
      setRoutines((prev) =>
        prev.map((routine) =>
          routine.id === routineId
            ? {
                ...routine,
                exercises: routine.exercises.map((item) =>
                  item.id === routineExerciseId ? { ...item, ...patch } : item,
                ),
                updatedAt: Date.now(),
              }
            : routine,
        ),
      );
    },
    [],
  );

  const startSession = useCallback((routineId: string) => {
    const routine = routines.find((item) => item.id === routineId);
    if (!routine) return null;
    const session: ActiveSession = {
      id: createId(),
      routineId,
      startedAt: Date.now(),
      currentExerciseIndex: 0,
      sets: [],
    };
    setActiveSession(session);
    return session;
  }, [routines]);

  const startSessionFromTemplate = useCallback(
    (name: string, exercises: string[]) => {
      const routineId = createId();
      const routineExercises: RoutineExercise[] = exercises.map((exercise) => ({
        id: createId(),
        exerciseId: hashExerciseId(exercise),
        name: exercise,
        targetSets: 3,
      }));
      const routine: Routine = {
        id: routineId,
        name: name.trim(),
        exercises: routineExercises,
        updatedAt: Date.now(),
      };
      setRoutines((prev) => [routine, ...prev]);
      setActiveRoutineId(routineId);
      const session: ActiveSession = {
        id: createId(),
        routineId,
        startedAt: Date.now(),
        currentExerciseIndex: 0,
        sets: [],
      };
      setActiveSession(session);
      return session;
    },
    [],
  );

  const logSet = useCallback((exerciseId: number, weight: number, reps: number) => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      const nextSet: SessionSet = {
        id: createId(),
        exerciseId,
        weight,
        reps,
        completedAt: Date.now(),
      };
      return { ...prev, sets: [...prev.sets, nextSet] };
    });
  }, []);

  const advanceExercise = useCallback(() => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      return { ...prev, currentExerciseIndex: prev.currentExerciseIndex + 1 };
    });
  }, []);

  const finishSession = useCallback(() => {
    setActiveSession((prev) => {
      if (!prev) return prev;
      const totalVolume = prev.sets.reduce(
        (sum, item) => sum + item.weight * item.reps,
        0,
      );
      const historyEntry: SessionHistory = {
        id: prev.id,
        routineId: prev.routineId,
        startedAt: prev.startedAt,
        endedAt: Date.now(),
        totalSets: prev.sets.length,
        totalVolume,
      };
      setHistory((existing) => [historyEntry, ...existing]);
      return null;
    });
  }, []);

  const activeRoutine = useMemo(
    () => routines.find((routine) => routine.id === activeRoutineId) ?? null,
    [routines, activeRoutineId],
  );

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
      startSession,
      startSessionFromTemplate,
      logSet,
      advanceExercise,
      finishSession,
    ],
  );
};
