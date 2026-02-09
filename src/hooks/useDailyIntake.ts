/**
 * Daily Intake Hook - now powered by React Query
 *
 * Provides automatic caching, background refetch,
 * optimistic updates, and offline support.
 *
 * @see useDailyIntakeQuery.ts for implementation details
 */
export { useDailyIntakeQuery as useDailyIntake } from "./useDailyIntakeQuery";

// Legacy implementation below (kept for reference, no longer used)
// ============================================================================

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import type { FoodItem, MacroTarget, Meal } from "@/data/mock";
import type { MealEntryItemRecord, MealEntryRecord } from "@/types/api";
import {
  createMealEntry,
  deleteMealEntryItem,
  ensureUser,
  fetchMealEntries,
  fetchNutritionSummary,
  fetchNutritionSettings,
  updateMealEntryItem,
  upsertNutritionSettings,
  upsertNutritionTargets,
} from "@/lib/api";
import type { LogItem, LogSection } from "@/types/log";
import type { LastLog, Summary, SyncState } from "@/types/nutrition";

const cloneMacros = (macros: MacroTarget[]) =>
  macros.map((macro) => ({ ...macro }));

export const useDailyIntakeLegacy = (
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
  const refreshSeqRef = useRef(0);

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
            foodId: item.food_id ?? null,
            mealTypeId: entry.meal_type_id ?? null,
            mealLabel,
            mealEmoji,
            name: item.food_name,
            quantity: item.quantity ?? 1,
            portionLabel: item.portion_label ?? null,
            portionGrams: item.portion_grams ?? null,
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
        (acc, item) => {
          const quantity = Number(item.quantity ?? 1) || 1;
          return {
            kcal: acc.kcal + Number(item.kcal ?? 0) * quantity,
            carbs: acc.carbs + Number(item.carbs_g ?? 0) * quantity,
            protein: acc.protein + Number(item.protein_g ?? 0) * quantity,
            fat: acc.fat + Number(item.fat_g ?? 0) * quantity,
          };
        },
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
    const requestId = ++refreshSeqRef.current;
    await ensureUser();
    const response = await fetchMealEntries(localDate);
    if (requestId !== refreshSeqRef.current) return;
    recomputeFromItems(response.entries, response.items);
  }, [localDate, meals.length, recomputeFromItems]);

  const hydrateEntries = useCallback(
    (entries: MealEntryRecord[], items: MealEntryItemRecord[]) => {
      recomputeFromItems(entries, items);
    },
    [recomputeFromItems],
  );

  const hydrateSummary = useCallback(
    (payload?: {
      totals?: { kcal?: number; carbs_g?: number; protein_g?: number; fat_g?: number };
      targets?: {
        kcal_goal?: number | null;
        carbs_g?: number | null;
        protein_g?: number | null;
        fat_g?: number | null;
      } | null;
      settings?: {
        kcal_goal?: number | null;
        carbs_g?: number | null;
        protein_g?: number | null;
        fat_g?: number | null;
      } | null;
    }) => {
      if (!payload?.totals) return;
      const totals = payload.totals;
      const goalCandidate =
        payload.targets?.kcal_goal ??
        payload.settings?.kcal_goal ??
        summaryRef.current.goal;
      const goalValue = Number(goalCandidate);
      const nextGoal =
        Number.isFinite(goalValue) && goalValue > 0 ? goalValue : summaryRef.current.goal;
      const eaten = Number(totals.kcal ?? 0);
      setSummary((prev) => ({
        ...prev,
        goal: nextGoal,
        eaten,
        kcalLeft: Math.max(nextGoal - eaten, 0),
      }));
      setMacros((prev) =>
        prev.map((macro) => {
          const current =
            macro.key === "carbs"
              ? Number(totals.carbs_g ?? macro.current)
              : macro.key === "protein"
                ? Number(totals.protein_g ?? macro.current)
                : Number(totals.fat_g ?? macro.current);
          return {
            ...macro,
            current: Number.isFinite(current) ? current : macro.current,
          };
        }),
      );
    },
    [],
  );

  const hydrateTargets = useCallback(
    (targets?: {
      kcal_goal?: number | null;
      carbs_g?: number | null;
      protein_g?: number | null;
      fat_g?: number | null;
    } | null) => {
      if (!targets) return;
      const goalValue = Number(targets.kcal_goal ?? Number.NaN);
      if (Number.isFinite(goalValue) && goalValue > 0) {
        setSummary((prev) => ({
          ...prev,
          goal: goalValue,
          kcalLeft: Math.max(goalValue - prev.eaten, 0),
        }));
      }
      setMacros((prev) =>
        prev.map((macro) => {
          const nextGoal =
            macro.key === "carbs"
              ? targets.carbs_g
              : macro.key === "protein"
                ? targets.protein_g
                : targets.fat_g;
          return {
            ...macro,
            goal:
              Number.isFinite(Number(nextGoal ?? Number.NaN))
                ? Number(nextGoal)
                : macro.goal,
          };
        }),
      );
    },
    [],
  );

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
        kcalLeft: Math.max(goal - prev.eaten, 0),
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
    const nextGoal = Number.isFinite(kcalGoal ?? undefined) ? Number(kcalGoal) : 0;
    setSummary((prev) => ({
      ...prev,
      goal: nextGoal,
      kcalLeft: nextGoal > 0 ? Math.max(nextGoal - prev.eaten, 0) : 0,
    }));
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

  const setGoal = useCallback(async (goal: number) => {
    if (!Number.isFinite(goal) || goal <= 0) return;
    const previousSummary = { ...summaryRef.current };
    const consumed = summaryRef.current.goal - summaryRef.current.kcalLeft;
    setSummary((prev) => ({
      ...prev,
      goal,
      kcalLeft: Math.max(goal - consumed, 0),
    }));
    setSyncPulse();
    try {
      await upsertNutritionTargets({ localDate, kcalGoal: goal });
      await upsertNutritionSettings({ kcalGoal: goal });
    } catch {
      setSummary(previousSummary);
      toast("Unable to save calorie goal", {
        action: {
          label: "Retry",
          onClick: () => void setGoal(goal),
        },
      });
    }
  }, [localDate, setSyncPulse]);

  const setMacroTargets = useCallback(
    async (next: { carbs?: number; protein?: number; fat?: number }) => {
      const previousMacros = cloneMacros(macrosRef.current);
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
      setSyncPulse();
      try {
        await upsertNutritionTargets({
          localDate,
          kcalGoal: summaryRef.current.goal,
          carbsG: next.carbs,
          proteinG: next.protein,
          fatG: next.fat,
        });
        await upsertNutritionSettings({
          carbsG: next.carbs,
          proteinG: next.protein,
          fatG: next.fat,
        });
      } catch {
        setMacros(previousMacros);
        toast("Unable to save macro targets", {
          action: {
            label: "Retry",
            onClick: () => void setMacroTargets(next),
          },
        });
      }
    },
    [localDate, setSyncPulse],
  );

  const logFood = useCallback(
    async (food: FoodItem, mealTypeId?: string) => {
      await ensureUser();
      const previousSummary = { ...summaryRef.current };
      const previousMacros = cloneMacros(macrosRef.current);
      const previousSections = [...logSections];

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

      try {
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

        void refreshEntries();
        setSyncPulse();
      } catch {
        setSummary(previousSummary);
        setMacros(previousMacros);
        setLogSections(previousSections);
        toast("Unable to log food", {
          action: {
            label: "Retry",
            onClick: () => void logFood(food, mealTypeId),
          },
        });
        void refreshEntries();
      }
    },
    [localDate, logSections, refreshEntries, setSyncPulse],
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
    async (item?: LogItem) => {
      if (!item) return;
      const previousSections = [...logSections];
      const previousSummary = { ...summaryRef.current };
      const previousMacros = cloneMacros(macrosRef.current);

      const nextSections = logSections
        .map((section) => ({
          ...section,
          items: section.items.filter((entry) => {
            if (item.id && entry.id) {
              return entry.id !== item.id;
            }
            return !(
              entry.name === item.name &&
              entry.mealLabel === item.mealLabel &&
              entry.mealEmoji === item.mealEmoji
            );
          }),
        }))
        .filter((section) => section.items.length > 0);

      const previousCount = logSections.reduce(
        (sum, section) => sum + section.items.length,
        0,
      );
      const nextCount = nextSections.reduce(
        (sum, section) => sum + section.items.length,
        0,
      );

      if (nextCount !== previousCount) {
        setLogSections(nextSections);
        const totals = nextSections.reduce(
          (acc, section) =>
            section.items.reduce(
              (inner, entry) => {
                const quantity = entry.quantity ?? 1;
                return {
                  kcal: inner.kcal + entry.kcal * quantity,
                  carbs: inner.carbs + entry.macros.carbs * quantity,
                  protein: inner.protein + entry.macros.protein * quantity,
                  fat: inner.fat + entry.macros.fat * quantity,
                };
              },
              acc,
            ),
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
        setSyncPulse();
      }

      try {
        if (item.id) {
          await deleteMealEntryItem(item.id);
        }
        void refreshEntries();
      } catch {
        setLogSections(previousSections);
        setSummary(previousSummary);
        setMacros(previousMacros);
        toast("Unable to remove item", {
          action: {
            label: "Retry",
            onClick: () => void removeLogItem(item),
          },
        });
        void refreshEntries();
      }
    },
    [logSections, refreshEntries, setSyncPulse],
  );

  const updateLogItem = useCallback(
    async (item: LogItem, multiplier: number) => {
      if (!item.id) return;
      const previousQuantity = item.quantity ?? 1;
      const delta = multiplier - previousQuantity;
      const previousSections = [...logSections];
      const previousSummary = { ...summaryRef.current };
      const previousMacros = cloneMacros(macrosRef.current);

      if (Number.isFinite(delta) && delta !== 0) {
        setLogSections((prev) =>
          prev.map((section) => ({
            ...section,
            items: section.items.map((entry) =>
              entry.id === item.id ? { ...entry, quantity: multiplier } : entry,
            ),
          })),
        );
        setSummary((prev) => ({
          ...prev,
          eaten: prev.eaten + item.kcal * delta,
          kcalLeft: Math.max(prev.kcalLeft - item.kcal * delta, 0),
        }));
        setMacros((prev) =>
          prev.map((macro) => ({
            ...macro,
            current: macro.current + (item.macros[macro.key] ?? 0) * delta,
          })),
        );
        setSyncPulse();
      }

      try {
        await ensureUser();
        await updateMealEntryItem(item.id, {
          quantity: multiplier,
        });
        void refreshEntries();
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        const isNotFound =
          message.includes("Cannot PATCH") || message.includes("404");
        if (isNotFound) {
          if (!item.mealTypeId) {
            setLogSections(previousSections);
            setSummary(previousSummary);
            setMacros(previousMacros);
            toast("Unable to update item", {
              action: {
                label: "Retry",
                onClick: () => void updateLogItem(item, multiplier),
              },
            });
            void refreshEntries();
            return;
          }
          try {
            await createMealEntry({
              localDate,
              mealTypeId: item.mealTypeId ?? undefined,
              items: [
                {
                  foodId: item.foodId ?? undefined,
                  foodName: item.name,
                  portionLabel: item.portionLabel ?? undefined,
                  portionGrams: item.portionGrams ?? undefined,
                  quantity: multiplier,
                  kcal: item.kcal,
                  carbsG: item.macros.carbs,
                  proteinG: item.macros.protein,
                  fatG: item.macros.fat,
                },
              ],
            });
            await deleteMealEntryItem(item.id);
            void refreshEntries();
          } catch {
            setLogSections(previousSections);
            setSummary(previousSummary);
            setMacros(previousMacros);
            toast("Unable to update item", {
              action: {
                label: "Retry",
                onClick: () => void updateLogItem(item, multiplier),
              },
            });
            void refreshEntries();
          }
        } else {
          setLogSections(previousSections);
          setSummary(previousSummary);
          setMacros(previousMacros);
          toast("Unable to update item", {
            action: {
              label: "Retry",
              onClick: () => void updateLogItem(item, multiplier),
            },
          });
          void refreshEntries();
        }
      }
    },
    [localDate, logSections, refreshEntries, setSyncPulse],
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
    updateLogItem,
    hydrateSummary,
    hydrateEntries,
    hydrateTargets,
  };
};
