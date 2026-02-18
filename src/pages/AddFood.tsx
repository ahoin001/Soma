import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { FoodItem, Meal } from "@/data/mock";
import { AppShell, EditLogSheet, FoodDetailSheet, PageContainer } from "@/components/aura";
import { FoodSearchContent } from "@/components/aura/FoodSearchContent";
import { useAppStore } from "@/state/AppStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChevronLeft, Copy } from "lucide-react";
import { fuzzyFilter } from "@/lib/fuzzySearch";
import { useSheetManager } from "@/hooks/useSheetManager";
import { calculateMacroPercent } from "@/data/foodApi";
import type { LogItem } from "@/types/log";
import { CREATED_FOOD_KEY, SHEET_ADD_FOOD_KEY } from "@/lib/storageKeys";
import type { NutritionDraft } from "@/types/nutrition";
import { ensureUser, fetchMealEntries } from "@/lib/api";
import {
  FOOD_GOAL_PRESETS,
  getGoalPresetForSelection,
  matchesAllFoodTags,
  sortFoods,
  type FoodGoalPresetId,
  type FoodSortOption,
  type FoodTagId,
} from "@/lib/foodClassification";

type ActiveTab = "search" | "recent" | "liked" | "history";

type LocationState = {
  meal?: Meal;
};

const ALL_SORTS: FoodSortOption[] = [
  "relevance",
  "calories_asc",
  "calories_desc",
  "protein_desc",
  "protein_asc",
  "carbs_asc",
  "carbs_desc",
];

const ALL_TAGS: FoodTagId[] = [
  "high_protein",
  "high_carb",
  "low_carb",
  "high_fat",
  "low_fat",
  "high_fiber",
  "calorie_dense",
  "low_calorie",
];

const parseSort = (value: string | null): FoodSortOption => {
  if (!value) return "relevance";
  return ALL_SORTS.includes(value as FoodSortOption) ? (value as FoodSortOption) : "relevance";
};

const parseTags = (value: string | null): FoodTagId[] => {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item): item is FoodTagId => ALL_TAGS.includes(item as FoodTagId));
};

const AddFood = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const state = (location.state ?? {}) as LocationState;
  const returnTo = searchParams.get("returnTo") ?? "/nutrition";
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { nutrition, foodCatalog, mealTypes, setMealPulse } = useAppStore();
  const initialTab = (searchParams.get("tab") as ActiveTab) ?? "recent";
  const [activeTab, setActiveTab] = useState<ActiveTab>(initialTab);
  const [lastBrowseTab, setLastBrowseTab] = useState<Exclude<ActiveTab, "search">>(
    initialTab === "search" ? "recent" : initialTab,
  );
  const [searchQuery, setSearchQuery] = useState(searchParams.get("query") ?? "");
  const [sortBy, setSortBy] = useState<FoodSortOption>(() => parseSort(searchParams.get("sort")));
  const [selectedTags, setSelectedTags] = useState<FoodTagId[]>(() =>
    parseTags(searchParams.get("tags")),
  );
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(() => {
    const s = (location.state ?? {}) as LocationState;
    return s.meal ?? null;
  });
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [editItem, setEditItem] = useState<LogItem | null>(null);
  const [recentMealFoods, setRecentMealFoods] = useState<FoodItem[]>([]);
  const [yesterdayMealItems, setYesterdayMealItems] = useState<
    Array<{ food: FoodItem; quantity: number; portionLabel?: string; portionGrams?: number }>
  >([]);
  const [isLoadingYesterday, setIsLoadingYesterday] = useState(false);
  const [isAddingSameAsYesterday, setIsAddingSameAsYesterday] = useState(false);
  const recentRequestRef = useRef(0);
  const { activeSheet, openSheet, closeSheets } = useSheetManager<"detail" | "edit">(null, {
    storageKey: SHEET_ADD_FOOD_KEY,
    persist: true,
  });
  const isEditOpen = activeSheet === "edit" && Boolean(editItem);
  const isDetailOpen = activeSheet === "detail" && Boolean(selectedFood);

  const {
    results: apiResults,
    status: searchStatus,
    error: searchError,
    searchFoods,
    lookupBarcode,
    applyOverrides,
    upsertOverride,
    createFood,
    favorites,
    history,
    refreshLists,
    setFavorite,
    updateFoodMaster,
  } = foodCatalog;
  const { logSections, removeLogItem, updateLogItem } = nutrition;

  const loggedInMeal = useMemo(() => {
    const mealId = selectedMeal?.id;
    const ids = new Set<string>();
    const names = new Set<string>();
    if (!mealId) return { ids, names };
    logSections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.mealTypeId !== mealId) return;
        if (item.foodId) ids.add(item.foodId);
        names.add(item.name.trim().toLowerCase());
      });
    });
    return { ids, names };
  }, [logSections, selectedMeal?.id]);

  const addedFoods = useMemo(() => {
    const mealId = selectedMeal?.id;
    if (!mealId) return [];
    const next: FoodItem[] = [];
    const seen = new Set<string>();
    logSections.forEach((section) => {
      section.items.forEach((item) => {
        if (item.mealTypeId !== mealId) return;
        const key = item.foodId ?? item.name.trim().toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        const portion =
          item.portionLabel ??
          (item.portionGrams ? `${item.portionGrams} g` : "1 serving");
        const macros = {
          carbs: Number(item.macros.carbs ?? 0),
          protein: Number(item.macros.protein ?? 0),
          fat: Number(item.macros.fat ?? 0),
        };
        next.push({
          id: item.foodId ?? item.id ?? `log:${item.name.toLowerCase()}`,
          name: item.name,
          portion,
          portionLabel: item.portionLabel ?? undefined,
          portionGrams: item.portionGrams ?? undefined,
          kcal: Number(item.kcal ?? 0),
          emoji: item.emoji ?? "🍽️",
          imageUrl: item.imageUrl ?? undefined,
          source: "local",
          macros,
          macroPercent: calculateMacroPercent(macros),
        });
      });
    });
    return applyOverrides(next);
  }, [applyOverrides, logSections, selectedMeal?.id]);

  const recentFoods = useMemo(() => {
    const combined = [...addedFoods, ...recentMealFoods];
    const seen = new Set<string>();
    return combined.filter((food) => {
      const key = food.id ?? food.name.trim().toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [addedFoods, recentMealFoods]);

  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  useEffect(() => {
    if (!selectedFood) return;
    const match =
      apiResults.find((item) => item.id === selectedFood.id) ??
      favorites.find((item) => item.id === selectedFood.id) ??
      history.find((item) => item.id === selectedFood.id);
    if (match && match !== selectedFood) {
      setSelectedFood(match);
    }
  }, [apiResults, favorites, history, selectedFood]);

  useEffect(() => {
    if (activeTab !== "search") {
      setLastBrowseTab(activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (activeSheet === "detail" && !selectedFood) {
      closeSheets();
    }
  }, [activeSheet, closeSheets, selectedFood]);

  useEffect(() => {
    const hasQuery = searchQuery.trim().length > 0;
    if (hasQuery && activeTab !== "search") {
      setActiveTab("search");
    } else if (!hasQuery && activeTab === "search") {
      setActiveTab(lastBrowseTab);
    }
  }, [activeTab, lastBrowseTab, searchQuery]);

  useEffect(() => {
    const query = searchQuery.trim();
    const timer = window.setTimeout(() => {
      searchFoods(query);
      const nextParams = new URLSearchParams(searchParams);
      if (selectedMeal?.id) {
        nextParams.set("mealId", selectedMeal.id);
      } else {
        nextParams.delete("mealId");
      }
      if (returnTo) {
        nextParams.set("returnTo", returnTo);
      } else {
        nextParams.delete("returnTo");
      }
      if (activeTab) {
        nextParams.set("tab", activeTab);
      } else {
        nextParams.delete("tab");
      }
      if (searchQuery) {
        nextParams.set("query", searchQuery);
      } else {
        nextParams.delete("query");
      }
      if (sortBy !== "relevance") {
        nextParams.set("sort", sortBy);
      } else {
        nextParams.delete("sort");
      }
      if (selectedTags.length > 0) {
        nextParams.set("tags", selectedTags.join(","));
      } else {
        nextParams.delete("tags");
      }
      setSearchParams(nextParams, { replace: true });
    }, query ? 200 : 0);
    return () => window.clearTimeout(timer);
  }, [
    searchFoods,
    searchQuery,
    activeTab,
    returnTo,
    selectedMeal?.id,
    selectedTags,
    searchParams,
    sortBy,
    setSearchParams,
  ]);

  useEffect(() => {
    const meals = mealTypes.meals;
    if (!meals.length) return;
    const mealId = searchParams.get("mealId");
    if (mealId) {
      const match = meals.find((meal) => meal.id === mealId);
      if (match) {
        setSelectedMeal(match);
        return;
      }
      return;
    }
    setSelectedMeal((prev) => prev ?? meals[0]);
  }, [mealTypes.meals, searchParams]);

  useEffect(() => {
    const mealId = selectedMeal?.id;
    if (!mealId) {
      setRecentMealFoods([]);
      return;
    }
    const requestId = ++recentRequestRef.current;
    const buildLocalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const today = new Date();
    const dates = Array.from({ length: 7 }, (_, index) => {
      const next = new Date(today);
      next.setDate(today.getDate() - index);
      return buildLocalDate(next);
    });

    const loadRecent = async () => {
      try {
        await ensureUser();
        const responses = await Promise.all(
          dates.map((date) => fetchMealEntries(date)),
        );
        if (requestId !== recentRequestRef.current) return;
        const itemMap = new Map<
          string,
          { item: FoodItem; loggedAt: number }
        >();
        responses.forEach((response) => {
          const entriesById = new Map(
            response.entries.map((entry) => [entry.id, entry]),
          );
          response.items.forEach((item) => {
            const entry = entriesById.get(item.meal_entry_id);
            if (!entry || entry.meal_type_id !== mealId) return;
            const macros = {
              carbs: Number(item.carbs_g ?? 0),
              protein: Number(item.protein_g ?? 0),
              fat: Number(item.fat_g ?? 0),
            };
            const portion =
              item.portion_label ??
              (item.portion_grams ? `${item.portion_grams} g` : "1 serving");
            const food: FoodItem = {
              id: item.food_id ?? `meal-item:${item.id}`,
              name: item.food_name,
              portion,
              portionLabel: item.portion_label ?? undefined,
              portionGrams: item.portion_grams ?? undefined,
              kcal: Number(item.kcal ?? 0),
              emoji: selectedMeal?.emoji ?? "🍽️",
              imageUrl: item.image_url ?? undefined,
              source: "local",
              macros,
              macroPercent: calculateMacroPercent(macros),
            };
            const key = item.food_id ?? item.food_name.trim().toLowerCase();
            const loggedAt = Date.parse(entry.logged_at);
            const existing = itemMap.get(key);
            if (!existing || loggedAt > existing.loggedAt) {
              itemMap.set(key, { item: food, loggedAt });
            }
          });
        });
        const ordered = Array.from(itemMap.values())
          .sort((a, b) => b.loggedAt - a.loggedAt)
          .map((entry) => entry.item);
        setRecentMealFoods(applyOverrides(ordered));
      } catch {
        if (requestId !== recentRequestRef.current) return;
        setRecentMealFoods([]);
      }
    };

    void loadRecent();
  }, [applyOverrides, selectedMeal?.emoji, selectedMeal?.id]);

  useEffect(() => {
    const mealId = selectedMeal?.id;
    if (!mealId) {
      setYesterdayMealItems([]);
      return;
    }
    const buildLocalDate = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    };
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayLocal = buildLocalDate(yesterday);

    const loadYesterday = async () => {
      setIsLoadingYesterday(true);
      try {
        await ensureUser();
        const { entries, items } = await fetchMealEntries(yesterdayLocal);
        const entryIds = new Set(
          entries
            .filter((e) => e.meal_type_id === mealId)
            .map((e) => e.id),
        );
        const itemsForMeal = items
          .filter((item) => entryIds.has(item.meal_entry_id))
          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

        // Deduplicate by food (id or name): one row per unique food, quantities summed.
        // Prevents duplicate log entries when the API returns multiple item rows for the same food.
        const byFoodKey = new Map<
          string,
          { item: (typeof itemsForMeal)[0]; totalQuantity: number }
        >();
        for (const item of itemsForMeal) {
          const key = (item.food_id ?? item.food_name.trim().toLowerCase()) || `meal-item:${item.id}`;
          const existing = byFoodKey.get(key);
          const qty = item.quantity ?? 1;
          if (existing) {
            existing.totalQuantity += qty;
          } else {
            byFoodKey.set(key, { item, totalQuantity: qty });
          }
        }

        const mealItems = Array.from(byFoodKey.values()).map(({ item, totalQuantity }) => {
          const macros = {
            carbs: Number(item.carbs_g ?? 0),
            protein: Number(item.protein_g ?? 0),
            fat: Number(item.fat_g ?? 0),
          };
          const portion =
            item.portion_label ??
            (item.portion_grams ? `${item.portion_grams} g` : "1 serving");
          const food: FoodItem = {
            id: item.food_id ?? `meal-item:${item.id}`,
            name: item.food_name,
            portion,
            portionLabel: item.portion_label ?? undefined,
            portionGrams: item.portion_grams ?? undefined,
            kcal: Number(item.kcal ?? 0),
            emoji: selectedMeal?.emoji ?? "🍽️",
            imageUrl: item.image_url ?? undefined,
            source: "local",
            macros,
            macroPercent: calculateMacroPercent(macros),
          };
          return {
            food: applyOverrides([food])[0],
            quantity: totalQuantity,
            portionLabel: item.portion_label ?? undefined,
            portionGrams: item.portion_grams ?? undefined,
          };
        });
        setYesterdayMealItems(mealItems);
      } catch {
        setYesterdayMealItems([]);
      } finally {
        setIsLoadingYesterday(false);
      }
    };

    void loadYesterday();
  }, [applyOverrides, selectedMeal?.emoji, selectedMeal?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem(CREATED_FOOD_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { food?: FoodItem };
      if (!parsed.food) return;
      setSelectedFood(parsed.food);
      openSheet("detail");
      window.localStorage.removeItem(CREATED_FOOD_KEY);
    } catch {
      window.localStorage.removeItem(CREATED_FOOD_KEY);
    }
  }, []);

  const filteredFoods = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const applyFiltersAndSort = (foods: FoodItem[]) => {
      const withFilters =
        selectedTags.length > 0
          ? foods.filter((food) => matchesAllFoodTags(food, selectedTags))
          : foods;
      return sortFoods(withFilters, sortBy);
    };

    if (!query) {
      if (activeTab === "liked") {
        return applyFiltersAndSort(applyOverrides(favorites));
      }
      if (activeTab === "history") {
        return applyFiltersAndSort(addedFoods);
      }
      if (activeTab === "recent") {
        return applyFiltersAndSort(applyOverrides(recentMealFoods));
      }
      if (activeTab === "search") {
        return applyFiltersAndSort(recentFoods);
      }
      return applyFiltersAndSort(recentFoods);
    }
    const merged = [...favorites, ...history, ...recentFoods, ...apiResults];
    const seen = new Set<string>();
    const unique = merged.filter((food) => {
      if (seen.has(food.id)) return false;
      seen.add(food.id);
      return true;
    });
    return applyFiltersAndSort(applyOverrides(fuzzyFilter(unique, query)));
  }, [
    activeTab,
    addedFoods,
    apiResults,
    applyOverrides,
    favorites,
    history,
    recentFoods,
    recentMealFoods,
    searchQuery,
    selectedTags,
    sortBy,
  ]);

  const goalPreset = useMemo(
    () => getGoalPresetForSelection(selectedTags, sortBy),
    [selectedTags, sortBy],
  );

  const handleGoalPresetChange = (presetId: FoodGoalPresetId | null) => {
    if (!presetId) {
      setSelectedTags([]);
      setSortBy("relevance");
      return;
    }
    const preset = FOOD_GOAL_PRESETS.find((entry) => entry.id === presetId);
    if (!preset) return;
    setSelectedTags(preset.tags);
    setSortBy(preset.sortBy);
  };

  const handleClearFilters = () => {
    setSelectedTags([]);
    setSortBy("relevance");
  };


  const resolveMealId = () => selectedMeal?.id ?? mealTypes.meals[0]?.id;

  const findExistingLogItem = (food: FoodItem, mealId?: string) => {
    if (!mealId) return null;
    for (const section of logSections) {
      for (const item of section.items) {
        if (item.mealTypeId !== mealId) continue;
        if (item.foodId && item.foodId === food.id) return item;
        if (item.name === food.name) return item;
      }
    }
    return null;
  };

  const handleTrack = (
    food: FoodItem,
    options?: { quantity?: number; portionLabel?: string; portionGrams?: number | null },
  ) => {
    const mealId = resolveMealId();
    if (!mealId) {
      toast("Select a meal first", { description: "Choose where to log this food." });
      return;
    }
    const existing = findExistingLogItem(food, mealId);
    if (existing) {
      toast("Already logged for this meal", {
        description: "Adjust servings instead of adding the same item twice.",
        action: {
          label: "Adjust servings",
          onClick: () => {
            setEditItem(existing);
            openSheet("edit");
          },
        },
      });
      return;
    }
    // Optimistic - fires immediately, errors handled by mutation's onError
    nutrition.logFood(food, mealId, options);
    setMealPulse(mealId);
    toast("Logged to diary", { description: "Food added to your day." });
    closeSheets();
    navigate(returnTo, { replace: true });
  };

  const handleQuickAdd = (food: FoodItem) => {
    const mealId = resolveMealId();
    if (!mealId) {
      toast("Select a meal first", { description: "Choose where to log this food." });
      return;
    }
    const existing = findExistingLogItem(food, mealId);
    if (existing) {
      toast("Already logged for this meal", {
        description: "Adjust servings instead of adding the same item twice.",
        action: {
          label: "Adjust servings",
          onClick: () => {
            setEditItem(existing);
            openSheet("edit");
          },
        },
      });
      return;
    }
    // Optimistic - fires immediately, errors handled by mutation's onError
    nutrition.logFood(food, mealId);
    setMealPulse(mealId);
    toast("Logged to diary", { description: "Food added to your day." });
  };

  const handleSameAsYesterday = () => {
    const mealId = resolveMealId();
    if (!mealId) {
      toast("Select a meal first", { description: "Choose where to log foods." });
      return;
    }
    if (yesterdayMealItems.length === 0) {
      toast("Nothing from yesterday", {
        description: `You didn't log anything for ${selectedMeal?.label ?? "this meal"} yesterday.`,
      });
      return;
    }
    setIsAddingSameAsYesterday(true);
    let added = 0;
    for (const { food, quantity, portionLabel, portionGrams } of yesterdayMealItems) {
      const existing = findExistingLogItem(food, mealId);
      if (existing) continue;
      nutrition.logFood(food, mealId, {
        quantity,
        portionLabel: portionLabel ?? undefined,
        portionGrams: portionGrams ?? undefined,
      });
      added++;
    }
    setIsAddingSameAsYesterday(false);
    setMealPulse(mealId);
    if (added > 0) {
      toast(`Added ${added} item${added === 1 ? "" : "s"} from yesterday`, {
        description: `Logged to ${selectedMeal?.label ?? "meal"}.`,
      });
      navigate(returnTo, { replace: true });
    } else {
      toast("Already logged", {
        description: `All of yesterday's ${selectedMeal?.label ?? "meal"} items are already in today.`,
      });
    }
  };

  const handleQuickRemove = (food: FoodItem) => {
    const mealId = resolveMealId();
    if (!mealId) return;
    const existing = findExistingLogItem(food, mealId);
    if (!existing) return;
    // Optimistic - fires immediately, errors handled by mutation's onError
    removeLogItem(existing);
    toast(`${food.name} removed`);
  };

  const handleUpdateFood = (food: FoodItem, next: NutritionDraft) => {
    const updated = upsertOverride(food, {
      kcal: next.kcal,
      portion: next.portion,
      macros: {
        carbs: next.carbs,
        protein: next.protein,
        fat: next.fat,
      },
    });
    setSelectedFood(updated);
    toast("Nutrition updated");
  };

  const handleUpdateMaster = async (
    food: FoodItem,
    next: NutritionDraft,
    micros: Record<string, number | string>,
  ) => {
    const cleanName = next.name?.trim();
    const cleanBrand = next.brand?.trim();
    const updated = await updateFoodMaster(food.id, {
      name: cleanName ? cleanName : food.name,
      brand: cleanBrand ? cleanBrand : null,
      brandId: next.brandId ?? null,
      portionLabel: next.portion,
      portionGrams: next.portionGrams ?? null,
      kcal: next.kcal,
      carbsG: next.carbs,
      proteinG: next.protein,
      fatG: next.fat,
      micronutrients: micros,
    });
    if (updated) {
      setSelectedFood(updated);
      toast("Master nutrition updated");
    }
  };

  return (
    <AppShell experience="nutrition" showNav={false}>
      {/* pt includes safe-area for immersive edge-to-edge display */}
      <PageContainer>
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-card/80 text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.1)]"
            onClick={() => navigate(returnTo)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <button
            type="button"
            className="rounded-full border border-border/70 bg-card px-3 py-1 text-xs font-semibold text-primary"
            onClick={() => {
              const nextParams = new URLSearchParams(searchParams);
              if (selectedMeal?.id) {
                nextParams.set("mealId", selectedMeal.id);
              }
              if (returnTo) {
                nextParams.set("returnTo", returnTo);
              }
              if (activeTab) {
                nextParams.set("tab", activeTab);
              }
              if (searchQuery) {
                nextParams.set("query", searchQuery);
              }
              if (sortBy !== "relevance") {
                nextParams.set("sort", sortBy);
              } else {
                nextParams.delete("sort");
              }
              if (selectedTags.length > 0) {
                nextParams.set("tags", selectedTags.join(","));
              } else {
                nextParams.delete("tags");
              }
              navigate(`/nutrition/add-food/scan?${nextParams.toString()}`);
            }}
          >
            Scan
          </button>
        </div>

        <div className="mt-4">
          <FoodSearchContent
            activeTab={activeTab}
            libraryTab={lastBrowseTab}
            onTabChange={(nextTab) => {
              setActiveTab(nextTab);
              if (nextTab !== "search") {
                setSearchQuery("");
              }
            }}
            searchQuery={searchQuery}
            onSearchChange={(value) => setSearchQuery(value)}
            searchStatus={searchStatus}
            searchError={searchError}
            foods={filteredFoods}
            selectedTags={selectedTags}
            onToggleTag={(tag) =>
              setSelectedTags((prev) =>
                prev.includes(tag) ? prev.filter((value) => value !== tag) : [...prev, tag],
              )
            }
            onClearFilters={handleClearFilters}
            goalPreset={goalPreset}
            onGoalPresetChange={handleGoalPresetChange}
            sortBy={sortBy}
            onSortByChange={setSortBy}
            meal={selectedMeal}
            meals={mealTypes.meals}
            loggedFoodIds={loggedInMeal.ids}
            loggedFoodNames={loggedInMeal.names}
            onMealChange={(mealId) => {
              const match = mealTypes.meals.find((meal) => meal.id === mealId) ?? null;
              setSelectedMeal(match);
            }}
            onSelectFood={(food) => {
              const mealId = resolveMealId();
              const existing = mealId ? findExistingLogItem(food, mealId) : null;
              if (existing) {
                setEditItem(existing);
                openSheet("edit");
                return;
              }
              setSelectedFood(food);
              openSheet("detail");
            }}
            onQuickAddFood={handleQuickAdd}
            onQuickRemoveFood={activeTab === "history" ? handleQuickRemove : undefined}
            sameAsYesterdayItems={yesterdayMealItems.map((x) => x.food)}
            onSameAsYesterday={handleSameAsYesterday}
            isLoadingSameAsYesterday={isLoadingYesterday}
            isAddingSameAsYesterday={isAddingSameAsYesterday}
            onOpenBarcode={() =>
              (() => {
                const nextParams = new URLSearchParams(searchParams);
                if (selectedMeal?.id) {
                  nextParams.set("mealId", selectedMeal.id);
                }
                nextParams.set("returnTo", "/nutrition/add-food");
                nextParams.set("tab", activeTab);
                if (searchQuery) {
                  nextParams.set("query", searchQuery);
                } else {
                  nextParams.delete("query");
                }
                if (sortBy !== "relevance") {
                  nextParams.set("sort", sortBy);
                } else {
                  nextParams.delete("sort");
                }
                if (selectedTags.length > 0) {
                  nextParams.set("tags", selectedTags.join(","));
                } else {
                  nextParams.delete("tags");
                }
                navigate(`/nutrition/add-food/scan?${nextParams.toString()}`);
              })()
            }
            onOpenCreate={() =>
              (() => {
                const nextParams = new URLSearchParams(searchParams);
                if (selectedMeal?.id) {
                  nextParams.set("mealId", selectedMeal.id);
                }
                nextParams.set("returnTo", "/nutrition/add-food");
                nextParams.set("tab", activeTab);
                if (searchQuery) {
                  nextParams.set("query", searchQuery);
                } else {
                  nextParams.delete("query");
                }
                if (sortBy !== "relevance") {
                  nextParams.set("sort", sortBy);
                } else {
                  nextParams.delete("sort");
                }
                if (selectedTags.length > 0) {
                  nextParams.set("tags", selectedTags.join(","));
                } else {
                  nextParams.delete("tags");
                }
                navigate(`/nutrition/add-food/create?${nextParams.toString()}`);
              })()
            }
            inputRef={inputRef}
          />
        </div>
      </PageContainer>

      <FoodDetailSheet
        open={isDetailOpen}
        onOpenChange={(open) => (open ? openSheet("detail") : closeSheets())}
        food={selectedFood}
        macros={nutrition.macros}
        onTrack={handleTrack}
        onUpdateFood={handleUpdateFood}
        onUpdateMaster={handleUpdateMaster}
        isFavorite={selectedFood ? favorites.some((food) => food.id === selectedFood.id) : false}
        onToggleFavorite={(favorite) => {
          if (!selectedFood) return;
          void setFavorite(selectedFood.id, favorite);
        }}
      />

      <EditLogSheet
        open={isEditOpen}
        onOpenChange={(open) => (open ? openSheet("edit") : closeSheets())}
        item={editItem}
        onSave={(item, multiplier) => {
          // Optimistic - fires immediately, errors handled by mutation's onError
          updateLogItem(item, multiplier);
          toast(`Updated ${item.name} to ${Number(multiplier).toFixed(1)}x`);
        }}
        onDelete={(item) => {
          // Optimistic - fires immediately, errors handled by mutation's onError
          removeLogItem(item);
          toast(`${item.name} removed`);
          closeSheets();
        }}
      />
    </AppShell>
  );
};

export default AddFood;
