import type {
  BrandRecord,
  FoodRecord,
  FoodServingRecord,
  MealEntryItemRecord,
  MealEntryRecord,
  MealPlanDayRecord,
  MealPlanGroupRecord,
  MealPlanItemRecord,
  MealPlanMealRecord,
  MealPlanWeekAssignmentRecord,
  MealTypeRecord,
} from "@/types/api";
import { SESSION_TOKEN_KEY, USER_ID_KEY } from "@/lib/storageKeys";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

export const getSessionToken = () =>
  typeof window !== "undefined" ? window.localStorage.getItem(SESSION_TOKEN_KEY) : null;

export const setSessionToken = (token: string | null) => {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(SESSION_TOKEN_KEY, token);
  else window.localStorage.removeItem(SESSION_TOKEN_KEY);
};

/** Use for any API path so VITE_API_BASE_URL (e.g. Render) is applied. */
export const buildApiUrl = (path: string) => {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (!API_BASE) return path;
  return `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
};

/** Read stored user id only; does not create one. For auth restore. */
export const getStoredUserId = () =>
  typeof window !== "undefined" ? window.localStorage.getItem(USER_ID_KEY) : null;

export const getUserId = () => {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(USER_ID_KEY);
  if (existing) return existing;
  const next =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `user_${Math.random().toString(36).slice(2, 10)}${Date.now()}`;
  window.localStorage.setItem(USER_ID_KEY, next);
  return next;
};

export const setUserId = (userId: string) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(USER_ID_KEY, userId);
};

/** Clear stored user id (e.g. on logout). Keeps PWA from showing stale "logged in" state. */
export const clearStoredUserId = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_ID_KEY);
};

const apiFetch = async <T>(path: string, options?: RequestInit) => {
  const userId = getUserId();
  const sessionToken = getSessionToken();
  const headers = new Headers(options?.headers);
  if (userId) {
    headers.set("x-user-id", userId);
  }
  if (sessionToken) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  }
  if (!headers.has("Content-Type") && options?.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(buildApiUrl(path), {
    ...options,
    credentials: "include",
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
};

export const ensureUser = async (displayName = "You") => {
  const userId = getUserId();
  if (!userId) return null;
  return apiFetch<{ user: { id: string } }>("/api/users/ensure", {
    method: "POST",
    body: JSON.stringify({ userId, displayName }),
  });
};

/**
 * Timeout for auth check so the app doesn't hang on slow/cold API.
 * Auth can be slow due to: API cold start (serverless), network RTT, or backend load.
 * On timeout we return { user: null } so the app shows the auth screen instead of infinite loading.
 */
const AUTH_ME_TIMEOUT_MS = 4000;

export const fetchCurrentUser = async (): Promise<{
  user: { id: string; email: string | null; emailVerified?: boolean } | null;
}> => {
  const userId = getUserId();
  const sessionToken = getSessionToken();
  const headers = new Headers();
  if (userId) {
    headers.set("x-user-id", userId);
  }
  if (sessionToken) {
    headers.set("Authorization", `Bearer ${sessionToken}`);
  }
  const controller = new AbortController();
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    AUTH_ME_TIMEOUT_MS,
  );
  try {
    const response = await fetch(buildApiUrl("/api/auth/me"), {
      credentials: "include",
      headers,
      signal: controller.signal,
    });
    if (response.status === 401) {
      setSessionToken(null);
      clearStoredUserId();
      return { user: null };
    }
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Request failed: ${response.status}`);
    }
    return (await response.json()) as {
      user: { id: string; email: string | null; emailVerified?: boolean } | null;
    };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { user: null };
    }
    throw err;
  } finally {
    window.clearTimeout(timeoutId);
  }
};

export const fetchUserProfile = async () =>
  apiFetch<{
    profile: {
      display_name: string;
      sex: string | null;
      dob: string | null;
      height_cm: number | null;
      units: string | null;
      timezone: string | null;
    } | null;
  }>("/api/users/profile");

export const registerUser = async (payload: {
  email: string;
  password: string;
  displayName?: string;
}) =>
  apiFetch<{ user: { id: string }; sessionToken?: string; verificationToken?: string }>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

export const loginUser = async (payload: { email: string; password: string }) =>
  apiFetch<{ user: { id: string; emailVerified?: boolean }; sessionToken?: string }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

export const logoutUser = async () =>
  apiFetch<{ ok: boolean }>("/api/auth/logout", {
    method: "POST",
  });

export const requestPasswordReset = async (payload: { email: string }) =>
  apiFetch<{ ok: boolean; resetToken?: string }>("/api/auth/request-password-reset", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const resetPassword = async (payload: { token: string; newPassword: string }) =>
  apiFetch<{ ok: boolean }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const requestEmailVerification = async (payload?: { email: string }) =>
  apiFetch<{ ok: boolean; verificationToken?: string }>("/api/auth/request-email-verification", {
    method: "POST",
    body: JSON.stringify(payload ?? {}),
  });

export const verifyEmail = async (payload: { token: string }) =>
  apiFetch<{ ok: boolean }>("/api/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const searchExercises = async (
  query: string,
  _seed = false,
  scope: "all" | "mine" = "all",
) =>
  apiFetch<{ items: Record<string, unknown>[] }>(
    `/api/exercises/search?query=${encodeURIComponent(query)}&seed=false&scope=${scope}`,
  );

export const fetchExerciseByName = async (name: string) =>
  apiFetch<{ exercise: Record<string, unknown> | null }>(
    `/api/exercises/by-name?name=${encodeURIComponent(name)}`,
  );

export const fetchExerciseById = async (exerciseId: number) =>
  apiFetch<{ exercise: Record<string, unknown> | null }>(
    `/api/exercises/${exerciseId}`,
  );

export const fetchAdminExercises = async (query = "", limit = 120) =>
  apiFetch<{ items: Record<string, unknown>[] }>(
    `/api/exercises/admin?query=${encodeURIComponent(query)}&limit=${limit}`,
  );

export const createExercise = async (payload: {
  name: string;
  description?: string | null;
  category?: string | null;
  equipment?: string[] | null;
  muscles?: string[] | null;
  imageUrl?: string | null;
}) =>
  apiFetch<{ exercise: Record<string, unknown> }>("/api/exercises", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateExerciseMaster = async (
  id: number,
  payload: {
    name?: string;
    description?: string | null;
    category?: string | null;
    equipment?: string[] | null;
    muscles?: string[] | null;
    imageUrl?: string | null;
  },
) =>
  apiFetch<{ exercise: Record<string, unknown> }>(`/api/exercises/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const deleteExercise = async (exerciseId: number) =>
  apiFetch<{ ok: boolean }>(`/api/exercises/${exerciseId}`, {
    method: "DELETE",
  });

export const fetchGroceryBag = async () =>
  apiFetch<{ items: Array<{ id: string; name: string; bucket: string; macroGroup?: string | null; category?: string | null }> }>(
    "/api/groceries",
  );

export const addGroceryBagItem = async (payload: {
  name: string;
  bucket: "staples" | "rotation" | "special";
  macroGroup?: string | null;
  category?: string | null;
}) =>
  apiFetch<{ item: { id: string } }>("/api/groceries", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const removeGroceryBagItem = async (itemId: string) =>
  apiFetch<{ ok: boolean }>(`/api/groceries/${itemId}`, { method: "DELETE" });

export const fetchMealPlans = async () =>
  apiFetch<{
    groups: MealPlanGroupRecord[];
    days: MealPlanDayRecord[];
    meals: MealPlanMealRecord[];
    items: MealPlanItemRecord[];
    weekAssignments: MealPlanWeekAssignmentRecord[];
  }>("/api/meal-plans");

export const createMealPlanDay = async (payload: {
  name: string;
  groupId?: string | null;
  targets?: {
    kcal?: number;
    protein?: number;
    carbs?: number;
    fat?: number;
  };
}) =>
  apiFetch<{ day: MealPlanDayRecord; meals: MealPlanMealRecord[] }>("/api/meal-plans/days", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateMealPlanDay = async (
  dayId: string,
  payload: {
    name?: string;
    groupId?: string | null;
    targets?: {
      kcal?: number;
      protein?: number;
      carbs?: number;
      fat?: number;
    };
  },
) =>
  apiFetch<{ day: MealPlanDayRecord }>(`/api/meal-plans/days/${dayId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const createMealPlanGroup = async (payload: { name: string }) =>
  apiFetch<{ group: MealPlanGroupRecord }>("/api/meal-plans/groups", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateMealPlanGroup = async (
  groupId: string,
  payload: { name?: string; sortOrder?: number },
) =>
  apiFetch<{ group: MealPlanGroupRecord | null }>(`/api/meal-plans/groups/${groupId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const deleteMealPlanGroup = async (groupId: string) =>
  apiFetch<{ ok: boolean }>(`/api/meal-plans/groups/${groupId}`, { method: "DELETE" });

export const duplicateMealPlanDay = async (dayId: string, name?: string) =>
  apiFetch<{
    day: MealPlanDayRecord;
    meals: MealPlanMealRecord[];
    items: MealPlanItemRecord[];
  }>(`/api/meal-plans/days/${dayId}/duplicate`, {
    method: "POST",
    body: JSON.stringify({ name }),
  });

export const deleteMealPlanDay = async (dayId: string) =>
  apiFetch<{ ok: boolean }>(`/api/meal-plans/days/${dayId}`, { method: "DELETE" });

export const addMealPlanItem = async (
  mealId: string,
  payload: {
    foodId?: string | null;
    foodName: string;
    quantity?: number;
    slot: "protein" | "carbs" | "balance";
    kcal: number;
    proteinG: number;
    carbsG: number;
    fatG: number;
  },
) =>
  apiFetch<{ item: MealPlanItemRecord }>(`/api/meal-plans/meals/${mealId}/items`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateMealPlanItem = async (
  itemId: string,
  payload: {
    quantity?: number;
    slot?: "protein" | "carbs" | "balance";
  },
) =>
  apiFetch<{ item: MealPlanItemRecord | null }>(`/api/meal-plans/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const deleteMealPlanItem = async (itemId: string) =>
  apiFetch<{ ok: boolean }>(`/api/meal-plans/items/${itemId}`, { method: "DELETE" });

export const reorderMealPlanMeals = async (dayId: string, mealIds: string[]) =>
  apiFetch<{ meals: MealPlanMealRecord[] }>(`/api/meal-plans/days/${dayId}/meals/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ mealIds }),
  });

export const reorderMealPlanItems = async (mealId: string, itemIds: string[]) =>
  apiFetch<{ items: MealPlanItemRecord[] }>(`/api/meal-plans/meals/${mealId}/items/reorder`, {
    method: "PATCH",
    body: JSON.stringify({ itemIds }),
  });

export const applyMealPlanToWeekdays = async (
  dayId: string | null,
  weekdays: number[],
) =>
  apiFetch<{ assignments: MealPlanWeekAssignmentRecord[] }>("/api/meal-plans/week-assignments", {
    method: "POST",
    body: JSON.stringify({ dayId, weekdays }),
  });

export const clearMealPlanWeekday = async (weekday: number) =>
  apiFetch<{ ok: boolean }>(`/api/meal-plans/week-assignments/${weekday}`, {
    method: "DELETE",
  });

export const upsertUserProfile = async (payload: {
  displayName: string;
  sex?: string | null;
  dob?: string | null;
  heightCm?: number | null;
  units?: string | null;
  timezone?: string | null;
}) =>
  apiFetch<{ profile: { user_id: string } }>("/api/users/profile", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const ensureMealTypes = async () => {
  await apiFetch<{ ok: boolean }>("/api/meal-types/ensure", { method: "POST" });
  return apiFetch<{ items: MealTypeRecord[] }>("/api/meal-types");
};

export const searchFoods = async (
  query: string,
  limit = 20,
  external = true,
) =>
  apiFetch<{ items: FoodRecord[] }>(
    `/api/foods/search?q=${encodeURIComponent(query)}&limit=${limit}&external=${external ? "true" : "false"}`,
  );

export const fetchFoodByBarcode = async (barcode: string) =>
  apiFetch<{ item: FoodRecord | null }>(
    `/api/foods/barcode/${encodeURIComponent(barcode)}`,
  );

export const fetchFoodServings = async (foodId: string) =>
  apiFetch<{ servings: FoodServingRecord[] }>(
    `/api/foods/${foodId}/servings`,
  );

export const createFoodServing = async (foodId: string, payload: { label: string; grams: number }) =>
  apiFetch<{ serving: FoodServingRecord }>(`/api/foods/${foodId}/servings`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const fetchFoodFavorites = async () =>
  apiFetch<{ items: FoodRecord[] }>("/api/foods/favorites");

export const toggleFoodFavorite = async (foodId: string, favorite: boolean) =>
  apiFetch<{ ok: boolean }>("/api/foods/favorites", {
    method: "POST",
    body: JSON.stringify({ foodId, favorite }),
  });

export const fetchFoodHistory = async (limit = 20) =>
  apiFetch<{ items: FoodRecord[] }>(
    `/api/foods/history?limit=${encodeURIComponent(String(limit))}`,
  );

export const createFood = async (payload: {
  name: string;
  brand?: string;
  brandId?: string;
  barcode?: string;
  source?: string;
  portionLabel?: string;
  portionGrams?: number;
  kcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  micronutrients?: Record<string, unknown>;
  imageUrl?: string;
}) =>
  apiFetch<{ item: FoodRecord }>("/api/foods", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const fetchFoodImageSignature = async () =>
  apiFetch<{
    timestamp: number;
    signature: string;
    apiKey: string;
    cloudName: string;
    uploadPreset: string | null;
  }>("/api/foods/image/signature");

export const fetchFoodById = async (foodId: string) =>
  apiFetch<{ item: FoodRecord | null }>(`/api/foods/${foodId}`);

export const updateFoodImage = async (foodId: string, imageUrl: string) =>
  apiFetch<{ item: FoodRecord | null }>(`/api/foods/${foodId}/image`, {
    method: "PATCH",
    body: JSON.stringify({ imageUrl }),
  });

export const updateFoodMaster = async (
  foodId: string,
  payload: {
    name?: string;
    brand?: string | null;
    brandId?: string | null;
    portionLabel?: string | null;
    portionGrams?: number | null;
    kcal?: number;
    carbsG?: number;
    proteinG?: number;
    fatG?: number;
    micronutrients?: Record<string, number | string>;
  },
) =>
  apiFetch<{ item: FoodRecord | null }>(`/api/foods/${foodId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const fetchBrands = async (query = "", verified = true, limit = 50) =>
  apiFetch<{ items: BrandRecord[] }>(
    `/api/brands?q=${encodeURIComponent(query)}&verified=${verified ? "true" : "false"}&limit=${limit}`,
  );

export const createBrand = async (payload: {
  name: string;
  websiteUrl?: string;
  logoUrl?: string;
}) =>
  apiFetch<{ brand: BrandRecord }>("/api/brands", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateBrand = async (
  brandId: string,
  payload: {
    name?: string;
    websiteUrl?: string | null;
    logoUrl?: string | null;
    isVerified?: boolean;
  },
) =>
  apiFetch<{ brand: BrandRecord | null }>(`/api/brands/${brandId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const fetchBrandLogoSignature = async () =>
  apiFetch<{
    timestamp: number;
    signature: string;
    apiKey: string;
    cloudName: string;
    uploadPreset: string | null;
  }>("/api/brands/logo/signature");

export const createMealEntry = async (payload: {
  localDate: string;
  mealTypeId?: string;
  notes?: string;
  items: Array<{
    foodId?: string;
    foodName: string;
    portionLabel?: string;
    portionGrams?: number;
    quantity?: number;
    kcal?: number;
    carbsG?: number;
    proteinG?: number;
    fatG?: number;
    micronutrients?: Record<string, unknown>;
    sortOrder?: number;
  }>;
}) =>
  apiFetch<{ entry: MealEntryRecord; items: MealEntryItemRecord[] }>("/api/meal-entries", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const fetchMealEntries = async (localDate: string) =>
  apiFetch<{ entries: MealEntryRecord[]; items: MealEntryItemRecord[] }>(
    `/api/meal-entries?localDate=${encodeURIComponent(localDate)}`,
  );

export const deleteMealEntryItem = async (itemId: string) =>
  apiFetch<{ deleted: string | null }>(`/api/meal-entries/items/${itemId}`, {
    method: "DELETE",
  });

export const updateMealEntryItem = async (
  itemId: string,
  payload: {
    quantity?: number;
    kcal?: number;
    carbsG?: number;
    proteinG?: number;
    fatG?: number;
  },
) =>
  apiFetch<{ item: MealEntryItemRecord | null }>(`/api/meal-entries/items/${itemId}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export type NutritionSummaryMicros = {
  sodium_mg?: number;
  fiber_g?: number;
  sugar_g?: number;
  potassium_mg?: number;
  cholesterol_mg?: number;
  saturated_fat_g?: number;
};

export const fetchNutritionSummary = async (localDate: string) =>
  apiFetch<{
    localDate: string;
    totals: { kcal: number; carbs_g: number; protein_g: number; fat_g: number };
    micros?: NutritionSummaryMicros | null;
    targets: {
      kcal_goal: number | null;
      carbs_g: number | null;
      protein_g: number | null;
      fat_g: number | null;
    } | null;
    settings: {
      kcal_goal: number | null;
      carbs_g: number | null;
      protein_g: number | null;
      fat_g: number | null;
    } | null;
  }>(`/api/nutrition/summary?localDate=${encodeURIComponent(localDate)}`);

export const fetchNutritionWeekly = async (start: string) =>
  apiFetch<{ items: Array<{ day: string; kcal: number }> }>(
    `/api/nutrition/weekly?start=${encodeURIComponent(start)}`,
  );

export const fetchNutritionStreak = async () =>
  apiFetch<{ current: number; best: number }>("/api/nutrition/streak");

export const upsertNutritionTargets = async (payload: {
  localDate: string;
  kcalGoal?: number;
  carbsG?: number;
  proteinG?: number;
  fatG?: number;
}) =>
  apiFetch<{ target: { local_date: string } }>("/api/nutrition/targets", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const fetchNutritionSettings = async () =>
  apiFetch<{
    settings: {
      kcal_goal: number | null;
      carbs_g: number | null;
      protein_g: number | null;
      fat_g: number | null;
    } | null;
  }>("/api/nutrition/settings");

export const upsertNutritionSettings = async (payload: {
  kcalGoal?: number;
  carbsG?: number;
  proteinG?: number;
  fatG?: number;
}) =>
  apiFetch<{ settings: { kcal_goal: number | null } }>("/api/nutrition/settings", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const fetchNutritionAnalytics = async (days = 28) =>
  apiFetch<{ days: number; average: number; items: Array<{ day: string; kcal: number }> }>(
    `/api/analytics/nutrition?days=${encodeURIComponent(String(days))}`,
  );

export const fetchTrainingAnalytics = async (weeks = 8) =>
  apiFetch<{
    weeks: number;
    items: Array<{ week_start: string; volume: number; total_sets: number }>;
  }>(`/api/analytics/training?weeks=${encodeURIComponent(String(weeks))}`);

export const fetchExerciseAnalytics = async (exerciseId: number, days = 84) =>
  apiFetch<{
    days: number;
    items: Array<{
      day: string;
      total_sets: number;
      total_volume_kg: number;
      max_weight_kg: number;
      est_one_rm_kg: number;
    }>;
  }>(
    `/api/analytics/exercise?exerciseId=${encodeURIComponent(
      String(exerciseId),
    )}&days=${encodeURIComponent(String(days))}`,
  );

export const fetchMuscleAnalytics = async (days = 84) =>
  apiFetch<{
    days: number;
    items: Array<{
      day: string;
      muscle: string;
      total_sets: number;
      total_volume_kg: number;
    }>;
  }>(`/api/analytics/muscles?days=${encodeURIComponent(String(days))}`);

export const fetchWeightLogs = async (options?: {
  start?: string;
  end?: string;
  limit?: number;
}) => {
  const params = new URLSearchParams();
  if (options?.start) params.set("start", options.start);
  if (options?.end) params.set("end", options.end);
  if (options?.limit) params.set("limit", String(options.limit));
  const query = params.toString();
  return apiFetch<{ items: Array<{ local_date: string; weight: number; unit: string }> }>(
    `/api/tracking/weight${query ? `?${query}` : ""}`,
  );
};

export const fetchLatestWeightLog = async () =>
  apiFetch<{
    entry: { local_date: string; weight: number; unit: string; logged_at: string } | null;
  }>("/api/tracking/weight/latest");

export const upsertWeightLog = async (payload: {
  localDate: string;
  weight: number;
  unit: string;
  notes?: string;
}) =>
  apiFetch<{ entry: { local_date: string; weight: number; unit: string } }>(
    "/api/tracking/weight",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

export const deleteWeightLog = async (localDate: string) =>
  apiFetch<{ ok: boolean }>("/api/tracking/weight?localDate=" + encodeURIComponent(localDate), {
    method: "DELETE",
  });

export const fetchStepsLogs = async (localDate?: string) => {
  const query = localDate ? `?localDate=${encodeURIComponent(localDate)}` : "";
  return apiFetch<{ items: Array<{ local_date: string; steps: number; source: string | null }> }>(
    `/api/tracking/steps${query}`,
  );
};

export const upsertStepsLog = async (payload: {
  localDate: string;
  steps: number;
  source?: string;
}) =>
  apiFetch<{ entry: { local_date: string; steps: number } }>("/api/tracking/steps", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const fetchWaterLogs = async (localDate?: string) => {
  const query = localDate ? `?localDate=${encodeURIComponent(localDate)}` : "";
  return apiFetch<{ items: Array<{ local_date: string; amount_ml: number; source: string | null }> }>(
    `/api/tracking/water${query}`,
  );
};

export const upsertWaterLog = async (payload: {
  localDate: string;
  amountMl: number;
  source?: string;
}) =>
  apiFetch<{ entry: { local_date: string; amount_ml: number } }>("/api/tracking/water", {
    method: "POST",
    body: JSON.stringify(payload),
  });

/** Replace all water entries for a day with a single absolute total. */
export const setWaterLogTotal = async (payload: {
  localDate: string;
  totalMl: number;
  source?: string;
}) =>
  apiFetch<{ entry: { local_date: string; amount_ml: number } | null; totalMl: number }>(
    "/api/tracking/water/total",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

export const fetchActivityGoals = async () =>
  apiFetch<{ goals: { steps_goal: number | null; water_goal_ml: number | null; weight_unit: string | null } | null }>(
    "/api/tracking/goals",
  );

export const upsertActivityGoals = async (payload: {
  stepsGoal?: number;
  waterGoalMl?: number;
  weightUnit?: string;
}) =>
  apiFetch<{ goals: { steps_goal: number | null; water_goal_ml: number | null; weight_unit: string | null } }>(
    "/api/tracking/goals",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

export const fetchWorkoutPlans = async () =>
  apiFetch<{
    plans: Array<{ id: string; name: string; sort_order: number }>;
    templates: Array<{
      id: string;
      plan_id: string;
      name: string;
      last_performed_at: string | null;
      sort_order: number;
    }>;
    exercises: Array<{
      id: string;
      template_id: string;
      exercise_name: string;
      item_order: number;
    }>;
  }>("/api/workouts/plans");

export const createWorkoutPlan = async (payload: {
  name: string;
  sortOrder?: number;
}) =>
  apiFetch<{ plan: { id: string; name: string; sort_order: number } }>(
    "/api/workouts/plans",
    { method: "POST", body: JSON.stringify(payload) },
  );

export const updateWorkoutPlan = async (planId: string, payload: { name?: string; sortOrder?: number }) =>
  apiFetch<{ plan: { id: string; name: string; sort_order: number } }>(
    `/api/workouts/plans/${planId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );

export const deleteWorkoutPlan = async (planId: string) =>
  apiFetch<{ ok: boolean }>(`/api/workouts/plans/${planId}`, { method: "DELETE" });

export const updateWorkoutTemplate = async (
  templateId: string,
  payload: { name?: string; sortOrder?: number },
) =>
  apiFetch<{ template: { id: string; name: string } }>(
    `/api/workouts/templates/${templateId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );

export const deleteWorkoutTemplate = async (templateId: string) =>
  apiFetch<{ ok: boolean }>(`/api/workouts/templates/${templateId}`, {
    method: "DELETE",
  });

export const createWorkoutTemplate = async (payload: {
  planId: string;
  name: string;
  sortOrder?: number;
}) =>
  apiFetch<{ template: { id: string; plan_id: string; name: string } }>(
    "/api/workouts/templates",
    { method: "POST", body: JSON.stringify(payload) },
  );

export const completeWorkoutTemplate = async (templateId: string) =>
  apiFetch<{ template: { id: string; last_performed_at: string | null } }>(
    `/api/workouts/templates/${templateId}/complete`,
    { method: "POST" },
  );

export const updateWorkoutTemplateExercises = async (
  templateId: string,
  exercises: Array<{ name: string; itemOrder: number }>,
) =>
  apiFetch<{ ok: boolean }>(`/api/workouts/templates/${templateId}/exercises`, {
    method: "PUT",
    body: JSON.stringify({
      exercises: exercises.map((exercise) => ({
        exerciseName: exercise.name,
        itemOrder: exercise.itemOrder,
      })),
    }),
  });

export const fetchFitnessRoutines = async () =>
  apiFetch<{
    routines: Array<{ id: string; name: string; updated_at: string }>;
    exercises: Array<{
      id: string;
      routine_id: string;
      exercise_id: number | null;
      exercise_name: string;
      target_sets: number;
      notes: string | null;
    }>;
  }>("/api/fitness/routines");

export const createFitnessRoutine = async (name: string) =>
  apiFetch<{ routine: { id: string; name: string } }>("/api/fitness/routines", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

export const renameFitnessRoutine = async (routineId: string, name: string) =>
  apiFetch<{ routine: { id: string; name: string } }>(
    `/api/fitness/routines/${routineId}`,
    { method: "PATCH", body: JSON.stringify({ name }) },
  );

export const deleteFitnessRoutine = async (routineId: string) =>
  apiFetch<{ ok: boolean }>(`/api/fitness/routines/${routineId}`, { method: "DELETE" });

export const addFitnessRoutineExercise = async (
  routineId: string,
  payload: { exerciseId?: number; name: string },
) =>
  apiFetch<{ exercise: { id: string } }>(`/api/fitness/routines/${routineId}/exercises`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const updateFitnessRoutineExercise = async (
  routineId: string,
  routineExerciseId: string,
  payload: { targetSets?: number; notes?: string },
) =>
  apiFetch<{ exercise: { id: string } }>(
    `/api/fitness/routines/${routineId}/exercises/${routineExerciseId}`,
    { method: "PATCH", body: JSON.stringify(payload) },
  );

export const removeFitnessRoutineExercise = async (
  routineId: string,
  routineExerciseId: string,
) =>
  apiFetch<{ ok: boolean }>(
    `/api/fitness/routines/${routineId}/exercises/${routineExerciseId}`,
    { method: "DELETE" },
  );

export const fetchActiveFitnessSession = async () =>
  apiFetch<{
    session: { id: string; routine_id: string | null; started_at: string } | null;
    exercises: Array<{ id: string; exercise_id: number | null; exercise_name: string; item_order: number }>;
    sets: Array<{ id: string; session_exercise_id: string; weight: number; reps: number }>;
  }>("/api/fitness/sessions/active");

export const fetchFitnessSessionHistory = async () =>
  apiFetch<{
    items: Array<{
      id: string;
      routine_id: string | null;
      started_at: string;
      ended_at: string;
      total_sets: number;
      total_volume: number;
    }>;
  }>("/api/fitness/sessions/history");

export const startFitnessSession = async (payload: {
  routineId?: string;
  templateId?: string;
  exercises?: string[];
}) =>
  apiFetch<{ session: { id: string } }>("/api/fitness/sessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const logFitnessSet = async (payload: {
  sessionId: string;
  sessionExerciseId: string;
  weightDisplay?: number;
  unitUsed?: "lb" | "kg";
  reps?: number;
  rpe?: number;
  restSeconds?: number;
}) =>
  apiFetch<{ set: { id: string } }>(`/api/fitness/sessions/${payload.sessionId}/sets`, {
    method: "POST",
    body: JSON.stringify({
      sessionExerciseId: payload.sessionExerciseId,
      weightDisplay: payload.weightDisplay,
      unitUsed: payload.unitUsed,
      reps: payload.reps,
      rpe: payload.rpe,
      restSeconds: payload.restSeconds,
    }),
  });

export const finishFitnessSession = async (sessionId: string) =>
  apiFetch<{ session: { id: string } }>(`/api/fitness/sessions/${sessionId}/finish`, {
    method: "POST",
  });
