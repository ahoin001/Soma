/**
 * UIContext - Transient UI state
 *
 * This context holds ephemeral UI state that doesn't persist:
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

// ============================================================================
// Types
// ============================================================================

type MealPulse = {
  mealId?: string;
  at: number;
} | null;

type UIContextValue = {
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

  // Experience transition tuning - circular reveal only
  experienceTransitionConfig: {
    durationMs: number;
    curve: number;
    originY: number;
    radiusPct: number;
  };
  setExperienceTransitionConfig: (config: {
    durationMs?: number;
    curve?: number;
    originY?: number;
    radiusPct?: number;
  }) => void;
};

// ============================================================================
// Storage Keys
// ============================================================================

const EXPERIENCE_TRANSITION_CONFIG_KEY = "aurafit-experience-transition-config-v1";

// ============================================================================
// Context
// ============================================================================

const UIContext = createContext<UIContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export const UIProvider = ({ children }: { children: ReactNode }) => {
  // Meal Pulse - ephemeral, no persistence
  const [mealPulse, setMealPulseState] = useState<MealPulse>(null);

  // Selected Date - ephemeral, defaults to today
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  // Experience transition tuning - persisted
  const [experienceTransitionConfig, setExperienceTransitionConfigState] = useState(() => {
    const defaults = {
      durationMs: 900,
      curve: 1.1,
      originY: 0.22,
      radiusPct: 160,
    };
    if (typeof window === "undefined") return defaults;
    const stored = window.localStorage.getItem(EXPERIENCE_TRANSITION_CONFIG_KEY);
    if (!stored) return defaults;
    try {
      const parsed = JSON.parse(stored) as Partial<typeof defaults>;
      return { ...defaults, ...parsed };
    } catch {
      return defaults;
    }
  });

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

  const setExperienceTransitionConfig = useCallback(
    (config: {
      durationMs?: number;
      curve?: number;
      originY?: number;
      radiusPct?: number;
    }) => {
      setExperienceTransitionConfigState((prev) => {
        const next = { ...prev, ...config };
        if (typeof window !== "undefined") {
          window.localStorage.setItem(
            EXPERIENCE_TRANSITION_CONFIG_KEY,
            JSON.stringify(next),
          );
        }
        return next;
      });
    },
    [],
  );

  // --- Memoized Value ---

  const value = useMemo(
    () => ({
      mealPulse,
      setMealPulse,
      clearMealPulse,
      selectedDate,
      setSelectedDate,
      goToToday,
      goToPrevDay,
      goToNextDay,
      experienceTransitionConfig,
      setExperienceTransitionConfig,
    }),
    [
      mealPulse,
      setMealPulse,
      clearMealPulse,
      selectedDate,
      goToToday,
      goToPrevDay,
      goToNextDay,
      experienceTransitionConfig,
      setExperienceTransitionConfig,
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
 * Experience transition tuning (circular reveal only)
 */
export const useExperienceTransitionConfig = () => {
  const { experienceTransitionConfig, setExperienceTransitionConfig } = useUI();
  return { experienceTransitionConfig, setExperienceTransitionConfig };
};
