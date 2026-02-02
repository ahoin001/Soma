import type {
  FoodRecord,
  MealEntryItemRecord,
  MealEntryRecord,
  MealTypeRecord,
} from "@/types/api";

const USER_ID_KEY = "aurafit-user-id";

export const getUserId = () => {
  if (typeof window === "undefined") return null;
  const existing = window.localStorage.getItem(USER_ID_KEY);
  if (existing) return existing;
  const next = crypto.randomUUID();
  window.localStorage.setItem(USER_ID_KEY, next);
  return next;
};

const apiFetch = async <T>(path: string, options?: RequestInit) => {
  const userId = getUserId();
  const headers = new Headers(options?.headers);
  if (userId) {
    headers.set("x-user-id", userId);
  }
  if (!headers.has("Content-Type") && options?.body) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(path, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed: ${response.status}`);
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

export const ensureMealTypes = async () => {
  await apiFetch<{ ok: boolean }>("/api/meal-types/ensure", { method: "POST" });
  return apiFetch<{ items: MealTypeRecord[] }>("/api/meal-types");
};

export const searchFoods = async (query: string, limit = 20) =>
  apiFetch<{ items: FoodRecord[] }>(
    `/api/foods/search?q=${encodeURIComponent(query)}&limit=${limit}`,
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
  apiFetch<{ entry: MealEntryRecord }>("/api/meal-entries", {
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
