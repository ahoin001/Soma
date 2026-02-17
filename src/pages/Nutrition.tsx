import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { type FoodItem, type Meal } from "@/data/mock";
import {
  AppShell,
  DashboardHeader,
  DateSwitcher,
  EditLogSheet,
  FoodDetailSheet,
  type FoodDetailSheetProps,
  MacroMicroGoalSheet,
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
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSheetManager } from "@/hooks/useSheetManager";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SHEET_NUTRITION_KEY } from "@/lib/storageKeys";
import { toLocalDate } from "@/lib/nutritionData";
import type { NutritionDraft } from "@/types/nutrition";

type ActiveSheet = "detail" | "quick" | "edit" | "admin" | null;

function NutritionPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[420px] px-4 pb-10">
      <div className="-mx-4 skeleton-shimmer overflow-hidden rounded-b-[40px]">
        <div className="rounded-b-[40px] bg-gradient-to-b from-secondary/80 via-secondary/45 to-background pb-8 pt-[calc(3rem+var(--sat,env(safe-area-inset-top)))] dark:from-card dark:via-background/95 dark:to-background">
          <div className="flex justify-center px-5">
            <Skeleton className="h-24 w-24 rounded-full" />
          </div>
          <div className="mt-4 flex justify-center gap-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-28" />
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-2 skeleton-shimmer overflow-hidden rounded-full max-w-[8rem] mx-auto">
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>
      <Card className="card-default skeleton-shimmer mt-4 overflow-hidden rounded-[28px] px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-3 w-24" />
            <Skeleton className="mt-2 h-5 w-32" />
          </div>
          <Skeleton className="h-10 w-10 rounded-full" />
        </div>
        <div className="mt-4 space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 w-full rounded-[22px]" />
          ))}
        </div>
      </Card>
      <div className="mt-4 flex gap-3">
        <Skeleton className="h-24 flex-1 rounded-[24px] skeleton-shimmer" />
        <Skeleton className="h-24 flex-1 rounded-[24px] skeleton-shimmer" />
      </div>
    </div>
  );
}

const Nutrition = () => {
  const { activeSheet, openSheet, closeSheets, setActiveSheet } =
    useSheetManager<Exclude<ActiveSheet, null>>(null, {
      storageKey: SHEET_NUTRITION_KEY,
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
  const { showFoodImages, headerStyle } = useUserSettings();
  const { mealPulse, setMealPulse, clearMealPulse } = useMealPulse();
  const { userId, email, logout } = useAuth();
  const isAdmin = useIsAdmin();
  const isSignedIn = Boolean(userId);
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
    micros,
    syncState,
    logFood,
    undoLastLog,
    logSections,
    completion,
    selectedDate,
    setSelectedDate,
    removeLogItem,
    updateLogItem,
    isLoading: nutritionLoading,
    setGoal,
    setMacroTargets,
  } = nutrition;
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);
  const meals = mealTypes.meals;
  const { favorites, history, refreshLists, setFavorite } = foodCatalog;
  const stepsSummary = useStepsSummary(selectedDate);
  const waterSummary = useWaterSummary(selectedDate);
  
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

  const handleTrack = async (
    food: FoodItem,
    options?: { quantity?: number; portionLabel?: string; portionGrams?: number | null },
  ) => {
    try {
      await logFood(food, selectedMeal?.id, options);
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
        navigate("/nutrition/add-food");
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
              className="absolute h-64 w-64 rounded-full bg-gradient-to-br from-primary/45 via-accent/35 to-transparent blur-3xl"
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
                className="absolute text-primary"
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
                className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80"
              >
                {locationState?.isNewUser ? "Welcome to" : "Welcome back to"}
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4, type: "spring", stiffness: 200 }}
                className="mt-2 text-4xl font-bold text-primary"
              >
                AuraFit
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.6 }}
                className="mt-2 text-sm text-primary/80"
              >
                {locationState?.isNewUser 
                  ? "Let's start your wellness journey ✨" 
                  : "Ready to continue your journey ✨"}
              </motion.p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <LoadingState
        isLoading={nutritionLoading}
        delay={180}
        skeleton={<NutritionPageSkeleton />}
      >
        <div className="mx-auto w-full max-w-[420px] px-4 pb-10">
          {/* Header extends to screen edges (-mx-4) for immersive gradient effect */}
          <div className="-mx-4">
            <DashboardHeader
            eaten={summary.eaten}
            steps={stepsSummary.steps}
            kcalLeft={summary.kcalLeft}
            goal={summary.goal}
            syncState={syncState}
            macros={macros}
            micros={micros}
            animateTrigger={animateTrigger}
            variant={headerStyle}
            onLongPressMacros={() => setGoalSheetOpen(true)}
            onProfileClick={
              isAdmin
                ? () => {
                    closeSheets();
                    setAdminQuery("");
                    openSheet("admin");
                  }
                : undefined
            }
            onBellClick={
              isAdmin ? () => navigate("/nutrition/admin/import") : undefined
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
          pulseTrigger={animateTrigger}
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
        <Card className="card-subtle mt-4 rounded-[24px] px-4 py-3">
          <p className="section-caption">Appearance & theme</p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Header style, theme mode, color palette, default home.
          </p>
          <Button
            type="button"
            variant="ghost"
            className="mt-3 rounded-xl"
            onClick={() => navigate("/settings")}
          >
            Open Settings
          </Button>
        </Card>
        <StreakCard
          days={insights.streak.days}
          bestWeek={insights.streak.bestWeek}
          message={insights.streak.message}
        />

        <Card className="card-subtle mt-4 rounded-[24px] px-4 py-3">
          <p className="section-caption">Account</p>
          <p className="mt-0.5 text-sm font-medium text-foreground">
            {isSignedIn ? (email ?? "Signed in") : "Not signed in"}
          </p>
          {isSignedIn ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() => void logout()}
              className="mt-3 rounded-xl"
            >
              Log out
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate("/auth", { state: { from: "/nutrition" } })}
              className="mt-3 rounded-xl"
            >
              Sign in
            </Button>
          )}
        </Card>
        </div>
      </LoadingState>

      <FoodDetailSheet
        open={isDetailOpen}
        onOpenChange={(open) => (open ? openSheet("detail") : closeSheets())}
        food={selectedFood}
        macros={macros}
        onTrack={handleTrack}
        onUpdateFood={handleUpdateFood as FoodDetailSheetProps["onUpdateFood"]}
        onUpdateMaster={handleUpdateMaster as FoodDetailSheetProps["onUpdateMaster"]}
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
        <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-6">
          <div className="px-5 pb-6 pt-3">
            <p className="text-xs uppercase tracking-[0.3em] text-primary/80">
              Admin
            </p>
            <h3 className="mt-2 text-xl font-display font-semibold text-foreground">
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
                  className="flex w-full items-center justify-between rounded-[24px] border border-border/60 bg-card px-4 py-3 text-left shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-secondary text-xl">
                      {showFoodImages && food.imageUrl ? (
                        <img
                          src={food.imageUrl}
                          alt={food.name}
                          className="h-full w-full object-contain"
                        />
                      ) : (
                        food.emoji
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-foreground">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {food.portion} • {food.kcal} cal
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-primary">Edit</span>
                </button>
              ))}
              {adminQuery.trim() && apiResults.length === 0 && (
                <p className="text-sm text-muted-foreground">No foods found.</p>
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
      <MacroMicroGoalSheet
        open={goalSheetOpen}
        onOpenChange={setGoalSheetOpen}
        macros={macros}
        micros={micros}
        calorieGoal={summary.goal}
        onSaveMacros={setMacroTargets}
        onSaveCalorieGoal={setGoal}
      />
    </AppShell>
  );
};

export default Nutrition;
