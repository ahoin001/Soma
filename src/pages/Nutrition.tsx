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
  FoodImage,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useSheetManager } from "@/hooks/useSheetManager";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Sparkles } from "lucide-react";
import { LoadingState } from "@/components/ui/loading-state";
import { Skeleton } from "@/components/ui/skeleton";
import { SHEET_NUTRITION_KEY } from "@/lib/storageKeys";
import {
  getTopSourcesForMacro,
  getTopSourcesForMicro,
  toLocalDate,
} from "@/lib/nutritionData";
import { getMicroSlotKeys } from "@/components/aura/MacroMicroGoalSheet";
import type { NutritionDraft } from "@/types/nutrition";
import type { MealPlanItem, MealPlanMeal } from "@/hooks/useMealPlans";

/** Build a FoodItem from a meal plan item so we can call logFood. */
function planItemToFoodItem(item: MealPlanItem): FoodItem {
  const macros = { carbs: item.carbs, protein: item.protein, fat: item.fat };
  const totalCal = item.carbs * 4 + item.protein * 4 + item.fat * 9;
  const macroPercent = totalCal
    ? {
        carbs: (item.carbs * 4 / totalCal) * 100,
        protein: (item.protein * 4 / totalCal) * 100,
        fat: (item.fat * 9 / totalCal) * 100,
      }
    : { carbs: 33.33, protein: 33.33, fat: 33.34 };
  return {
    id: item.foodId ?? `plan-${item.id}`,
    name: item.foodName,
    portion: "1 serving",
    portionLabel: "1 serving",
    kcal: item.kcal,
    emoji: "🍽️",
    macros,
    macroPercent,
  };
}

type SuggestedPlanDayState = {
  suggestedPlanDay: {
    id: string;
    name: string;
    meals: MealPlanMeal[];
    items: MealPlanItem[];
  };
  targetDate?: string; // YYYY-MM-DD
};

type ActiveSheet = "detail" | "quick" | "edit" | "admin" | null;

/** Normalize for fuzzy match: lowercase, collapse spaces, strip non-alphanumeric */
function normalizeForFuzzy(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Score a food for fuzzy relevance to query tokens (partial match, word start, length). */
function scoreFoodRelevance(food: FoodItem, tokens: string[]): number {
  if (!tokens.length) return 0;
  const haystack = normalizeForFuzzy(`${food.name} ${food.brand ?? ""}`);
  if (!haystack) return 0;
  let score = 0;
  for (const token of tokens) {
    if (!token) continue;
    if (haystack.includes(token)) {
      score += token.length >= 2 ? 2 : 1;
      if (haystack.startsWith(token) || haystack.includes(` ${token}`)) score += 2;
    }
  }
  return score;
}

/** Re-rank foods by fuzzy relevance to query, then by name length for ties. */
function rankByRelevance(foods: FoodItem[], query: string): FoodItem[] {
  const q = normalizeForFuzzy(query);
  const tokens = q.split(" ").filter(Boolean);
  if (!tokens.length) return foods;
  return [...foods]
    .map((food) => ({ food, score: scoreFoodRelevance(food, tokens) }))
    .filter((item) => item.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.food.name.length - b.food.name.length;
    })
    .map((item) => item.food);
}

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
  const [adminQueryDebounced, setAdminQueryDebounced] = useState("");
  const [adminSort, setAdminSort] = useState<"relevance" | "name_asc" | "name_desc">("relevance");
  const [adminBrandFilter, setAdminBrandFilter] = useState("");
  const [adminPage, setAdminPage] = useState(1);
  const navigate = useNavigate();

  // Debounce admin search so we don't fire on every keystroke (fuzzy + partial match work better)
  useEffect(() => {
    if (activeSheet !== "admin") return;
    const t = adminQuery.trim();
    const timer = window.setTimeout(() => setAdminQueryDebounced(t), 350);
    return () => window.clearTimeout(timer);
  }, [activeSheet, adminQuery]);

  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showWelcome, setShowWelcome] = useState(false);
  const locationState = location.state as { justLoggedIn?: boolean; isNewUser?: boolean } | null;
  const locationStateSuggested = location.state as SuggestedPlanDayState | null;
  const suggestedPlanDay = locationStateSuggested?.suggestedPlanDay ?? null;
  const targetDateFromState = locationStateSuggested?.targetDate ?? null;
  const [dismissedPlanDayId, setDismissedPlanDayId] = useState<string | null>(null);
  const [addingToMealLabel, setAddingToMealLabel] = useState<string | null>(null);
  const [logFullDayConflictOpen, setLogFullDayConflictOpen] = useState(false);
  const [isLoggingFullDay, setIsLoggingFullDay] = useState(false);
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
    error: catalogError,
    isSearching,
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

  const topSourcesMacro = useMemo(
    () => ({
      carbs: getTopSourcesForMacro(logSections, "carbs"),
      protein: getTopSourcesForMacro(logSections, "protein"),
      fat: getTopSourcesForMacro(logSections, "fat"),
    }),
    [logSections]
  );
  const topSourcesMicro = useMemo(() => {
    const keys = getMicroSlotKeys();
    const out: Record<string, ReturnType<typeof getTopSourcesForMicro>> = {};
    for (const key of keys) {
      out[key] = getTopSourcesForMicro(logSections, key);
    }
    return out;
  }, [logSections]);

  // Drive the shared food catalog search from admin so admin uses the same pipeline as Add Food
  useEffect(() => {
    if (activeSheet === "admin") {
      searchFoods(adminQueryDebounced);
    }
  }, [activeSheet, adminQueryDebounced, searchFoods]);

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

  // When arriving with a suggested plan day + targetDate, switch view to that date
  useEffect(() => {
    if (suggestedPlanDay && targetDateFromState) {
      const [y, m, d] = targetDateFromState.split("-").map(Number);
      if (Number.isFinite(y) && Number.isFinite(m) && Number.isFinite(d)) {
        setSelectedDate(new Date(y, m - 1, d));
      }
    }
  }, [suggestedPlanDay?.id, targetDateFromState, setSelectedDate]);

  const addPlanMealToDiary = (planMeal: MealPlanMeal, mealTypeId: string) => {
    if (!suggestedPlanDay) return;
    const planItems = suggestedPlanDay.items.filter((i) => i.mealId === planMeal.id);
    if (!planItems.length) return;
    setAddingToMealLabel(planMeal.label);
    for (const item of planItems) {
      logFood(planItemToFoodItem(item), mealTypeId, { quantity: item.quantity });
    }
    setMealPulse(mealTypeId);
    toast(`Added ${planItems.length} item(s) to ${planMeal.label}`, {
      description: "Use Undo on the next toast if needed.",
    });
    setAddingToMealLabel(null);
  };

  const matchPlanMealToUserMeal = (planMealLabel: string): Meal | null => {
    const lower = planMealLabel.toLowerCase();
    return meals.find((m) => m.label.toLowerCase() === lower) ?? meals[0] ?? null;
  };

  const addAllPlanMealsToDiary = () => {
    if (!suggestedPlanDay) return;
    setIsLoggingFullDay(true);
    let totalAdded = 0;
    for (const planMeal of suggestedPlanDay.meals) {
      const userMeal = matchPlanMealToUserMeal(planMeal.label);
      if (!userMeal) continue;
      const planItems = suggestedPlanDay.items.filter((i) => i.mealId === planMeal.id);
      for (const item of planItems) {
        logFood(planItemToFoodItem(item), userMeal.id, { quantity: item.quantity });
        totalAdded += 1;
      }
    }
    setMealPulse(meals[0]?.id ?? null);
    toast(`Logged full day: ${totalAdded} item(s) from ${suggestedPlanDay.name}`, {
      description: "Use Undo on the diary to remove items if needed.",
    });
    setIsLoggingFullDay(false);
  };

  const handleLogFullDayClick = () => {
    const totalItems = logSections.flatMap((s) => s.items).length;
    if (totalItems > 0) {
      setLogFullDayConflictOpen(true);
    } else {
      addAllPlanMealsToDiary();
    }
  };

  const handleLogFullDayAppend = () => {
    setLogFullDayConflictOpen(false);
    addAllPlanMealsToDiary();
  };

  const handleLogFullDayReplace = () => {
    setLogFullDayConflictOpen(false);
    const allItems = logSections.flatMap((s) => s.items);
    for (const item of allItems) {
      removeLogItem(item);
    }
    setTimeout(() => {
      addAllPlanMealsToDiary();
    }, 400);
  };

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

  // Admin uses same search as Add Food: food catalog hook (same API, overrides, limit 20)
  const adminSearchResults =
    activeSheet === "admin" ? apiResults : [];
  const adminSearchLoading =
    activeSheet === "admin" && adminQueryDebounced.length > 0 && isSearching;
  const adminSearchError = activeSheet === "admin" ? catalogError : null;

  const adminUniqueBrands = useMemo(() => {
    const brands = adminSearchResults
      .map((f) => f.brand)
      .filter((b): b is string => Boolean(b?.trim()));
    return [...new Set(brands)].sort((a, b) => a.localeCompare(b));
  }, [adminSearchResults]);

  const adminFilteredAndSorted = useMemo(() => {
    let list =
      adminSort === "relevance"
        ? rankByRelevance(adminSearchResults, adminQueryDebounced)
        : [...adminSearchResults];
    if (adminBrandFilter) {
      list = list.filter((f) => f.brand === adminBrandFilter);
    }
    if (adminSort === "name_asc") {
      list = [...list].sort((a, b) => a.name.localeCompare(b.name));
    } else if (adminSort === "name_desc") {
      list = [...list].sort((a, b) => b.name.localeCompare(a.name));
    }
    return list;
  }, [adminSearchResults, adminBrandFilter, adminSort, adminQueryDebounced]);

  const ADMIN_PAGE_SIZE = 15;
  const adminTotalPages = Math.max(1, Math.ceil(adminFilteredAndSorted.length / ADMIN_PAGE_SIZE));
  const adminPageSafe = Math.min(Math.max(1, adminPage), adminTotalPages);
  const adminPaginated = useMemo(() => {
    const start = (adminPageSafe - 1) * ADMIN_PAGE_SIZE;
    return adminFilteredAndSorted.slice(start, start + ADMIN_PAGE_SIZE);
  }, [adminFilteredAndSorted, adminPageSafe]);

  useEffect(() => {
    setAdminPage(1);
  }, [adminQueryDebounced, adminBrandFilter]);

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
    navigate(`/nutrition/add-food?${params.toString()}`, { state: { meal } });
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
            topSourcesMacro={topSourcesMacro}
            topSourcesMicro={topSourcesMicro}
            onLongPressMacros={() => setGoalSheetOpen(true)}
            onGoalsClick={() => {
              closeSheets();
              navigate("/nutrition/goals");
            }}
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

        {suggestedPlanDay && dismissedPlanDayId !== suggestedPlanDay.id && (
          <Card className="mt-4 rounded-[24px] border-primary/30 bg-primary/5 px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-primary">
                  Suggested from plan
                </p>
                <h3 className="mt-1 text-base font-semibold text-foreground">
                  {suggestedPlanDay.name}
                </h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  Add meals below or log the full day in one tap.
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                onClick={() => setDismissedPlanDayId(suggestedPlanDay.id)}
                aria-label="Dismiss suggestions"
              >
                Dismiss
              </Button>
            </div>
            <Button
              type="button"
              className="mt-4 w-full rounded-full"
              disabled={isLoggingFullDay}
              onClick={handleLogFullDayClick}
            >
              {isLoggingFullDay ? "Logging…" : "Log full day"}
            </Button>
            <div className="mt-4 space-y-3">
              {suggestedPlanDay.meals.map((planMeal) => {
                const planItems = suggestedPlanDay.items.filter((i) => i.mealId === planMeal.id);
                const userMeal = matchPlanMealToUserMeal(planMeal.label);
                const isAdding = addingToMealLabel === planMeal.label;
                if (planItems.length === 0) return null;
                return (
                  <div
                    key={planMeal.id}
                    className="rounded-2xl border border-border/60 bg-card/80 px-3 py-3"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium text-foreground">
                        {planMeal.emoji ?? "🍽️"} {planMeal.label}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        className="rounded-full"
                        disabled={!userMeal || isAdding}
                        onClick={() => userMeal && addPlanMealToDiary(planMeal, userMeal.id)}
                      >
                        {isAdding ? "Adding…" : `Add to ${planMeal.label}`}
                      </Button>
                    </div>
                    <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">
                      {planItems.slice(0, 5).map((item) => (
                        <li key={item.id}>
                          {item.foodName} × {(item.quantity || 1) % 1 === 0 ? item.quantity : (item.quantity || 1).toFixed(2)}
                        </li>
                      ))}
                      {planItems.length > 5 && (
                        <li>+{planItems.length - 5} more</li>
                      )}
                    </ul>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        <Dialog open={logFullDayConflictOpen} onOpenChange={setLogFullDayConflictOpen}>
          <DialogContent className="rounded-3xl border border-border/60 bg-card">
            <DialogHeader>
              <DialogTitle>This day already has logged items</DialogTitle>
              <DialogDescription>
                Append the plan to your existing log, or replace the day with only the plan&apos;s items?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex gap-2 sm:gap-2">
              <Button
                type="button"
                className="rounded-full"
                onClick={handleLogFullDayAppend}
              >
                Append
              </Button>
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={handleLogFullDayReplace}
              >
                Replace
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

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
        <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-6 max-h-[90vh] flex flex-col">
          <div className="px-5 pb-6 pt-3 flex flex-col min-h-0 flex-1 overflow-hidden">
            <p className="text-xs uppercase tracking-[0.3em] text-primary/80">
              Admin
            </p>
            <h3 className="mt-2 text-xl font-display font-semibold text-foreground">
              Food database editor
            </h3>
            <Input
              value={adminQuery}
              onChange={(event) => setAdminQuery(event.target.value)}
              placeholder="Search foods (e.g. milk, chicken)..."
              className="mt-4 rounded-full"
            />
            {/* Filters always visible for consistent layout */}
            <div className="mt-4 flex flex-wrap gap-2 shrink-0">
              <Select
                value={adminSort}
                onValueChange={(v) => setAdminSort(v as "relevance" | "name_asc" | "name_desc")}
              >
                <SelectTrigger className="w-[130px] rounded-full">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="name_asc">A–Z</SelectItem>
                  <SelectItem value="name_desc">Z–A</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={adminBrandFilter || "__all__"}
                onValueChange={(v) => setAdminBrandFilter(v === "__all__" ? "" : v)}
              >
                <SelectTrigger className="min-w-[140px] rounded-full flex-1">
                  <SelectValue placeholder="Brand" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All brands</SelectItem>
                  {adminUniqueBrands.map((brand) => (
                    <SelectItem key={brand} value={brand}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Fixed-height list area so layout doesn't jump when typing */}
            <div className="mt-4 min-h-[280px] flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-muted/30">
              <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0">
                {!adminQueryDebounced && (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <p className="text-sm font-medium text-foreground/90">
                      Search foods to find and edit
                    </p>
                    <p className="text-xs text-muted-foreground max-w-[240px]">
                      Type a name or brand (e.g. milk, oat). Results update as you type.
                    </p>
                  </div>
                )}
                {adminQueryDebounced && adminSearchLoading && (
                  <div className="flex flex-col items-center justify-center gap-3 py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Searching…</p>
                  </div>
                )}
                {adminQueryDebounced && adminSearchError && (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <p className="text-sm font-medium text-destructive">Search failed</p>
                    <p className="text-xs text-muted-foreground max-w-[240px]">{adminSearchError}</p>
                  </div>
                )}
                {adminQueryDebounced && !adminSearchLoading && !adminSearchError && adminFilteredAndSorted.length === 0 && (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <p className="text-sm font-medium text-foreground/90">No foods found</p>
                    <p className="text-xs text-muted-foreground max-w-[240px]">
                      Try a different search or check spelling. Partial matches (e.g. &quot;mil&quot; for milk) are supported.
                    </p>
                  </div>
                )}
                {adminQueryDebounced && !adminSearchLoading && !adminSearchError && adminPaginated.map((food) => (
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
                      <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-secondary text-xl shrink-0">
                        {showFoodImages && food.imageUrl ? (
                          <FoodImage
                            src={food.imageUrl}
                            alt={food.name}
                            className="h-full w-full object-contain"
                            fallback={
                              <div className="flex h-full w-full items-center justify-center text-xl">
                                {food.emoji ?? "🍽️"}
                              </div>
                            }
                          />
                        ) : (
                          food.emoji
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{food.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {food.brand ? `${food.brand} · ` : ""}{food.portion} · {food.kcal} cal
                        </p>
                      </div>
                    </div>
                    <span className="text-xs font-semibold text-primary shrink-0">Edit</span>
                  </button>
                ))}
              </div>
            </div>
            {adminQueryDebounced && !adminSearchLoading && !adminSearchError && adminFilteredAndSorted.length > 0 && (
              <div className="mt-4 flex items-center justify-between gap-2 border-t border-border/60 pt-3 shrink-0">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setAdminPage((p) => Math.max(1, p - 1))}
                  disabled={adminPageSafe <= 1}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground tabular-nums">
                  Page {adminPageSafe} of {adminTotalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => setAdminPage((p) => Math.min(adminTotalPages, p + 1))}
                  disabled={adminPageSafe >= adminTotalPages}
                >
                  Next
                </Button>
              </div>
            )}
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
