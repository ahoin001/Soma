import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ensureUser,
  fetchActivityGoals,
  fetchStepsLogs,
  fetchWaterLogs,
  fetchWeightLogs,
  deleteWeightLog,
  upsertStepsLog,
  upsertActivityGoals,
  upsertWaterLog,
  setWaterLogTotal,
  upsertWeightLog,
} from "@/lib/api";
import { queryKeys } from "@/lib/queryKeys";

// ============================================================================
// Types
// ============================================================================

export type WeightEntry = {
  date: string;
  weight: number;
};

type StepsData = {
  steps: number;
  connected: boolean;
  goal: number;
};

type WaterData = {
  totalMl: number;
  goalMl: number;
};

// ============================================================================
// useWeightLogs - React Query version
// ============================================================================

export const useWeightLogsQuery = () => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.trackingWeight,
    queryFn: async () => {
      await ensureUser();
      const response = await fetchWeightLogs({ limit: 180 });
      return response.items.map((item) => ({
        date: item.local_date,
        weight: Number(item.weight),
      })) as WeightEntry[];
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  const mutation = useMutation({
    mutationFn: async (entry: { date: string; weight: number; unit?: string }) => {
      await ensureUser();
      await upsertWeightLog({
        localDate: entry.date,
        weight: entry.weight,
        unit: entry.unit ?? "lb",
      });
      return entry;
    },
    onMutate: async (entry) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.trackingWeight });

      // Snapshot previous value
      const previous = queryClient.getQueryData<WeightEntry[]>(queryKeys.trackingWeight);

      // Optimistically update
      queryClient.setQueryData<WeightEntry[]>(queryKeys.trackingWeight, (old) => {
        if (!old) return [{ date: entry.date, weight: entry.weight }];
        const existingIndex = old.findIndex((e) => e.date === entry.date);
        if (existingIndex >= 0) {
          return old.map((e) =>
            e.date === entry.date ? { date: entry.date, weight: entry.weight } : e
          );
        }
        return [{ date: entry.date, weight: entry.weight }, ...old].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
      });

      return { previous };
    },
    onError: (_err, entry, context) => {
      // Rollback on error
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.trackingWeight, context.previous);
      }
      toast("Unable to save weight", {
        action: {
          label: "Retry",
          onClick: () => mutation.mutate(entry),
        },
      });
    },
    onSettled: () => {
      // Refetch after mutation
      void queryClient.invalidateQueries({ queryKey: queryKeys.trackingWeight });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (localDate: string) => {
      await ensureUser();
      await deleteWeightLog(localDate);
      return localDate;
    },
    onMutate: async (localDate) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.trackingWeight });
      const previous = queryClient.getQueryData<WeightEntry[]>(queryKeys.trackingWeight);
      queryClient.setQueryData<WeightEntry[]>(queryKeys.trackingWeight, (old) =>
        (old ?? []).filter((entry) => entry.date !== localDate),
      );
      return { previous };
    },
    onError: (_err, localDate, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.trackingWeight, context.previous);
      }
      toast("Unable to delete weight", {
        action: {
          label: "Retry",
          onClick: () => deleteMutation.mutate(localDate),
        },
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trackingWeight });
    },
  });

  return {
    entries: query.data ?? [],
    status: query.isLoading ? "loading" : query.isError ? "error" : "idle",
    error: query.error instanceof Error ? query.error.message : null,
    refresh: () => queryClient.invalidateQueries({ queryKey: queryKeys.trackingWeight }),
    addEntry: mutation.mutate,
    isAdding: mutation.isPending,
    removeEntry: deleteMutation.mutate,
    isRemoving: deleteMutation.isPending,
  };
};

// ============================================================================
// useStepsSummary - React Query version
// ============================================================================

export const useStepsSummaryQuery = (date: Date) => {
  const queryClient = useQueryClient();
  const localDate = useMemo(() => date.toISOString().slice(0, 10), [date]);

  const query = useQuery({
    queryKey: queryKeys.trackingSteps(localDate),
    queryFn: async (): Promise<StepsData> => {
      await ensureUser();
      const [stepsResponse, goalsResponse] = await Promise.all([
        fetchStepsLogs(localDate),
        fetchActivityGoals(),
      ]);

      const hasSteps = stepsResponse.items.length > 0;
      const latest = stepsResponse.items[0];

      return {
        steps: hasSteps ? Number(latest.steps ?? 0) : 0,
        connected: hasSteps,
        goal: goalsResponse.goals?.steps_goal ?? 8000,
      };
    },
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const stepsMutation = useMutation({
    mutationFn: async (value: number) => {
      await ensureUser();
      await upsertStepsLog({ localDate, steps: value, source: "manual" });
      return value;
    },
    onMutate: async (value) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.trackingSteps(localDate) });
      const previous = queryClient.getQueryData<StepsData>(queryKeys.trackingSteps(localDate));

      queryClient.setQueryData<StepsData>(queryKeys.trackingSteps(localDate), (old) => ({
        steps: value,
        connected: true,
        goal: old?.goal ?? 8000,
      }));

      return { previous };
    },
    onError: (_err, value, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.trackingSteps(localDate), context.previous);
      }
      toast("Unable to update steps", {
        action: {
          label: "Retry",
          onClick: () => stepsMutation.mutate(value),
        },
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trackingSteps(localDate) });
    },
  });

  const goalMutation = useMutation({
    mutationFn: async (nextGoal: number) => {
      if (!Number.isFinite(nextGoal) || nextGoal <= 0) {
        throw new Error("Invalid goal");
      }
      await ensureUser();
      await upsertActivityGoals({ stepsGoal: Math.round(nextGoal) });
      return Math.round(nextGoal);
    },
    onMutate: async (nextGoal) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.trackingSteps(localDate) });
      const previous = queryClient.getQueryData<StepsData>(queryKeys.trackingSteps(localDate));

      queryClient.setQueryData<StepsData>(queryKeys.trackingSteps(localDate), (old) => ({
        steps: old?.steps ?? 0,
        connected: old?.connected ?? false,
        goal: Math.round(nextGoal),
      }));

      return { previous };
    },
    onError: (_err, nextGoal, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.trackingSteps(localDate), context.previous);
      }
      toast("Unable to update steps goal", {
        action: {
          label: "Retry",
          onClick: () => goalMutation.mutate(nextGoal),
        },
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trackingSteps(localDate) });
    },
  });

  return {
    steps: query.data?.steps ?? 0,
    connected: query.data?.connected ?? false,
    goal: query.data?.goal ?? 8000,
    isLoading: query.isLoading,
    refresh: () => queryClient.invalidateQueries({ queryKey: queryKeys.trackingSteps(localDate) }),
    setManualSteps: stepsMutation.mutate,
    updateGoal: goalMutation.mutate,
  };
};

// ============================================================================
// useWaterSummary - React Query version
// ============================================================================

export const useWaterSummaryQuery = (date: Date) => {
  const queryClient = useQueryClient();
  const localDate = useMemo(() => date.toISOString().slice(0, 10), [date]);

  const query = useQuery({
    queryKey: queryKeys.trackingWater(localDate),
    queryFn: async (): Promise<WaterData> => {
      await ensureUser();
      const [waterResponse, goalsResponse] = await Promise.all([
        fetchWaterLogs(localDate),
        fetchActivityGoals(),
      ]);

      const total = waterResponse.items.reduce(
        (sum, item) => sum + Number(item.amount_ml ?? 0),
        0
      );

      return {
        totalMl: total,
        goalMl: goalsResponse.goals?.water_goal_ml ?? 2000,
      };
    },
    staleTime: 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  const addWaterMutation = useMutation({
    mutationFn: async (amountMl: number) => {
      if (!Number.isFinite(amountMl) || amountMl <= 0) {
        throw new Error("Invalid amount");
      }
      await ensureUser();
      await upsertWaterLog({ localDate, amountMl, source: "manual" });
      return amountMl;
    },
    onMutate: async (amountMl) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.trackingWater(localDate) });
      const previous = queryClient.getQueryData<WaterData>(queryKeys.trackingWater(localDate));

      queryClient.setQueryData<WaterData>(queryKeys.trackingWater(localDate), (old) => ({
        totalMl: (old?.totalMl ?? 0) + amountMl,
        goalMl: old?.goalMl ?? 2000,
      }));

      return { previous };
    },
    onError: (_err, amountMl, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.trackingWater(localDate), context.previous);
      }
      toast("Unable to add water", {
        action: {
          label: "Retry",
          onClick: () => addWaterMutation.mutate(amountMl),
        },
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trackingWater(localDate) });
    },
  });

  const setTotalMutation = useMutation({
    mutationKey: ["setWaterTotal", localDate],
    mutationFn: async (nextTotal: number) => {
      if (!Number.isFinite(nextTotal) || nextTotal < 0) {
        throw new Error("Invalid total");
      }
      const rounded = Math.round(nextTotal);
      await ensureUser();
      // Use the absolute-total endpoint — no delta computation needed.
      await setWaterLogTotal({ localDate, totalMl: rounded, source: "manual" });
      return rounded;
    },
    onMutate: async (nextTotal) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.trackingWater(localDate) });
      const previous = queryClient.getQueryData<WaterData>(queryKeys.trackingWater(localDate));

      queryClient.setQueryData<WaterData>(queryKeys.trackingWater(localDate), (old) => ({
        totalMl: Math.round(nextTotal),
        goalMl: old?.goalMl ?? 2000,
      }));

      return { previous };
    },
    onError: (_err, nextTotal, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.trackingWater(localDate), context.previous);
      }
      toast("Unable to update water", {
        action: {
          label: "Retry",
          onClick: () => setTotalMutation.mutate(nextTotal),
        },
      });
    },
    onSettled: () => {
      // Only refetch from server once no other setWaterTotal mutations are in
      // flight, preventing a stale refetch from overwriting a newer optimistic
      // update (the root cause of the "cups refill" race condition).
      const pending = queryClient.isMutating({
        mutationKey: ["setWaterTotal", localDate],
      });
      if (pending === 0) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.trackingWater(localDate) });
      }
    },
  });

  const goalMutation = useMutation({
    mutationFn: async (nextGoal: number) => {
      if (!Number.isFinite(nextGoal) || nextGoal <= 0) {
        throw new Error("Invalid goal");
      }
      await ensureUser();
      await upsertActivityGoals({ waterGoalMl: Math.round(nextGoal) });
      return Math.round(nextGoal);
    },
    onMutate: async (nextGoal) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.trackingWater(localDate) });
      const previous = queryClient.getQueryData<WaterData>(queryKeys.trackingWater(localDate));

      queryClient.setQueryData<WaterData>(queryKeys.trackingWater(localDate), (old) => ({
        totalMl: old?.totalMl ?? 0,
        goalMl: Math.round(nextGoal),
      }));

      return { previous };
    },
    onError: (_err, nextGoal, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKeys.trackingWater(localDate), context.previous);
      }
      toast("Unable to update water goal", {
        action: {
          label: "Retry",
          onClick: () => goalMutation.mutate(nextGoal),
        },
      });
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.trackingWater(localDate) });
    },
  });

  return {
    totalMl: query.data?.totalMl ?? 0,
    goalMl: query.data?.goalMl ?? 2000,
    isLoading: query.isLoading,
    refresh: () => queryClient.invalidateQueries({ queryKey: queryKeys.trackingWater(localDate) }),
    addWater: addWaterMutation.mutate,
    setWaterTotal: setTotalMutation.mutate,
    updateGoal: goalMutation.mutate,
  };
};
