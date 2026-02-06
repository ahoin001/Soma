/**
 * Daily Intake Hook - React Query Version
 *
 * Manages nutrition tracking for a given date:
 * - Summary (kcal eaten/left/goal)
 * - Macros (carbs, protein, fat with current/goal)
 * - Log sections (meals with food items)
 *
 * Uses React Query for caching, background refetch, and offline support.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { FoodItem, MacroTarget, Meal } from "@/data/mock";
import type { MealEntryItemRecord, MealEntryRecord } from "@/types/api";
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
import { queueMutation } from "@/lib/offlineQueue";
import { computeLogSections, computeTotals, toLocalDate } from "@/lib/nutritionData";

// ============================================================================
// Types
// ============================================================================

type Summary = {
  eaten: number;
  burned: number;
  kcalLeft: number;
  goal: number;
};

type SyncState = "idle" | "syncing";

type NutritionData = {
  summary: Summary;
  macros: MacroTarget[];
  logSections: LogSection[];
};

type LastLog = {
  food: FoodItem;
  itemId?: string;
};

// ============================================================================
// Helpers
// ============================================================================

const cloneMacros = (macros: MacroTarget[]) =>
  macros.map((macro) => ({ ...macro }));


// ============================================================================
// Main Hook
// ============================================================================

export const useDailyIntakeQuery = (
  initialSummary: Summary,
  initialMacros: MacroTarget[],
  meals: Meal[]
) => {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [syncState, setSyncState] = useState<SyncState>("idle");
  const lastLogRef = useRef<LastLog | null>(null);
  const syncTimerRef = useRef<number | null>(null);

  const localDate = useMemo(() => toLocalDate(selectedDate), [selectedDate]);

  // --- Query: Fetch nutrition data ---
  const nutritionQuery = useQuery({
    queryKey: queryKeys.nutrition(localDate),
    queryFn: async ({ signal }): Promise<NutritionData> => {
      console.log("[nutritionQuery] queryFn START", { localDate });
      
      // Check if cancelled before starting
      if (signal?.aborted) {
        console.log("[nutritionQuery] queryFn ABORTED before start");
        throw new Error("Query was cancelled");
      }
      
      await ensureUser();
      
      // Check if cancelled after auth
      if (signal?.aborted) {
        console.log("[nutritionQuery] queryFn ABORTED after auth");
        throw new Error("Query was cancelled");
      }
      
      const [entriesRes, summaryRes, settingsRes] = await Promise.all([
        fetchMealEntries(localDate),
        fetchNutritionSummary(localDate),
        fetchNutritionSettings(),
      ]);
      
      // CRITICAL: Check if cancelled BEFORE processing and returning data
      // This prevents stale fetch results from overwriting optimistic updates
      if (signal?.aborted) {
        console.log("[nutritionQuery] queryFn ABORTED after fetch - discarding results");
        throw new Error("Query was cancelled");
      }

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

      // Final cancellation check before returning
      if (signal?.aborted) {
        console.log("[nutritionQuery] queryFn ABORTED before return - discarding results");
        throw new Error("Query was cancelled");
      }
      
      console.log("[nutritionQuery] queryFn COMPLETE", {
        sectionsCount: logSections.length,
        totalItems: logSections.reduce((sum, s) => sum + s.items.length, 0),
        entriesCount: entriesRes.entries.length,
        itemsCount: entriesRes.items.length,
      });
      return { summary, macros, logSections };
    },
    enabled: meals.length > 0,
    staleTime: 2 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    initialData: {
      summary: initialSummary,
      macros: cloneMacros(initialMacros),
      logSections: [],
    },
    // Treat initial data as fresh to prevent immediate background refetch
    // This prevents race conditions where an initial fetch overwrites optimistic updates
    initialDataUpdatedAt: Date.now(),
  });

  // Extract data with fallbacks
  const summary = nutritionQuery.data?.summary ?? initialSummary;
  const macros = nutritionQuery.data?.macros ?? initialMacros;
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
      console.log("[logFood] mutationFn START", { food: food.name, mealTypeId });
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
          },
        ],
      });
      console.log("[logFood] mutationFn COMPLETE", { itemId: result.items[0]?.id });
      return result;
    },
    onMutate: async ({ food, mealTypeId, quantity, portionLabel, portionGrams }) => {
      console.log("[logFood] onMutate START", { food: food.name, mealTypeId });
      
      // CRITICAL: Cancel queries FIRST to prevent in-flight queries from overwriting
      await queryClient.cancelQueries({ queryKey: queryKeys.nutrition(localDate) });
      console.log("[logFood] onMutate: queries cancelled");

      // Get previous data after cancellation
      const previous = queryClient.getQueryData<NutritionData>(
        queryKeys.nutrition(localDate)
      );
      console.log("[logFood] onMutate: previous logSections count", previous?.logSections.length);

      // Find meal label from meals array
      const meal = meals.find((m) => m.id === mealTypeId);
      const mealLabel = meal?.label ?? "Meal";
      const mealEmoji = meal?.emoji ?? "🍽️";

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
        emoji: mealEmoji,
        imageUrl: food.imageUrl ?? null,
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

          const updated = {
            ...old,
            logSections: newSections,
            summary: {
              ...old.summary,
              eaten: old.summary.eaten + food.kcal * safeQuantity,
              kcalLeft: Math.max(old.summary.kcalLeft - food.kcal * safeQuantity, 0),
            },
            macros: old.macros.map((macro) => ({
              ...macro,
              current: macro.current + (food.macros[macro.key] ?? 0) * safeQuantity,
            })),
          };
          console.log("[logFood] onMutate: optimistic update applied", {
            sectionsCount: updated.logSections.length,
            totalItems: updated.logSections.reduce((sum, s) => sum + s.items.length, 0),
          });
          return updated;
        }
      );

      setSyncPulse();
      console.log("[logFood] onMutate COMPLETE");
      return { previous };
    },
    onSuccess: (response, { food, mealTypeId }) => {
      console.log("[logFood] onSuccess", { food: food.name, itemId: response.items[0]?.id });
      lastLogRef.current = { food, itemId: response.items[0]?.id };
      
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
        console.log("[logFood] onSuccess: replaced optimistic ID with real ID", realItem.id);
      }
    },
    onError: (_err, { food, mealTypeId }, context) => {
      console.log("[logFood] onError", { food: food.name, error: _err });
      // If offline, keep optimistic update and queue for later
      if (!navigator.onLine) {
        void queueMutation("nutrition.logFood", { food, mealTypeId, localDate });
        toast("Saved offline • Will sync when connected");
        return;
      }

      // Online error - rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.nutrition(localDate), context.previous);
      }

      toast("Unable to log food", {
        action: {
          label: "Retry",
          onClick: () => logFoodMutation.mutate({ food, mealTypeId }),
        },
      });
    },
    onSettled: () => {
      // DON'T immediately refetch - it causes race conditions with db replication
      // Instead, mark as stale so next natural refetch gets fresh data
      console.log("[logFood] onSettled: marking query as stale (no immediate refetch)");
      void queryClient.invalidateQueries({ 
        queryKey: queryKeys.nutrition(localDate),
        refetchType: "none", // Mark stale but don't refetch immediately
      });
    },
  });

  // --- Mutation: Remove log item ---
  const removeItemMutation = useMutation({
    mutationFn: async (item: LogItem) => {
      console.log("[removeItem] mutationFn START", { itemId: item.id, name: item.name });
      if (!item.id) throw new Error("Item has no ID");
      await deleteMealEntryItem(item.id);
      console.log("[removeItem] mutationFn COMPLETE");
    },
    onMutate: async (item) => {
      console.log("[removeItem] onMutate START", { itemId: item.id, name: item.name });
      
      // CRITICAL: Cancel queries FIRST to prevent in-flight queries from overwriting
      await queryClient.cancelQueries({ queryKey: queryKeys.nutrition(localDate) });
      console.log("[removeItem] onMutate: queries cancelled");

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
          };
          console.log("[removeItem] onMutate: optimistic update applied", {
            sectionsCount: updated.logSections.length,
            totalItems: updated.logSections.reduce((sum, s) => sum + s.items.length, 0),
          });
          return updated;
        }
      );

      setSyncPulse();
      console.log("[removeItem] onMutate COMPLETE");
      return { previous };
    },
    onError: (_err, item, context) => {
      console.log("[removeItem] onError", { itemId: item.id, error: _err });
      // If offline, keep optimistic update and queue for later
      if (!navigator.onLine) {
        void queueMutation("nutrition.removeLogItem", { itemId: item.id });
        toast("Saved offline • Will sync when connected");
        return;
      }

      // Online error - rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.nutrition(localDate), context.previous);
      }
      toast("Unable to remove item", {
        action: {
          label: "Retry",
          onClick: () => removeItemMutation.mutate(item),
        },
      });
    },
    onSuccess: () => {
      console.log("[removeItem] onSuccess: item successfully deleted");
    },
    onSettled: () => {
      // DON'T immediately refetch - it causes race conditions with db replication
      console.log("[removeItem] onSettled: marking query as stale (no immediate refetch)");
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
      console.log("[updateItem] mutationFn START", { itemId: item.id, multiplier });
      if (!item.id) throw new Error("Item has no ID");
      await ensureUser();
      await updateMealEntryItem(item.id, { quantity: multiplier });
      console.log("[updateItem] mutationFn COMPLETE");
    },
    onMutate: async ({ item, multiplier }) => {
      console.log("[updateItem] onMutate START", { itemId: item.id, multiplier });
      
      // CRITICAL: Cancel queries FIRST to prevent in-flight queries from overwriting
      await queryClient.cancelQueries({ queryKey: queryKeys.nutrition(localDate) });
      console.log("[updateItem] onMutate: queries cancelled");

      // Get previous data after cancellation
      const previous = queryClient.getQueryData<NutritionData>(
        queryKeys.nutrition(localDate)
      );

      const previousQuantity = item.quantity ?? 1;
      const delta = multiplier - previousQuantity;

      // Optimistic update
      queryClient.setQueryData<NutritionData>(
        queryKeys.nutrition(localDate),
        (old) => {
          if (!old) return old;
          const updated = {
            ...old,
            logSections: old.logSections.map((section) => ({
              ...section,
              items: section.items.map((entry) =>
                entry.id === item.id ? { ...entry, quantity: multiplier } : entry
              ),
            })),
            summary: {
              ...old.summary,
              eaten: old.summary.eaten + item.kcal * delta,
              kcalLeft: Math.max(old.summary.kcalLeft - item.kcal * delta, 0),
            },
            macros: old.macros.map((macro) => ({
              ...macro,
              current: macro.current + (item.macros[macro.key] ?? 0) * delta,
            })),
          };
          console.log("[updateItem] onMutate: optimistic update applied");
          return updated;
        }
      );

      setSyncPulse();
      console.log("[updateItem] onMutate COMPLETE");
      return { previous };
    },
    onSuccess: () => {
      console.log("[updateItem] onSuccess: item successfully updated");
    },
    onError: (_err, { item, multiplier }, context) => {
      console.log("[updateItem] onError", { itemId: item.id, error: _err });
      // If offline, keep optimistic update and queue for later
      if (!navigator.onLine) {
        void queueMutation("nutrition.updateLogItem", { itemId: item.id, quantity: multiplier });
        toast("Saved offline • Will sync when connected");
        return;
      }

      // Online error - rollback optimistic update
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.nutrition(localDate), context.previous);
      }
      toast("Unable to update item", {
        action: {
          label: "Retry",
          onClick: () => updateItemMutation.mutate({ item, multiplier }),
        },
      });
    },
    onSettled: () => {
      // DON'T immediately refetch - it causes race conditions with db replication
      console.log("[updateItem] onSettled: marking query as stale (no immediate refetch)");
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
      toast("Unable to save calorie goal", {
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
      toast("Unable to save macro targets", {
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

  // --- Refresh helpers ---
  const refreshEntries = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.nutrition(localDate) });
  }, [localDate, queryClient]);

  // --- Legacy hydration (for backward compatibility with AppStore) ---
  const hydrateEntries = useCallback(
    (entries: MealEntryRecord[], items: MealEntryItemRecord[]) => {
      const logSections = computeLogSections(entries, items, meals);
      const totals = computeTotals(logSections);
      queryClient.setQueryData<NutritionData>(
        queryKeys.nutrition(localDate),
        (old) => ({
          summary: old?.summary ?? initialSummary,
          macros: (old?.macros ?? initialMacros).map((macro) => ({
            ...macro,
            current: totals[macro.key],
          })),
          logSections,
        })
      );
    },
    [localDate, meals, queryClient, initialSummary, initialMacros]
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
      // This is handled by the query now, but we keep for backward compat
      void queryClient.invalidateQueries({ queryKey: queryKeys.nutrition(localDate) });
    },
    [localDate, queryClient]
  );

  const hydrateTargets = useCallback(
    (_targets?: {
      kcal_goal?: number | null;
      carbs_g?: number | null;
      protein_g?: number | null;
      fat_g?: number | null;
    } | null) => {
      // This is handled by the query now, but we keep for backward compat
      void queryClient.invalidateQueries({ queryKey: queryKeys.nutrition(localDate) });
    },
    [localDate, queryClient]
  );

  // --- Return same interface as original hook ---
  return {
    summary,
    macros,
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
    hydrateSummary,
    hydrateEntries,
    hydrateTargets,
    // Additional query state for components that need it
    isLoading: nutritionQuery.isLoading,
    isRefetching: nutritionQuery.isRefetching,
  };
};
