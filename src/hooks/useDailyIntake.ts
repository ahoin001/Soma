import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FoodItem, MacroTarget, Meal } from "@/data/mock";
import type { MealEntryItemRecord, MealEntryRecord } from "@/types/api";
import {
  createMealEntry,
  deleteMealEntryItem,
  ensureUser,
  fetchMealEntries,
  fetchNutritionSummary,
  fetchNutritionSettings,
  upsertNutritionSettings,
  upsertNutritionTargets,
} from "@/lib/api";
import type { LogSection } from "@/types/log";

type Summary = {
  eaten: number;
  burned: number;
  kcalLeft: number;
  goal: number;
};

type SyncState = "idle" | "syncing";

type LastLog = {
  food: FoodItem;
  previousSummary: Summary;
  previousMacros: MacroTarget[];
  itemId?: string;
};

const cloneMacros = (macros: MacroTarget[]) =>
  macros.map((macro) => ({ ...macro }));

export const useDailyIntake = (
  initialSummary: Summary,
  initialMacros: MacroTarget[],
  meals: Meal[],
) => {
  const [summary, setSummary] = useState<Summary>({ ...initialSummary });
  const [macros, setMacros] = useState<MacroTarget[]>(
    cloneMacros(initialMacros),
  );
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [logSections, setLogSections] = useState<LogSection[]>([]);
  const summaryRef = useRef<Summary>(summary);
  const macrosRef = useRef<MacroTarget[]>(macros);
  const lastLogRef = useRef<LastLog | null>(null);
  const syncTimerRef = useRef<number | null>(null);

  const localDate = useMemo(() => {
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const day = String(selectedDate.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, [selectedDate]);

  const recomputeFromItems = useCallback(
    (entries: MealEntryRecord[], items: MealEntryItemRecord[]) => {
      const itemsByEntry = new Map<string, MealEntryItemRecord[]>();
      items.forEach((item) => {
        const list = itemsByEntry.get(item.meal_entry_id) ?? [];
        list.push(item);
        itemsByEntry.set(item.meal_entry_id, list);
      });

      const mealMap = new Map<string, Meal>();
      meals.forEach((meal) => {
        mealMap.set(meal.id, meal);
      });

      const sectionsByMeal = new Map<
        string,
        { section: LogSection; latestLoggedAt: number }
      >();

      for (const entry of entries) {
        const meal = entry.meal_type_id ? mealMap.get(entry.meal_type_id) : null;
        const mealKey = entry.meal_type_id ?? "meal";
        const mealLabel = meal?.label ?? "Meal";
        const mealEmoji = meal?.emoji ?? "🍽️";
        const entryItems = itemsByEntry.get(entry.id) ?? [];
        const loggedAt = new Date(entry.logged_at).getTime();

        if (!sectionsByMeal.has(mealKey)) {
          sectionsByMeal.set(mealKey, {
            section: { meal: mealLabel, time: entry.logged_at, items: [] },
            latestLoggedAt: loggedAt,
          });
        }

        const target = sectionsByMeal.get(mealKey);
        if (!target) continue;
        target.latestLoggedAt = Math.max(target.latestLoggedAt, loggedAt);
        target.section.items.push(
          ...entryItems.map((item) => ({
            id: item.id,
            name: item.food_name,
            kcal: Number(item.kcal ?? 0),
            macros: {
              carbs: Number(item.carbs_g ?? 0),
              protein: Number(item.protein_g ?? 0),
              fat: Number(item.fat_g ?? 0),
            },
            emoji: mealEmoji,
            imageUrl: item.image_url ?? null,
          })),
        );
      }

      const ordered = meals
        .map((meal) => sectionsByMeal.get(meal.id))
        .filter(
          (entry): entry is { section: LogSection; latestLoggedAt: number } =>
            Boolean(entry),
        );

      const otherSections = Array.from(sectionsByMeal.entries())
        .filter(([key]) => !mealMap.has(key))
        .map(([, value]) => value);

      const formatted = [...ordered, ...otherSections].map(({ section, latestLoggedAt }) => ({
        ...section,
        time: new Date(latestLoggedAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      }));

      setLogSections(formatted);

      const totals = items.reduce(
        (acc, item) => ({
          kcal: acc.kcal + Number(item.kcal ?? 0),
          carbs: acc.carbs + Number(item.carbs_g ?? 0),
          protein: acc.protein + Number(item.protein_g ?? 0),
          fat: acc.fat + Number(item.fat_g ?? 0),
        }),
        { kcal: 0, carbs: 0, protein: 0, fat: 0 },
      );

      setSummary((prev) => ({
        ...prev,
        eaten: totals.kcal,
        kcalLeft: Math.max(prev.goal - totals.kcal, 0),
      }));

      setMacros((prev) =>
        prev.map((macro) => ({
          ...macro,
          current: totals[macro.key],
        })),
      );
    },
    [meals],
  );

  const refreshEntries = useCallback(async () => {
    if (!meals.length) return;
    await ensureUser();
    const response = await fetchMealEntries(localDate);
    recomputeFromItems(response.entries, response.items);
  }, [localDate, meals.length, recomputeFromItems]);

  const refreshTargets = useCallback(async () => {
    await ensureUser();
    const [daily, settings] = await Promise.all([
      fetchNutritionSummary(localDate),
      fetchNutritionSettings(),
    ]);
    const target = daily.targets ?? null;
    const fallback = settings.settings ?? null;
    if (!target && !fallback) return;
    const kcalGoal = target?.kcal_goal ?? fallback?.kcal_goal;
    if (Number.isFinite(kcalGoal ?? undefined)) {
      const goal = Number(kcalGoal);
      setSummary((prev) => ({
        ...prev,
        goal,
        kcalLeft: Math.max(goal - (prev.goal - prev.kcalLeft), 0),
      }));
    }
    setMacros((prev) =>
      prev.map((macro) => ({
        ...macro,
        goal:
          macro.key === "carbs"
            ? Number((target?.carbs_g ?? fallback?.carbs_g) ?? macro.goal)
            : macro.key === "protein"
              ? Number((target?.protein_g ?? fallback?.protein_g) ?? macro.goal)
              : Number((target?.fat_g ?? fallback?.fat_g) ?? macro.goal),
      })),
    );
  }, [localDate]);

  const setSyncPulse = useCallback(() => {
    setSyncState("syncing");
    if (syncTimerRef.current) {
      window.clearTimeout(syncTimerRef.current);
    }
    syncTimerRef.current = window.setTimeout(() => {
      setSyncState("idle");
      syncTimerRef.current = null;
    }, 900);
  }, []);

  const setGoal = useCallback((goal: number) => {
    if (!Number.isFinite(goal) || goal <= 0) return;
    const consumed = summaryRef.current.goal - summaryRef.current.kcalLeft;
    setSummary((prev) => ({
      ...prev,
      goal,
      kcalLeft: Math.max(goal - consumed, 0),
    }));
    void upsertNutritionTargets({ localDate, kcalGoal: goal });
    void upsertNutritionSettings({ kcalGoal: goal });
    setSyncPulse();
  }, [localDate, setSyncPulse]);

  const setMacroTargets = useCallback(
    (next: { carbs?: number; protein?: number; fat?: number }) => {
      setMacros((prev) =>
        prev.map((macro) => ({
          ...macro,
          goal:
            macro.key === "carbs"
              ? next.carbs ?? macro.goal
              : macro.key === "protein"
                ? next.protein ?? macro.goal
                : next.fat ?? macro.goal,
        })),
      );
      void upsertNutritionTargets({
        localDate,
        kcalGoal: summaryRef.current.goal,
        carbsG: next.carbs,
        proteinG: next.protein,
        fatG: next.fat,
      });
      void upsertNutritionSettings({
        carbsG: next.carbs,
        proteinG: next.protein,
        fatG: next.fat,
      });
      setSyncPulse();
    },
    [localDate, setSyncPulse],
  );

  const logFood = useCallback(
    async (food: FoodItem, mealTypeId?: string) => {
      await ensureUser();
      const previousSummary = summaryRef.current;
      const previousMacros = cloneMacros(macrosRef.current);

      setSummary((prev) => ({
        ...prev,
        eaten: prev.eaten + food.kcal,
        kcalLeft: Math.max(prev.kcalLeft - food.kcal, 0),
      }));

      setMacros((prev) =>
        prev.map((macro) => ({
          ...macro,
          current: macro.current + (food.macros[macro.key] ?? 0),
        })),
      );

      const response = await createMealEntry({
        localDate,
        mealTypeId,
        items: [
          {
            foodId: food.id,
            foodName: food.name,
            portionLabel: food.portion,
            kcal: food.kcal,
            carbsG: food.macros.carbs,
            proteinG: food.macros.protein,
            fatG: food.macros.fat,
          },
        ],
      });

      lastLogRef.current = {
        food,
        previousSummary,
        previousMacros,
        itemId: response.items[0]?.id,
      };

      await refreshEntries();
      setSyncPulse();
    },
    [localDate, refreshEntries, setSyncPulse],
  );

  const undoLastLog = useCallback(async () => {
    if (!lastLogRef.current) return;
    const { itemId } = lastLogRef.current;
    if (itemId) {
      await deleteMealEntryItem(itemId);
    }
    await refreshEntries();
    lastLogRef.current = null;
    setSyncPulse();
  }, [refreshEntries, setSyncPulse]);

  useEffect(() => {
    summaryRef.current = summary;
    macrosRef.current = macros;
  }, [summary, macros]);

  useEffect(() => {
    void refreshEntries();
    void refreshTargets();
  }, [refreshEntries, refreshTargets]);

  useEffect(() => {
    return () => {
      if (syncTimerRef.current) {
        window.clearTimeout(syncTimerRef.current);
      }
    };
  }, []);

  const completion = useMemo(() => {
    if (!summary.goal) return 0;
    const eaten = summary.goal - summary.kcalLeft;
    return Math.min(100, Math.round((eaten / summary.goal) * 100));
  }, [summary.goal, summary.kcalLeft]);

  const removeLogItem = useCallback(
    async (itemId?: string) => {
      if (!itemId) return;
      await deleteMealEntryItem(itemId);
      await refreshEntries();
    },
    [refreshEntries],
  );

  return {
    summary,
    macros,
    syncState,
    logFood,
    undoLastLog,
    setGoal,
    setMacroTargets,
    selectedDate,
    setSelectedDate,
    logSections,
    completion,
    refreshEntries,
    removeLogItem,
  };
};
