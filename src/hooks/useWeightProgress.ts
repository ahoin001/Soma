import { useEffect, useState } from "react";
import { fetchNutritionSummary } from "@/lib/api";
import type { WeightEntry } from "@/types/progress";

/**
 * Fetches and caches calories for the active weight date (for chart tooltip).
 */
export function useCaloriesByDate(activeDate: string | null) {
  const [caloriesByDate, setCaloriesByDate] = useState<
    Record<string, number | null | undefined>
  >({});

  useEffect(() => {
    if (!activeDate || activeDate in caloriesByDate) return;
    let cancelled = false;
    const fetchCalories = async () => {
      try {
        const summary = await fetchNutritionSummary(activeDate);
        if (cancelled) return;
        const kcal = Number(summary.totals?.kcal ?? 0);
        setCaloriesByDate((prev) => ({
          ...prev,
          [activeDate]: Number.isFinite(kcal) ? kcal : 0,
        }));
      } catch {
        if (cancelled) return;
        setCaloriesByDate((prev) => ({ ...prev, [activeDate]: null }));
      }
    };
    fetchCalories();
    return () => {
      cancelled = true;
    };
  }, [activeDate, caloriesByDate]);

  return caloriesByDate;
}

export type WeightStats = {
  minWeight: number;
  maxWeight: number;
  startDate: string;
  midDate: string | null;
  endDate: string;
};

export type WeightGuidance = {
  goal: string;
  min: number;
  max: number;
  rate: number;
  status: "on" | "slow" | "fast";
  adjust: number;
};

/**
 * Derived stats and guidance from weight entries.
 */
export function useWeightStats(
  entries: WeightEntry[],
  trendRange: number,
): {
  filteredEntries: WeightEntry[];
  stats: WeightStats | null;
  latest: WeightEntry | null;
  lastEntries: WeightEntry[];
} {
  const filteredEntries = entries.filter((entry) => {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (trendRange - 1));
    return new Date(entry.date).getTime() >= cutoff.getTime();
  });

  const stats: WeightStats | null =
    filteredEntries.length === 0
      ? null
      : (() => {
          const sorted = [...filteredEntries].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
          const weights = sorted.map((e) => e.weight);
          const startDate = sorted[0].date;
          const endDate = sorted[sorted.length - 1].date;
          const startTime = new Date(startDate).getTime();
          const endTime = new Date(endDate).getTime();
          const spanDays = Math.round((endTime - startTime) / 86400000);
          const midDate =
            spanDays >= 14
              ? new Date((startTime + endTime) / 2).toISOString().slice(0, 10)
              : null;
          return {
            minWeight: Math.min(...weights),
            maxWeight: Math.max(...weights),
            startDate,
            midDate,
            endDate,
          };
        })();

  const latest =
    entries.length === 0
      ? null
      : [...entries].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
        )[0];

  const lastEntries = [...entries]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  return { filteredEntries, stats, latest, lastEntries };
}

/**
 * Weight trend rate (lb/week) and goal-based guidance.
 */
export function useWeightGuidance(
  entries: WeightEntry[],
  goal: string,
): WeightGuidance | null {
  const trend =
    entries.length < 2
      ? null
      : (() => {
          const sorted = [...entries].sort(
            (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
          );
          const lastDate = new Date(
            sorted[sorted.length - 1].date,
          ).getTime();
          const windowStart = lastDate - 28 * 86400000;
          const windowEntries = sorted.filter(
            (e) => new Date(e.date).getTime() >= windowStart,
          );
          const activeEntries =
            windowEntries.length >= 2 ? windowEntries : sorted;
          const start = activeEntries[0];
          const end = activeEntries[activeEntries.length - 1];
          const days = Math.max(
            (new Date(end.date).getTime() - new Date(start.date).getTime()) /
              86400000,
            1,
          );
          const delta = end.weight - start.weight;
          return { ratePerWeek: delta / (days / 7) };
        })();

  if (!trend) return null;

  const goalKey =
    goal === "balance" ? "recomp" : goal;
  const ranges = {
    cut: { min: -0.75, max: -0.25 },
    recomp: { min: -0.25, max: 0.25 },
    bulk: { min: 0.25, max: 0.75 },
  } as const;
  const { min, max } = ranges[goalKey as keyof typeof ranges] ?? ranges.recomp;
  const rate = trend.ratePerWeek;
  let status: "on" | "slow" | "fast" = "on";
  if (rate < min) status = "slow";
  if (rate > max) status = "fast";
  const adjust = status === "on" ? 0 : status === "slow" ? 150 : -150;

  return { goal: goalKey, min, max, rate, status, adjust };
}
