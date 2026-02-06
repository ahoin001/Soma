/**
 * UIContext - Transient UI state
 *
 * This context holds ephemeral UI state that doesn't persist:
 * - Workout drafts (temporary exercise lists before saving)
 * - Meal pulse animations (highlight effects)
 * - Modal/drawer states (if needed)
 *
 * Changes frequently but is isolated from data fetching,
 * so re-renders are contained to UI-dependent components.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { WorkoutTemplate } from "@/types/fitness";

// ============================================================================
// Types
// ============================================================================

type MealPulse = {
  mealId?: string;
  at: number;
} | null;

type UIContextValue = {
  // Workout Drafts - temporary exercise list before saving
  workoutDrafts: Record<string, WorkoutTemplate["exercises"]>;
  setWorkoutDraft: (workoutId: string, exercises: WorkoutTemplate["exercises"]) => void;
  clearWorkoutDraft: (workoutId: string) => void;
  getWorkoutDraft: (workoutId: string) => WorkoutTemplate["exercises"] | undefined;

  // Meal Pulse - highlight animation trigger
  mealPulse: MealPulse;
  setMealPulse: (mealId?: string) => void;
  clearMealPulse: () => void;

  // Selected Date - for nutrition/tracking views
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  goToToday: () => void;
  goToPrevDay: () => void;
  goToNextDay: () => void;

  // Experience transition style - shared across nutrition/fitness
  experienceTransition: "blur-scale" | "color-wash" | "circular-reveal";
  setExperienceTransition: (
    value: "blur-scale" | "color-wash" | "circular-reveal"
  ) => void;
};

// ============================================================================
// Storage Keys
// ============================================================================

const WORKOUT_DRAFTS_KEY = "ironflow-workout-drafts-v1";
const EXPERIENCE_TRANSITION_KEY = "aurafit-experience-transition-v1";

// ============================================================================
// Context
// ============================================================================

const UIContext = createContext<UIContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export const UIProvider = ({ children }: { children: ReactNode }) => {
  // Workout Drafts - persisted to localStorage to survive page refresh
  const [workoutDrafts, setWorkoutDrafts] = useState<
    Record<string, WorkoutTemplate["exercises"]>
  >(() => {
    if (typeof window === "undefined") return {};
    const stored = window.localStorage.getItem(WORKOUT_DRAFTS_KEY);
    if (!stored) return {};
    try {
      return JSON.parse(stored) as Record<string, WorkoutTemplate["exercises"]>;
    } catch {
      return {};
    }
  });

  // Meal Pulse - ephemeral, no persistence
  const [mealPulse, setMealPulseState] = useState<MealPulse>(null);

  // Selected Date - ephemeral, defaults to today
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // Experience transition style - persisted
  const [experienceTransition, setExperienceTransition] = useState<
    "blur-scale" | "color-wash" | "circular-reveal"
  >(() => {
    if (typeof window === "undefined") return "blur-scale";
    const stored = window.localStorage.getItem(EXPERIENCE_TRANSITION_KEY);
    if (stored === "color-wash" || stored === "circular-reveal") {
      return stored;
    }
    return "blur-scale";
  });

  // --- Workout Draft Actions ---

  const setWorkoutDraft = useCallback(
    (workoutId: string, exercises: WorkoutTemplate["exercises"]) => {
      setWorkoutDrafts((prev) => ({ ...prev, [workoutId]: exercises }));
    },
    []
  );

  const clearWorkoutDraft = useCallback((workoutId: string) => {
    setWorkoutDrafts((prev) => {
      const next = { ...prev };
      delete next[workoutId];
      return next;
    });
  }, []);

  const getWorkoutDraft = useCallback(
    (workoutId: string) => workoutDrafts[workoutId],
    [workoutDrafts]
  );

  // --- Meal Pulse Actions ---

  const setMealPulse = useCallback((mealId?: string) => {
    setMealPulseState({ mealId, at: Date.now() });
  }, []);

  const clearMealPulse = useCallback(() => {
    setMealPulseState(null);
  }, []);

  // --- Date Navigation Actions ---

  const goToToday = useCallback(() => {
    setSelectedDate(new Date());
  }, []);

  const goToPrevDay = useCallback(() => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() - 1);
      return next;
    });
  }, []);

  const goToNextDay = useCallback(() => {
    setSelectedDate((prev) => {
      const next = new Date(prev);
      next.setDate(next.getDate() + 1);
      return next;
    });
  }, []);

  // --- Persistence ---

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(WORKOUT_DRAFTS_KEY, JSON.stringify(workoutDrafts));
  }, [workoutDrafts]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(EXPERIENCE_TRANSITION_KEY, experienceTransition);
  }, [experienceTransition]);

  // --- Memoized Value ---

  const value = useMemo(
    () => ({
      workoutDrafts,
      setWorkoutDraft,
      clearWorkoutDraft,
      getWorkoutDraft,
      mealPulse,
      setMealPulse,
      clearMealPulse,
      selectedDate,
      setSelectedDate,
      goToToday,
      goToPrevDay,
      goToNextDay,
      experienceTransition,
      setExperienceTransition,
    }),
    [
      workoutDrafts,
      setWorkoutDraft,
      clearWorkoutDraft,
      getWorkoutDraft,
      mealPulse,
      setMealPulse,
      clearMealPulse,
      selectedDate,
      goToToday,
      goToPrevDay,
      goToNextDay,
      experienceTransition,
      setExperienceTransition,
    ]
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

// ============================================================================
// Hooks
// ============================================================================

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within UIProvider");
  }
  return context;
};

/**
 * Convenience hook for workout drafts only
 */
export const useWorkoutDrafts = () => {
  const { workoutDrafts, setWorkoutDraft, clearWorkoutDraft, getWorkoutDraft } = useUI();
  return { workoutDrafts, setWorkoutDraft, clearWorkoutDraft, getWorkoutDraft };
};

/**
 * Convenience hook for meal pulse only
 */
export const useMealPulse = () => {
  const { mealPulse, setMealPulse, clearMealPulse } = useUI();
  return { mealPulse, setMealPulse, clearMealPulse };
};

/**
 * Convenience hook for date navigation
 */
export const useSelectedDate = () => {
  const { selectedDate, setSelectedDate, goToToday, goToPrevDay, goToNextDay } = useUI();
  return { selectedDate, setSelectedDate, goToToday, goToPrevDay, goToNextDay };
};

/**
 * Experience transition preference
 */
export const useExperienceTransition = () => {
  const { experienceTransition, setExperienceTransition } = useUI();
  return { experienceTransition, setExperienceTransition };
};
