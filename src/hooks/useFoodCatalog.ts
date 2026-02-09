/**
 * Food Catalog Hook - now powered by React Query
 *
 * Provides automatic caching, background refetch,
 * optimistic updates, and offline support.
 *
 * @see useFoodCatalogQuery.ts for implementation details
 */
export { useFoodCatalogQuery as useFoodCatalog } from "./useFoodCatalogQuery";

// Legacy implementation below (kept for reference, no longer used)
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { FoodItem, MacroKey } from "@/data/mock";
import { calculateMacroPercent } from "@/data/foodApi";
import type { FoodRecord } from "@/types/api";
import {
  createFood as createFoodApi,
  ensureUser,
  fetchFoodFavorites,
  fetchFoodHistory,
  fetchFoodByBarcode,
  searchFoods as searchFoodsApi,
  toggleFoodFavorite,
  updateFoodImage as updateFoodImageApi,
  updateFoodMaster as updateFoodMasterApi,
} from "@/lib/api";
import { FOOD_CACHE_KEY } from "@/lib/storageKeys";
import type { CacheEntry } from "@/types/cache";
import type { FoodOverride } from "@/types/nutrition";

type FoodCache = {
  searches: Record<string, CacheEntry<FoodItem[]>>;
  barcodes: Record<string, CacheEntry<FoodItem | null>>;
  overrides: Record<string, FoodOverride>;
};

const CACHE_KEY = FOOD_CACHE_KEY;
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

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeQuery = (value: string) => normalizeText(value);

const tokenize = (value: string) => normalizeText(value).split(" ").filter(Boolean);

const scoreFood = (food: FoodItem, tokens: string[]) => {
  if (!tokens.length) return 0;
  const haystack = normalizeText(`${food.name} ${food.brand ?? ""}`);
  if (!haystack) return 0;
  let score = 0;
  for (const token of tokens) {
    if (!token) continue;
    if (haystack.includes(token)) {
      score += token.length >= 3 ? 2 : 1;
      if (haystack.startsWith(token)) {
        score += 1;
      }
    }
  }
  return score;
};

const fuzzyMatchFoods = (foods: FoodItem[], query: string) => {
  const tokens = tokenize(query);
  const ranked = foods
    .map((food) => ({ food, score: scoreFood(food, tokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.food.name.length - b.food.name.length;
    })
    .map((item) => item.food);
  return dedupeFoods(ranked);
};

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
    brand: record.brand_name ?? record.brand ?? undefined,
    brandId: record.brand_id ?? undefined,
    brandLogoUrl: record.brand_logo_url ?? undefined,
    portion:
      record.portion_label ??
      (record.portion_grams ? `${record.portion_grams} g` : "100 g"),
    portionLabel: record.portion_label ?? undefined,
    portionGrams: record.portion_grams ?? undefined,
    kcal: Number(record.kcal ?? 0),
    emoji: "🍽️",
    barcode: record.barcode ?? undefined,
    source: record.is_global ? "api" : "local",
    imageUrl: record.image_url ?? undefined,
    micronutrients: record.micronutrients ?? undefined,
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

export const useFoodCatalogLegacy = () => {
  const [cache, setCache] = useState<FoodCache>(() => loadCache());
  const [results, setResults] = useState<FoodItem[]>([]);
  const [favorites, setFavorites] = useState<FoodItem[]>([]);
  const [history, setHistory] = useState<FoodItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const inFlightRef = useRef<Map<string, Promise<FoodItem[]>>>(new Map());

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
    async (query: string, options?: { force?: boolean }) => {
      const normalized = normalizeQuery(query);
      setLastQuery(normalized);
      if (!normalized) {
        setResults([]);
        setStatus("idle");
        setError(null);
        return;
      }
      await ensureUser();
      const cacheKey = normalized;
      const cached = cache.searches[cacheKey];
      const force = options?.force ?? false;
      const localPool = dedupeFoods([
        ...favorites,
        ...history,
        ...Object.values(cache.searches).flatMap((entry) => entry.value),
      ]);
      if (!force && isFresh(cached)) {
        const localMatches = fuzzyMatchFoods(localPool, normalized);
        setResults(applyOverrides(dedupeFoods([...localMatches, ...cached.value])));
        setStatus("idle");
        setError(null);
        return;
      }
      setStatus("loading");
      setError(null);
      const localMatches = fuzzyMatchFoods(localPool, normalized);
      const existing = inFlightRef.current.get(cacheKey);
      const fetchPromise =
        existing ??
        (async () => {
          const response = await searchFoodsApi(normalized, 20, false);
          let fetched = response.items.map(toFoodItem);
          const fallbackQuery =
            normalized.endsWith("s") && normalized.length > 3
              ? normalized.slice(0, -1)
              : null;
          if (!fetched.length && fallbackQuery && fallbackQuery !== normalized) {
            const fallbackResponse = await searchFoodsApi(fallbackQuery, 20, false);
            fetched = [...fetched, ...fallbackResponse.items.map(toFoodItem)];
          }
          const deduped = dedupeFoods(fetched);
          const nextCache: FoodCache = {
            ...cache,
            searches: {
              ...cache.searches,
              [cacheKey]: { value: deduped, updatedAt: Date.now() },
            },
          };
          persist(nextCache);
          return deduped;
        })();
      if (!existing) {
        inFlightRef.current.set(cacheKey, fetchPromise);
      }
      try {
        const deduped = await fetchPromise;
        const mergedResults = dedupeFoods([...localMatches, ...deduped]);
        setResults(applyOverrides(mergedResults));
        setStatus("idle");
      } catch (fetchError) {
        const detail =
          fetchError instanceof Error ? fetchError.message : "Search failed.";
        setStatus("error");
        setError(detail);
      } finally {
        if (inFlightRef.current.get(cacheKey) === fetchPromise) {
          inFlightRef.current.delete(cacheKey);
        }
      }
    },
    [applyOverrides, cache, persist, favorites, history],
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
        const response = await fetchFoodByBarcode(barcode);
        const fetched = response.item ? toFoodItem(response.item) : null;
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
      setFavorites((prev) =>
        prev.map((item) =>
          item.id === updated.id ? applyOverride(item, override) : item,
        ),
      );
      setHistory((prev) =>
        prev.map((item) =>
          item.id === updated.id ? applyOverride(item, override) : item,
        ),
      );
      return updated;
    },
    [cache, persist],
  );

  const refreshLists = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      await ensureUser();
      const [favoriteRes, historyRes] = await Promise.all([
        fetchFoodFavorites(),
        fetchFoodHistory(50),
      ]);
      setFavorites(favoriteRes.items.map(toFoodItem));
      setHistory(historyRes.items.map(toFoodItem));
      setStatus("idle");
      setCache((prev) => {
        if (!Object.keys(prev.searches).length) return prev;
        const nextCache: FoodCache = { ...prev, searches: {} };
        persistCache(nextCache);
        return nextCache;
      });
    } catch (fetchError) {
      const detail =
        fetchError instanceof Error ? fetchError.message : "Failed to refresh foods.";
      setStatus("error");
      setError(detail);
    }
  }, []);

  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  const createFood = useCallback(
    async (payload: {
      name: string;
      brand?: string;
      portionLabel?: string;
      portionGrams?: number;
      kcal: number;
      carbs: number;
      protein: number;
      fat: number;
      micronutrients?: Record<string, unknown>;
      imageUrl?: string;
    }) => {
      try {
        await ensureUser();
        const response = await createFoodApi({
          name: payload.name,
          brand: payload.brand,
          portionLabel: payload.portionLabel,
          portionGrams: payload.portionGrams,
          kcal: payload.kcal,
          carbsG: payload.carbs,
          proteinG: payload.protein,
          fatG: payload.fat,
          micronutrients: payload.micronutrients,
          imageUrl: payload.imageUrl,
        });
        const created = toFoodItem(response.item);
        const nextCache: FoodCache = { ...cache, searches: {} };
        persist(nextCache);
        setResults((prev) => dedupeFoods([created, ...prev]));
        void refreshLists();
        return created;
      } catch {
        toast("Unable to create food", {
          action: {
            label: "Retry",
            onClick: () => void createFood(payload),
          },
        });
        throw new Error("Food creation failed");
      }
    },
    [cache, persist, refreshLists],
  );

  const setFavorite = useCallback(
    async (foodId: string, favorite: boolean) => {
      const source =
        results.find((item) => item.id === foodId) ??
        history.find((item) => item.id === foodId);
      const previousFavorites = [...favorites];
      if (favorite && source) {
        setFavorites((prev) =>
          prev.some((item) => item.id === foodId) ? prev : [source, ...prev],
        );
      } else if (!favorite) {
        setFavorites((prev) => prev.filter((item) => item.id !== foodId));
      }
      try {
        await ensureUser();
        await toggleFoodFavorite(foodId, favorite);
        void refreshLists();
      } catch {
        setFavorites(previousFavorites);
        toast(favorite ? "Unable to add favorite" : "Unable to remove favorite", {
          action: {
            label: "Retry",
            onClick: () => void setFavorite(foodId, favorite),
          },
        });
        void refreshLists();
      }
    },
    [favorites, history, refreshLists, results],
  );

  const updateFoodMaster = useCallback(
    async (
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
      await ensureUser();
      const response = await updateFoodMasterApi(foodId, payload);
      if (!response.item) return null;
      const updated = toFoodItem(response.item);
      const nextOverrides = { ...cache.overrides };
      delete nextOverrides[foodId];
      const nextBarcodes = { ...cache.barcodes };
      Object.keys(nextBarcodes).forEach((key) => {
        if (nextBarcodes[key].value?.id === foodId) {
          delete nextBarcodes[key];
        }
      });
      persist({ ...cache, overrides: nextOverrides, searches: {}, barcodes: nextBarcodes });
      setResults((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setFavorites((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setHistory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      void refreshLists();
      if (lastQuery) {
        void searchFoods(lastQuery, { force: true });
      }
      return updated;
    },
    [cache, persist, lastQuery, searchFoods, refreshLists],
  );

  const updateFoodImage = useCallback(
    async (foodId: string, imageUrl: string) => {
      await ensureUser();
      const response = await updateFoodImageApi(foodId, imageUrl);
      if (!response.item) return null;
      const updated = toFoodItem(response.item);
      const nextBarcodes = { ...cache.barcodes };
      Object.keys(nextBarcodes).forEach((key) => {
        if (nextBarcodes[key].value?.id === foodId) {
          delete nextBarcodes[key];
        }
      });
      persist({ ...cache, searches: {}, barcodes: nextBarcodes });
      setResults((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setFavorites((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setHistory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      void refreshLists();
      if (lastQuery) {
        void searchFoods(lastQuery, { force: true });
      }
      return updated;
    },
    [cache, persist, lastQuery, searchFoods, refreshLists],
  );

  return useMemo(
    () => ({
      results,
      favorites,
      history,
      status,
      error,
      searchFoods,
      lookupBarcode,
      applyOverrides,
      upsertOverride,
      createFood,
      refreshLists,
      setFavorite,
      updateFoodMaster,
      updateFoodImage,
    }),
    [
      results,
      favorites,
      history,
      status,
      error,
      searchFoods,
      lookupBarcode,
      applyOverrides,
      upsertOverride,
      createFood,
      refreshLists,
      setFavorite,
      updateFoodMaster,
      updateFoodImage,
    ],
  );
};
