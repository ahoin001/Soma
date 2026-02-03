import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { defaultMacroTargets, defaultSummary } from "@/data/defaults";
import { useDailyIntake } from "@/hooks/useDailyIntake";
import { useFoodCatalog } from "@/hooks/useFoodCatalog";
import { useExerciseLibrary } from "@/hooks/useExerciseLibrary";
import { useFitnessPlanner } from "@/hooks/useFitnessPlanner";
import { useMealTypes } from "@/hooks/useMealTypes";
import { useWorkoutPlans } from "@/hooks/useWorkoutPlans";
import type { WorkoutPlan, WorkoutTemplate } from "@/types/fitness";

type UserProfile = {
  displayName: string;
  goal: "balance" | "cut" | "bulk";
  sex?: "male" | "female" | "other";
  age?: number;
  heightCm?: number;
  weightKg?: number;
  activity?: "sedentary" | "light" | "moderate" | "active" | "athlete";
};

type AppStore = {
  userProfile: UserProfile;
  setUserProfile: (next: UserProfile) => void;
  showFoodImages: boolean;
  setShowFoodImages: (next: boolean) => void;
  nutrition: ReturnType<typeof useDailyIntake>;
  mealTypes: ReturnType<typeof useMealTypes>;
  foodCatalog: ReturnType<typeof useFoodCatalog>;
  fitnessLibrary: ReturnType<typeof useExerciseLibrary>;
  fitnessPlanner: ReturnType<typeof useFitnessPlanner>;
  workoutPlans: WorkoutPlan[];
  activePlanId: string | null;
  setActivePlanId: (planId: string | null) => void;
  lastWorkoutByPlan: Record<string, string | null>;
  updateWorkoutPlan: (planId: string, patch: Partial<WorkoutPlan>) => void;
  updateWorkoutTemplate: (
    planId: string,
    workoutId: string,
    patch: Partial<WorkoutTemplate>,
  ) => void;
  recordWorkoutCompleted: (planId: string, workoutId: string) => void;
  deleteWorkoutPlan: (planId: string) => void;
  deleteWorkoutTemplate: (planId: string, workoutId: string) => void;
  createWorkoutPlan: (name: string) => Promise<WorkoutPlan>;
  createWorkoutTemplate: (planId: string, name: string) => Promise<WorkoutTemplate>;
  workoutDrafts: Record<string, WorkoutTemplate["exercises"]>;
  setWorkoutDraft: (workoutId: string, exercises: WorkoutTemplate["exercises"]) => void;
  clearWorkoutDraft: (workoutId: string) => void;
};

const AppStoreContext = createContext<AppStore | null>(null);

export const AppStoreProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<UserProfile>({
    displayName: "You",
    goal: "balance",
  });
  const [showFoodImages, setShowFoodImages] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem("aurafit-show-food-images");
    return stored ? stored === "true" : true;
  });
  const mealTypes = useMealTypes();
  const nutrition = useDailyIntake(defaultSummary, defaultMacroTargets, mealTypes.meals);
  const foodCatalog = useFoodCatalog();
  const fitnessLibrary = useExerciseLibrary();
  const fitnessPlanner = useFitnessPlanner();
  const [workoutDrafts, setWorkoutDrafts] = useState<
    Record<string, WorkoutTemplate["exercises"]>
  >(() => {
    if (typeof window === "undefined") return {};
    const stored = window.localStorage.getItem("ironflow-workout-drafts-v1");
    if (!stored) return {};
    try {
      return JSON.parse(stored) as Record<string, WorkoutTemplate["exercises"]>;
    } catch {
      return {};
    }
  });
  const {
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
  } = useWorkoutPlans();

  const setWorkoutDraft = (workoutId: string, exercises: WorkoutTemplate["exercises"]) => {
    setWorkoutDrafts((prev) => ({ ...prev, [workoutId]: exercises }));
  };

  const clearWorkoutDraft = (workoutId: string) => {
    setWorkoutDrafts((prev) => {
      const next = { ...prev };
      delete next[workoutId];
      return next;
    });
  };

  const value = useMemo(
    () => ({
      userProfile,
      setUserProfile,
      showFoodImages,
      setShowFoodImages,
      nutrition,
      mealTypes,
      foodCatalog,
      fitnessLibrary,
      fitnessPlanner,
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
      workoutDrafts,
      setWorkoutDraft,
      clearWorkoutDraft,
    }),
    [
      userProfile,
      showFoodImages,
      nutrition,
      mealTypes,
      foodCatalog,
      fitnessLibrary,
      fitnessPlanner,
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
      workoutDrafts,
    ],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "aurafit-show-food-images",
      String(showFoodImages),
    );
  }, [showFoodImages]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "ironflow-workout-drafts-v1",
      JSON.stringify(workoutDrafts),
    );
  }, [workoutDrafts]);

  return (
    <AppStoreContext.Provider value={value}>
      {children}
    </AppStoreContext.Provider>
  );
};

export const useAppStore = () => {
  const context = useContext(AppStoreContext);
  if (!context) {
    throw new Error("useAppStore must be used within AppStoreProvider.");
  }
  return context;
};
