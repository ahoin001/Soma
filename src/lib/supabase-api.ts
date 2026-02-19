/**
 * Supabase-backed API layer.
 * Single source of truth for all data operations when Supabase is configured.
 * RLS policies (019_rls_policies.sql) enforce auth.uid() on every table.
 *
 * Patterns:
 * - supabase.from() for direct CRUD
 * - supabase.rpc() for computed server-side queries (analytics)
 * - throwIfNoUser() gates operations that require auth.uid() under RLS
 * - getUserId() is only for optional client-side filtering paths
 */
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
  MealPlanTargetPresetRecord,
  MealPlanWeekAssignmentRecord,
  MealTypeRecord,
} from "@/types/api";
import type { ExerciseOverride } from "@/data/exerciseOverridesApi";
import type { ExerciseMedia } from "@/data/exerciseMediaApi";
import { USER_ID_KEY } from "@/lib/storageKeys";
import { supabase } from "./supabase";

// ─── helpers ────────────────────────────────────────────────────────────────

const getUserId = (): string | null => {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(USER_ID_KEY);
};

const throwIfNoUser = async (): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  const uid = session?.user?.id ?? null;
  if (!uid) throw new Error("Unauthorized");
  return uid;
};

/** Throws if the Supabase response has an error (ignores PGRST116 "no rows"). */
const throwOnError = <T>(result: { data: T; error: { message: string; code?: string } | null }, allowEmpty = false): T => {
  if (result.error && (!allowEmpty || result.error.code !== "PGRST116")) {
    throw new Error(result.error.message);
  }
  return result.data;
};

// ─── ensureUser ─────────────────────────────────────────────────────────────
let ensureUserCache: {
  userId: string;
  promise: Promise<{ user: { id: string } } | null>;
} | null = null;

export const ensureUserSupabase = async (displayName = "You") => {
  const { data: { session } } = await supabase.auth.getSession();
  const userId = session?.user?.id ?? null;
  if (!userId) return null;
  if (ensureUserCache?.userId === userId) return ensureUserCache.promise;
  const promise = (async () => {
    const { error } = await supabase.from("user_profiles").upsert(
      { user_id: userId, display_name: displayName },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { user: { id: userId } };
  })();
  ensureUserCache = { userId, promise };
  return promise;
};

// ─── meal types ─────────────────────────────────────────────────────────────
export const ensureMealTypesSupabase = async () => {
  const userId = await throwIfNoUser();
  const defaults = [
    { label: "Breakfast", emoji: "🌅", sort_order: 0 },
    { label: "Lunch", emoji: "☀️", sort_order: 1 },
    { label: "Dinner", emoji: "🌙", sort_order: 2 },
    { label: "Snack", emoji: "🍎", sort_order: 3 },
  ];
  for (const d of defaults) {
    await supabase
      .from("meal_types")
      .upsert(
        { user_id: userId, ...d },
        { onConflict: "user_id,label", ignoreDuplicates: true },
      );
  }
  const { data, error } = await supabase
    .from("meal_types")
    .select("*")
    .or(`user_id.eq.${userId},user_id.is.null`)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return { items: (data ?? []) as MealTypeRecord[] };
};

// ─── meal entries ───────────────────────────────────────────────────────────
export const fetchMealEntriesSupabase = async (localDate: string) => {
  const userId = await throwIfNoUser();
  const { data: entries, error: eErr } = await supabase
    .from("meal_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("local_date", localDate)
    .order("logged_at", { ascending: false });
  if (eErr) throw new Error(eErr.message);
  const ids = (entries ?? []).map((e) => e.id);
  if (ids.length === 0) {
    return { entries: [] as MealEntryRecord[], items: [] as MealEntryItemRecord[] };
  }
  const { data: items, error: iErr } = await supabase
    .from("meal_entry_items")
    .select("*, food:foods!meal_entry_items_food_id_fkey(image_url)")
    .in("meal_entry_id", ids)
    .order("sort_order", { ascending: true });
  if (iErr) throw new Error(iErr.message);
  const enrichedItems = (items ?? []).map((item) => {
    const foodImage =
      (item as { food?: { image_url?: string | null } | null }).food?.image_url ?? null;
    return {
      ...item,
      image_url: (item as { image_url?: string | null }).image_url ?? foodImage,
    };
  });
  return {
    entries: (entries ?? []) as MealEntryRecord[],
    items: enrichedItems as MealEntryItemRecord[],
  };
};

export const createMealEntrySupabase = async (payload: {
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
}) => {
  const userId = await throwIfNoUser();
  const { data: entry, error: entryErr } = await supabase
    .from("meal_entries")
    .insert({
      user_id: userId,
      local_date: payload.localDate,
      meal_type_id: payload.mealTypeId ?? null,
      notes: payload.notes ?? null,
    })
    .select()
    .single();
  if (entryErr) throw new Error(entryErr.message);
  const rows = payload.items.map((item, i) => ({
    meal_entry_id: entry.id,
    food_id: item.foodId ?? null,
    food_name: item.foodName,
    portion_label: item.portionLabel ?? null,
    portion_grams: item.portionGrams ?? null,
    quantity: item.quantity ?? 1,
    kcal: item.kcal ?? 0,
    carbs_g: item.carbsG ?? 0,
    protein_g: item.proteinG ?? 0,
    fat_g: item.fatG ?? 0,
    micronutrients: item.micronutrients ?? {},
    sort_order: item.sortOrder ?? i,
  }));
  const { data: insertedItems, error: itemsErr } = await supabase
    .from("meal_entry_items")
    .insert(rows)
    .select();
  if (itemsErr) throw new Error(itemsErr.message);
  return {
    entry: entry as MealEntryRecord,
    items: (insertedItems ?? []) as MealEntryItemRecord[],
  };
};

export const updateMealEntryItemSupabase = async (
  itemId: string,
  payload: {
    quantity?: number;
    kcal?: number;
    carbsG?: number;
    proteinG?: number;
    fatG?: number;
  },
) => {
  const updates: Record<string, unknown> = {};
  if (payload.quantity != null) updates.quantity = payload.quantity;
  if (payload.kcal != null) updates.kcal = payload.kcal;
  if (payload.carbsG != null) updates.carbs_g = payload.carbsG;
  if (payload.proteinG != null) updates.protein_g = payload.proteinG;
  if (payload.fatG != null) updates.fat_g = payload.fatG;
  const { data, error } = await supabase
    .from("meal_entry_items")
    .update(updates)
    .eq("id", itemId)
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { item: data as MealEntryItemRecord | null };
};

export const deleteMealEntryItemSupabase = async (itemId: string) => {
  const { error } = await supabase
    .from("meal_entry_items")
    .delete()
    .eq("id", itemId);
  if (error) throw new Error(error.message);
  return { deleted: itemId };
};

// ─── foods (search, favorites, history) ─────────────────────────────────────
export const searchFoodsSupabase = async (
  query: string,
  limit = 20,
  external = true,
) => {
  const userId = getUserId();
  let q = supabase
    .from("foods")
    .select("*, brand:brands(name, logo_url)")
    .limit(limit);
  if (userId) {
    q = q.or(`is_global.eq.true,created_by_user_id.eq.${userId}`);
  } else {
    q = q.eq("is_global", true);
  }
  if (query.trim()) {
    q = q.textSearch("search_vector", query.trim(), { type: "websearch", config: "simple" });
  }
  const { data, error } = await q.order("is_global", { ascending: false });
  if (error) throw new Error(error.message);
  const dbItems = (data ?? []).map((r: Record<string, unknown>) => ({
    ...r,
    brand_name: (r.brand as { name?: string })?.name ?? r.brand,
    brand_logo_url: (r.brand as { logo_url?: string })?.logo_url ?? null,
  })) as FoodRecord[];

  if (!external || !query.trim()) return { items: dbItems };

  try {
    const { items: extItems } = await searchFoodsExternalSupabase(query, limit);
    const dbNames = new Set(dbItems.map((i) => i.name?.toLowerCase()));
    const merged = [
      ...dbItems,
      ...extItems
        .filter((i) => !dbNames.has(i.name?.toLowerCase()))
        .map((i) => ({
          ...i,
          id: `ext_${i.source}_${i.barcode ?? i.name}`,
          is_global: true,
          created_by_user_id: null,
          brand_name: i.brand,
          brand_logo_url: null,
        })),
    ].slice(0, limit);
    return { items: merged as FoodRecord[] };
  } catch {
    return { items: dbItems };
  }
};

export const fetchFoodFavoritesSupabase = async () => {
  const userId = await throwIfNoUser();
  const { data: favs, error: fErr } = await supabase
    .from("user_food_favorites")
    .select("food_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (fErr) throw new Error(fErr.message);
  const ids = (favs ?? []).map((f) => f.food_id);
  if (ids.length === 0) return { items: [] as FoodRecord[] };
  const { data: foods, error } = await supabase
    .from("foods")
    .select("*, brand:brands(name, logo_url)")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const byId = Object.fromEntries((foods ?? []).map((f: Record<string, unknown>) => [
    f.id,
    { ...f, brand_name: (f.brand as { name?: string })?.name ?? f.brand, brand_logo_url: (f.brand as { logo_url?: string })?.logo_url ?? null },
  ]));
  const ordered = ids.map((id) => byId[id]).filter(Boolean);
  return { items: ordered as FoodRecord[] };
};

export const fetchFoodHistorySupabase = async (limit = 20) => {
  const userId = await throwIfNoUser();
  const { data: hist, error: hErr } = await supabase
    .from("user_food_history")
    .select("food_id")
    .eq("user_id", userId)
    .order("last_logged_at", { ascending: false })
    .limit(limit);
  if (hErr) throw new Error(hErr.message);
  const ids = (hist ?? []).map((h) => h.food_id);
  if (ids.length === 0) return { items: [] as FoodRecord[] };
  const { data: foods, error } = await supabase
    .from("foods")
    .select("*, brand:brands(name, logo_url)")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const byId = Object.fromEntries((foods ?? []).map((f: Record<string, unknown>) => [
    f.id,
    { ...f, brand_name: (f.brand as { name?: string })?.name ?? f.brand, brand_logo_url: (f.brand as { logo_url?: string })?.logo_url ?? null },
  ]));
  const ordered = ids.map((id) => byId[id]).filter(Boolean);
  return { items: ordered as FoodRecord[] };
};

export const fetchFoodByIdSupabase = async (foodId: string) => {
  const { data, error } = await supabase
    .from("foods")
    .select("*, brand:brands(name, logo_url)")
    .eq("id", foodId)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  if (!data) return { item: null };
  const d = data as Record<string, unknown>;
  return {
    item: {
      ...d,
      brand_name: (d.brand as { name?: string })?.name ?? d.brand,
      brand_logo_url: (d.brand as { logo_url?: string })?.logo_url ?? null,
    } as FoodRecord,
  };
};

export const fetchFoodServingsSupabase = async (foodId: string) => {
  const { data, error } = await supabase
    .from("food_servings")
    .select("*")
    .eq("food_id", foodId);
  if (error) throw new Error(error.message);
  return { servings: (data ?? []) as FoodServingRecord[] };
};

export const toggleFoodFavoriteSupabase = async (foodId: string, favorite: boolean) => {
  const userId = await throwIfNoUser();
  if (favorite) {
    await supabase.from("user_food_favorites").upsert(
      { user_id: userId, food_id: foodId },
      { onConflict: "user_id,food_id" },
    );
  } else {
    await supabase
      .from("user_food_favorites")
      .delete()
      .eq("user_id", userId)
      .eq("food_id", foodId);
  }
  return { ok: true };
};

export const createFoodSupabase = async (payload: {
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
}) => {
  const userId = await throwIfNoUser();
  const { data, error } = await supabase
    .from("foods")
    .insert({
      name: payload.name,
      brand: payload.brand ?? null,
      brand_id: payload.brandId ?? null,
      barcode: payload.barcode ?? null,
      source: payload.source ?? "custom",
      is_global: false,
      created_by_user_id: userId,
      portion_label: payload.portionLabel ?? null,
      portion_grams: payload.portionGrams ?? null,
      kcal: payload.kcal,
      carbs_g: payload.carbsG,
      protein_g: payload.proteinG,
      fat_g: payload.fatG,
      micronutrients: payload.micronutrients ?? {},
      image_url: payload.imageUrl ?? null,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { item: data as FoodRecord };
};

// ─── brands ─────────────────────────────────────────────────────────────────
export const fetchBrandsSupabase = async (
  query = "",
  verified = true,
  limit = 50,
) => {
  let q = supabase
    .from("brands")
    .select("*")
    .limit(limit);
  if (verified) q = q.eq("is_verified", true);
  if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return { items: (data ?? []) as BrandRecord[] };
};

export const createBrandSupabase = async (payload: {
  name: string;
  websiteUrl?: string;
  logoUrl?: string;
}) => {
  const userId = await throwIfNoUser();
  const { data, error } = await supabase
    .from("brands")
    .insert({
      name: payload.name.trim(),
      website_url: payload.websiteUrl ?? null,
      logo_url: payload.logoUrl ?? null,
      is_verified: false,
      created_by_user_id: userId,
    })
    .select()
    .single();
  if (error) throw new Error(error.message);
  return { brand: data as BrandRecord };
};

// ─── tracking (weight, steps, water) ────────────────────────────────────────
export const fetchWeightLogsSupabase = async (options?: {
  start?: string;
  end?: string;
  limit?: number;
}) => {
  const userId = await throwIfNoUser();
  let q = supabase
    .from("weight_logs")
    .select("local_date, weight, unit")
    .eq("user_id", userId)
    .order("local_date", { ascending: false });
  if (options?.start) q = q.gte("local_date", options.start);
  if (options?.end) q = q.lte("local_date", options.end);
  if (options?.limit) q = q.limit(options.limit);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return {
    items: (data ?? []).map((r) => ({
      local_date: r.local_date,
      weight: r.weight,
      unit: r.unit ?? "kg",
    })),
  };
};

export const upsertWeightLogSupabase = async (payload: {
  localDate: string;
  weight: number;
  unit: string;
  notes?: string;
}) => {
  const userId = await throwIfNoUser();
  const { data, error } = await supabase
    .from("weight_logs")
    .upsert(
      {
        user_id: userId,
        local_date: payload.localDate,
        weight: payload.weight,
        unit: payload.unit,
        notes: payload.notes ?? null,
      },
      { onConflict: "user_id,local_date" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return {
    entry: {
      local_date: payload.localDate,
      weight: payload.weight,
      unit: payload.unit,
    },
  };
};

export const fetchStepsLogsSupabase = async (localDate?: string) => {
  const userId = await throwIfNoUser();
  let q = supabase
    .from("steps_logs")
    .select("local_date, steps, source")
    .eq("user_id", userId)
    .order("local_date", { ascending: false });
  if (localDate) q = q.eq("local_date", localDate);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return {
    items: (data ?? []).map((r) => ({
      local_date: r.local_date,
      steps: r.steps ?? 0,
      source: r.source ?? null,
    })),
  };
};

export const upsertStepsLogSupabase = async (payload: {
  localDate: string;
  steps: number;
  source?: string;
}) => {
  const userId = await throwIfNoUser();
  const source = payload.source ?? "manual";
  const { data: existing } = await supabase
    .from("steps_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("local_date", payload.localDate)
    .eq("source", source)
    .single();
  if (existing) {
    await supabase
      .from("steps_logs")
      .update({ steps: payload.steps })
      .eq("id", existing.id);
  } else {
    await supabase.from("steps_logs").insert({
      user_id: userId,
      local_date: payload.localDate,
      steps: payload.steps,
      source,
    });
  }
  return { entry: { local_date: payload.localDate, steps: payload.steps } };
};

export const fetchWaterLogsSupabase = async (localDate?: string) => {
  const userId = await throwIfNoUser();
  let q = supabase
    .from("water_logs")
    .select("local_date, amount_ml, source")
    .eq("user_id", userId)
    .order("local_date", { ascending: false });
  if (localDate) q = q.eq("local_date", localDate);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return {
    items: (data ?? []).map((r) => ({
      local_date: r.local_date,
      amount_ml: r.amount_ml ?? 0,
      source: r.source ?? null,
    })),
  };
};

export const upsertWaterLogSupabase = async (payload: {
  localDate: string;
  amountMl: number;
  source?: string;
}) => {
  const userId = await throwIfNoUser();
  await supabase.from("water_logs").insert({
    user_id: userId,
    local_date: payload.localDate,
    amount_ml: payload.amountMl,
    source: payload.source ?? "manual",
  });
  return { entry: { local_date: payload.localDate, amount_ml: payload.amountMl } };
};

export const fetchActivityGoalsSupabase = async () => {
  const userId = await throwIfNoUser();
  const { data, error } = await supabase
    .from("user_activity_goals")
    .select("steps_goal, water_goal_ml, weight_unit")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return {
    goals: data
      ? {
          steps_goal: data.steps_goal,
          water_goal_ml: data.water_goal_ml,
          weight_unit: data.weight_unit ?? "lb",
        }
      : null,
  };
};

// ─── nutrition summary ─────────────────────────────────────────────────────
export const fetchNutritionSummarySupabase = async (localDate: string) => {
  const userId = await throwIfNoUser();
  const { data: entries } = await supabase
    .from("meal_entries")
    .select("id")
    .eq("user_id", userId)
    .eq("local_date", localDate);
  const ids = (entries ?? []).map((e) => e.id);
  if (ids.length === 0) {
    const { data: targets } = await supabase
      .from("daily_nutrition_targets")
      .select("kcal_goal, carbs_g, protein_g, fat_g")
      .eq("user_id", userId)
      .eq("local_date", localDate)
      .maybeSingle();
    const { data: settings } = await supabase
      .from("user_nutrition_settings")
      .select("kcal_goal, carbs_g, protein_g, fat_g")
      .eq("user_id", userId)
      .maybeSingle();
    return {
      localDate,
      totals: { kcal: 0, carbs_g: 0, protein_g: 0, fat_g: 0 },
      micros: null,
      targets: targets ?? null,
      settings: settings ?? null,
    };
  }
  const { data: items, error: iErr } = await supabase
    .from("meal_entry_items")
    .select("kcal, carbs_g, protein_g, fat_g")
    .in("meal_entry_id", ids);
  if (iErr) throw new Error(iErr.message);
  const totals = (items ?? []).reduce(
    (acc, i) => ({
      kcal: acc.kcal + Number(i.kcal ?? 0),
      carbs_g: acc.carbs_g + Number(i.carbs_g ?? 0),
      protein_g: acc.protein_g + Number(i.protein_g ?? 0),
      fat_g: acc.fat_g + Number(i.fat_g ?? 0),
    }),
    { kcal: 0, carbs_g: 0, protein_g: 0, fat_g: 0 },
  );
  const { data: targets } = await supabase
    .from("daily_nutrition_targets")
    .select("kcal_goal, carbs_g, protein_g, fat_g")
    .eq("user_id", userId)
    .eq("local_date", localDate)
    .maybeSingle();
  const { data: settings } = await supabase
    .from("user_nutrition_settings")
    .select("kcal_goal, carbs_g, protein_g, fat_g")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    localDate,
    totals,
    micros: null,
    targets: targets ?? null,
    settings: settings ?? null,
  };
};

export const fetchNutritionSettingsSupabase = async () => {
  const userId = await throwIfNoUser();
  const { data, error } = await supabase
    .from("user_nutrition_settings")
    .select("kcal_goal, carbs_g, protein_g, fat_g")
    .eq("user_id", userId)
    .single();
  if (error && error.code !== "PGRST116") throw new Error(error.message);
  return { settings: data ?? null };
};

export const upsertActivityGoalsSupabase = async (payload: {
  stepsGoal?: number;
  waterGoalMl?: number;
  weightUnit?: string;
}) => {
  const userId = await throwIfNoUser();
  const { data, error } = await supabase
    .from("user_activity_goals")
    .upsert(
      {
        user_id: userId,
        steps_goal: payload.stepsGoal ?? null,
        water_goal_ml: payload.waterGoalMl ?? null,
        weight_unit: payload.weightUnit ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();
  if (error) throw new Error(error.message);
  return {
    goals: {
      steps_goal: data?.steps_goal ?? null,
      water_goal_ml: data?.water_goal_ml ?? null,
      weight_unit: data?.weight_unit ?? null,
    },
  };
};

// ─── user profile ───────────────────────────────────────────────────────────

export const fetchUserProfileSupabase = async () => {
  const userId = await throwIfNoUser();
  const data = throwOnError(
    await supabase
      .from("user_profiles")
      .select("display_name, sex, dob, height_cm, units, timezone")
      .eq("user_id", userId)
      .single(),
    true,
  );
  return { profile: data ?? null };
};

export const upsertUserProfileSupabase = async (payload: {
  displayName: string;
  sex?: string | null;
  dob?: string | null;
  heightCm?: number | null;
  units?: string | null;
  timezone?: string | null;
}) => {
  const userId = await throwIfNoUser();
  throwOnError(
    await supabase.from("user_profiles").upsert(
      {
        user_id: userId,
        display_name: payload.displayName,
        sex: payload.sex ?? null,
        dob: payload.dob ?? null,
        height_cm: payload.heightCm ?? null,
        units: payload.units ?? null,
        timezone: payload.timezone ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    ),
  );
  return { profile: { user_id: userId } };
};

// ─── food extra CRUD ────────────────────────────────────────────────────────

export const fetchFoodByBarcodeSupabase = async (barcode: string) => {
  const data = throwOnError(
    await supabase
      .from("foods")
      .select("*, brand:brands(name, logo_url)")
      .eq("barcode", barcode)
      .limit(1)
      .maybeSingle(),
  );
  if (!data) return { item: null };
  const d = data as Record<string, unknown>;
  return {
    item: {
      ...d,
      brand_name: (d.brand as { name?: string })?.name ?? d.brand,
      brand_logo_url: (d.brand as { logo_url?: string })?.logo_url ?? null,
    } as FoodRecord,
  };
};

export const createFoodServingSupabase = async (
  foodId: string,
  payload: { label: string; grams: number },
) => {
  const data = throwOnError(
    await supabase
      .from("food_servings")
      .insert({ food_id: foodId, label: payload.label, grams: payload.grams })
      .select()
      .single(),
  );
  return { serving: data as FoodServingRecord };
};

export const updateFoodImageSupabase = async (foodId: string, imageUrl: string) => {
  const data = throwOnError(
    await supabase
      .from("foods")
      .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
      .eq("id", foodId)
      .select()
      .single(),
  );
  return { item: data as FoodRecord };
};

export const deleteFoodSupabase = async (foodId: string) => {
  throwOnError(await supabase.from("foods").delete().eq("id", foodId));
  return { ok: true };
};

export const updateFoodMasterSupabase = async (
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
) => {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.brand !== undefined) updates.brand = payload.brand;
  if (payload.brandId !== undefined) updates.brand_id = payload.brandId;
  if (payload.portionLabel !== undefined) updates.portion_label = payload.portionLabel;
  if (payload.portionGrams !== undefined) updates.portion_grams = payload.portionGrams;
  if (payload.kcal !== undefined) updates.kcal = payload.kcal;
  if (payload.carbsG !== undefined) updates.carbs_g = payload.carbsG;
  if (payload.proteinG !== undefined) updates.protein_g = payload.proteinG;
  if (payload.fatG !== undefined) updates.fat_g = payload.fatG;
  if (payload.micronutrients !== undefined) updates.micronutrients = payload.micronutrients;
  const data = throwOnError(
    await supabase.from("foods").update(updates).eq("id", foodId).select().single(),
  );
  return { item: data as FoodRecord };
};

// ─── brand extra CRUD ───────────────────────────────────────────────────────

export const updateBrandSupabase = async (
  brandId: string,
  payload: { name?: string; websiteUrl?: string | null; logoUrl?: string | null; isVerified?: boolean },
) => {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.websiteUrl !== undefined) updates.website_url = payload.websiteUrl;
  if (payload.logoUrl !== undefined) updates.logo_url = payload.logoUrl;
  if (payload.isVerified !== undefined) updates.is_verified = payload.isVerified;
  const data = throwOnError(
    await supabase.from("brands").update(updates).eq("id", brandId).select().single(),
  );
  return { brand: data as BrandRecord };
};

// ─── nutrition targets & settings upsert ────────────────────────────────────

export const upsertNutritionTargetsSupabase = async (payload: {
  localDate: string;
  kcalGoal?: number;
  carbsG?: number;
  proteinG?: number;
  fatG?: number;
}) => {
  const userId = await throwIfNoUser();
  throwOnError(
    await supabase.from("daily_nutrition_targets").upsert(
      {
        user_id: userId,
        local_date: payload.localDate,
        kcal_goal: payload.kcalGoal ?? null,
        carbs_g: payload.carbsG ?? null,
        protein_g: payload.proteinG ?? null,
        fat_g: payload.fatG ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,local_date" },
    ),
  );
  return { target: { local_date: payload.localDate } };
};

export const upsertNutritionSettingsSupabase = async (payload: {
  kcalGoal?: number;
  carbsG?: number;
  proteinG?: number;
  fatG?: number;
}) => {
  const userId = await throwIfNoUser();
  const data = throwOnError(
    await supabase
      .from("user_nutrition_settings")
      .upsert(
        {
          user_id: userId,
          kcal_goal: payload.kcalGoal ?? null,
          carbs_g: payload.carbsG ?? null,
          protein_g: payload.proteinG ?? null,
          fat_g: payload.fatG ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      )
      .select()
      .single(),
  );
  return { settings: { kcal_goal: data?.kcal_goal ?? null } };
};

// ─── nutrition analytics (single RPC call per function) ─────────────────────

export const fetchNutritionWeeklySupabase = async (start: string) => {
  const userId = await throwIfNoUser();
  const { data, error } = await supabase.rpc("nutrition_weekly", { p_user_id: userId, p_start: start });
  if (error) throw new Error(error.message);
  return { items: (data ?? []) as Array<{ day: string; kcal: number }> };
};

export const fetchNutritionStreakSupabase = async () => {
  const userId = await throwIfNoUser();
  const { data, error } = await supabase.rpc("nutrition_streak", { p_user_id: userId });
  if (error) throw new Error(error.message);
  const row = (data as Array<{ current_streak: number; best_streak: number }>)?.[0];
  return { current: row?.current_streak ?? 0, best: row?.best_streak ?? 0 };
};

export const fetchNutritionAnalyticsSupabase = async (days = 28) => {
  const userId = await throwIfNoUser();
  const { data, error } = await supabase.rpc("nutrition_analytics", { p_user_id: userId, p_days: days });
  if (error) throw new Error(error.message);
  const items = (data ?? []) as Array<{ day: string; kcal: number; carbs_g: number; protein_g: number; fat_g: number }>;
  const avg = items.length ? Math.round(items.reduce((s, i) => s + i.kcal, 0) / items.length) : 0;
  return { days, average: avg, items };
};

// ─── training analytics ─────────────────────────────────────────────────────

export const fetchTrainingAnalyticsSupabase = async (weeks = 8) => {
  const userId = await throwIfNoUser();
  const start = new Date();
  start.setDate(start.getDate() - weeks * 7);
  const startStr = start.toISOString().slice(0, 10);
  const { data } = await supabase
    .from("exercise_stats_daily")
    .select("day, total_sets, total_volume_kg")
    .eq("user_id", userId)
    .gte("day", startStr);
  const weekBuckets: Record<string, { volume: number; total_sets: number }> = {};
  for (const row of data ?? []) {
    const d = new Date(row.day);
    d.setDate(d.getDate() - d.getDay());
    const weekStart = d.toISOString().slice(0, 10);
    const bucket = weekBuckets[weekStart] ?? { volume: 0, total_sets: 0 };
    bucket.volume += Number(row.total_volume_kg ?? 0);
    bucket.total_sets += Number(row.total_sets ?? 0);
    weekBuckets[weekStart] = bucket;
  }
  return {
    weeks,
    items: Object.entries(weekBuckets).map(([week_start, v]) => ({
      week_start,
      volume: Math.round(v.volume),
      total_sets: v.total_sets,
    })),
  };
};

export const fetchExerciseAnalyticsSupabase = async (exerciseId: number, days = 84) => {
  const userId = await throwIfNoUser();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const { data } = await supabase
    .from("exercise_stats_daily")
    .select("day, total_sets, total_volume_kg, max_weight_kg, est_one_rm_kg")
    .eq("user_id", userId)
    .eq("exercise_id", exerciseId)
    .gte("day", start.toISOString().slice(0, 10))
    .order("day", { ascending: true });
  return {
    days,
    items: (data ?? []).map((r) => ({
      day: r.day,
      total_sets: r.total_sets,
      total_volume_kg: Number(r.total_volume_kg ?? 0),
      max_weight_kg: Number(r.max_weight_kg ?? 0),
      est_one_rm_kg: Number(r.est_one_rm_kg ?? 0),
    })),
  };
};

export const fetchMuscleAnalyticsSupabase = async (days = 84) => {
  const userId = await throwIfNoUser();
  const start = new Date();
  start.setDate(start.getDate() - days);
  const { data } = await supabase
    .from("muscle_stats_daily")
    .select("day, muscle, total_sets, total_volume_kg")
    .eq("user_id", userId)
    .gte("day", start.toISOString().slice(0, 10))
    .order("day", { ascending: true });
  return {
    days,
    items: (data ?? []).map((r) => ({
      day: r.day,
      muscle: r.muscle,
      total_sets: r.total_sets,
      total_volume_kg: Number(r.total_volume_kg ?? 0),
    })),
  };
};

// ─── weight / water extras ──────────────────────────────────────────────────

export const fetchLatestWeightLogSupabase = async () => {
  const userId = await throwIfNoUser();
  const data = throwOnError(
    await supabase
      .from("weight_logs")
      .select("local_date, weight, unit, logged_at")
      .eq("user_id", userId)
      .order("local_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
  return { entry: data ?? null };
};

export const deleteWeightLogSupabase = async (localDate: string) => {
  const userId = await throwIfNoUser();
  throwOnError(
    await supabase
      .from("weight_logs")
      .delete()
      .eq("user_id", userId)
      .eq("local_date", localDate),
  );
  return { ok: true };
};

export const setWaterLogTotalSupabase = async (payload: {
  localDate: string;
  totalMl: number;
  source?: string;
}) => {
  const userId = await throwIfNoUser();
  await supabase
    .from("water_logs")
    .delete()
    .eq("user_id", userId)
    .eq("local_date", payload.localDate);
  if (payload.totalMl > 0) {
    await supabase.from("water_logs").insert({
      user_id: userId,
      local_date: payload.localDate,
      amount_ml: payload.totalMl,
      source: payload.source ?? "manual",
    });
  }
  return {
    entry: payload.totalMl > 0
      ? { local_date: payload.localDate, amount_ml: payload.totalMl }
      : null,
    totalMl: payload.totalMl,
  };
};

// ─── exercises ──────────────────────────────────────────────────────────────

export const searchExercisesSupabase = async (
  query: string,
  _seed = false,
  scope: "all" | "mine" = "all",
) => {
  const userId = getUserId();
  let q = supabase.from("exercises").select("*").limit(50);
  if (scope === "mine" && userId) {
    q = q.eq("created_by_user_id", userId);
  }
  if (query.trim()) {
    q = q.textSearch("name", query.trim(), { type: "websearch", config: "simple" });
  }
  const data = throwOnError(await q.order("name", { ascending: true }));
  return { items: (data ?? []) as Record<string, unknown>[] };
};

export const fetchExerciseByNameSupabase = async (name: string) => {
  const data = throwOnError(
    await supabase.from("exercises").select("*").ilike("name", name).limit(1).maybeSingle(),
  );
  return { exercise: (data as Record<string, unknown>) ?? null };
};

export const fetchExerciseByIdSupabase = async (exerciseId: number) => {
  const data = throwOnError(
    await supabase.from("exercises").select("*").eq("id", exerciseId).maybeSingle(),
  );
  return { exercise: (data as Record<string, unknown>) ?? null };
};

export const fetchAdminExercisesSupabase = async (query = "", limit = 120) => {
  let q = supabase.from("exercises").select("*").limit(limit);
  if (query.trim()) q = q.ilike("name", `%${query.trim()}%`);
  const data = throwOnError(await q.order("name", { ascending: true }));
  return { items: (data ?? []) as Record<string, unknown>[] };
};

export const createExerciseSupabase = async (payload: {
  name: string;
  description?: string | null;
  category?: string | null;
  equipment?: string[] | null;
  muscles?: string[] | null;
  imageUrl?: string | null;
}) => {
  const userId = await throwIfNoUser();
  const data = throwOnError(
    await supabase
      .from("exercises")
      .insert({
        name: payload.name,
        description: payload.description ?? null,
        category: payload.category ?? null,
        equipment: payload.equipment ?? [],
        muscles: payload.muscles ?? [],
        image_url: payload.imageUrl ?? null,
        created_by_user_id: userId,
        is_custom: true,
      })
      .select()
      .single(),
  );
  return { exercise: data as Record<string, unknown> };
};

export const updateExerciseMasterSupabase = async (
  id: number,
  payload: {
    name?: string;
    description?: string | null;
    category?: string | null;
    equipment?: string[] | null;
    muscles?: string[] | null;
    imageUrl?: string | null;
  },
) => {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.description !== undefined) updates.description = payload.description;
  if (payload.category !== undefined) updates.category = payload.category;
  if (payload.equipment !== undefined) updates.equipment = payload.equipment;
  if (payload.muscles !== undefined) updates.muscles = payload.muscles;
  if (payload.imageUrl !== undefined) updates.image_url = payload.imageUrl;
  const data = throwOnError(
    await supabase.from("exercises").update(updates).eq("id", id).select().single(),
  );
  return { exercise: data as Record<string, unknown> };
};

export const deleteExerciseSupabase = async (exerciseId: number) => {
  throwOnError(await supabase.from("exercises").delete().eq("id", exerciseId));
  return { ok: true };
};

// ─── exercise overrides ─────────────────────────────────────────────────────

export const fetchExerciseOverrideSupabase = async (
  exerciseName: string,
): Promise<ExerciseOverride | null> => {
  const userId = await throwIfNoUser();
  const data = throwOnError(
    await supabase
      .from("exercise_overrides")
      .select("*")
      .eq("user_id", userId)
      .eq("exercise_name", exerciseName)
      .maybeSingle(),
  );
  return (data as ExerciseOverride) ?? null;
};

export const saveExerciseOverrideSupabase = async (payload: {
  exerciseName: string;
  steps?: string[] | null;
  guideUrl?: string | null;
}) => {
  const userId = await throwIfNoUser();
  const data = throwOnError(
    await supabase
      .from("exercise_overrides")
      .upsert(
        {
          user_id: userId,
          exercise_name: payload.exerciseName,
          steps: payload.steps ?? null,
          guide_url: payload.guideUrl ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,exercise_name" },
      )
      .select()
      .single(),
  );
  return { override: data as ExerciseOverride };
};

// ─── exercise media ─────────────────────────────────────────────────────────

export const fetchExerciseMediaSupabase = async (
  exerciseName: string,
): Promise<ExerciseMedia[]> => {
  const userId = getUserId();
  let q = supabase
    .from("exercise_media")
    .select("*")
    .eq("exercise_name", exerciseName);
  if (userId) {
    q = q.or(`user_id.eq.${userId},user_id.is.null`);
  } else {
    q = q.is("user_id", null);
  }
  const data = throwOnError(await q.order("is_primary", { ascending: false }));
  return (data ?? []) as ExerciseMedia[];
};

export const createExerciseMediaSupabase = async (payload: {
  exerciseName: string;
  sourceType: "cloudinary" | "youtube" | "external";
  mediaUrl: string;
  thumbUrl?: string | null;
  isPrimary?: boolean;
}) => {
  const userId = await throwIfNoUser();
  const data = throwOnError(
    await supabase
      .from("exercise_media")
      .insert({
        exercise_name: payload.exerciseName,
        user_id: userId,
        source_type: payload.sourceType,
        media_url: payload.mediaUrl,
        thumb_url: payload.thumbUrl ?? null,
        is_primary: payload.isPrimary ?? false,
      })
      .select()
      .single(),
  );
  return { media: data as ExerciseMedia };
};

export const setExerciseMediaPrimarySupabase = async (mediaId: string) => {
  const data = throwOnError(
    await supabase
      .from("exercise_media")
      .update({ is_primary: true })
      .eq("id", mediaId)
      .select()
      .single(),
  );
  return { media: data as ExerciseMedia };
};

export const deleteExerciseMediaSupabase = async (mediaId: string) => {
  throwOnError(await supabase.from("exercise_media").delete().eq("id", mediaId));
  return { ok: true };
};

// ─── groceries ──────────────────────────────────────────────────────────────

export const fetchGroceryBagSupabase = async () => {
  const userId = await throwIfNoUser();
  const data = throwOnError(
    await supabase
      .from("grocery_bag_items")
      .select("id, name, bucket, macro_group, category")
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  );
  return {
    items: (data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      bucket: r.bucket as string,
      macroGroup: (r.macro_group as string | null) ?? null,
      category: (r.category as string | null) ?? null,
    })),
  };
};

export const addGroceryBagItemSupabase = async (payload: {
  name: string;
  bucket: "staples" | "rotation" | "special";
  macroGroup?: string | null;
  category?: string | null;
}) => {
  const userId = await throwIfNoUser();
  const data = throwOnError(
    await supabase
      .from("grocery_bag_items")
      .insert({
        user_id: userId,
        name: payload.name,
        bucket: payload.bucket,
        macro_group: payload.macroGroup ?? null,
        category: payload.category ?? null,
      })
      .select("id")
      .single(),
  );
  return { item: { id: data.id as string } };
};

export const removeGroceryBagItemSupabase = async (itemId: string) => {
  throwOnError(await supabase.from("grocery_bag_items").delete().eq("id", itemId));
  return { ok: true };
};

// ─── meal plans ─────────────────────────────────────────────────────────────

export const fetchMealPlansSupabase = async () => {
  const userId = await throwIfNoUser();
  const [groupsRes, daysRes, assignRes] = await Promise.all([
    supabase.from("meal_plan_groups").select("*").eq("user_id", userId).order("sort_order"),
    supabase.from("meal_plan_days").select("*").eq("user_id", userId).order("updated_at", { ascending: false }),
    supabase.from("meal_plan_week_assignments").select("*").eq("user_id", userId),
  ]);
  const groups = (groupsRes.data ?? []) as MealPlanGroupRecord[];
  const days = (daysRes.data ?? []) as MealPlanDayRecord[];
  const weekAssignments = (assignRes.data ?? []) as MealPlanWeekAssignmentRecord[];
  const dayIds = days.map((d) => d.id);
  let meals: MealPlanMealRecord[] = [];
  let items: MealPlanItemRecord[] = [];
  if (dayIds.length > 0) {
    const mealsRes = await supabase.from("meal_plan_meals").select("*").in("day_id", dayIds).order("sort_order");
    meals = (mealsRes.data ?? []) as MealPlanMealRecord[];
    const mealIds = meals.map((m) => m.id);
    if (mealIds.length > 0) {
      const itemsRes = await supabase.from("meal_plan_items").select("*").in("meal_id", mealIds).order("sort_order");
      items = (itemsRes.data ?? []) as MealPlanItemRecord[];
    }
  }
  return { groups, days, meals, items, weekAssignments };
};

export const createMealPlanDaySupabase = async (payload: {
  name: string;
  groupId?: string | null;
  targets?: {
    kcal?: number; protein?: number; carbs?: number; fat?: number;
    kcalMin?: number | null; kcalMax?: number | null;
    proteinMin?: number | null; proteinMax?: number | null;
    carbsMin?: number | null; carbsMax?: number | null;
    fatMin?: number | null; fatMax?: number | null;
  };
}) => {
  const userId = await throwIfNoUser();
  const t = payload.targets ?? {};
  const day = throwOnError(
    await supabase
      .from("meal_plan_days")
      .insert({
        user_id: userId,
        name: payload.name,
        group_id: payload.groupId ?? null,
        target_kcal: t.kcal ?? 0,
        target_protein_g: t.protein ?? 0,
        target_carbs_g: t.carbs ?? 0,
        target_fat_g: t.fat ?? 0,
        target_kcal_min: t.kcalMin ?? null,
        target_kcal_max: t.kcalMax ?? null,
        target_protein_g_min: t.proteinMin ?? null,
        target_protein_g_max: t.proteinMax ?? null,
        target_carbs_g_min: t.carbsMin ?? null,
        target_carbs_g_max: t.carbsMax ?? null,
        target_fat_g_min: t.fatMin ?? null,
        target_fat_g_max: t.fatMax ?? null,
      })
      .select()
      .single(),
  ) as MealPlanDayRecord;
  const defaultMeals = [
    { label: "Breakfast", emoji: "🌅", sort_order: 0 },
    { label: "Lunch", emoji: "☀️", sort_order: 1 },
    { label: "Dinner", emoji: "🌙", sort_order: 2 },
    { label: "Snack", emoji: "🍎", sort_order: 3 },
  ].map((m) => ({ ...m, day_id: day.id }));
  const meals = throwOnError(
    await supabase.from("meal_plan_meals").insert(defaultMeals).select(),
  ) as MealPlanMealRecord[];
  return { day, meals };
};

export const updateMealPlanDaySupabase = async (
  dayId: string,
  payload: {
    name?: string;
    groupId?: string | null;
    targets?: {
      kcal?: number; protein?: number; carbs?: number; fat?: number;
      kcalMin?: number | null; kcalMax?: number | null;
      proteinMin?: number | null; proteinMax?: number | null;
      carbsMin?: number | null; carbsMax?: number | null;
      fatMin?: number | null; fatMax?: number | null;
    };
  },
) => {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.groupId !== undefined) updates.group_id = payload.groupId;
  if (payload.targets) {
    const t = payload.targets;
    if (t.kcal !== undefined) updates.target_kcal = t.kcal;
    if (t.protein !== undefined) updates.target_protein_g = t.protein;
    if (t.carbs !== undefined) updates.target_carbs_g = t.carbs;
    if (t.fat !== undefined) updates.target_fat_g = t.fat;
    if (t.kcalMin !== undefined) updates.target_kcal_min = t.kcalMin;
    if (t.kcalMax !== undefined) updates.target_kcal_max = t.kcalMax;
    if (t.proteinMin !== undefined) updates.target_protein_g_min = t.proteinMin;
    if (t.proteinMax !== undefined) updates.target_protein_g_max = t.proteinMax;
    if (t.carbsMin !== undefined) updates.target_carbs_g_min = t.carbsMin;
    if (t.carbsMax !== undefined) updates.target_carbs_g_max = t.carbsMax;
    if (t.fatMin !== undefined) updates.target_fat_g_min = t.fatMin;
    if (t.fatMax !== undefined) updates.target_fat_g_max = t.fatMax;
  }
  const data = throwOnError(
    await supabase.from("meal_plan_days").update(updates).eq("id", dayId).select().single(),
  );
  return { day: data as MealPlanDayRecord };
};

export const deleteMealPlanDaySupabase = async (dayId: string) => {
  throwOnError(await supabase.from("meal_plan_days").delete().eq("id", dayId));
  return { ok: true };
};

export const duplicateMealPlanDaySupabase = async (dayId: string, name?: string) => {
  const userId = await throwIfNoUser();
  const srcDay = throwOnError(await supabase.from("meal_plan_days").select("*").eq("id", dayId).single()) as MealPlanDayRecord;
  const newDay = throwOnError(
    await supabase
      .from("meal_plan_days")
      .insert({
        user_id: userId,
        name: name ?? `${srcDay.name} (copy)`,
        group_id: srcDay.group_id,
        target_kcal: srcDay.target_kcal,
        target_protein_g: srcDay.target_protein_g,
        target_carbs_g: srcDay.target_carbs_g,
        target_fat_g: srcDay.target_fat_g,
        target_kcal_min: srcDay.target_kcal_min ?? null,
        target_kcal_max: srcDay.target_kcal_max ?? null,
        target_protein_g_min: srcDay.target_protein_g_min ?? null,
        target_protein_g_max: srcDay.target_protein_g_max ?? null,
        target_carbs_g_min: srcDay.target_carbs_g_min ?? null,
        target_carbs_g_max: srcDay.target_carbs_g_max ?? null,
        target_fat_g_min: srcDay.target_fat_g_min ?? null,
        target_fat_g_max: srcDay.target_fat_g_max ?? null,
      })
      .select()
      .single(),
  ) as MealPlanDayRecord;
  const srcMeals = throwOnError(
    await supabase.from("meal_plan_meals").select("*").eq("day_id", dayId).order("sort_order"),
  ) as MealPlanMealRecord[];
  const newMeals: MealPlanMealRecord[] = [];
  const allItems: MealPlanItemRecord[] = [];
  for (const srcMeal of srcMeals) {
    const nm = throwOnError(
      await supabase
        .from("meal_plan_meals")
        .insert({ day_id: newDay.id, label: srcMeal.label, emoji: srcMeal.emoji, sort_order: srcMeal.sort_order })
        .select()
        .single(),
    ) as MealPlanMealRecord;
    newMeals.push(nm);
    const srcItems = throwOnError(
      await supabase.from("meal_plan_items").select("*").eq("meal_id", srcMeal.id).order("sort_order"),
    ) as MealPlanItemRecord[];
    if (srcItems.length) {
      const rows = srcItems.map((si) => ({
        meal_id: nm.id,
        food_id: si.food_id,
        food_name: si.food_name,
        quantity: si.quantity,
        slot: si.slot,
        kcal: si.kcal,
        protein_g: si.protein_g,
        carbs_g: si.carbs_g,
        fat_g: si.fat_g,
        sort_order: si.sort_order,
      }));
      const ni = throwOnError(await supabase.from("meal_plan_items").insert(rows).select()) as MealPlanItemRecord[];
      allItems.push(...ni);
    }
  }
  return { day: newDay, meals: newMeals, items: allItems };
};

export const addMealPlanItemSupabase = async (
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
) => {
  const data = throwOnError(
    await supabase
      .from("meal_plan_items")
      .insert({
        meal_id: mealId,
        food_id: payload.foodId ?? null,
        food_name: payload.foodName,
        quantity: payload.quantity ?? 1,
        slot: payload.slot,
        kcal: payload.kcal,
        protein_g: payload.proteinG,
        carbs_g: payload.carbsG,
        fat_g: payload.fatG,
      })
      .select()
      .single(),
  );
  return { item: data as MealPlanItemRecord };
};

export const updateMealPlanItemSupabase = async (
  itemId: string,
  payload: { quantity?: number; slot?: "protein" | "carbs" | "balance" },
) => {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload.quantity !== undefined) updates.quantity = payload.quantity;
  if (payload.slot !== undefined) updates.slot = payload.slot;
  const data = throwOnError(
    await supabase.from("meal_plan_items").update(updates).eq("id", itemId).select().single(),
  );
  return { item: data as MealPlanItemRecord };
};

export const deleteMealPlanItemSupabase = async (itemId: string) => {
  throwOnError(await supabase.from("meal_plan_items").delete().eq("id", itemId));
  return { ok: true };
};

export const reorderMealPlanMealsSupabase = async (dayId: string, mealIds: string[]) => {
  for (let i = 0; i < mealIds.length; i++) {
    await supabase.from("meal_plan_meals").update({ sort_order: i }).eq("id", mealIds[i]);
  }
  const data = throwOnError(
    await supabase.from("meal_plan_meals").select("*").eq("day_id", dayId).order("sort_order"),
  );
  return { meals: (data ?? []) as MealPlanMealRecord[] };
};

export const reorderMealPlanItemsSupabase = async (mealId: string, itemIds: string[]) => {
  for (let i = 0; i < itemIds.length; i++) {
    await supabase.from("meal_plan_items").update({ sort_order: i }).eq("id", itemIds[i]);
  }
  const data = throwOnError(
    await supabase.from("meal_plan_items").select("*").eq("meal_id", mealId).order("sort_order"),
  );
  return { items: (data ?? []) as MealPlanItemRecord[] };
};

export const applyMealPlanToWeekdaysSupabase = async (dayId: string | null, weekdays: number[]) => {
  const userId = await throwIfNoUser();
  const rows = weekdays.map((wd) => ({
    user_id: userId,
    weekday: wd,
    day_id: dayId,
    updated_at: new Date().toISOString(),
  }));
  for (const row of rows) {
    await supabase.from("meal_plan_week_assignments").upsert(row, { onConflict: "user_id,weekday" });
  }
  const data = throwOnError(
    await supabase.from("meal_plan_week_assignments").select("*").eq("user_id", userId),
  );
  return { assignments: (data ?? []) as MealPlanWeekAssignmentRecord[] };
};

export const clearMealPlanWeekdaySupabase = async (weekday: number) => {
  const userId = await throwIfNoUser();
  throwOnError(
    await supabase
      .from("meal_plan_week_assignments")
      .delete()
      .eq("user_id", userId)
      .eq("weekday", weekday),
  );
  return { ok: true };
};

// ─── meal plan groups ───────────────────────────────────────────────────────

export const createMealPlanGroupSupabase = async (payload: { name: string }) => {
  const userId = await throwIfNoUser();
  const data = throwOnError(
    await supabase
      .from("meal_plan_groups")
      .insert({ user_id: userId, name: payload.name })
      .select()
      .single(),
  );
  return { group: data as MealPlanGroupRecord };
};

export const updateMealPlanGroupSupabase = async (
  groupId: string,
  payload: { name?: string; sortOrder?: number },
) => {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.sortOrder !== undefined) updates.sort_order = payload.sortOrder;
  const data = throwOnError(
    await supabase.from("meal_plan_groups").update(updates).eq("id", groupId).select().single(),
  );
  return { group: data as MealPlanGroupRecord };
};

export const deleteMealPlanGroupSupabase = async (groupId: string) => {
  throwOnError(await supabase.from("meal_plan_groups").delete().eq("id", groupId));
  return { ok: true };
};

// ─── meal plan presets ──────────────────────────────────────────────────────

export const fetchMealPlanPresetsSupabase = async () => {
  const userId = await throwIfNoUser();
  const data = throwOnError(
    await supabase.from("meal_plan_target_presets").select("*").eq("user_id", userId).order("sort_order"),
  );
  return { presets: (data ?? []) as MealPlanTargetPresetRecord[] };
};

export const createMealPlanPresetSupabase = async (payload: {
  name: string;
  targets: {
    kcal: number; protein: number; carbs: number; fat: number;
    kcalMin?: number | null; kcalMax?: number | null;
    proteinMin?: number | null; proteinMax?: number | null;
    carbsMin?: number | null; carbsMax?: number | null;
    fatMin?: number | null; fatMax?: number | null;
  };
}) => {
  const userId = await throwIfNoUser();
  const t = payload.targets;
  const data = throwOnError(
    await supabase
      .from("meal_plan_target_presets")
      .insert({
        user_id: userId,
        name: payload.name,
        target_kcal: t.kcal,
        target_protein_g: t.protein,
        target_carbs_g: t.carbs,
        target_fat_g: t.fat,
        target_kcal_min: t.kcalMin ?? null,
        target_kcal_max: t.kcalMax ?? null,
        target_protein_g_min: t.proteinMin ?? null,
        target_protein_g_max: t.proteinMax ?? null,
        target_carbs_g_min: t.carbsMin ?? null,
        target_carbs_g_max: t.carbsMax ?? null,
        target_fat_g_min: t.fatMin ?? null,
        target_fat_g_max: t.fatMax ?? null,
      })
      .select()
      .single(),
  );
  return { preset: data as MealPlanTargetPresetRecord };
};

export const deleteMealPlanPresetSupabase = async (presetId: string) => {
  throwOnError(await supabase.from("meal_plan_target_presets").delete().eq("id", presetId));
  return { ok: true };
};

// ─── workout plans ──────────────────────────────────────────────────────────

export const fetchWorkoutPlansSupabase = async () => {
  const userId = await throwIfNoUser();
  const plans = throwOnError(
    await supabase.from("workout_plans").select("id, name, sort_order").eq("user_id", userId).is("deleted_at", null).order("sort_order"),
  ) as Array<{ id: string; name: string; sort_order: number }>;
  const planIds = plans.map((p) => p.id);
  let templates: Array<{ id: string; plan_id: string; name: string; last_performed_at: string | null; sort_order: number }> = [];
  let exercises: Array<{ id: string; template_id: string; exercise_id: number | null; exercise_name: string; item_order: number }> = [];
  if (planIds.length) {
    templates = throwOnError(
      await supabase.from("workout_templates").select("id, plan_id, name, last_performed_at, sort_order").in("plan_id", planIds).is("deleted_at", null).order("sort_order"),
    ) ?? [];
    const tplIds = templates.map((t) => t.id);
    if (tplIds.length) {
      exercises = throwOnError(
        await supabase.from("workout_template_exercises").select("id, template_id, exercise_id, exercise_name, item_order").in("template_id", tplIds).order("item_order"),
      ) ?? [];
    }
  }
  return { plans, templates, exercises };
};

export const createWorkoutPlanSupabase = async (payload: { name: string; sortOrder?: number }) => {
  const userId = await throwIfNoUser();
  const data = throwOnError(
    await supabase.from("workout_plans").insert({ user_id: userId, name: payload.name, sort_order: payload.sortOrder ?? 0 }).select("id, name, sort_order").single(),
  );
  return { plan: data as { id: string; name: string; sort_order: number } };
};

export const updateWorkoutPlanSupabase = async (planId: string, payload: { name?: string; sortOrder?: number }) => {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.sortOrder !== undefined) updates.sort_order = payload.sortOrder;
  const data = throwOnError(
    await supabase.from("workout_plans").update(updates).eq("id", planId).select("id, name, sort_order").single(),
  );
  return { plan: data as { id: string; name: string; sort_order: number } };
};

export const deleteWorkoutPlanSupabase = async (planId: string) => {
  throwOnError(await supabase.from("workout_plans").update({ deleted_at: new Date().toISOString() }).eq("id", planId));
  return { ok: true };
};

export const createWorkoutTemplateSupabase = async (payload: { planId: string; name: string; sortOrder?: number }) => {
  const data = throwOnError(
    await supabase.from("workout_templates").insert({ plan_id: payload.planId, name: payload.name, sort_order: payload.sortOrder ?? 0 }).select("id, plan_id, name").single(),
  );
  return { template: data as { id: string; plan_id: string; name: string } };
};

export const updateWorkoutTemplateSupabase = async (templateId: string, payload: { name?: string; sortOrder?: number }) => {
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (payload.name !== undefined) updates.name = payload.name;
  if (payload.sortOrder !== undefined) updates.sort_order = payload.sortOrder;
  const data = throwOnError(
    await supabase.from("workout_templates").update(updates).eq("id", templateId).select("id, name").single(),
  );
  return { template: data as { id: string; name: string } };
};

export const deleteWorkoutTemplateSupabase = async (templateId: string) => {
  throwOnError(await supabase.from("workout_templates").update({ deleted_at: new Date().toISOString() }).eq("id", templateId));
  return { ok: true };
};

export const completeWorkoutTemplateSupabase = async (templateId: string) => {
  const data = throwOnError(
    await supabase.from("workout_templates").update({ last_performed_at: new Date().toISOString() }).eq("id", templateId).select("id, last_performed_at").single(),
  );
  return { template: data as { id: string; last_performed_at: string | null } };
};

export const updateWorkoutTemplateExercisesSupabase = async (
  templateId: string,
  exercises: Array<{ name: string; itemOrder: number }>,
) => {
  await supabase.from("workout_template_exercises").delete().eq("template_id", templateId);
  if (exercises.length) {
    const rows = exercises.map((e) => ({
      template_id: templateId,
      exercise_name: e.name,
      item_order: e.itemOrder,
    }));
    throwOnError(await supabase.from("workout_template_exercises").insert(rows));
  }
  return { ok: true };
};

// ─── fitness routines ───────────────────────────────────────────────────────

export const fetchFitnessRoutinesSupabase = async () => {
  const userId = await throwIfNoUser();
  const routines = throwOnError(
    await supabase.from("routines").select("id, name, updated_at").eq("user_id", userId).is("deleted_at", null).order("updated_at", { ascending: false }),
  ) as Array<{ id: string; name: string; updated_at: string }>;
  const routineIds = routines.map((r) => r.id);
  let exercises: Array<{ id: string; routine_id: string; exercise_id: number | null; exercise_name: string; target_sets: number; notes: string | null }> = [];
  if (routineIds.length) {
    exercises = throwOnError(
      await supabase.from("routine_exercises").select("id, routine_id, exercise_id, exercise_name, target_sets, notes").in("routine_id", routineIds).order("item_order"),
    ) ?? [];
  }
  return { routines, exercises };
};

export const createFitnessRoutineSupabase = async (name: string) => {
  const userId = await throwIfNoUser();
  const data = throwOnError(
    await supabase.from("routines").insert({ user_id: userId, name }).select("id, name").single(),
  );
  return { routine: data as { id: string; name: string } };
};

export const renameFitnessRoutineSupabase = async (routineId: string, name: string) => {
  const data = throwOnError(
    await supabase.from("routines").update({ name, updated_at: new Date().toISOString() }).eq("id", routineId).select("id, name").single(),
  );
  return { routine: data as { id: string; name: string } };
};

export const deleteFitnessRoutineSupabase = async (routineId: string) => {
  throwOnError(await supabase.from("routines").update({ deleted_at: new Date().toISOString() }).eq("id", routineId));
  return { ok: true };
};

export const addFitnessRoutineExerciseSupabase = async (
  routineId: string,
  payload: { exerciseId?: number; name: string },
) => {
  const { data: maxRow } = await supabase
    .from("routine_exercises")
    .select("item_order")
    .eq("routine_id", routineId)
    .order("item_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextOrder = ((maxRow?.item_order as number) ?? -1) + 1;
  const data = throwOnError(
    await supabase
      .from("routine_exercises")
      .insert({
        routine_id: routineId,
        exercise_id: payload.exerciseId ?? null,
        exercise_name: payload.name,
        item_order: nextOrder,
      })
      .select("id")
      .single(),
  );
  return { exercise: { id: data.id as string } };
};

export const updateFitnessRoutineExerciseSupabase = async (
  _routineId: string,
  routineExerciseId: string,
  payload: { targetSets?: number; notes?: string },
) => {
  const updates: Record<string, unknown> = {};
  if (payload.targetSets !== undefined) updates.target_sets = payload.targetSets;
  if (payload.notes !== undefined) updates.notes = payload.notes;
  const data = throwOnError(
    await supabase.from("routine_exercises").update(updates).eq("id", routineExerciseId).select("id").single(),
  );
  return { exercise: { id: data.id as string } };
};

export const removeFitnessRoutineExerciseSupabase = async (
  _routineId: string,
  routineExerciseId: string,
) => {
  throwOnError(await supabase.from("routine_exercises").delete().eq("id", routineExerciseId));
  return { ok: true };
};

// ─── fitness sessions ───────────────────────────────────────────────────────

export const fetchActiveFitnessSessionSupabase = async () => {
  const userId = await throwIfNoUser();
  const session = throwOnError(
    await supabase
      .from("workout_sessions")
      .select("id, routine_id, template_id, started_at")
      .eq("user_id", userId)
      .is("ended_at", null)
      .order("started_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  );
  if (!session) return { session: null, exercises: [], sets: [] };
  const exercises = throwOnError(
    await supabase.from("session_exercises").select("id, exercise_id, exercise_name, item_order").eq("session_id", session.id).order("item_order"),
  ) ?? [];
  const exIds = exercises.map((e) => e.id);
  let sets: Array<{ id: string; session_exercise_id: string; weight: number; reps: number }> = [];
  if (exIds.length) {
    sets = (throwOnError(
      await supabase.from("session_sets").select("id, session_exercise_id, weight_display, reps").in("session_exercise_id", exIds).order("completed_at"),
    ) ?? []).map((s: Record<string, unknown>) => ({
      id: s.id as string,
      session_exercise_id: s.session_exercise_id as string,
      weight: Number(s.weight_display ?? 0),
      reps: Number(s.reps ?? 0),
    }));
  }
  return { session: { id: session.id, routine_id: session.routine_id, started_at: session.started_at }, exercises, sets };
};

export const fetchFitnessSessionHistorySupabase = async () => {
  const userId = await throwIfNoUser();
  const sessions = throwOnError(
    await supabase
      .from("workout_sessions")
      .select("id, routine_id, started_at, ended_at")
      .eq("user_id", userId)
      .not("ended_at", "is", null)
      .order("started_at", { ascending: false })
      .limit(50),
  ) ?? [];
  const sIds = sessions.map((s) => s.id);
  let summaries: Record<string, { total_sets: number; total_volume: number }> = {};
  if (sIds.length) {
    const summaryData = throwOnError(
      await supabase.from("session_summary").select("session_id, total_sets, total_volume").in("session_id", sIds),
    ) ?? [];
    summaries = Object.fromEntries(summaryData.map((s: Record<string, unknown>) => [
      s.session_id,
      { total_sets: Number(s.total_sets ?? 0), total_volume: Number(s.total_volume ?? 0) },
    ]));
  }
  return {
    items: sessions.map((s) => ({
      id: s.id,
      routine_id: s.routine_id,
      started_at: s.started_at,
      ended_at: s.ended_at,
      total_sets: summaries[s.id]?.total_sets ?? 0,
      total_volume: summaries[s.id]?.total_volume ?? 0,
    })),
  };
};

export const startFitnessSessionSupabase = async (payload: {
  routineId?: string;
  templateId?: string;
  exercises?: string[];
}) => {
  const userId = await throwIfNoUser();
  const session = throwOnError(
    await supabase
      .from("workout_sessions")
      .insert({
        user_id: userId,
        routine_id: payload.routineId ?? null,
        template_id: payload.templateId ?? null,
      })
      .select("id")
      .single(),
  );
  let exerciseNames = payload.exercises ?? [];
  if (!exerciseNames.length && payload.routineId) {
    const re = throwOnError(
      await supabase.from("routine_exercises").select("exercise_name, item_order").eq("routine_id", payload.routineId).order("item_order"),
    ) ?? [];
    exerciseNames = re.map((e) => e.exercise_name);
  }
  if (!exerciseNames.length && payload.templateId) {
    const te = throwOnError(
      await supabase.from("workout_template_exercises").select("exercise_name, item_order").eq("template_id", payload.templateId).order("item_order"),
    ) ?? [];
    exerciseNames = te.map((e) => e.exercise_name);
  }
  if (exerciseNames.length) {
    const rows = exerciseNames.map((name, i) => ({
      session_id: session.id,
      exercise_name: name,
      item_order: i,
    }));
    await supabase.from("session_exercises").insert(rows);
  }
  return { session: { id: session.id as string } };
};

export const logFitnessSetSupabase = async (payload: {
  sessionId: string;
  sessionExerciseId: string;
  weightDisplay?: number;
  unitUsed?: "lb" | "kg";
  reps?: number;
  rpe?: number;
  restSeconds?: number;
}) => {
  const weightKg = payload.unitUsed === "lb"
    ? (payload.weightDisplay ?? 0) * 0.453592
    : (payload.weightDisplay ?? 0);
  const data = throwOnError(
    await supabase
      .from("session_sets")
      .insert({
        session_exercise_id: payload.sessionExerciseId,
        weight_kg: weightKg,
        weight_display: payload.weightDisplay ?? null,
        unit_used: payload.unitUsed ?? "lb",
        reps: payload.reps ?? null,
        rpe: payload.rpe ?? null,
        rest_seconds: payload.restSeconds ?? null,
      })
      .select("id")
      .single(),
  );
  return { set: { id: data.id as string } };
};

export const finishFitnessSessionSupabase = async (sessionId: string) => {
  throwOnError(
    await supabase
      .from("workout_sessions")
      .update({ ended_at: new Date().toISOString() })
      .eq("id", sessionId),
  );
  return { session: { id: sessionId } };
};

export const swapSessionExerciseSupabase = async (
  _sessionId: string,
  sessionExerciseId: string,
  newExerciseId: number,
) => {
  const ex = throwOnError(
    await supabase.from("exercises").select("name").eq("id", newExerciseId).single(),
  );
  const data = throwOnError(
    await supabase
      .from("session_exercises")
      .update({ exercise_id: newExerciseId, exercise_name: ex.name })
      .eq("id", sessionExerciseId)
      .select("id, exercise_id, exercise_name, item_order")
      .single(),
  );
  return { exercise: data as Record<string, unknown>, lastPerformed: null };
};

// ─── journal (body measurements + progress photos) ──────────────────────────

export const fetchJournalMeasurementsSupabase = async (params?: { type?: string; limit?: number }) => {
  const userId = await throwIfNoUser();
  let q = supabase
    .from("body_measurements")
    .select("id, measurement_type, value, unit, logged_at, notes, created_at")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false });
  if (params?.type) q = q.eq("measurement_type", params.type);
  if (params?.limit) q = q.limit(params.limit);
  const data = throwOnError(await q);
  return { items: data ?? [] };
};

export const fetchJournalMeasurementsLatestSupabase = async () => {
  const userId = await throwIfNoUser();
  const { data } = await supabase.rpc("get_latest_measurements", { p_user_id: userId }).select("*");
  if (data) return { items: data };
  const allTypes = [
    "body_weight", "neck", "shoulders", "chest", "left_bicep", "right_bicep",
    "left_forearm", "right_forearm", "waist", "hips", "left_thigh", "right_thigh",
    "left_calf", "right_calf",
  ];
  const results: Array<{ id: string; measurement_type: string; value: number; unit: string; logged_at: string }> = [];
  for (const mt of allTypes) {
    const row = throwOnError(
      await supabase
        .from("body_measurements")
        .select("id, measurement_type, value, unit, logged_at")
        .eq("user_id", userId)
        .eq("measurement_type", mt)
        .order("logged_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    );
    if (row) results.push(row as typeof results[number]);
  }
  return { items: results };
};

export const createJournalMeasurementSupabase = async (payload: {
  measurement_type: string;
  value: number;
  unit?: string;
  logged_at?: string;
  notes?: string;
}) => {
  const userId = await throwIfNoUser();
  const data = throwOnError(
    await supabase
      .from("body_measurements")
      .insert({
        user_id: userId,
        measurement_type: payload.measurement_type,
        value: payload.value,
        unit: payload.unit ?? "cm",
        logged_at: payload.logged_at ?? new Date().toISOString(),
        notes: payload.notes ?? null,
      })
      .select()
      .single(),
  );
  return { entry: data };
};

export const fetchProgressPhotosSupabase = async (limit?: number) => {
  const userId = await throwIfNoUser();
  let q = supabase
    .from("progress_photos")
    .select("id, image_url, taken_at, note, created_at")
    .eq("user_id", userId)
    .order("taken_at", { ascending: false });
  if (limit != null) q = q.limit(limit);
  const data = throwOnError(await q);
  return { items: data ?? [] };
};

export const createProgressPhotoSupabase = async (payload: {
  image_url: string;
  taken_at?: string;
  note?: string;
}) => {
  const userId = await throwIfNoUser();
  const data = throwOnError(
    await supabase
      .from("progress_photos")
      .insert({
        user_id: userId,
        image_url: payload.image_url,
        taken_at: payload.taken_at ?? new Date().toISOString(),
        note: payload.note ?? null,
      })
      .select()
      .single(),
  );
  return { photo: data };
};

export const deleteProgressPhotoSupabase = async (id: string) => {
  throwOnError(await supabase.from("progress_photos").delete().eq("id", id));
  return { ok: true };
};

// ─── edge functions ─────────────────────────────────────────────────────────

const invokeEdge = async <T>(fnName: string, body: unknown): Promise<T> => {
  const { data, error } = await supabase.functions.invoke(fnName, {
    body: JSON.stringify(body),
  });
  if (error) throw new Error(error.message ?? `Edge function ${fnName} failed`);
  return data as T;
};

type CloudinarySignature = {
  timestamp: number;
  signature: string;
  apiKey: string;
  cloudName: string;
  uploadPreset: string | null;
};

export const fetchCloudinarySignatureSupabase = async (): Promise<CloudinarySignature> =>
  invokeEdge<CloudinarySignature>("cloudinary-signature", {});

export const fetchExternalSvgSupabase = async (url: string): Promise<string> => {
  const result = await invokeEdge<{ svg: string }>("fetch-external-svg", { url });
  return result.svg;
};

type ExternalFoodItem = {
  name: string;
  brand: string | null;
  barcode: string | null;
  source: string;
  portionLabel: string | null;
  portionGrams: number | null;
  kcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  micronutrients: Record<string, unknown>;
};

export const searchFoodsExternalSupabase = async (
  query: string,
  limit = 20,
): Promise<{ items: ExternalFoodItem[] }> =>
  invokeEdge<{ items: ExternalFoodItem[] }>("food-search-external", { query, limit, mode: "search" });

export const lookupBarcodeExternalSupabase = async (
  barcode: string,
): Promise<{ item: ExternalFoodItem | null }> =>
  invokeEdge<{ item: ExternalFoodItem | null }>("food-search-external", { query: barcode, mode: "barcode" });
