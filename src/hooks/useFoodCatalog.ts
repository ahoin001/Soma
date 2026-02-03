import { useCallback, useEffect, useMemo, useState } from "react";
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
  updateFoodMaster as updateFoodMasterApi,
} from "@/lib/api";

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
    brand: record.brand ?? undefined,
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

export const useFoodCatalog = () => {
  const [cache, setCache] = useState<FoodCache>(() => loadCache());
  const [results, setResults] = useState<FoodItem[]>([]);
  const [favorites, setFavorites] = useState<FoodItem[]>([]);
  const [history, setHistory] = useState<FoodItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [lastQuery, setLastQuery] = useState("");
  const [externalSearchEnabled, setExternalSearchEnabled] = useState(() => {
    if (!isBrowser) return true;
    const stored = window.localStorage.getItem("aura-food-external-search");
    return stored ? stored === "true" : true;
  });

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
    async (
      query: string,
      options?: { force?: boolean; external?: boolean },
    ) => {
      const normalized = normalizeQuery(query);
      setLastQuery(normalized);
      if (!normalized) {
        setResults([]);
        setStatus("idle");
        setError(null);
        return;
      }
      await ensureUser();
      const cacheKey = `${normalized}|${(options?.external ?? externalSearchEnabled) ? "api" : "local"}`;
      const cached = cache.searches[cacheKey];
      const force = options?.force ?? false;
      const external = options?.external ?? externalSearchEnabled;
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
      try {
        const response = await searchFoodsApi(normalized, 20, external);
        let fetched = response.items.map(toFoodItem);
        const fallbackQuery =
          normalized.endsWith("s") && normalized.length > 3
            ? normalized.slice(0, -1)
            : null;
        if (!fetched.length && fallbackQuery && fallbackQuery !== normalized) {
          const fallbackResponse = await searchFoodsApi(
            fallbackQuery,
            20,
            external,
          );
          fetched = [...fetched, ...fallbackResponse.items.map(toFoodItem)];
        }
        const deduped = dedupeFoods(fetched);
        const localMatches = fuzzyMatchFoods(localPool, normalized);
        const mergedResults = dedupeFoods([...localMatches, ...deduped]);
        const nextCache: FoodCache = {
          ...cache,
          searches: {
            ...cache.searches,
            [cacheKey]: { value: deduped, updatedAt: Date.now() },
          },
        };
        persist(nextCache);
        setResults(applyOverrides(mergedResults));
        setStatus("idle");
      } catch (fetchError) {
        const detail =
          fetchError instanceof Error ? fetchError.message : "Search failed.";
        setStatus("error");
        setError(detail);
      }
    },
    [applyOverrides, cache, persist, externalSearchEnabled, favorites, history],
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
      return updated;
    },
    [cache, persist],
  );

  const refreshLists = useCallback(async () => {
    await ensureUser();
    const [favoriteRes, historyRes] = await Promise.all([
      fetchFoodFavorites(),
      fetchFoodHistory(50),
    ]);
    setFavorites(favoriteRes.items.map(toFoodItem));
    setHistory(historyRes.items.map(toFoodItem));
  }, []);

  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  const createFood = useCallback(
    async (payload: {
      name: string;
      kcal: number;
      carbs: number;
      protein: number;
      fat: number;
      micronutrients?: Record<string, unknown>;
      imageUrl?: string;
    }) => {
      await ensureUser();
      const response = await createFoodApi({
        name: payload.name,
        kcal: payload.kcal,
        carbsG: payload.carbs,
        proteinG: payload.protein,
        fatG: payload.fat,
        micronutrients: payload.micronutrients,
        imageUrl: payload.imageUrl,
      });
      const created = toFoodItem(response.item);
      setResults((prev) => dedupeFoods([created, ...prev]));
      await refreshLists();
      return created;
    },
    [refreshLists],
  );

  const setFavorite = useCallback(async (foodId: string, favorite: boolean) => {
    await ensureUser();
    await toggleFoodFavorite(foodId, favorite);
    await refreshLists();
  }, [refreshLists]);

  const updateFoodMaster = useCallback(
    async (
      foodId: string,
      payload: {
        name?: string;
        brand?: string | null;
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
      persist({ ...cache, overrides: nextOverrides });
      setResults((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setFavorites((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      setHistory((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      if (lastQuery) {
        void searchFoods(lastQuery, { force: true, external: externalSearchEnabled });
      }
      return updated;
    },
    [cache, persist, lastQuery, searchFoods, externalSearchEnabled],
  );

  const toggleExternalSearch = useCallback((enabled: boolean) => {
    setExternalSearchEnabled(enabled);
    if (isBrowser) {
      window.localStorage.setItem(
        "aura-food-external-search",
        enabled ? "true" : "false",
      );
    }
  }, []);

  return useMemo(
    () => ({
      results,
      favorites,
      history,
      status,
      error,
      searchFoods,
      externalSearchEnabled,
      toggleExternalSearch,
      lookupBarcode,
      applyOverrides,
      upsertOverride,
      createFood,
      refreshLists,
      setFavorite,
      updateFoodMaster,
    }),
    [
      results,
      favorites,
      history,
      status,
      error,
      searchFoods,
      externalSearchEnabled,
      toggleExternalSearch,
      lookupBarcode,
      applyOverrides,
      upsertOverride,
      createFood,
      refreshLists,
      setFavorite,
      updateFoodMaster,
    ],
  );
};
