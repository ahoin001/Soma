/**
 * UserContext - User profile and persistent settings
 *
 * This context holds user-specific data that persists across sessions:
 * - User profile (name, goals, body metrics)
 * - User preferences (showFoodImages)
 *
 * Changes rarely, so updates won't cause unnecessary re-renders
 * in components that only need UI state.
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
import {
  ensureUser,
  fetchLatestWeightLog,
  fetchNutritionSummary,
  fetchUserProfile,
} from "@/lib/api";

// ============================================================================
// Types
// ============================================================================

export type UserProfile = {
  displayName: string;
  goal: "balance" | "cut" | "bulk";
  sex?: "male" | "female" | "other";
  age?: number;
  heightCm?: number;
  weightKg?: number;
  activity?: "sedentary" | "light" | "moderate" | "active" | "athlete";
};

export type UserSettings = {
  showFoodImages: boolean;
};

type UserContextValue = {
  // Profile
  userProfile: UserProfile;
  setUserProfile: (next: UserProfile | ((prev: UserProfile) => UserProfile)) => void;
  updateUserProfile: (patch: Partial<UserProfile>) => void;

  // Settings
  showFoodImages: boolean;
  setShowFoodImages: (next: boolean) => void;

  // Hydration state
  isHydrated: boolean;
};

// ============================================================================
// Storage Keys
// ============================================================================

const USER_PROFILE_KEY = "aurafit-user-profile-v1";
const FOOD_IMAGES_KEY = "aurafit-show-food-images";

// ============================================================================
// Default Values
// ============================================================================

const defaultProfile: UserProfile = {
  displayName: "You",
  goal: "balance",
};

// ============================================================================
// Context
// ============================================================================

const UserContext = createContext<UserContextValue | null>(null);

// ============================================================================
// Provider
// ============================================================================

export const UserProvider = ({ children }: { children: ReactNode }) => {
  const [isHydrated, setIsHydrated] = useState(false);

  // User Profile - persisted to localStorage
  const [userProfile, setUserProfile] = useState<UserProfile>(() => {
    if (typeof window === "undefined") return defaultProfile;

    const stored = window.localStorage.getItem(USER_PROFILE_KEY);
    if (!stored) return defaultProfile;

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
      return defaultProfile;
    }
  });

  // User Settings - persisted to localStorage
  const [showFoodImages, setShowFoodImages] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(FOOD_IMAGES_KEY);
    return stored ? stored === "true" : true;
  });

  // Convenience method to patch profile
  const updateUserProfile = useCallback((patch: Partial<UserProfile>) => {
    setUserProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  // Persist profile changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(userProfile));
  }, [userProfile]);

  // Persist settings changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(FOOD_IMAGES_KEY, String(showFoodImages));
  }, [showFoodImages]);

  // Hydrate from server on mount
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
        const [profileRes, weightRes, nutritionSummary] = await Promise.all([
          fetchUserProfile(),
          fetchLatestWeightLog(),
          fetchNutritionSummary(today),
        ]);

        if (!active) return;

        const profile = profileRes.profile;
        const weightEntry = weightRes.entry;
        const settings = nutritionSummary.settings ?? null;

        if (!profile && !weightEntry && !settings) {
          setIsHydrated(true);
          return;
        }

        setUserProfile((prev) => ({
          ...prev,
          displayName: profile?.display_name ?? prev.displayName ?? "You",
          sex: (profile?.sex as UserProfile["sex"] | null) ?? prev.sex ?? undefined,
          age: profile?.dob ? computeAge(profile.dob) ?? prev.age : prev.age,
          heightCm: Number.isFinite(profile?.height_cm ?? undefined)
            ? Number(profile?.height_cm)
            : prev.heightCm,
          weightKg:
            weightEntry && Number.isFinite(weightEntry.weight)
              ? normalizeWeight(weightEntry.weight, weightEntry.unit) ?? prev.weightKg
              : prev.weightKg,
        }));

        setIsHydrated(true);
      } catch {
        // Ignore hydration failures, use local data
        setIsHydrated(true);
      }
    };

    void hydrateProfile();
    return () => {
      active = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      userProfile,
      setUserProfile,
      updateUserProfile,
      showFoodImages,
      setShowFoodImages,
      isHydrated,
    }),
    [userProfile, updateUserProfile, showFoodImages, isHydrated]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

// ============================================================================
// Hook
// ============================================================================

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within UserProvider");
  }
  return context;
};

/**
 * Convenience hook for just the profile
 */
export const useUserProfile = () => {
  const { userProfile, setUserProfile, updateUserProfile } = useUser();
  return { userProfile, setUserProfile, updateUserProfile };
};

/**
 * Convenience hook for just the settings
 */
export const useUserSettings = () => {
  const { showFoodImages, setShowFoodImages } = useUser();
  return { showFoodImages, setShowFoodImages };
};
