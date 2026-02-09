import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { defaultMacroTargets, defaultSummary } from "@/data/defaults";
import {
  ensureUser,
  fetchLatestWeightLog,
  fetchMealEntries,
  fetchNutritionSummary,
  fetchUserProfile,
} from "@/lib/api";
import { useDailyIntake } from "@/hooks/useDailyIntake";
import { useFoodCatalog } from "@/hooks/useFoodCatalog";
import { useExerciseLibrary } from "@/hooks/useExerciseLibrary";
import { useFitnessPlanner } from "@/hooks/useFitnessPlanner";
import { useMealTypes } from "@/hooks/useMealTypes";
import { useWorkoutPlans } from "@/hooks/useWorkoutPlans";
import {
  DEBUG_KEY,
  FOOD_IMAGES_KEY,
  USER_PROFILE_KEY,
  WORKOUT_DRAFTS_KEY_V2,
} from "@/lib/storageKeys";
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
  workoutPlansLoaded: boolean;
  refreshWorkoutPlans: () => Promise<void>;
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
  workoutDrafts: Record<string, WorkoutDraft>;
  setWorkoutDraft: (
    workoutId: string,
    exercises: WorkoutTemplate["exercises"],
    baseSignature: string,
  ) => void;
  clearWorkoutDraft: (workoutId: string) => void;
  mealPulse: { mealId?: string; at: number } | null;
  setMealPulse: (mealId?: string) => void;
  clearMealPulse: () => void;
};

const AppStoreContext = createContext<AppStore | null>(null);

type WorkoutDraft = {
  exercises: WorkoutTemplate["exercises"];
  baseSignature: string;
  updatedAt: number;
};

export const AppStoreProvider = ({ children }: { children: ReactNode }) => {
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    if (typeof window === "undefined") {
      return { displayName: "You", goal: "balance" };
    }
    const stored = window.localStorage.getItem(USER_PROFILE_KEY);
    if (!stored) {
      return { displayName: "You", goal: "balance" };
    }
    try {
      const parsed = JSON.parse(stored) as UserProfile;
      return {
        displayName: parsed.displayName ?? "You",
        goal: parsed.goal ?? "balance",
        sex: parsed.sex,
        age: parsed.age,
        heightCm: parsed.heightCm,
        weightKg: parsed.weightKg,
        activity: parsed.activity,
      };
    } catch {
      return { displayName: "You", goal: "balance" };
    }
  });
  const [showFoodImages, setShowFoodImages] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(FOOD_IMAGES_KEY);
    return stored ? stored === "true" : true;
  });
  const mealTypes = useMealTypes();
  const nutrition = useDailyIntake(defaultSummary, defaultMacroTargets, mealTypes.meals);
  const {
    hydrateEntries: hydrateNutritionEntries,
    hydrateSummary: hydrateNutritionSummary,
    hydrateTargets: hydrateNutritionTargets,
  } = nutrition;
  const foodCatalog = useFoodCatalog();
  const fitnessLibrary = useExerciseLibrary();
  const fitnessPlanner = useFitnessPlanner();
  const [workoutDrafts, setWorkoutDrafts] = useState<Record<string, WorkoutDraft>>(() => {
    if (typeof window === "undefined") return {};
    const storedV2 = window.localStorage.getItem(WORKOUT_DRAFTS_KEY_V2);
    if (storedV2) {
      try {
        return JSON.parse(storedV2) as Record<string, WorkoutDraft>;
      } catch {
        return {};
      }
    }
    return {};
  });
  const {
    workoutPlans,
    workoutPlansLoaded,
    refreshWorkoutPlans,
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
  const [mealPulse, setMealPulseState] = useState<{ mealId?: string; at: number } | null>(
    null,
  );

  const setWorkoutDraft = (
    workoutId: string,
    exercises: WorkoutTemplate["exercises"],
    baseSignature: string,
  ) => {
    setWorkoutDrafts((prev) => ({
      ...prev,
      [workoutId]: { exercises, baseSignature, updatedAt: Date.now() },
    }));
  };

  const clearWorkoutDraft = (workoutId: string) => {
    setWorkoutDrafts((prev) => {
      const next = { ...prev };
      delete next[workoutId];
      return next;
    });
  };

  const setMealPulse = (mealId?: string) => {
    setMealPulseState({ mealId, at: Date.now() });
  };

  const clearMealPulse = () => {
    setMealPulseState(null);
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
      workoutPlansLoaded,
      refreshWorkoutPlans,
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
      mealPulse,
      setMealPulse,
      clearMealPulse,
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
      workoutPlansLoaded,
      refreshWorkoutPlans,
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
      mealPulse,
      setMealPulse,
      clearMealPulse,
    ],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FOOD_IMAGES_KEY, String(showFoodImages));
  }, [showFoodImages]);

  useEffect(() => {
    let active = true;
    const computeAge = (dob: string) => {
      const birth = new Date(dob);
      if (Number.isNaN(birth.getTime())) return undefined;
      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDelta = today.getMonth() - birth.getMonth();
      if (monthDelta < 0 || (monthDelta === 0 && today.getDate() < birth.getDate())) {
        age -= 1;
      }
      return age >= 0 ? age : undefined;
    };
    const normalizeWeight = (weight: number, unit: string) => {
      if (!Number.isFinite(weight)) return undefined;
      if (unit.toLowerCase() === "lb") {
        return Math.round(weight * 0.453592 * 10) / 10;
      }
      return Math.round(weight * 10) / 10;
    };
    const toLocalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const hydrateProfile = async () => {
      try {
        await ensureUser();
        const today = toLocalDate(new Date());
        const [profileRes, weightRes, nutritionSummary, mealEntries] = await Promise.all([
          fetchUserProfile(),
          fetchLatestWeightLog(),
          fetchNutritionSummary(today),
          fetchMealEntries(today),
        ]);
        if (!active) return;
        const profile = profileRes.profile;
        const weightEntry = weightRes.entry;
        const settings = nutritionSummary.settings ?? null;
        if (!profile && !weightEntry && !settings && !nutritionSummary.totals) {
          if (mealEntries.entries.length) {
            hydrateNutritionEntries(mealEntries.entries, mealEntries.items);
          }
          return;
        }
        setUserProfile((prev) => ({
          ...prev,
          displayName: profile?.display_name ?? prev.displayName ?? "You",
          sex:
            (profile?.sex as UserProfile["sex"] | null) ??
            prev.sex ??
            undefined,
          age: profile?.dob ? computeAge(profile.dob) ?? prev.age : prev.age,
          heightCm:
            Number.isFinite(profile?.height_cm ?? undefined)
              ? Number(profile?.height_cm)
              : prev.heightCm,
          weightKg:
            weightEntry && Number.isFinite(weightEntry.weight)
              ? normalizeWeight(weightEntry.weight, weightEntry.unit) ?? prev.weightKg
              : prev.weightKg,
        }));

        if (settings) {
          hydrateNutritionTargets(settings);
        } else if (import.meta.env.DEV) {
          const enabled =
            typeof window !== "undefined" &&
            window.localStorage.getItem(DEBUG_KEY) === "true";
          if (enabled) {
            console.info("[AuraFit] missing nutrition settings on hydrate");
          }
        }

        hydrateNutritionSummary({
          totals: nutritionSummary.totals,
          targets: nutritionSummary.targets ?? null,
          settings: nutritionSummary.settings ?? null,
        });

        if (import.meta.env.DEV) {
          const enabled =
            typeof window !== "undefined" &&
            window.localStorage.getItem(DEBUG_KEY) === "true";
          if (enabled) {
            const kcal = Number(nutritionSummary.settings?.kcal_goal ?? Number.NaN);
            const invalidKcal = !Number.isFinite(kcal) || kcal <= 0;
            if (invalidKcal) {
              console.info("[AuraFit] nutrition settings kcal_goal invalid", {
                kcal_goal: nutritionSummary.settings?.kcal_goal ?? null,
              });
            }
          }
        }

        if (mealEntries.entries.length) {
          hydrateNutritionEntries(mealEntries.entries, mealEntries.items);
        }
      } catch {
        // ignore hydration failures
      }
    };
    void hydrateProfile();
    return () => {
      active = false;
    };
  }, [
    hydrateNutritionEntries,
    hydrateNutritionSummary,
    hydrateNutritionTargets,
    setUserProfile,
  ]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
  }, [userProfile]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      WORKOUT_DRAFTS_KEY_V2,
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

export const useWorkoutDrafts = () => {
  const { workoutDrafts, setWorkoutDraft, clearWorkoutDraft } = useAppStore();
  return { workoutDrafts, setWorkoutDraft, clearWorkoutDraft };
};
