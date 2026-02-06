import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { MealTypeRecord } from "@/types/api";
import type { Meal } from "@/data/mock";
import { ensureMealTypes, ensureUser } from "@/lib/api";
import { getMealRecommendation } from "@/lib/nutrition";
import { queryKeys } from "@/lib/queryKeys";

export const useMealTypes = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.mealTypes,
    queryFn: async () => {
      await ensureUser();
      return ensureMealTypes();
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 2 * 60 * 60 * 1000,
  });

  const items = query.data?.items ?? [];
  const meals = useMemo<Meal[]>(
    () =>
      items.map((item) => ({
        id: item.id,
        label: item.label,
        emoji: item.emoji ?? "🍽️",
        recommended: getMealRecommendation(item.label),
      })),
    [items],
  );

  const reload = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.mealTypes });
  }, [queryClient]);

  return {
    items,
    meals,
    status: query.isFetching ? "loading" : query.isError ? "error" : "idle",
    error: query.error instanceof Error ? query.error.message : null,
    reload,
  };
};
