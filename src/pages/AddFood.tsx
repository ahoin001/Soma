import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { FoodItem, Meal } from "@/data/mock";
import { AppShell, FoodDetailSheet } from "@/components/aura";
import { FoodSearchContent } from "@/components/aura/FoodSearchContent";
import { useAppStore } from "@/state/AppStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import { fuzzyFilter } from "@/lib/fuzzySearch";

type ActiveTab = "recent" | "liked" | "history";

type LocationState = {
  mealId?: string;
  createdFood?: FoodItem;
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
  const state = (location.state ?? {}) as LocationState;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { nutrition, foodCatalog, mealTypes } = useAppStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const {
    results: apiResults,
    status: searchStatus,
    error: searchError,
    searchFoods,
    lookupBarcode,
    applyOverrides,
    upsertOverride,
    createFood,
    externalSearchEnabled,
    toggleExternalSearch,
    favorites,
    history,
    refreshLists,
    setFavorite,
    updateFoodMaster,
  } = foodCatalog;

  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  useEffect(() => {
    const query = searchQuery.trim();
    const timer = window.setTimeout(() => {
      searchFoods(query, { external: externalSearchEnabled });
    }, query ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [searchFoods, searchQuery, externalSearchEnabled]);

  useEffect(() => {
    const meals = mealTypes.meals;
    if (!meals.length) return;
    if (state.mealId) {
      const match = meals.find((meal) => meal.id === state.mealId);
      if (match) {
        setSelectedMeal(match);
        return;
      }
    }
    setSelectedMeal(meals[0]);
  }, [mealTypes.meals, state.mealId]);

  useEffect(() => {
    if (!state.createdFood) return;
    setSelectedFood(state.createdFood);
    setDetailOpen(true);
    navigate(location.pathname, { replace: true });
  }, [location.pathname, navigate, state.createdFood]);

  const filteredFoods = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      if (activeTab === "liked") {
        return applyOverrides(favorites);
      }
      if (activeTab === "history") {
        return applyOverrides(history);
      }
      return applyOverrides(history.slice(0, 20));
    }
    const merged = [...favorites, ...history, ...apiResults];
    const seen = new Set<string>();
    const unique = merged.filter((food) => {
      if (seen.has(food.id)) return false;
      seen.add(food.id);
      return true;
    });
    return applyOverrides(fuzzyFilter(unique, query));
  }, [activeTab, apiResults, applyOverrides, favorites, history, searchQuery]);


  const handleTrack = (food: FoodItem) => {
    nutrition.logFood(food, selectedMeal?.id);
    toast("Logged to diary", {
      description: "Food added to your day.",
    });
    setDetailOpen(false);
  };

  const handleQuickAdd = (food: FoodItem) => {
    nutrition.logFood(food, selectedMeal?.id);
    toast("Logged to diary", {
      description: "Food added to your day.",
    });
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
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-4">
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/80 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.1)]"
            onClick={() => navigate(-1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <button
            type="button"
            className="rounded-full border border-emerald-100 bg-white px-3 py-1 text-xs font-semibold text-emerald-700"
            onClick={() => navigate("/nutrition/add-food/scan", { state: { mealId: selectedMeal?.id } })}
          >
            Scan
          </button>
        </div>

        <div className="mt-4">
          <FoodSearchContent
            activeTab={activeTab}
            onTabChange={setActiveTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchStatus={searchStatus}
            searchError={searchError}
            foods={filteredFoods}
            meal={selectedMeal}
            onSelectFood={(food) => {
              setSelectedFood(food);
              setDetailOpen(true);
            }}
            onQuickAddFood={handleQuickAdd}
            onOpenBarcode={() =>
              navigate("/nutrition/add-food/scan", {
                state: { mealId: selectedMeal?.id },
              })
            }
            onOpenCreate={() =>
              navigate("/nutrition/add-food/create", {
                state: { mealId: selectedMeal?.id },
              })
            }
            externalSearchEnabled={externalSearchEnabled}
            onExternalSearchChange={(enabled) => {
              toggleExternalSearch(enabled);
              if (searchQuery.trim()) {
                searchFoods(searchQuery, { force: true, external: enabled });
              }
            }}
            inputRef={inputRef}
          />
        </div>
      </div>

      <FoodDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
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
    </AppShell>
  );
};

export default AddFood;
