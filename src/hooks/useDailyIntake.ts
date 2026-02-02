import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FoodItem, MacroTarget, Meal } from "@/data/mock";
import type { MealEntryItemRecord, MealEntryRecord } from "@/types/api";
import { createMealEntry, deleteMealEntryItem, ensureUser, fetchMealEntries } from "@/lib/api";
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

      const sections: LogSection[] = [];
      for (const entry of entries) {
        const meal = entry.meal_type_id ? mealMap.get(entry.meal_type_id) : null;
        const mealLabel = meal?.label ?? "Meal";
        const mealEmoji = meal?.emoji ?? "🍽️";
        const entryItems = itemsByEntry.get(entry.id) ?? [];
        sections.push({
          meal: mealLabel,
          time: new Date(entry.logged_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          items: entryItems.map((item) => ({
            id: item.id,
            name: item.food_name,
            kcal: Number(item.kcal ?? 0),
            macros: {
              carbs: Number(item.carbs_g ?? 0),
              protein: Number(item.protein_g ?? 0),
              fat: Number(item.fat_g ?? 0),
            },
            emoji: mealEmoji,
          })),
        });
      }

      setLogSections(sections);

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
        eaten: items.length,
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
    setSyncPulse();
  }, [setSyncPulse]);

  const logFood = useCallback(
    async (food: FoodItem, mealTypeId?: string) => {
      await ensureUser();
      const previousSummary = summaryRef.current;
      const previousMacros = cloneMacros(macrosRef.current);

      setSummary((prev) => ({
        ...prev,
        eaten: prev.eaten + 1,
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
  }, [refreshEntries]);

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
    selectedDate,
    setSelectedDate,
    logSections,
    completion,
    refreshEntries,
    removeLogItem,
  };
};
