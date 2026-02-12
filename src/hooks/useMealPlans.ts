import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addMealPlanItem,
  applyMealPlanToWeekdays,
  clearMealPlanWeekday,
  createMealPlanDay,
  createMealPlanGroup,
  deleteMealPlanDay,
  deleteMealPlanGroup,
  deleteMealPlanItem,
  duplicateMealPlanDay,
  fetchMealPlans,
  reorderMealPlanItems,
  reorderMealPlanMeals,
  updateMealPlanDay,
  updateMealPlanGroup,
  updateMealPlanItem,
} from "@/lib/api";
import type {
  MealPlanDayRecord,
  MealPlanGroupRecord,
  MealPlanItemRecord,
  MealPlanMealRecord,
  MealPlanWeekAssignmentRecord,
} from "@/types/api";

export type MealPlanSlot = "protein" | "carbs" | "balance";

export type MealPlanDay = {
  id: string;
  name: string;
  groupId: string | null;
  targets: {
    kcal: number;
    protein: number;
    carbs: number;
    fat: number;
  };
};

export type MealPlanGroup = {
  id: string;
  name: string;
  sortOrder: number;
};

export type MealPlanMeal = {
  id: string;
  dayId: string;
  label: string;
  emoji: string | null;
  sortOrder: number;
};

export type MealPlanItem = {
  id: string;
  mealId: string;
  foodId: string | null;
  foodName: string;
  quantity: number;
  slot: MealPlanSlot;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  sortOrder: number;
};

export type MealPlanWeekAssignment = {
  weekday: number;
  dayId: string | null;
};

type MealPlansState = "idle" | "loading" | "error";

const toNum = (value: number | string | null | undefined, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapDay = (row: MealPlanDayRecord): MealPlanDay => ({
  id: row.id,
  name: row.name,
  groupId: row.group_id ?? null,
  targets: {
    kcal: toNum(row.target_kcal),
    protein: toNum(row.target_protein_g),
    carbs: toNum(row.target_carbs_g),
    fat: toNum(row.target_fat_g),
  },
});

const mapGroup = (row: MealPlanGroupRecord): MealPlanGroup => ({
  id: row.id,
  name: row.name,
  sortOrder: row.sort_order,
});

const mapMeal = (row: MealPlanMealRecord): MealPlanMeal => ({
  id: row.id,
  dayId: row.day_id,
  label: row.label,
  emoji: row.emoji,
  sortOrder: row.sort_order,
});

const mapItem = (row: MealPlanItemRecord): MealPlanItem => ({
  id: row.id,
  mealId: row.meal_id,
  foodId: row.food_id,
  foodName: row.food_name,
  quantity: toNum(row.quantity, 1),
  slot: row.slot,
  kcal: toNum(row.kcal),
  protein: toNum(row.protein_g),
  carbs: toNum(row.carbs_g),
  fat: toNum(row.fat_g),
  sortOrder: row.sort_order,
});

const mapWeek = (row: MealPlanWeekAssignmentRecord): MealPlanWeekAssignment => ({
  weekday: row.weekday,
  dayId: row.day_id,
});

export const useMealPlans = () => {
  const [groups, setGroups] = useState<MealPlanGroup[]>([]);
  const [days, setDays] = useState<MealPlanDay[]>([]);
  const [meals, setMeals] = useState<MealPlanMeal[]>([]);
  const [items, setItems] = useState<MealPlanItem[]>([]);
  const [weekAssignments, setWeekAssignments] = useState<MealPlanWeekAssignment[]>([]);
  const [status, setStatus] = useState<MealPlansState>("idle");
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      const response = await fetchMealPlans();
      setGroups((response.groups ?? []).map(mapGroup));
      setDays((response.days ?? []).map(mapDay));
      setMeals((response.meals ?? []).map(mapMeal));
      setItems((response.items ?? []).map(mapItem));
      setWeekAssignments((response.weekAssignments ?? []).map(mapWeek));
      setStatus("idle");
    } catch (loadError) {
      const detail =
        loadError instanceof Error ? loadError.message : "Unable to load meal plans.";
      setStatus("error");
      setError(detail);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addDay = useCallback(
    async (payload: {
      name: string;
      groupId?: string | null;
      targets: MealPlanDay["targets"];
    }) => {
      const response = await createMealPlanDay({
        name: payload.name,
        groupId: payload.groupId ?? undefined,
        targets: payload.targets,
      });
      if (response.day) {
        setDays((prev) => [...prev, mapDay(response.day)]);
      }
      if (response.meals?.length) {
        setMeals((prev) => [...prev, ...response.meals.map(mapMeal)]);
      }
      return response.day ? mapDay(response.day) : null;
    },
    [],
  );

  const patchDay = useCallback(
    async (
      dayId: string,
      payload: {
        name?: string;
        groupId?: string | null;
        targets?: MealPlanDay["targets"];
      },
    ) => {
      const response = await updateMealPlanDay(dayId, payload);
      if (response.day) {
        const mapped = mapDay(response.day);
        setDays((prev) => prev.map((day) => (day.id === dayId ? mapped : day)));
        return mapped;
      }
      return null;
    },
    [],
  );

  const addGroup = useCallback(async (name: string) => {
    const response = await createMealPlanGroup({ name });
    if (response.group) {
      setGroups((prev) => [...prev, mapGroup(response.group)]);
      return mapGroup(response.group);
    }
    return null;
  }, []);

  const patchGroup = useCallback(
    async (groupId: string, payload: { name?: string; sortOrder?: number }) => {
      const response = await updateMealPlanGroup(groupId, payload);
      if (response.group) {
        const mapped = mapGroup(response.group);
        setGroups((prev) => prev.map((g) => (g.id === groupId ? mapped : g)));
        return mapped;
      }
      return null;
    },
    [],
  );

  const removeGroup = useCallback(async (groupId: string) => {
    await deleteMealPlanGroup(groupId);
    setGroups((prev) => prev.filter((g) => g.id !== groupId));
    setDays((prev) =>
      prev.map((day) => (day.groupId === groupId ? { ...day, groupId: null } : day)),
    );
  }, []);

  const removeDay = useCallback(async (dayId: string) => {
    await deleteMealPlanDay(dayId);
    const removedMealIds = meals
      .filter((meal) => meal.dayId === dayId)
      .map((meal) => meal.id);
    const removedMealIdSet = new Set(removedMealIds);
    setDays((prev) => prev.filter((day) => day.id !== dayId));
    setMeals((prev) => prev.filter((meal) => meal.dayId !== dayId));
    setItems((prev) => prev.filter((item) => !removedMealIdSet.has(item.mealId)));
    setWeekAssignments((prev) =>
      prev.map((entry) => (entry.dayId === dayId ? { ...entry, dayId: null } : entry)),
    );
  }, [meals]);

  const duplicateDay = useCallback(async (dayId: string, name?: string) => {
    const response = await duplicateMealPlanDay(dayId, name);
    if (response.day) {
      setDays((prev) => [...prev, mapDay(response.day)]);
    }
    if (response.meals?.length) {
      setMeals((prev) => [...prev, ...response.meals.map(mapMeal)]);
    }
    if (response.items?.length) {
      setItems((prev) => [...prev, ...response.items.map(mapItem)]);
    }
    return response.day ? mapDay(response.day) : null;
  }, []);

  const addItem = useCallback(
    async (
      mealId: string,
      payload: {
        foodId?: string | null;
        foodName: string;
        quantity?: number;
        slot: MealPlanSlot;
        kcal: number;
        protein: number;
        carbs: number;
        fat: number;
      },
    ) => {
      const response = await addMealPlanItem(mealId, {
        foodId: payload.foodId ?? null,
        foodName: payload.foodName,
        quantity: payload.quantity ?? 1,
        slot: payload.slot,
        kcal: payload.kcal,
        proteinG: payload.protein,
        carbsG: payload.carbs,
        fatG: payload.fat,
      });
      if (response.item) {
        const mapped = mapItem(response.item);
        setItems((prev) => [...prev, mapped]);
        return mapped;
      }
      return null;
    },
    [],
  );

  const patchItem = useCallback(
    async (
      itemId: string,
      payload: {
        quantity?: number;
        slot?: MealPlanSlot;
      },
    ) => {
      const response = await updateMealPlanItem(itemId, payload);
      if (response.item) {
        const mapped = mapItem(response.item);
        setItems((prev) => prev.map((item) => (item.id === itemId ? mapped : item)));
      }
    },
    [],
  );

  const removeItem = useCallback(async (itemId: string) => {
    await deleteMealPlanItem(itemId);
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const reorderMeals = useCallback(async (dayId: string, mealIds: string[]) => {
    const response = await reorderMealPlanMeals(dayId, mealIds);
    if (response.meals) {
      const mapped = response.meals.map(mapMeal);
      setMeals((prev) => {
        const map = new Map(prev.map((meal) => [meal.id, meal]));
        mapped.forEach((meal) => map.set(meal.id, meal));
        return [...map.values()].sort((a, b) => {
          if (a.dayId !== b.dayId) {
            return a.dayId.localeCompare(b.dayId);
          }
          return a.sortOrder - b.sortOrder;
        });
      });
    }
  }, []);

  const reorderItems = useCallback(async (mealId: string, itemIds: string[]) => {
    const response = await reorderMealPlanItems(mealId, itemIds);
    if (response.items) {
      const mapped = response.items.map(mapItem);
      setItems((prev) => {
        const map = new Map(prev.map((item) => [item.id, item]));
        mapped.forEach((item) => map.set(item.id, item));
        return [...map.values()].sort((a, b) => {
          if (a.mealId !== b.mealId) {
            return a.mealId.localeCompare(b.mealId);
          }
          return a.sortOrder - b.sortOrder;
        });
      });
    }
  }, []);

  const applyToWeekdays = useCallback(async (dayId: string | null, weekdays: number[]) => {
    const response = await applyMealPlanToWeekdays(dayId, weekdays);
    if (response.assignments) {
      const mapped = response.assignments.map(mapWeek);
      setWeekAssignments((prev) => {
        const map = new Map<number, MealPlanWeekAssignment>();
        prev.forEach((entry) => map.set(entry.weekday, entry));
        mapped.forEach((entry) => map.set(entry.weekday, entry));
        return [...map.values()].sort((a, b) => a.weekday - b.weekday);
      });
    }
  }, []);

  const clearWeekday = useCallback(async (weekday: number) => {
    await clearMealPlanWeekday(weekday);
    setWeekAssignments((prev) => {
      const existing = prev.find((entry) => entry.weekday === weekday);
      if (existing) {
        return prev.map((entry) =>
          entry.weekday === weekday ? { ...entry, dayId: null } : entry,
        );
      }
      return [...prev, { weekday, dayId: null }];
    });
  }, []);

  return useMemo(
    () => ({
      groups,
      days,
      meals,
      items,
      weekAssignments,
      status,
      error,
      reload,
      addDay,
      patchDay,
      removeDay,
      duplicateDay,
      addGroup,
      patchGroup,
      removeGroup,
      addItem,
      patchItem,
      removeItem,
      reorderMeals,
      reorderItems,
      applyToWeekdays,
      clearWeekday,
    }),
    [
      groups,
      days,
      meals,
      items,
      weekAssignments,
      status,
      error,
      reload,
      addDay,
      patchDay,
      removeDay,
      duplicateDay,
      addGroup,
      patchGroup,
      removeGroup,
      addItem,
      patchItem,
      removeItem,
      reorderMeals,
      reorderItems,
      applyToWeekdays,
      clearWeekday,
    ],
  );
};
