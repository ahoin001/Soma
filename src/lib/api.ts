/**
 * Supabase API layer — thin re-export over supabase-api.ts.
 * All consumers import from this file for a stable public interface.
 */
import * as sb from "@/lib/supabase-api";
import { USER_ID_KEY } from "@/lib/storageKeys";
import { supabase } from "@/lib/supabase";

import type {
  MealPlanDayRecord,
  MealPlanGroupRecord,
  MealPlanItemRecord,
  MealPlanMealRecord,
  MealPlanTargetPresetRecord,
  MealPlanWeekAssignmentRecord,
} from "@/types/api";

// ─── errors ─────────────────────────────────────────────────────────────────

export class SessionExpiredError extends Error {
  constructor() {
    super("Session expired");
    this.name = "SessionExpiredError";
  }
}

// ─── session / user identity ────────────────────────────────────────────────

export const getStoredUserId = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_ID_KEY);
};

export const getUserId = () => {
  if (typeof window === "undefined") return null;
  const existing = getStoredUserId();
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

export const clearStoredUserId = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_ID_KEY);
};

export const getSessionToken = (): string | null => null;
export const setSessionToken = (_token: string | null) => {};
export const buildApiUrl = (path: string) => path;

// ─── ensureUser ─────────────────────────────────────────────────────────────

export const ensureUser = (displayName = "You") => sb.ensureUserSupabase(displayName);

// ─── auth (Supabase Auth) ───────────────────────────────────────────────────

export const fetchCurrentUser = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) return { user: null };
  return { user: { id: session.user.id, email: session.user.email ?? null, emailVerified: !!session.user.email_confirmed_at } };
};

export const registerUser = async (p: { email: string; password: string; displayName?: string }) => {
  const { data, error } = await supabase.auth.signUp({ email: p.email, password: p.password, options: { data: { display_name: p.displayName } } });
  if (error) throw new Error(error.message);
  return { user: { id: data.user?.id ?? "" }, sessionToken: data.session?.access_token };
};

export const loginUser = async (p: { email: string; password: string }) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email: p.email, password: p.password });
  if (error) throw new Error(error.message);
  return { user: { id: data.user.id, emailVerified: !!data.user.email_confirmed_at }, sessionToken: data.session.access_token };
};

export const logoutUser = async () => {
  await supabase.auth.signOut();
  return { ok: true };
};

export const requestPasswordReset = async (p: { email: string }) => {
  const { error } = await supabase.auth.resetPasswordForEmail(p.email);
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const resetPassword = async (p: { token: string; newPassword: string }) => {
  const { error } = await supabase.auth.updateUser({ password: p.newPassword });
  if (error) throw new Error(error.message);
  return { ok: true };
};

export const requestEmailVerification = async (_p?: { email: string }) => ({ ok: true });
export const verifyEmail = async (_p: { token: string }) => ({ ok: true });

// ─── user profile ───────────────────────────────────────────────────────────

export const fetchUserProfile = () => sb.fetchUserProfileSupabase();
export const upsertUserProfile = (p: Parameters<typeof sb.upsertUserProfileSupabase>[0]) => sb.upsertUserProfileSupabase(p);

// ─── exercises ──────────────────────────────────────────────────────────────

export const searchExercises = (query: string, _seed = false, scope: "all" | "mine" = "all") => sb.searchExercisesSupabase(query, _seed, scope);
export const fetchExerciseByName = (name: string) => sb.fetchExerciseByNameSupabase(name);
export const fetchExerciseById = (exerciseId: number) => sb.fetchExerciseByIdSupabase(exerciseId);
export const fetchAdminExercises = (query = "", limit = 120) => sb.fetchAdminExercisesSupabase(query, limit);
export const createExercise = (p: Parameters<typeof sb.createExerciseSupabase>[0]) => sb.createExerciseSupabase(p);
export const updateExerciseMaster = (id: number, p: Parameters<typeof sb.updateExerciseMasterSupabase>[1]) => sb.updateExerciseMasterSupabase(id, p);
export const deleteExercise = (exerciseId: number) => sb.deleteExerciseSupabase(exerciseId);

// ─── groceries ──────────────────────────────────────────────────────────────

export const fetchGroceryBag = () => sb.fetchGroceryBagSupabase();
export const addGroceryBagItem = (p: Parameters<typeof sb.addGroceryBagItemSupabase>[0]) => sb.addGroceryBagItemSupabase(p);
export const removeGroceryBagItem = (itemId: string) => sb.removeGroceryBagItemSupabase(itemId);

// ─── meal plans ─────────────────────────────────────────────────────────────

export type MealPlanTargetsInput = {
  kcal?: number; protein?: number; carbs?: number; fat?: number;
  kcalMin?: number | null; kcalMax?: number | null;
  proteinMin?: number | null; proteinMax?: number | null;
  carbsMin?: number | null; carbsMax?: number | null;
  fatMin?: number | null; fatMax?: number | null;
};

export const fetchMealPlans = () => sb.fetchMealPlansSupabase() as Promise<{ groups: MealPlanGroupRecord[]; days: MealPlanDayRecord[]; meals: MealPlanMealRecord[]; items: MealPlanItemRecord[]; weekAssignments: MealPlanWeekAssignmentRecord[] }>;
export const createMealPlanDay = (p: Parameters<typeof sb.createMealPlanDaySupabase>[0]) => sb.createMealPlanDaySupabase(p);
export const updateMealPlanDay = (dayId: string, p: Parameters<typeof sb.updateMealPlanDaySupabase>[1]) => sb.updateMealPlanDaySupabase(dayId, p);
export const fetchMealPlanPresets = () => sb.fetchMealPlanPresetsSupabase() as Promise<{ presets: MealPlanTargetPresetRecord[] }>;
export const createMealPlanPreset = (p: Parameters<typeof sb.createMealPlanPresetSupabase>[0]) => sb.createMealPlanPresetSupabase(p);
export const deleteMealPlanPreset = (presetId: string) => sb.deleteMealPlanPresetSupabase(presetId);
export const createMealPlanGroup = (p: Parameters<typeof sb.createMealPlanGroupSupabase>[0]) => sb.createMealPlanGroupSupabase(p);
export const updateMealPlanGroup = (groupId: string, p: Parameters<typeof sb.updateMealPlanGroupSupabase>[1]) => sb.updateMealPlanGroupSupabase(groupId, p);
export const deleteMealPlanGroup = (groupId: string) => sb.deleteMealPlanGroupSupabase(groupId);
export const duplicateMealPlanDay = (dayId: string, name?: string) => sb.duplicateMealPlanDaySupabase(dayId, name);
export const deleteMealPlanDay = (dayId: string) => sb.deleteMealPlanDaySupabase(dayId);
export const addMealPlanItem = (mealId: string, p: Parameters<typeof sb.addMealPlanItemSupabase>[1]) => sb.addMealPlanItemSupabase(mealId, p);
export const updateMealPlanItem = (itemId: string, p: Parameters<typeof sb.updateMealPlanItemSupabase>[1]) => sb.updateMealPlanItemSupabase(itemId, p);
export const deleteMealPlanItem = (itemId: string) => sb.deleteMealPlanItemSupabase(itemId);
export const reorderMealPlanMeals = (dayId: string, mealIds: string[]) => sb.reorderMealPlanMealsSupabase(dayId, mealIds);
export const reorderMealPlanItems = (mealId: string, itemIds: string[]) => sb.reorderMealPlanItemsSupabase(mealId, itemIds);
export const applyMealPlanToWeekdays = (dayId: string | null, weekdays: number[]) => sb.applyMealPlanToWeekdaysSupabase(dayId, weekdays);
export const clearMealPlanWeekday = (weekday: number) => sb.clearMealPlanWeekdaySupabase(weekday);

// ─── meal types ─────────────────────────────────────────────────────────────

export const ensureMealTypes = () => sb.ensureMealTypesSupabase();

// ─── foods ──────────────────────────────────────────────────────────────────

export const searchFoods = (query: string, limit = 20, external = true) => sb.searchFoodsSupabase(query, limit, external);
export const fetchFoodByBarcode = (barcode: string) => sb.fetchFoodByBarcodeSupabase(barcode);
export const fetchFoodServings = (foodId: string) => sb.fetchFoodServingsSupabase(foodId);
export const createFoodServing = (foodId: string, p: Parameters<typeof sb.createFoodServingSupabase>[1]) => sb.createFoodServingSupabase(foodId, p);
export const fetchFoodFavorites = () => sb.fetchFoodFavoritesSupabase();
export const toggleFoodFavorite = (foodId: string, favorite: boolean) => sb.toggleFoodFavoriteSupabase(foodId, favorite);
export const fetchFoodHistory = (limit = 20) => sb.fetchFoodHistorySupabase(limit);
export const createFood = (p: Parameters<typeof sb.createFoodSupabase>[0]) => sb.createFoodSupabase(p);
export const fetchFoodImageSignature = () => sb.fetchCloudinarySignatureSupabase();
export const fetchFoodById = (foodId: string) => sb.fetchFoodByIdSupabase(foodId);
export const updateFoodImage = (foodId: string, imageUrl: string) => sb.updateFoodImageSupabase(foodId, imageUrl);
export const deleteFood = (foodId: string) => sb.deleteFoodSupabase(foodId);
export const updateFoodMaster = (foodId: string, p: Parameters<typeof sb.updateFoodMasterSupabase>[1]) => sb.updateFoodMasterSupabase(foodId, p);

// ─── brands ─────────────────────────────────────────────────────────────────

export const fetchBrands = (query = "", verified = true, limit = 50) => sb.fetchBrandsSupabase(query, verified, limit);
export const createBrand = (p: Parameters<typeof sb.createBrandSupabase>[0]) => sb.createBrandSupabase(p);
export const updateBrand = (brandId: string, p: Parameters<typeof sb.updateBrandSupabase>[1]) => sb.updateBrandSupabase(brandId, p);
export const fetchBrandLogoSignature = () => sb.fetchCloudinarySignatureSupabase();

// ─── meal entries ───────────────────────────────────────────────────────────

export const createMealEntry = (p: Parameters<typeof sb.createMealEntrySupabase>[0]) => sb.createMealEntrySupabase(p);
export const fetchMealEntries = (localDate: string) => sb.fetchMealEntriesSupabase(localDate);
export const deleteMealEntryItem = (itemId: string) => sb.deleteMealEntryItemSupabase(itemId);
export const updateMealEntryItem = (itemId: string, p: Parameters<typeof sb.updateMealEntryItemSupabase>[1]) => sb.updateMealEntryItemSupabase(itemId, p);

// ─── nutrition ──────────────────────────────────────────────────────────────

export type NutritionSummaryMicros = {
  sodium_mg?: number; fiber_g?: number; sugar_g?: number; added_sugar_g?: number;
  potassium_mg?: number; cholesterol_mg?: number; saturated_fat_g?: number;
};

export const fetchNutritionSummary = (localDate: string) => sb.fetchNutritionSummarySupabase(localDate);
export const fetchNutritionWeekly = (start: string) => sb.fetchNutritionWeeklySupabase(start);
export const fetchNutritionStreak = () => sb.fetchNutritionStreakSupabase();
export const fetchExternalSvgUrl = (url: string) => sb.fetchExternalSvgSupabase(url);
export const upsertNutritionTargets = (p: Parameters<typeof sb.upsertNutritionTargetsSupabase>[0]) => sb.upsertNutritionTargetsSupabase(p);
export const fetchNutritionSettings = () => sb.fetchNutritionSettingsSupabase();
export const upsertNutritionSettings = (p: Parameters<typeof sb.upsertNutritionSettingsSupabase>[0]) => sb.upsertNutritionSettingsSupabase(p);

// ─── analytics ──────────────────────────────────────────────────────────────

export const fetchNutritionAnalytics = (days = 28) => sb.fetchNutritionAnalyticsSupabase(days);
export const fetchTrainingAnalytics = (weeks = 8) => sb.fetchTrainingAnalyticsSupabase(weeks);
export const fetchExerciseAnalytics = (exerciseId: number, days = 84) => sb.fetchExerciseAnalyticsSupabase(exerciseId, days);
export const fetchMuscleAnalytics = (days = 84) => sb.fetchMuscleAnalyticsSupabase(days);

// ─── tracking (weight, steps, water) ────────────────────────────────────────

export const fetchWeightLogs = (options?: Parameters<typeof sb.fetchWeightLogsSupabase>[0]) => sb.fetchWeightLogsSupabase(options);
export const fetchLatestWeightLog = () => sb.fetchLatestWeightLogSupabase();
export const upsertWeightLog = (p: Parameters<typeof sb.upsertWeightLogSupabase>[0]) => sb.upsertWeightLogSupabase(p);
export const deleteWeightLog = (localDate: string) => sb.deleteWeightLogSupabase(localDate);
export const fetchStepsLogs = (localDate?: string) => sb.fetchStepsLogsSupabase(localDate);
export const upsertStepsLog = (p: Parameters<typeof sb.upsertStepsLogSupabase>[0]) => sb.upsertStepsLogSupabase(p);
export const fetchWaterLogs = (localDate?: string) => sb.fetchWaterLogsSupabase(localDate);
export const upsertWaterLog = (p: Parameters<typeof sb.upsertWaterLogSupabase>[0]) => sb.upsertWaterLogSupabase(p);
export const setWaterLogTotal = (p: Parameters<typeof sb.setWaterLogTotalSupabase>[0]) => sb.setWaterLogTotalSupabase(p);
export const fetchActivityGoals = () => sb.fetchActivityGoalsSupabase();
export const upsertActivityGoals = (p: Parameters<typeof sb.upsertActivityGoalsSupabase>[0]) => sb.upsertActivityGoalsSupabase(p);

// ─── workout plans ──────────────────────────────────────────────────────────

export const fetchWorkoutPlans = () => sb.fetchWorkoutPlansSupabase();
export const createWorkoutPlan = (p: Parameters<typeof sb.createWorkoutPlanSupabase>[0]) => sb.createWorkoutPlanSupabase(p);
export const updateWorkoutPlan = (planId: string, p: Parameters<typeof sb.updateWorkoutPlanSupabase>[1]) => sb.updateWorkoutPlanSupabase(planId, p);
export const deleteWorkoutPlan = (planId: string) => sb.deleteWorkoutPlanSupabase(planId);
export const updateWorkoutTemplate = (templateId: string, p: Parameters<typeof sb.updateWorkoutTemplateSupabase>[1]) => sb.updateWorkoutTemplateSupabase(templateId, p);
export const deleteWorkoutTemplate = (templateId: string) => sb.deleteWorkoutTemplateSupabase(templateId);
export const createWorkoutTemplate = (p: Parameters<typeof sb.createWorkoutTemplateSupabase>[0]) => sb.createWorkoutTemplateSupabase(p);
export const completeWorkoutTemplate = (templateId: string) => sb.completeWorkoutTemplateSupabase(templateId);
export const updateWorkoutTemplateExercises = (templateId: string, exercises: Array<{ name: string; itemOrder: number }>) => sb.updateWorkoutTemplateExercisesSupabase(templateId, exercises);

// ─── fitness routines ───────────────────────────────────────────────────────

export const fetchFitnessRoutines = () => sb.fetchFitnessRoutinesSupabase();
export const createFitnessRoutine = (name: string) => sb.createFitnessRoutineSupabase(name);
export const renameFitnessRoutine = (routineId: string, name: string) => sb.renameFitnessRoutineSupabase(routineId, name);
export const deleteFitnessRoutine = (routineId: string) => sb.deleteFitnessRoutineSupabase(routineId);
export const addFitnessRoutineExercise = (routineId: string, p: Parameters<typeof sb.addFitnessRoutineExerciseSupabase>[1]) => sb.addFitnessRoutineExerciseSupabase(routineId, p);
export const updateFitnessRoutineExercise = (routineId: string, routineExerciseId: string, p: Parameters<typeof sb.updateFitnessRoutineExerciseSupabase>[2]) => sb.updateFitnessRoutineExerciseSupabase(routineId, routineExerciseId, p);
export const removeFitnessRoutineExercise = (routineId: string, routineExerciseId: string) => sb.removeFitnessRoutineExerciseSupabase(routineId, routineExerciseId);

// ─── fitness sessions ───────────────────────────────────────────────────────

export const fetchActiveFitnessSession = () => sb.fetchActiveFitnessSessionSupabase();
export const fetchFitnessSessionHistory = () => sb.fetchFitnessSessionHistorySupabase();
export const startFitnessSession = (p: Parameters<typeof sb.startFitnessSessionSupabase>[0]) => sb.startFitnessSessionSupabase(p);
export const swapSessionExercise = (sessionId: string, sessionExerciseId: string, newExerciseId: number) => sb.swapSessionExerciseSupabase(sessionId, sessionExerciseId, newExerciseId);
export const logFitnessSet = (p: Parameters<typeof sb.logFitnessSetSupabase>[0]) => sb.logFitnessSetSupabase(p);
export const finishFitnessSession = (sessionId: string) => sb.finishFitnessSessionSupabase(sessionId);

// ─── journal (body measurements + progress photos) ──────────────────────────

export const fetchJournalMeasurements = (params?: Parameters<typeof sb.fetchJournalMeasurementsSupabase>[0]) => sb.fetchJournalMeasurementsSupabase(params);
export const fetchJournalMeasurementsLatest = () => sb.fetchJournalMeasurementsLatestSupabase();
export const createJournalMeasurement = (p: Parameters<typeof sb.createJournalMeasurementSupabase>[0]) => sb.createJournalMeasurementSupabase(p);
export const fetchProgressPhotos = (limit?: number) => sb.fetchProgressPhotosSupabase(limit);
export const createProgressPhoto = (p: Parameters<typeof sb.createProgressPhotoSupabase>[0]) => sb.createProgressPhotoSupabase(p);
export const deleteProgressPhoto = (id: string) => sb.deleteProgressPhotoSupabase(id);
