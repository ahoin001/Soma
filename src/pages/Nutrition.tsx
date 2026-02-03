import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type FoodItem, type Meal } from "@/data/mock";
import {
  AppShell,
  DashboardHeader,
  DateSwitcher,
  EditLogSheet,
  FoodDetailSheet,
  MealLogPanel,
  QuickActionSheet,
  QuickAdd,
  StepsCard,
  StreakCard,
  WaterCard,
  WeeklyPreview,
} from "@/components/aura";
import { toast } from "sonner";
import type { LogItem } from "@/types/log";
import { useAppStore } from "@/state/AppStore";
import { useStepsSummary, useWaterSummary } from "@/hooks/useTracking";
import { useNutritionInsights } from "@/hooks/useNutritionInsights";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";

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

const Nutrition = () => {
  const [detailOpen, setDetailOpen] = useState(false);
  const [quickOpen, setQuickOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<LogItem | null>(null);
  const [adminOpen, setAdminOpen] = useState(false);
  const [adminQuery, setAdminQuery] = useState("");
  const navigate = useNavigate();
  const { nutrition, foodCatalog, mealTypes, showFoodImages, setShowFoodImages } = useAppStore();
  const { email } = useAuth();
  const isAdmin = email?.toLowerCase() === "ahoin001@gmail.com";
  const {
    results: apiResults,
    applyOverrides,
    upsertOverride,
    updateFoodMaster,
    searchFoods,
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
    updateLogItem,
  } = nutrition;
  const meals = mealTypes.meals;
  const { favorites, history, refreshLists, setFavorite } = foodCatalog;
  const stepsSummary = useStepsSummary(selectedDate);
  const waterSummary = useWaterSummary(selectedDate);
  const insights = useNutritionInsights(selectedDate);
  const isFavorite = useMemo(
    () => (selectedFood ? favorites.some((food) => food.id === selectedFood.id) : false),
    [favorites, selectedFood],
  );

  useEffect(() => {
    void refreshLists();
  }, [refreshLists]);

  useEffect(() => {
    if (!adminOpen) return;
    const query = adminQuery.trim();
    const timer = window.setTimeout(() => {
      searchFoods(query, { force: true, external: true });
    }, query ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [adminOpen, adminQuery, searchFoods]);

  useEffect(() => {
    if (!meals.length || selectedMeal) return;
    setSelectedMeal(meals[0]);
  }, [meals, selectedMeal]);

  const openSearch = (meal: Meal) => {
    setSelectedMeal(meal);
    navigate("/nutrition/add-food", { state: { mealId: meal.id } });
  };

  const openDetail = (food: FoodItem) => {
    setSelectedFood(food);
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

  const handleEditItem = (item: LogItem) => {
    setEditItem(item);
    setEditOpen(true);
  };

  const handleRemoveItem = (item: LogItem) => {
    void removeLogItem(item.id);
    toast(`${item.name} removed`);
  };

  return (
    <AppShell experience="nutrition" onAddAction={() => setQuickOpen(true)}>
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-4">
        <div className="-mx-4 -mt-[env(safe-area-inset-top)]">
          <DashboardHeader
            eaten={summary.eaten}
            steps={stepsSummary.steps}
            kcalLeft={summary.kcalLeft}
            goal={summary.goal}
            syncState={syncState}
            macros={macros}
          />
        </div>
        {isAdmin && (
          <div className="mt-4">
            <Button
              type="button"
              className="w-full rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              variant="secondary"
              onClick={() => setAdminOpen(true)}
            >
              Admin: Edit food database
            </Button>
          </div>
        )}

        <DateSwitcher value={selectedDate} onChange={setSelectedDate} />

        <MealLogPanel
          meals={meals}
          logSections={logSections}
          completion={completion}
          onAddMeal={openSearch}
          onEditItem={handleEditItem}
          onRemoveItem={handleRemoveItem}
        />
        
        <StepsCard
          steps={stepsSummary.steps}
          goal={stepsSummary.goal}
          connected={stepsSummary.connected}
          onConnect={() =>
            toast("Apple Watch sync coming soon", {
              description: "Health data will be available when native sync is enabled.",
            })
          }
          onManualSave={(value) => stepsSummary.setManualSteps(value)}
          onGoalSave={(value) => stepsSummary.updateGoal(value)}
        />
        <WaterCard
          totalMl={waterSummary.totalMl}
          goalMl={waterSummary.goalMl}
          onAdd={waterSummary.addWater}
          onGoalSave={(value) => waterSummary.updateGoal(value)}
        />
        <Card className="mt-6 rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
                Preferences
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                Show food images
              </p>
              <p className="text-xs text-slate-500">
                Toggle food photos across lists and sheets.
              </p>
            </div>
            <Switch
              checked={showFoodImages}
              onCheckedChange={setShowFoodImages}
            />
          </div>
        </Card>
        <WeeklyPreview weeklyKcal={insights.weekly} goal={summary.goal} />
        <Card className="mt-6 rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            28-day average
          </p>
          <p className="mt-2 text-2xl font-display font-semibold text-slate-900">
            {insights.average} cal
          </p>
          <p className="text-xs text-slate-500">
            Average daily intake over the last 28 days.
          </p>
        </Card>
        <StreakCard
          days={insights.streak.days}
          bestWeek={insights.streak.bestWeek}
          message={insights.streak.message}
        />
        <QuickAdd foods={apiResults.slice(0, 3)} onSelect={openDetail} />
      </div>

      <FoodDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        food={selectedFood}
        macros={macros}
        onTrack={handleTrack}
        onUpdateFood={handleUpdateFood}
        onUpdateMaster={handleUpdateMaster}
        isFavorite={isFavorite}
        onToggleFavorite={(favorite) => {
          if (!selectedFood) return;
          void setFavorite(selectedFood.id, favorite);
        }}
      />

      <QuickActionSheet
        open={quickOpen}
        onOpenChange={setQuickOpen}
        meals={meals}
        selectedMeal={selectedMeal}
        onSelectMeal={setSelectedMeal}
        onAddFood={() => {
          setQuickOpen(false);
          if (selectedMeal) {
            navigate("/nutrition/add-food", { state: { mealId: selectedMeal.id } });
          } else {
            navigate("/nutrition/add-food");
          }
        }}
        onCreateFood={() => {
          setQuickOpen(false);
          navigate("/nutrition/add-food/create", {
            state: { mealId: selectedMeal?.id },
          });
        }}
      />

      <Drawer open={adminOpen} onOpenChange={setAdminOpen}>
        <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <div className="px-5 pb-6 pt-3">
            <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">
              Admin
            </p>
            <h3 className="mt-2 text-xl font-display font-semibold text-slate-900">
              Food database editor
            </h3>
            <Input
              value={adminQuery}
              onChange={(event) => setAdminQuery(event.target.value)}
              placeholder="Search foods..."
              className="mt-4 rounded-full"
            />
            <div className="mt-4 space-y-3">
              {apiResults.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => {
                    setSelectedFood(food);
                    setDetailOpen(true);
                    setAdminOpen(false);
                  }}
                  className="flex w-full items-center justify-between rounded-[24px] border border-black/5 bg-white px-4 py-3 text-left shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-xl">
                      {showFoodImages && food.imageUrl ? (
                        <img
                          src={food.imageUrl}
                          alt={food.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        food.emoji
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{food.name}</p>
                      <p className="text-xs text-slate-500">
                        {food.portion} • {food.kcal} cal
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-emerald-600">Edit</span>
                </button>
              ))}
              {adminQuery.trim() && apiResults.length === 0 && (
                <p className="text-sm text-slate-500">No foods found.</p>
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <EditLogSheet
        open={editOpen}
        onOpenChange={setEditOpen}
        item={editItem}
        onSave={(item, multiplier) => {
          void updateLogItem(item, multiplier);
          toast(`Updated ${item.name} to ${Number(multiplier).toFixed(1)}x`);
        }}
        onDelete={(item) => {
          handleRemoveItem(item);
        }}
      />
    </AppShell>
  );
};

export default Nutrition;
