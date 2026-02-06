import { useEffect, useState } from "react";
import { fetchNutritionSummary } from "@/lib/api";
import type { NutritionTrend } from "@/types/progress";

/**
 * Fetches and caches nutrition summaries (kcal, macros) for a set of dates.
 */
export function useNutritionTrend(dateKeys: string[]) {
  const [trend, setTrend] = useState<
    Record<string, NutritionTrend | null | undefined>
  >({});

  useEffect(() => {
    let cancelled = false;
    const fetchMissing = async () => {
      const missing = dateKeys.filter((dateKey) => !(dateKey in trend));
      if (missing.length === 0) return;
      const results = await Promise.all(
        missing.map(async (dateKey) => {
          try {
            const summary = await fetchNutritionSummary(dateKey);
            const t = summary.totals;
            const payload: NutritionTrend = {
              kcal: Number(t?.kcal ?? 0),
              carbs: Number(t?.carbs_g ?? 0),
              protein: Number(t?.protein_g ?? 0),
              fat: Number(t?.fat_g ?? 0),
            };
            return [dateKey, payload] as const;
          } catch {
            return [dateKey, null] as const;
          }
        }),
      );
      if (cancelled) return;
      setTrend((prev) => {
        const next = { ...prev };
        results.forEach(([key, value]) => {
          next[key] = value;
        });
        return next;
      });
    };
    fetchMissing();
    return () => {
      cancelled = true;
    };
  }, [dateKeys, trend]);

  return trend;
}
