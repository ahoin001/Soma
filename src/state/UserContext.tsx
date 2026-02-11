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
import {
  DEFAULT_HOME_KEY,
  FOOD_IMAGES_KEY,
  THEME_PALETTE_KEY,
  USER_PROFILE_KEY,
} from "@/lib/storageKeys";

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
  defaultHome: "nutrition" | "fitness";
  themePalette: "emerald" | "ocean";
};

type UserContextValue = {
  // Profile
  userProfile: UserProfile;
  setUserProfile: (next: UserProfile | ((prev: UserProfile) => UserProfile)) => void;
  updateUserProfile: (patch: Partial<UserProfile>) => void;

  // Settings
  showFoodImages: boolean;
  setShowFoodImages: (next: boolean) => void;
  defaultHome: "nutrition" | "fitness";
  setDefaultHome: (next: "nutrition" | "fitness") => void;
  themePalette: "emerald" | "ocean";
  setThemePalette: (next: "emerald" | "ocean") => void;

  // Hydration state
  isHydrated: boolean;
};

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

  const [defaultHome, setDefaultHome] = useState<"nutrition" | "fitness">(() => {
    if (typeof window === "undefined") return "nutrition";
    const stored = window.localStorage.getItem(DEFAULT_HOME_KEY);
    return stored === "fitness" ? "fitness" : "nutrition";
  });

  const [themePalette, setThemePalette] = useState<"emerald" | "ocean">(() => {
    if (typeof window === "undefined") return "emerald";
    const stored = window.localStorage.getItem(THEME_PALETTE_KEY);
    return stored === "ocean" ? "ocean" : "emerald";
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DEFAULT_HOME_KEY, defaultHome);
  }, [defaultHome]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(THEME_PALETTE_KEY, themePalette);
  }, [themePalette]);

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
      defaultHome,
      setDefaultHome,
      themePalette,
      setThemePalette,
      isHydrated,
    }),
    [
      userProfile,
      updateUserProfile,
      showFoodImages,
      defaultHome,
      themePalette,
      isHydrated,
    ]
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
  const {
    showFoodImages,
    setShowFoodImages,
    defaultHome,
    setDefaultHome,
    themePalette,
    setThemePalette,
  } = useUser();
  return {
    showFoodImages,
    setShowFoodImages,
    defaultHome,
    setDefaultHome,
    themePalette,
    setThemePalette,
  };
};
