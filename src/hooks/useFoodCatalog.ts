import { useCallback, useMemo, useState } from "react";
import type { FoodItem, MacroKey } from "@/data/mock";
import { calculateMacroPercent, fetchFoodByBarcode } from "@/data/foodApi";
import type { FoodRecord } from "@/types/api";
import { createFood as createFoodApi, searchFoods as searchFoodsApi } from "@/lib/api";

type CacheEntry<T> = {
  updatedAt: number;
  value: T;
};

type FoodOverride = {
  kcal: number;
  portion: string;
  macros: Record<MacroKey, number>;
};

type FoodCache = {
  searches: Record<string, CacheEntry<FoodItem[]>>;
  barcodes: Record<string, CacheEntry<FoodItem | null>>;
  overrides: Record<string, FoodOverride>;
};

const CACHE_KEY = "aura-food-cache-v1";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 7;

const emptyCache: FoodCache = {
  searches: {},
  barcodes: {},
  overrides: {},
};

const isBrowser = typeof window !== "undefined";

const loadCache = (): FoodCache => {
  if (!isBrowser) return emptyCache;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (!raw) return emptyCache;
    const parsed = JSON.parse(raw) as FoodCache;
    return {
      searches: parsed.searches ?? {},
      barcodes: parsed.barcodes ?? {},
      overrides: parsed.overrides ?? {},
    };
  } catch {
    return emptyCache;
  }
};

const persistCache = (cache: FoodCache) => {
  if (!isBrowser) return;
  window.localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
};

const isFresh = <T,>(entry?: CacheEntry<T>) =>
  !!entry && Date.now() - entry.updatedAt < CACHE_TTL_MS;

const normalizeQuery = (value: string) => value.trim().toLowerCase();

const buildOverrideKey = (food: FoodItem) => food.id;

const toFoodItem = (record: FoodRecord): FoodItem => {
  const macros = {
    carbs: Number(record.carbs_g ?? 0),
    protein: Number(record.protein_g ?? 0),
    fat: Number(record.fat_g ?? 0),
  };
  return {
    id: record.id,
    name: record.name,
    brand: record.brand ?? undefined,
    portion: record.portion_label ?? "1 serving",
    kcal: Number(record.kcal ?? 0),
    emoji: "🍽️",
    barcode: record.barcode ?? undefined,
    source: record.is_global ? "api" : "local",
    macros,
    macroPercent: calculateMacroPercent(macros),
  };
};

const applyOverride = (food: FoodItem, override?: FoodOverride): FoodItem => {
  if (!override) return food;
  const macroPercent = calculateMacroPercent(override.macros);
  return {
    ...food,
    kcal: override.kcal,
    portion: override.portion,
    macros: override.macros,
    macroPercent,
  };
};

const dedupeFoods = (foods: FoodItem[]) => {
  const seen = new Set<string>();
  return foods.filter((food) => {
    if (seen.has(food.id)) return false;
    seen.add(food.id);
    return true;
  });
};

export const useFoodCatalog = () => {
  const [cache, setCache] = useState<FoodCache>(() => loadCache());
  const [results, setResults] = useState<FoodItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const persist = useCallback((next: FoodCache) => {
    setCache(next);
    persistCache(next);
  }, []);

  const applyOverrides = useCallback(
    (foods: FoodItem[]) =>
      foods.map((food) => applyOverride(food, cache.overrides[buildOverrideKey(food)])),
    [cache.overrides],
  );

  const searchFoods = useCallback(
    async (query: string) => {
      const normalized = normalizeQuery(query);
      if (!normalized) {
        setResults([]);
        setStatus("idle");
        setError(null);
        return;
      }
      const cached = cache.searches[normalized];
      if (isFresh(cached)) {
        setResults(applyOverrides(cached.value));
        setStatus("idle");
        setError(null);
        return;
      }
      setStatus("loading");
      setError(null);
      try {
        const response = await searchFoodsApi(normalized);
        const fetched = response.items.map(toFoodItem);
        const deduped = dedupeFoods(fetched);
        const nextCache: FoodCache = {
          ...cache,
          searches: {
            ...cache.searches,
            [normalized]: { value: deduped, updatedAt: Date.now() },
          },
        };
        persist(nextCache);
        setResults(applyOverrides(deduped));
        setStatus("idle");
      } catch (fetchError) {
        const detail =
          fetchError instanceof Error ? fetchError.message : "Search failed.";
        setStatus("error");
        setError(detail);
      }
    },
    [applyOverrides, cache, persist],
  );

  const lookupBarcode = useCallback(
    async (barcode: string) => {
      const cached = cache.barcodes[barcode];
      if (isFresh(cached)) {
        return cached.value
          ? applyOverride(cached.value, cache.overrides[buildOverrideKey(cached.value)])
          : null;
      }
      try {
        const fetched = await fetchFoodByBarcode(barcode);
        const nextCache: FoodCache = {
          ...cache,
          barcodes: {
            ...cache.barcodes,
            [barcode]: { value: fetched, updatedAt: Date.now() },
          },
        };
        persist(nextCache);
        return fetched
          ? applyOverride(fetched, cache.overrides[buildOverrideKey(fetched)])
          : null;
      } catch (fetchError) {
        const detail =
          fetchError instanceof Error ? fetchError.message : "Lookup failed.";
        setStatus("error");
        setError(detail);
        return null;
      }
    },
    [cache, persist],
  );

  const upsertOverride = useCallback(
    (food: FoodItem, override: FoodOverride) => {
      const key = buildOverrideKey(food);
      const nextOverrides = { ...cache.overrides, [key]: override };
      const nextCache: FoodCache = { ...cache, overrides: nextOverrides };
      persist(nextCache);
      const updated = applyOverride(food, override);
      setResults((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      return updated;
    },
    [cache, persist],
  );

  const createFood = useCallback(
    async (payload: {
      name: string;
      kcal: number;
      carbs: number;
      protein: number;
      fat: number;
    }) => {
      const response = await createFoodApi({
        name: payload.name,
        kcal: payload.kcal,
        carbsG: payload.carbs,
        proteinG: payload.protein,
        fatG: payload.fat,
      });
      const created = toFoodItem(response.item);
      setResults((prev) => dedupeFoods([created, ...prev]));
      return created;
    },
    [],
  );

  return useMemo(
    () => ({
      results,
      status,
      error,
      searchFoods,
      lookupBarcode,
      applyOverrides,
      upsertOverride,
      createFood,
    }),
    [
      results,
      status,
      error,
      searchFoods,
      lookupBarcode,
      applyOverrides,
      upsertOverride,
      createFood,
    ],
  );
};
