import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { type FoodItem, type Meal } from "@/data/mock";
import {
  AppShell,
  DashboardHeader,
  DateSwitcher,
  EditLogSheet,
  FoodDetailSheet,
  MealLogPanel,
  QuickActionSheet,
  StepsCard,
  StreakCard,
  WaterCard,
} from "@/components/aura";
import { toast } from "sonner";
import type { LogItem } from "@/types/log";
import { useAppStore } from "@/state/AppStore";
import { useUserSettings, useMealPulse } from "@/state";
import { useStepsSummary, useWaterSummary } from "@/hooks/useTracking";
import { useNutritionInsights } from "@/hooks/useNutritionInsights";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { useSheetManager } from "@/hooks/useSheetManager";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";

type NutritionDraft = {
  name?: string;
  brand?: string;
  brandId?: string | null;
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

type ActiveSheet = "detail" | "quick" | "edit" | "admin" | null;

const Nutrition = () => {
  const { activeSheet, openSheet, closeSheets, setActiveSheet } =
    useSheetManager<Exclude<ActiveSheet, null>>(null, {
      storageKey: "aurafit-sheet:nutrition",
      persist: true,
    });
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null);
  const [editItem, setEditItem] = useState<LogItem | null>(null);
  const [adminQuery, setAdminQuery] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(false);
  const locationState = location.state as { justLoggedIn?: boolean; isNewUser?: boolean } | null;
  const {
    nutrition,
    foodCatalog,
    mealTypes,
  } = useAppStore();
  const { showFoodImages, setShowFoodImages } = useUserSettings();
  const { mealPulse, setMealPulse, clearMealPulse } = useMealPulse();
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
  
  // DEBUG: Track when logSections changes
  useEffect(() => {
    const totalItems = logSections.reduce((sum, s) => sum + s.items.length, 0);
    console.log("[Nutrition] logSections changed", {
      sectionsCount: logSections.length,
      totalItems,
    });
  }, [logSections]);
  const insights = useNutritionInsights(selectedDate);
  const isFavorite = useMemo(
    () => (selectedFood ? favorites.some((food) => food.id === selectedFood.id) : false),
    [favorites, selectedFood],
  );
  const animateTrigger = mealPulse?.at;
  const pulseMealId = mealPulse?.mealId;
  const isEditOpen = activeSheet === "edit" && Boolean(editItem);
  const isDetailOpen = activeSheet === "detail" && Boolean(selectedFood);

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
    if (activeSheet !== "admin") return;
    const query = adminQuery.trim();
    const timer = window.setTimeout(() => {
      searchFoods(query);
    }, query ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [activeSheet, adminQuery, searchFoods]);

  useEffect(() => {
    if (!mealPulse?.at) return;
    const timer = window.setTimeout(() => clearMealPulse(), 1200);
    return () => window.clearTimeout(timer);
  }, [clearMealPulse, mealPulse?.at]);

  // Show welcome animation when user just logged in
  useEffect(() => {
    if (locationState?.justLoggedIn) {
      setShowWelcome(true);
      // Clear the navigation state so it doesn't show again on refresh
      window.history.replaceState({}, document.title);
      // Auto-dismiss after animation
      const timer = window.setTimeout(() => setShowWelcome(false), 3000);
      return () => window.clearTimeout(timer);
    }
  }, [locationState?.justLoggedIn]);

  useEffect(() => {
    const editItemId = searchParams.get("editItemId");
    if (!editItemId) return;
    const match = logSections
      .flatMap((section) => section.items)
      .find((item) => item.id === editItemId);
    if (match) {
      setEditItem(match);
      setActiveSheet("edit");
    } else {
      toast("Could not find that item", {
        description: "Try selecting it directly from the meal list.",
      });
    }
    const next = new URLSearchParams(searchParams);
    next.delete("editItemId");
    setSearchParams(next, { replace: true });
  }, [logSections, searchParams, setSearchParams]);

  useEffect(() => {
    if (activeSheet === "edit" && !editItem) {
      closeSheets();
    }
  }, [activeSheet, closeSheets, editItem]);

  useEffect(() => {
    if (activeSheet === "detail" && !selectedFood) {
      closeSheets();
    }
  }, [activeSheet, closeSheets, selectedFood]);

  useEffect(() => {
    if (!meals.length || selectedMeal) return;
    setSelectedMeal(meals[0]);
  }, [meals, selectedMeal]);

  const openSearch = (meal: Meal) => {
    closeSheets();
    setSelectedMeal(meal);
    const params = new URLSearchParams();
    params.set("mealId", meal.id);
    params.set("returnTo", "/nutrition");
    navigate(`/nutrition/add-food?${params.toString()}`);
  };

  const openDetail = (food: FoodItem) => {
    closeSheets();
    setSelectedFood(food);
    openSheet("detail");
  };

  const handleTrack = async (food: FoodItem) => {
    try {
      await logFood(food, selectedMeal?.id);
      setMealPulse(selectedMeal?.id);
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
    } catch {
      toast("Couldn't log food", { description: "Please try again." });
      throw new Error("Failed to log food.");
    }
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

  const handleEditItem = (item: LogItem) => {
    setEditItem(item);
    openSheet("edit");
  };

  const handleRemoveItem = (item: LogItem) => {
    // Optimistic - fires immediately, errors handled by mutation's onError
    removeLogItem(item);
    toast(`${item.name} removed`);
  };

  return (
    <AppShell
      experience="nutrition"
      onAddAction={() => {
        closeSheets();
        openSheet("quick");
      }}
    >
      {/* Welcome overlay for fresh logins */}
      <AnimatePresence>
        {showWelcome && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
          >
            {/* Magical background glow */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 2.5, opacity: [0, 0.6, 0] }}
              transition={{ duration: 2.5, ease: "easeOut" }}
              className="absolute h-64 w-64 rounded-full bg-gradient-to-br from-emerald-300 via-emerald-200 to-transparent blur-3xl"
            />
            
            {/* Floating sparkles */}
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  opacity: 0, 
                  scale: 0,
                  x: 0,
                  y: 0,
                }}
                animate={{ 
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0.5],
                  x: Math.cos((i * Math.PI * 2) / 8) * 120,
                  y: Math.sin((i * Math.PI * 2) / 8) * 120,
                }}
                transition={{ 
                  duration: 1.8,
                  delay: 0.1 * i,
                  ease: "easeOut",
                }}
                className="absolute text-emerald-400"
              >
                <Sparkles className="h-5 w-5" />
              </motion.div>
            ))}
            
            {/* Welcome text */}
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="relative text-center"
            >
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-500"
              >
                {locationState?.isNewUser ? "Welcome to" : "Welcome back to"}
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                className="mt-2 text-4xl font-bold text-emerald-700"
              >
                AuraFit
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-2 text-sm text-emerald-600/80"
              >
                {locationState?.isNewUser 
                  ? "Let's start your wellness journey ✨" 
                  : "Ready to continue your journey ✨"}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-4">
        <div className="-mx-4 -mt-[env(safe-area-inset-top)]">
          <DashboardHeader
            eaten={summary.eaten}
            steps={stepsSummary.steps}
            kcalLeft={summary.kcalLeft}
            goal={summary.goal}
            syncState={syncState}
            macros={macros}
            animateTrigger={animateTrigger}
            onProfileClick={
              isAdmin
                ? () => {
                    closeSheets();
                    setAdminQuery("");
                    openSheet("admin");
                  }
                : undefined
            }
          />
        </div>

        <DateSwitcher value={selectedDate} onChange={setSelectedDate} />

        <MealLogPanel
          meals={meals}
          logSections={logSections}
          completion={completion}
          onAddMeal={openSearch}
          onEditItem={handleEditItem}
          onRemoveItem={handleRemoveItem}
          animateTrigger={animateTrigger}
          pulseMealId={pulseMealId}
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
          onSetTotal={waterSummary.setWaterTotal}
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
        <StreakCard
          days={insights.streak.days}
          bestWeek={insights.streak.bestWeek}
          message={insights.streak.message}
        />
      </div>

      <FoodDetailSheet
        open={isDetailOpen}
        onOpenChange={(open) => (open ? openSheet("detail") : closeSheets())}
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
        open={activeSheet === "quick"}
        onOpenChange={(open) => (open ? openSheet("quick") : closeSheets())}
        meals={meals}
        selectedMeal={selectedMeal}
        onSelectMeal={setSelectedMeal}
        onAddFood={() => {
          closeSheets();
          const params = new URLSearchParams();
          if (selectedMeal?.id) {
            params.set("mealId", selectedMeal.id);
          }
          params.set("returnTo", "/nutrition");
          navigate(`/nutrition/add-food?${params.toString()}`);
        }}
        onCreateFood={() => {
          closeSheets();
          const params = new URLSearchParams();
          if (selectedMeal?.id) {
            params.set("mealId", selectedMeal.id);
          }
          params.set("returnTo", "/nutrition");
          navigate(`/nutrition/add-food/create?${params.toString()}`);
        }}
      />

      <Drawer
        open={activeSheet === "admin"}
        onOpenChange={(open) => (open ? openSheet("admin") : closeSheets())}
      >
        <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <div className="px-5 pb-6 pt-3" data-vaul-no-drag>
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
                    closeSheets();
                    navigate("/nutrition/food/edit", {
                      state: { food, returnTo: "/nutrition" },
                    });
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
        open={isEditOpen}
        onOpenChange={(open) => (open ? openSheet("edit") : closeSheets())}
        item={editItem}
        onSave={(item, multiplier) => {
          // Optimistic - fires immediately, errors handled by mutation's onError
          updateLogItem(item, multiplier);
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
