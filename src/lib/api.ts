import type {
  FoodRecord,
  MealEntryItemRecord,
  MealEntryRecord,
  MealTypeRecord,
} from "@/types/api";
import { apiFetch } from "@/lib/apiClient";

export const ensureUser = async () =>
  apiFetch<{ user: { id: string } }>("/api/users/bootstrap", {
    method: "POST",
    body: JSON.stringify({}),
  });

export const ensureMealTypes = async () => {
  await apiFetch<{ ok: boolean }>("/api/meal-types/ensure", { method: "POST" });
  return apiFetch<{ items: MealTypeRecord[] }>("/api/meal-types");
};

export const searchFoods = async (query: string, limit = 20) =>
  apiFetch<{ items: FoodRecord[] }>(
    `/api/foods/search?q=${encodeURIComponent(query)}&limit=${limit}`,
  );

export const fetchFoodByBarcode = async (barcode: string) =>
  apiFetch<{ item: FoodRecord | null }>(
    `/api/foods/barcode/${encodeURIComponent(barcode)}`,
  );

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
  barcode?: string;
  source?: string;
  portionLabel?: string;
  portionGrams?: number;
  kcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  micronutrients?: Record<string, unknown>;
}) =>
  apiFetch<{ item: FoodRecord }>("/api/foods", {
    method: "POST",
    body: JSON.stringify(payload),
  });

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
