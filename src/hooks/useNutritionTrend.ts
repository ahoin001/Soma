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
            const m = summary.micros;
            const payload: NutritionTrend = {
              kcal: Number(t?.kcal ?? 0),
              carbs: Number(t?.carbs_g ?? 0),
              protein: Number(t?.protein_g ?? 0),
              fat: Number(t?.fat_g ?? 0),
              micros: m
                ? {
                    sodium_mg: Number(m.sodium_mg ?? 0),
                    fiber_g: Number(m.fiber_g ?? 0),
                    sugar_g: Number(m.sugar_g ?? 0),
                    potassium_mg: Number(m.potassium_mg ?? 0),
                    cholesterol_mg: Number(m.cholesterol_mg ?? 0),
                    saturated_fat_g: Number(m.saturated_fat_g ?? 0),
                  }
                : undefined,
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
