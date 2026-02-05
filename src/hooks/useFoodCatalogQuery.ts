/**
 * Food Catalog Hook - React Query Version
 *
 * Manages food search, favorites, history, and CRUD operations.
 * Uses React Query for caching with localStorage fallback for offline.
 */
import { useCallback, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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
import { queryKeys } from "@/lib/queryKeys";
import { queueMutation } from "@/lib/offlineQueue";

// ============================================================================
// Types
// ============================================================================

type FoodOverride = {
  kcal: number;
  portion: string;
  macros: Record<MacroKey, number>;
};

// ============================================================================
// Helpers
// ============================================================================

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
      if (haystack.startsWith(token)) score += 1;
    }
  }
  return score;
};

const dedupeFoods = (foods: FoodItem[]) => {
  const seen = new Set<string>();
  return foods.filter((food) => {
    if (seen.has(food.id)) return false;
    seen.add(food.id);
    return true;
  });
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

const toFoodItem = (record: FoodRecord): FoodItem => {
  const macros = {
    carbs: Number(record.carbs_g ?? 0),
    protein: Number(record.protein_g ?? 0),
    fat: Number(record.fat_g ?? 0),
  };
  // Debug: Log micronutrients from API response
  if (record.micronutrients && Object.keys(record.micronutrients).length > 0) {
    console.log("[toFoodItem] Food has micronutrients:", {
      id: record.id,
      name: record.name,
      micronutrients: record.micronutrients,
    });
  }
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

// ============================================================================
// Local Overrides Storage
// ============================================================================

const OVERRIDES_KEY = "aura-food-overrides-v1";

const loadOverrides = (): Record<string, FoodOverride> => {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveOverrides = (overrides: Record<string, FoodOverride>) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(overrides));
};

// ============================================================================
// Main Hook
// ============================================================================

export const useFoodCatalogQuery = () => {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [overrides, setOverrides] = useState<Record<string, FoodOverride>>(() =>
    loadOverrides()
  );

  const normalizedQuery = useMemo(
    () => normalizeQuery(searchQuery),
    [searchQuery]
  );

  // --- Query: Favorites ---
  const favoritesQuery = useQuery({
    queryKey: queryKeys.foodFavorites,
    queryFn: async () => {
      await ensureUser();
      const response = await fetchFoodFavorites();
      return response.items.map(toFoodItem);
    },
    staleTime: 60 * 1000, // 1 minute
  });

  // --- Query: History ---
  const historyQuery = useQuery({
    queryKey: queryKeys.foodHistory,
    queryFn: async () => {
      await ensureUser();
      const response = await fetchFoodHistory(50);
      return response.items.map(toFoodItem);
    },
    staleTime: 60 * 1000,
  });

  // --- Query: Search ---
  const searchQuery_ = useQuery({
    queryKey: queryKeys.foodSearch(normalizedQuery),
    queryFn: async () => {
      if (!normalizedQuery) return [];
      await ensureUser();
      const response = await searchFoodsApi(normalizedQuery, 20, false);
      let fetched = response.items.map(toFoodItem);

      // Fallback for plural queries
      const fallbackQuery =
        normalizedQuery.endsWith("s") && normalizedQuery.length > 3
          ? normalizedQuery.slice(0, -1)
          : null;
      if (!fetched.length && fallbackQuery) {
        const fallbackResponse = await searchFoodsApi(fallbackQuery, 20, false);
        fetched = fallbackResponse.items.map(toFoodItem);
      }

      return dedupeFoods(fetched);
    },
    enabled: normalizedQuery.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Combine search results with local matches
  const results = useMemo(() => {
    if (!normalizedQuery) return [];

    const favorites = favoritesQuery.data ?? [];
    const history = historyQuery.data ?? [];
    const apiResults = searchQuery_.data ?? [];

    const localPool = dedupeFoods([...favorites, ...history]);
    const localMatches = fuzzyMatchFoods(localPool, normalizedQuery);
    const combined = dedupeFoods([...localMatches, ...apiResults]);

    // Apply overrides
    return combined.map((food) => applyOverride(food, overrides[food.id]));
  }, [
    normalizedQuery,
    favoritesQuery.data,
    historyQuery.data,
    searchQuery_.data,
    overrides,
  ]);

  // --- Mutation: Toggle Favorite ---
  const favoriteMutation = useMutation({
    mutationFn: async ({
      foodId,
      favorite,
    }: {
      foodId: string;
      favorite: boolean;
    }) => {
      await ensureUser();
      await toggleFoodFavorite(foodId, favorite);
    },
    onMutate: async ({ foodId, favorite }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.foodFavorites });
      const previous = queryClient.getQueryData<FoodItem[]>(queryKeys.foodFavorites);

      // Find source food
      const source =
        results.find((item) => item.id === foodId) ??
        historyQuery.data?.find((item) => item.id === foodId);

      queryClient.setQueryData<FoodItem[]>(queryKeys.foodFavorites, (old) => {
        if (!old) return old;
        if (favorite && source) {
          return old.some((item) => item.id === foodId)
            ? old
            : [source, ...old];
        }
        return old.filter((item) => item.id !== foodId);
      });

      return { previous };
    },
    onError: (_err, { foodId, favorite }, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.foodFavorites, context.previous);
      }

      if (!navigator.onLine) {
        void queueMutation("food.toggleFavorite", { foodId, favorite });
        toast("Saved offline • Will sync when connected");
        return;
      }

      toast(favorite ? "Unable to add favorite" : "Unable to remove favorite", {
        action: {
          label: "Retry",
          onClick: () => favoriteMutation.mutate({ foodId, favorite }),
        },
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.foodFavorites });
    },
  });

  // --- Mutation: Create Food ---
  const createFoodMutation = useMutation({
    mutationFn: async (payload: {
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
      return toFoodItem(response.item);
    },
    onSuccess: () => {
      // Invalidate all food queries to pick up new food
      void queryClient.invalidateQueries({ queryKey: queryKeys.foodFavorites });
      void queryClient.invalidateQueries({ queryKey: queryKeys.foodHistory });
      void queryClient.invalidateQueries({ queryKey: ["foodSearch"] });
    },
    onError: (_err, payload) => {
      if (!navigator.onLine) {
        void queueMutation("food.create", payload);
        toast("Saved offline • Will sync when connected");
        return;
      }

      toast("Unable to create food", {
        action: {
          label: "Retry",
          onClick: () => createFoodMutation.mutate(payload),
        },
      });
    },
  });

  // --- Barcode Lookup ---
  const lookupBarcode = useCallback(async (barcode: string) => {
    try {
      const response = await fetchFoodByBarcode(barcode);
      return response.item ? toFoodItem(response.item) : null;
    } catch {
      return null;
    }
  }, []);

  // --- Override Management ---
  const upsertOverride = useCallback(
    (food: FoodItem, override: FoodOverride) => {
      const nextOverrides = { ...overrides, [food.id]: override };
      setOverrides(nextOverrides);
      saveOverrides(nextOverrides);
      return applyOverride(food, override);
    },
    [overrides]
  );

  const applyOverrides = useCallback(
    (foods: FoodItem[]) =>
      foods.map((food) => applyOverride(food, overrides[food.id])),
    [overrides]
  );

  // --- Update Food Master ---
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
      }
    ) => {
      await ensureUser();
      const response = await updateFoodMasterApi(foodId, payload);
      if (!response.item) return null;

      // Remove override for this food
      const nextOverrides = { ...overrides };
      delete nextOverrides[foodId];
      setOverrides(nextOverrides);
      saveOverrides(nextOverrides);

      // Invalidate queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.foodFavorites });
      void queryClient.invalidateQueries({ queryKey: queryKeys.foodHistory });
      void queryClient.invalidateQueries({ queryKey: ["foodSearch"] });

      return toFoodItem(response.item);
    },
    [overrides, queryClient]
  );

  // --- Update Food Image ---
  const updateFoodImage = useCallback(
    async (foodId: string, imageUrl: string) => {
      await ensureUser();
      const response = await updateFoodImageApi(foodId, imageUrl);
      if (!response.item) return null;

      // Invalidate queries
      void queryClient.invalidateQueries({ queryKey: queryKeys.foodFavorites });
      void queryClient.invalidateQueries({ queryKey: queryKeys.foodHistory });
      void queryClient.invalidateQueries({ queryKey: ["foodSearch"] });

      return toFoodItem(response.item);
    },
    [queryClient]
  );

  // --- Search function (for backward compatibility) ---
  const searchFoods = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  // --- Refresh function ---
  const refreshLists = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.foodFavorites });
    void queryClient.invalidateQueries({ queryKey: queryKeys.foodHistory });
  }, [queryClient]);

  // Determine status
  const isLoading =
    favoritesQuery.isLoading ||
    historyQuery.isLoading ||
    (normalizedQuery && searchQuery_.isLoading);
  const status = isLoading ? "loading" : "idle";

  return useMemo(
    () => ({
      results,
      favorites: (favoritesQuery.data ?? []).map((food) =>
        applyOverride(food, overrides[food.id])
      ),
      history: (historyQuery.data ?? []).map((food) =>
        applyOverride(food, overrides[food.id])
      ),
      status,
      error: searchQuery_.error?.message ?? null,
      searchFoods,
      lookupBarcode,
      applyOverrides,
      upsertOverride,
      createFood: createFoodMutation.mutateAsync,
      refreshLists,
      setFavorite: (foodId: string, favorite: boolean) =>
        favoriteMutation.mutate({ foodId, favorite }),
      updateFoodMaster,
      updateFoodImage,
      // Additional query state
      isSearching: searchQuery_.isFetching,
    }),
    [
      results,
      favoritesQuery.data,
      historyQuery.data,
      status,
      searchQuery_.error,
      searchQuery_.isFetching,
      searchFoods,
      lookupBarcode,
      applyOverrides,
      upsertOverride,
      createFoodMutation.mutateAsync,
      refreshLists,
      favoriteMutation,
      updateFoodMaster,
      updateFoodImage,
      overrides,
    ]
  );
};
