import { useEffect, useMemo, useState } from "react";
import {
  quickAddFoods,
  streakSummary,
  weeklyPreview,
  type FoodItem,
  type Meal,
} from "@/data/mock";
import {
  AppShell,
  DashboardHeader,
  DateSwitcher,
  EditLogSheet,
  FoodDetailSheet,
  FoodSearchSheet,
  MacroPills,
  MealLogPanel,
  QuickAdd,
  StepsCard,
  StreakCard,
  WeeklyPreview,
} from "@/components/aura";
import { toast } from "sonner";
import type { LogItem } from "@/types/log";
import { useAppStore } from "@/state/AppStore";

const tabs = {
  recent: [],
  liked: [],
  history: [],
} as const;

type NutritionDraft = {
  portion: string;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
};

const Nutrition = () => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<keyof typeof tabs>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<LogItem | null>(null);
  const { nutrition, foodCatalog, mealTypes } = useAppStore();
  const {
    results: apiResults,
    status: searchStatus,
    error: searchError,
    searchFoods,
    lookupBarcode,
    applyOverrides,
    upsertOverride,
    createFood,
  } = foodCatalog;
  const {
    summary,
    macros,
    syncState,
    logFood,
    undoLastLog,
    logSections,
    completion,
    selectedDate,
    setSelectedDate,
    removeLogItem,
  } = nutrition;
  const meals = mealTypes.meals;

  const filteredFoods = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return applyOverrides([]);
    }
    const merged = [...apiResults];
    const seen = new Set<string>();
    return applyOverrides(
      merged.filter((food) => {
        if (seen.has(food.id)) return false;
        seen.add(food.id);
        return true;
      }),
    );
  }, [activeTab, apiResults, applyOverrides, searchQuery]);

  useEffect(() => {
    if (!meals.length || selectedMeal) return;
    setSelectedMeal(meals[0]);
  }, [meals, selectedMeal]);

  useEffect(() => {
    const query = searchQuery.trim();
    const timer = window.setTimeout(() => {
      searchFoods(query);
    }, query ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [searchFoods, searchQuery]);

  const openSearch = (meal: Meal) => {
    setSelectedMeal(meal);
    setSearchOpen(true);
  };

  const openDetail = (food: FoodItem) => {
    setSelectedFood(food);
    setSearchOpen(false);
    setDetailOpen(true);
  };

  const handleTrack = (food: FoodItem) => {
    logFood(food, selectedMeal?.id);
    toast("Logged to diary", {
      description: "Food added to your day.",
      action: {
        label: "Undo",
        onClick: () => {
          undoLastLog();
          toast("Entry removed");
        },
      },
    });
  };

  const handleBarcodeDetected = async (value: string) => {
    const fetched = await lookupBarcode(value);
    if (fetched) {
      setSelectedFood(fetched);
      setDetailOpen(true);
      return;
    }
    toast("No match found", {
      description: "Try searching manually or create a custom item.",
    });
    setSearchOpen(true);
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

  const handleEditItem = (item: LogItem) => {
    setEditItem(item);
    setEditOpen(true);
  };

  const handleRemoveItem = (item: LogItem) => {
    void removeLogItem(item.id);
    toast(`${item.name} removed`);
  };

  return (
    <AppShell experience="nutrition">
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-4">
        <DashboardHeader
          eaten={summary.eaten}
          burned={summary.burned}
          kcalLeft={summary.kcalLeft}
          goal={summary.goal}
          syncState={syncState}
        />

        <MacroPills className="relative z-10 -mt-12" macros={macros} />

        <MealLogPanel
          meals={meals}
          logSections={logSections}
          completion={completion}
          onAddMeal={openSearch}
          onEditItem={handleEditItem}
          onRemoveItem={handleRemoveItem}
        />
        <DateSwitcher value={selectedDate} onChange={setSelectedDate} />
        <StepsCard
          steps={0}
          goal={8000}
          connected={false}
          onConnect={() =>
            toast("Apple Watch sync coming soon", {
              description: "Health data will be available when native sync is enabled.",
            })
          }
        />
        <WeeklyPreview weeklyKcal={weeklyPreview} goal={summary.goal} />
        <StreakCard
          days={streakSummary.days}
          bestWeek={streakSummary.bestWeek}
          message={streakSummary.message}
        />
        <QuickAdd foods={quickAddFoods} onSelect={openDetail} />
      </div>

      <FoodSearchSheet
        open={searchOpen}
        onOpenChange={setSearchOpen}
        activeTab={activeTab}
        onTabChange={(value) => setActiveTab(value)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        searchStatus={searchStatus}
        searchError={searchError}
        foods={filteredFoods}
        meal={selectedMeal}
        onSelectFood={openDetail}
        onBarcodeDetected={handleBarcodeDetected}
        onCreateFood={async (payload) => {
          const created = await createFood(payload);
          setSelectedFood(created);
          setDetailOpen(true);
        }}
      />

      <FoodDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        food={selectedFood}
        macros={macros}
        onTrack={handleTrack}
        onUpdateFood={handleUpdateFood}
      />

      <EditLogSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        item={editItem}
        onSave={(item, multiplier) =>
          toast(`Updated ${item.name} to ${multiplier.toFixed(1)}x`)
        }
      />
    </AppShell>
  );
};

export default Nutrition;
