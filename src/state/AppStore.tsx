import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { dailySummary, macroTargets } from "@/data/mock";
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
};

type AppStore = {
  userProfile: UserProfile;
  setUserProfile: (next: UserProfile) => void;
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
};

const AppStoreContext = createContext<AppStore | null>(null);

export const AppStoreProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<UserProfile>({
    displayName: "You",
    goal: "balance",
  });
  const mealTypes = useMealTypes();
  const nutrition = useDailyIntake(dailySummary, macroTargets, mealTypes.meals);
  const foodCatalog = useFoodCatalog();
  const fitnessLibrary = useExerciseLibrary();
  const fitnessPlanner = useFitnessPlanner();
  const {
    workoutPlans,
    activePlanId,
    setActivePlanId,
    lastWorkoutByPlan,
    updateWorkoutPlan,
    updateWorkoutTemplate,
    recordWorkoutCompleted,
    deleteWorkoutPlan,
  } = useWorkoutPlans();

  const value = useMemo(
    () => ({
      userProfile,
      setUserProfile,
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
    }),
    [
      userProfile,
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
    ],
  );

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
