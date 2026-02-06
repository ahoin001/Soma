import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { FoodItem, Meal } from "@/data/mock";
import { AppShell, EditLogSheet, FoodDetailSheet } from "@/components/aura";
import { FoodSearchContent } from "@/components/aura/FoodSearchContent";
import { useAppStore } from "@/state/AppStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { fuzzyFilter } from "@/lib/fuzzySearch";
import { useSheetManager } from "@/hooks/useSheetManager";
import { calculateMacroPercent } from "@/data/foodApi";
import type { LogItem } from "@/types/log";
import { ensureUser, fetchMealEntries } from "@/lib/api";

type ActiveTab = "search" | "recent" | "liked" | "history";

type LocationState = {
};

type NutritionDraft = {
  name?: string;
  brand?: string;
  portion: string;
  portionGrams?: number | null;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  sodiumMg?: number | null;
  fiberG?: number | null;
  sugarG?: number | null;
  saturatedFatG?: number | null;
  transFatG?: number | null;
  cholesterolMg?: number | null;
  potassiumMg?: number | null;
  ingredients?: string;
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
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [editItem, setEditItem] = useState<LogItem | null>(null);
  const [recentMealFoods, setRecentMealFoods] = useState<FoodItem[]>([]);
  const recentRequestRef = useRef(0);
  const { activeSheet, openSheet, closeSheets } = useSheetManager<"detail" | "edit">(null, {
    storageKey: "aurafit-sheet:add-food",
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

  // DEBUG: Track when logSections changes
  useEffect(() => {
    const totalItems = logSections.reduce((sum, s) => sum + s.items.length, 0);
    console.log("[AddFood] logSections changed", {
      sectionsCount: logSections.length,
      totalItems,
      selectedMealId: selectedMeal?.id,
    });
  }, [logSections, selectedMeal?.id]);

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
      setSearchParams(nextParams, { replace: true });
    }, query ? 200 : 0);
    return () => window.clearTimeout(timer);
  }, [
    searchFoods,
    searchQuery,
    activeTab,
    returnTo,
    selectedMeal?.id,
    searchParams,
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
    }
    setSelectedMeal(meals[0]);
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
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("aurafit-created-food");
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { food?: FoodItem };
      if (!parsed.food) return;
      setSelectedFood(parsed.food);
      openSheet("detail");
      window.localStorage.removeItem("aurafit-created-food");
    } catch {
      window.localStorage.removeItem("aurafit-created-food");
    }
  }, []);

  const filteredFoods = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      if (activeTab === "liked") {
        return applyOverrides(favorites);
      }
      if (activeTab === "history") {
        return addedFoods;
      }
      if (activeTab === "recent") {
        return recentFoods;
      }
      if (activeTab === "search") {
        return recentFoods;
      }
      return recentFoods;
    }
    const merged = [...favorites, ...history, ...recentFoods, ...apiResults];
    const seen = new Set<string>();
    const unique = merged.filter((food) => {
      if (seen.has(food.id)) return false;
      seen.add(food.id);
      return true;
    });
    return applyOverrides(fuzzyFilter(unique, query));
  }, [
    activeTab,
    addedFoods,
    apiResults,
    applyOverrides,
    favorites,
    history,
    recentFoods,
    searchQuery,
  ]);


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
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10" style={{ paddingTop: "calc(1rem + var(--sat, env(safe-area-inset-top)))" }}>
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/80 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.1)]"
            onClick={() => navigate(returnTo)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <button
            type="button"
            className="rounded-full border border-emerald-100 bg-white px-3 py-1 text-xs font-semibold text-emerald-700"
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
                navigate(`/nutrition/add-food/create?${nextParams.toString()}`);
              })()
            }
            inputRef={inputRef}
          />
        </div>
      </div>

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
