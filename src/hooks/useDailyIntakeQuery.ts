/**
 * Daily Intake Hook - React Query Version
 *
 * ARCHITECTURE CONTRACT (do not break without migration):
 * - This hook is the single owner of daily nutrition state.
 * - UI totals (summary/macros/micros) must be derived from `logSections`.
 * - No external hydration/backdoor setters should mutate nutrition cache shape.
 * - Optimistic updates must update `logSections`, then recompute totals from it.
 *
 * Manages nutrition tracking for a given date:
 * - Summary (kcal eaten/left/goal)
 * - Macros (carbs, protein, fat with current/goal)
 * - Log sections (meals with food items)
 *
 * Uses React Query for caching, background refetch, and offline support.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { appToast } from "@/lib/toast";
import type { FoodItem, MacroTarget, Meal } from "@/data/mock";
import {
  createMealEntry,
  deleteMealEntryItem,
  ensureUser,
  fetchMealEntries,
  fetchNutritionSettings,
  fetchNutritionSummary,
  updateMealEntryItem,
  upsertNutritionSettings,
  upsertNutritionTargets,
} from "@/lib/api";
import type { LogItem, LogSection } from "@/types/log";
import { queryKeys } from "@/lib/queryKeys";
import { DEBUG_KEY, LAST_NUTRITION_DATE_KEY } from "@/lib/storageKeys";
import { queueMutation } from "@/lib/offlineQueue";
import {
  computeLogSections,
  computeMicroTotals,
  computeTotals,
  normalizeMicroRecord,
  toLocalDate,
} from "@/lib/nutritionData";
import { normalizeFoodImageUrl } from "@/lib/foodImageUrl";
import type { LastLog, Summary, SyncState } from "@/types/nutrition";
import type { NutritionSummaryMicros } from "@/lib/api";

type NutritionData = {
  summary: Summary;
  macros: MacroTarget[];
  micros: NutritionSummaryMicros | null;
  logSections: LogSection[];
};

// ============================================================================
// Helpers
// ============================================================================

const cloneMacros = (macros: MacroTarget[]) =>
  macros.map((macro) => ({ ...macro }));

const isNutritionDebug = () =>
  import.meta.env.DEV &&
  typeof window !== "undefined" &&
  window.localStorage?.getItem(DEBUG_KEY) === "true";

// ============================================================================
// Main Hook
// ============================================================================

export const useDailyIntakeQuery = (
  initialSummary: Summary,
  initialMacros: MacroTarget[],
  meals: Meal[]
) => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (typeof window === "undefined") return new Date();
    const saved = window.localStorage.getItem(LAST_NUTRITION_DATE_KEY);
    if (!saved) return new Date();
    const parsed = new Date(`${saved}T12:00:00`);
    return Number.isFinite(parsed.getTime()) ? parsed : new Date();
  });
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const lastLogRef = useRef<LastLog | null>(null);
  const syncTimerRef = useRef<number | null>(null);

  const localDate = useMemo(() => toLocalDate(selectedDate), [selectedDate]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(LAST_NUTRITION_DATE_KEY, localDate);
  }, [localDate]);

  // --- Query: Fetch nutrition data ---
  const nutritionQuery = useQuery({
    queryKey: queryKeys.nutrition(localDate),
    queryFn: async ({ signal }): Promise<NutritionData> => {
      if (isNutritionDebug()) console.log("[nutritionQuery] queryFn START", { localDate });

      if (signal?.aborted) throw new Error("Query was cancelled");

      await ensureUser();

      if (signal?.aborted) throw new Error("Query was cancelled");
      
      const [entriesRes, summaryRes, settingsRes] = await Promise.all([
        fetchMealEntries(localDate),
        fetchNutritionSummary(localDate),
        fetchNutritionSettings(),
      ]);
      
      if (signal?.aborted) throw new Error("Query was cancelled");

      const logSections = computeLogSections(
        entriesRes.entries,
        entriesRes.items,
        meals
      );
      const totals = computeTotals(logSections);

      // Determine goal from targets or settings
      const goalCandidate =
        summaryRes.targets?.kcal_goal ??
        summaryRes.settings?.kcal_goal ??
        settingsRes.settings?.kcal_goal ??
        initialSummary.goal;
      const goal =
        Number.isFinite(Number(goalCandidate)) && Number(goalCandidate) > 0
          ? Number(goalCandidate)
          : initialSummary.goal;

      const summary: Summary = {
        eaten: totals.kcal,
        burned: 0,
        kcalLeft: Math.max(goal - totals.kcal, 0),
        goal,
      };

      // Merge macro targets from API
      const macros = initialMacros.map((macro) => ({
        ...macro,
        current: totals[macro.key],
        goal:
          macro.key === "carbs"
            ? Number(
                summaryRes.targets?.carbs_g ??
                  settingsRes.settings?.carbs_g ??
                  macro.goal
              )
            : macro.key === "protein"
              ? Number(
                  summaryRes.targets?.protein_g ??
                    settingsRes.settings?.protein_g ??
                    macro.goal
                )
              : Number(
                  summaryRes.targets?.fat_g ??
                    settingsRes.settings?.fat_g ??
                    macro.goal
                ),
      }));

      // Contract: micros are derived from diary-visible logSections, never from a parallel source.
      const micros = computeMicroTotals(logSections) as NutritionSummaryMicros;

      if (signal?.aborted) throw new Error("Query was cancelled");
      if (isNutritionDebug())
        console.log("[nutritionQuery] queryFn COMPLETE", {
          sectionsCount: logSections.length,
          totalItems: logSections.reduce((sum, s) => sum + s.items.length, 0),
        });
      return { summary, macros, micros, logSections };
    },
    enabled: meals.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    initialData: {
      summary: initialSummary,
      macros: cloneMacros(initialMacros),
      micros: null,
      logSections: [],
    },
    // Treat initial data as fresh to prevent immediate background refetch
    // This prevents race conditions where an initial fetch overwrites optimistic updates
    initialDataUpdatedAt: Date.now(),
  });

  // Extract data with fallbacks
  const summary = nutritionQuery.data?.summary ?? initialSummary;
  const macros = nutritionQuery.data?.macros ?? initialMacros;
  const micros = nutritionQuery.data?.micros ?? null;
  const logSections = nutritionQuery.data?.logSections ?? [];

  // --- Sync pulse (visual feedback) ---
  const setSyncPulse = useCallback(() => {
    setSyncState("syncing");
    if (syncTimerRef.current) window.clearTimeout(syncTimerRef.current);
    syncTimerRef.current = window.setTimeout(() => {
      setSyncState("idle");
      syncTimerRef.current = null;
    }, 900);
  }, []);

  // --- Mutation: Log food ---
  const logFoodMutation = useMutation({
    mutationFn: async ({
      food,
      mealTypeId,
      quantity,
      portionLabel,
      portionGrams,
    }: {
      food: FoodItem;
      mealTypeId?: string;
      quantity?: number;
      portionLabel?: string;
      portionGrams?: number | null;
    }) => {
      if (isNutritionDebug()) console.log("[logFood] mutationFn START", { food: food.name, mealTypeId });
      await ensureUser();
      const safeQuantity =
        Number.isFinite(quantity) && (quantity ?? 0) > 0 ? Number(quantity) : 1;
      const rawPortionGrams =
        portionGrams ?? food.portionGrams ?? undefined;
      const safePortionGrams = Number.isFinite(Number(rawPortionGrams))
        ? Number(rawPortionGrams)
        : undefined;
      const result = await createMealEntry({
        localDate,
        mealTypeId,
        items: [
          {
            foodId: food.id,
            foodName: food.name,
            portionLabel: portionLabel ?? food.portionLabel ?? food.portion,
            portionGrams: safePortionGrams,
            quantity: safeQuantity,
            kcal: food.kcal,
            carbsG: food.macros.carbs,
            proteinG: food.macros.protein,
            fatG: food.macros.fat,
            micronutrients: food.micronutrients ?? undefined,
          },
        ],
      });
      if (isNutritionDebug()) console.log("[logFood] mutationFn COMPLETE", { itemId: result.items[0]?.id });
      return result;
    },
    onMutate: async ({ food, mealTypeId, quantity, portionLabel, portionGrams }) => {
      if (isNutritionDebug()) console.log("[logFood] onMutate START", { food: food.name, mealTypeId });

      await queryClient.cancelQueries({ queryKey: queryKeys.nutrition(localDate) });
      if (isNutritionDebug()) console.log("[logFood] onMutate: queries cancelled");

      const previous = queryClient.getQueryData<NutritionData>(
        queryKeys.nutrition(localDate)
      );
      if (isNutritionDebug()) console.log("[logFood] onMutate: previous logSections count", previous?.logSections.length);

      // Find meal by id so section.meal matches a meal.label (MealLogPanel looks up by meal.label)
      const meal = meals.find((m) => m.id === mealTypeId);
      const mealLabel = meal?.label ?? (meals[0]?.label ?? "Meal");
      const mealEmoji = meal?.emoji ?? meals[0]?.emoji ?? "🍽️";

      // Create optimistic log item
      const safeQuantity =
        Number.isFinite(quantity) && (quantity ?? 0) > 0 ? Number(quantity) : 1;
      const rawPortionGrams =
        portionGrams ?? food.portionGrams ?? undefined;
      const safePortionGrams = Number.isFinite(Number(rawPortionGrams))
        ? Number(rawPortionGrams)
        : null;
      const optimisticItem: LogItem = {
        id: `optimistic-${Date.now()}`, // Temporary ID
        foodId: food.id,
        mealTypeId: mealTypeId ?? null,
        mealLabel,
        mealEmoji,
        name: food.name,
        quantity: safeQuantity,
        portionLabel: (portionLabel ?? food.portionLabel ?? food.portion) ?? null,
        portionGrams: safePortionGrams,
        kcal: food.kcal,
        macros: {
          carbs: food.macros.carbs,
          protein: food.macros.protein,
          fat: food.macros.fat,
        },
        micronutrients: normalizeMicroRecord(
          (food.micronutrients as Record<string, unknown> | undefined) ?? undefined,
        ),
        emoji: mealEmoji,
        imageUrl: normalizeFoodImageUrl(food.imageUrl) ?? null,
      };

      // Optimistic update
      queryClient.setQueryData<NutritionData>(
        queryKeys.nutrition(localDate),
        (old) => {
          if (!old) return old;

          // Add item to the appropriate section or create new section
          let foundSection = false;
          const newSections = old.logSections.map((section) => {
            if (section.meal === mealLabel) {
              foundSection = true;
              return {
                ...section,
                items: [...section.items, optimisticItem],
              };
            }
            return section;
          });

          // If no existing section, create one
          if (!foundSection) {
            newSections.push({
              meal: mealLabel,
              time: new Date().toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              items: [optimisticItem],
            });
          }

          const totals = computeTotals(newSections);
          const micros = computeMicroTotals(newSections) as NutritionSummaryMicros;

          const updated = {
            ...old,
            logSections: newSections,
            summary: {
              ...old.summary,
              eaten: totals.kcal,
              kcalLeft: Math.max(old.summary.goal - totals.kcal, 0),
            },
            macros: old.macros.map((macro) => ({
              ...macro,
              current: totals[macro.key],
            })),
            micros,
          };
          if (isNutritionDebug()) console.log("[logFood] onMutate: optimistic update applied", {
            sectionsCount: updated.logSections.length,
            totalItems: updated.logSections.reduce((sum, s) => sum + s.items.length, 0),
          });
          return updated;
        }
      );

      setSyncPulse();
      if (isNutritionDebug()) console.log("[logFood] onMutate COMPLETE");
      return { previous };
    },
    onSuccess: (response, { food, mealTypeId }) => {
      if (isNutritionDebug()) console.log("[logFood] onSuccess", { food: food.name, itemId: response.items[0]?.id });
      lastLogRef.current = { food, itemId: response.items[0]?.id };
      const meal = meals.find((m) => m.id === mealTypeId);
      appToast.success(meal ? `Added to ${meal.label}` : "Logged");

      // Update optimistic item with real ID from server (no refetch needed)
      const realItem = response.items[0];
      if (realItem) {
        queryClient.setQueryData<NutritionData>(
          queryKeys.nutrition(localDate),
          (old) => {
            if (!old) return old;
            return {
              ...old,
              logSections: old.logSections.map((section) => ({
                ...section,
                items: section.items.map((item) => {
                  // Replace optimistic item with real item
                  if (item.id?.startsWith("optimistic-") && item.foodId === food.id) {
                    return {
                      ...item,
                      id: realItem.id,
                    };
                  }
                  return item;
                }),
              })),
            };
          }
        );
        if (isNutritionDebug()) console.log("[logFood] onSuccess: replaced optimistic ID with real ID", realItem.id);
      }
    },
    onError: (_err, { food, mealTypeId }, context) => {
      if (isNutritionDebug()) console.log("[logFood] onError", { food: food.name, error: _err });
      // If offline, keep optimistic update and queue for later
      if (!navigator.onLine) {
        void queueMutation("nutrition.logFood", { food, mealTypeId, localDate });
        appToast.info("Saved offline • Will sync when connected");
        return;
      }

      // Online error - rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.nutrition(localDate), context.previous);
      }

      appToast.error("Unable to log food. Check your connection and try again.", {
        action: {
          label: "Retry",
          onClick: () => logFoodMutation.mutate({ food, mealTypeId }),
        },
      });
    },
    onSettled: () => {
      if (isNutritionDebug()) console.log("[logFood] onSettled: marking query as stale (no immediate refetch)");
      void queryClient.invalidateQueries({ 
        queryKey: queryKeys.nutrition(localDate),
        refetchType: "none", // Mark stale but don't refetch immediately
      });
    },
  });

  // --- Mutation: Remove log item ---
  const removeItemMutation = useMutation({
    mutationFn: async (item: LogItem) => {
      if (isNutritionDebug()) console.log("[removeItem] mutationFn START", { itemId: item.id, name: item.name });
      if (!item.id) throw new Error("Item has no ID");
      await deleteMealEntryItem(item.id);
      if (isNutritionDebug()) console.log("[removeItem] mutationFn COMPLETE");
    },
    onMutate: async (item) => {
      if (isNutritionDebug()) console.log("[removeItem] onMutate START", { itemId: item.id, name: item.name });

      await queryClient.cancelQueries({ queryKey: queryKeys.nutrition(localDate) });
      if (isNutritionDebug()) console.log("[removeItem] onMutate: queries cancelled");

      // Get previous data after cancellation
      const previous = queryClient.getQueryData<NutritionData>(
        queryKeys.nutrition(localDate)
      );

      // Optimistic removal
      queryClient.setQueryData<NutritionData>(
        queryKeys.nutrition(localDate),
        (old) => {
          if (!old) return old;
          const newSections = old.logSections
            .map((section) => ({
              ...section,
              items: section.items.filter((entry) => entry.id !== item.id),
            }))
            .filter((section) => section.items.length > 0);

          const totals = computeTotals(newSections);
          const micros = computeMicroTotals(newSections) as NutritionSummaryMicros;
          const updated = {
            ...old,
            logSections: newSections,
            summary: {
              ...old.summary,
              eaten: totals.kcal,
              kcalLeft: Math.max(old.summary.goal - totals.kcal, 0),
            },
            macros: old.macros.map((macro) => ({
              ...macro,
              current: totals[macro.key],
            })),
            micros,
          };
          if (isNutritionDebug()) console.log("[removeItem] onMutate: optimistic update applied", {
            sectionsCount: updated.logSections.length,
            totalItems: updated.logSections.reduce((sum, s) => sum + s.items.length, 0),
          });
          return updated;
        }
      );

      setSyncPulse();
      if (isNutritionDebug()) console.log("[removeItem] onMutate COMPLETE");
      return { previous };
    },
    onError: (_err, item, context) => {
      if (isNutritionDebug()) console.log("[removeItem] onError", { itemId: item.id, error: _err });
      // If offline, keep optimistic update and queue for later
      if (!navigator.onLine) {
        void queueMutation("nutrition.removeLogItem", { itemId: item.id });
        appToast.info("Saved offline • Will sync when connected");
        return;
      }

      // Online error - rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.nutrition(localDate), context.previous);
      }
      appToast.error("Unable to remove item. Check your connection and try again.", {
        action: { label: "Retry", onClick: () => removeItemMutation.mutate(item) },
      });
    },
    onSuccess: () => {
      if (isNutritionDebug()) console.log("[removeItem] onSuccess: item successfully deleted");
    },
    onSettled: () => {
      if (isNutritionDebug()) console.log("[removeItem] onSettled: marking query as stale (no immediate refetch)");
      void queryClient.invalidateQueries({ 
        queryKey: queryKeys.nutrition(localDate),
        refetchType: "none", // Mark stale but don't refetch immediately
      });
    },
  });

  // --- Mutation: Update log item quantity ---
  const updateItemMutation = useMutation({
    mutationFn: async ({
      item,
      multiplier,
    }: {
      item: LogItem;
      multiplier: number;
    }) => {
      if (isNutritionDebug()) console.log("[updateItem] mutationFn START", { itemId: item.id, multiplier });
      if (!item.id) throw new Error("Item has no ID");
      await ensureUser();
      await updateMealEntryItem(item.id, { quantity: multiplier });
      if (isNutritionDebug()) console.log("[updateItem] mutationFn COMPLETE");
    },
    onMutate: async ({ item, multiplier }) => {
      if (isNutritionDebug()) console.log("[updateItem] onMutate START", { itemId: item.id, multiplier });

      await queryClient.cancelQueries({ queryKey: queryKeys.nutrition(localDate) });
      if (isNutritionDebug()) console.log("[updateItem] onMutate: queries cancelled");

      // Get previous data after cancellation
      const previous = queryClient.getQueryData<NutritionData>(
        queryKeys.nutrition(localDate)
      );

      // Optimistic update
      queryClient.setQueryData<NutritionData>(
        queryKeys.nutrition(localDate),
        (old) => {
          if (!old) return old;
          const newSections = old.logSections.map((section) => ({
            ...section,
            items: section.items.map((entry) =>
              entry.id === item.id ? { ...entry, quantity: multiplier } : entry
            ),
          }));
          const totals = computeTotals(newSections);
          const micros = computeMicroTotals(newSections) as NutritionSummaryMicros;
          const updated = {
            ...old,
            logSections: newSections,
            summary: {
              ...old.summary,
              eaten: totals.kcal,
              kcalLeft: Math.max(old.summary.goal - totals.kcal, 0),
            },
            macros: old.macros.map((macro) => ({
              ...macro,
              current: totals[macro.key],
            })),
            micros,
          };
          if (isNutritionDebug()) console.log("[updateItem] onMutate: optimistic update applied");
          return updated;
        }
      );

      setSyncPulse();
      if (isNutritionDebug()) console.log("[updateItem] onMutate COMPLETE");
      return { previous };
    },
    onSuccess: () => {
      if (isNutritionDebug()) console.log("[updateItem] onSuccess: item successfully updated");
    },
    onError: (_err, { item, multiplier }, context) => {
      if (isNutritionDebug()) console.log("[updateItem] onError", { itemId: item.id, error: _err });
      // If offline, keep optimistic update and queue for later
      if (!navigator.onLine) {
        void queueMutation("nutrition.updateLogItem", { itemId: item.id, quantity: multiplier });
        appToast.info("Saved offline • Will sync when connected");
        return;
      }

      // Online error - rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.nutrition(localDate), context.previous);
      }
      appToast.error("Unable to update item. Check your connection and try again.", {
        action: { label: "Retry", onClick: () => updateItemMutation.mutate({ item, multiplier }) },
      });
    },
    onSettled: () => {
      if (isNutritionDebug()) console.log("[updateItem] onSettled: marking query as stale (no immediate refetch)");
      void queryClient.invalidateQueries({ 
        queryKey: queryKeys.nutrition(localDate),
        refetchType: "none", // Mark stale but don't refetch immediately
      });
    },
  });

  // --- Mutation: Set calorie goal ---
  const setGoalMutation = useMutation({
    mutationFn: async (goal: number) => {
      if (!Number.isFinite(goal) || goal <= 0) throw new Error("Invalid goal");
      await upsertNutritionTargets({ localDate, kcalGoal: goal });
      await upsertNutritionSettings({ kcalGoal: goal });
    },
    onMutate: async (goal) => {
      // Get previous data FIRST (synchronously)
      const previous = queryClient.getQueryData<NutritionData>(
        queryKeys.nutrition(localDate)
      );

      // Optimistic update IMMEDIATELY
      queryClient.setQueryData<NutritionData>(
        queryKeys.nutrition(localDate),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            summary: {
              ...old.summary,
              goal,
              kcalLeft: Math.max(goal - old.summary.eaten, 0),
            },
          };
        }
      );

      setSyncPulse();

      // Cancel any pending queries AFTER the optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.nutrition(localDate) });

      return { previous };
    },
    onError: (_err, goal, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.nutrition(localDate), context.previous);
      }
      appToast.info("Unable to save calorie goal", {
        action: {
          label: "Retry",
          onClick: () => setGoalMutation.mutate(goal),
        },
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.nutrition(localDate) });
    },
  });

  // --- Mutation: Set macro targets ---
  const setMacroTargetsMutation = useMutation({
    mutationFn: async (next: { carbs?: number; protein?: number; fat?: number }) => {
      await upsertNutritionTargets({
        localDate,
        kcalGoal: summary.goal,
        carbsG: next.carbs,
        proteinG: next.protein,
        fatG: next.fat,
      });
      await upsertNutritionSettings({
        carbsG: next.carbs,
        proteinG: next.protein,
        fatG: next.fat,
      });
    },
    onMutate: async (next) => {
      // Get previous data FIRST (synchronously)
      const previous = queryClient.getQueryData<NutritionData>(
        queryKeys.nutrition(localDate)
      );

      // Optimistic update IMMEDIATELY
      queryClient.setQueryData<NutritionData>(
        queryKeys.nutrition(localDate),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            macros: old.macros.map((macro) => ({
              ...macro,
              goal:
                macro.key === "carbs"
                  ? next.carbs ?? macro.goal
                  : macro.key === "protein"
                    ? next.protein ?? macro.goal
                    : next.fat ?? macro.goal,
            })),
          };
        }
      );

      setSyncPulse();

      // Cancel any pending queries AFTER the optimistic update
      await queryClient.cancelQueries({ queryKey: queryKeys.nutrition(localDate) });

      return { previous };
    },
    onError: (_err, next, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.nutrition(localDate), context.previous);
      }
      appToast.info("Unable to save macro targets", {
        action: {
          label: "Retry",
          onClick: () => setMacroTargetsMutation.mutate(next),
        },
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.nutrition(localDate) });
    },
  });

  // --- Computed ---
  const completion = useMemo(() => {
    if (!summary.goal) return 0;
    return Math.min(100, Math.round((summary.eaten / summary.goal) * 100));
  }, [summary.goal, summary.eaten]);

  // --- Undo last log ---
  const undoLastLog = useCallback(async () => {
    if (!lastLogRef.current?.itemId) return;
    await deleteMealEntryItem(lastLogRef.current.itemId);
    lastLogRef.current = null;
    setSyncPulse();
    void queryClient.invalidateQueries({ queryKey: queryKeys.nutrition(localDate) });
  }, [localDate, queryClient, setSyncPulse]);

  // --- Mutation: Copy day from another date (e.g. yesterday) ---
  const copyDayMutation = useMutation({
    mutationFn: async (sourceLocalDate: string) => {
      await ensureUser();
      const { entries, items } = await fetchMealEntries(sourceLocalDate);
      const sourceSections = computeLogSections(entries, items, meals);
      let created = 0;
      for (const section of sourceSections) {
        if (section.items.length === 0) continue;
        const mealTypeId = section.items[0]?.mealTypeId ?? undefined;
        await createMealEntry({
          localDate,
          mealTypeId,
          items: section.items.map((item) => ({
            foodId: item.foodId ?? undefined,
            foodName: item.name,
            portionLabel: item.portionLabel ?? undefined,
            portionGrams: item.portionGrams ?? undefined,
            quantity: item.quantity ?? 1,
            kcal: item.kcal,
            carbsG: item.macros.carbs,
            proteinG: item.macros.protein,
            fatG: item.macros.fat,
          })),
        });
        created += section.items.length;
      }
      return { copiedItems: created };
    },
    onSuccess: (data) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.nutrition(localDate) });
      appToast.info(
        data.copiedItems > 0
          ? `Copied ${data.copiedItems} item${data.copiedItems === 1 ? "" : "s"} from yesterday`
          : "Nothing to copy — yesterday was empty",
      );
    },
    onError: () => {
      appToast.info("Could not copy yesterday's meals", { description: "Please try again." });
    },
  });

  // --- Refresh helpers ---
  const refreshEntries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.nutrition(localDate) });
  }, [localDate, queryClient]);

  // --- Return same interface as original hook ---
  return {
    summary,
    macros,
    micros,
    syncState,
    logFood: (
      food: FoodItem,
      mealTypeId?: string,
      options?: { quantity?: number; portionLabel?: string; portionGrams?: number | null },
    ) => {
      logFoodMutation.mutate({
        food,
        mealTypeId,
        quantity: options?.quantity,
        portionLabel: options?.portionLabel,
        portionGrams: options?.portionGrams,
      });
    },
    undoLastLog,
    setGoal: setGoalMutation.mutate,
    setMacroTargets: setMacroTargetsMutation.mutate,
    selectedDate,
    setSelectedDate,
    logSections,
    completion,
    refreshEntries,
    removeLogItem: (item?: LogItem) => {
      if (item) removeItemMutation.mutate(item);
    },
    updateLogItem: (item: LogItem, multiplier: number) => {
      updateItemMutation.mutate({ item, multiplier });
    },
    copyDayFrom: (sourceLocalDate: string) => copyDayMutation.mutate(sourceLocalDate),
    isCopyingDay: copyDayMutation.isPending,
    // Additional query state for components that need it
    isLoading: nutritionQuery.isLoading,
    isRefetching: nutritionQuery.isRefetching,
    isFetching: nutritionQuery.isFetching,
    dataUpdatedAt: nutritionQuery.dataUpdatedAt,
  };
};
