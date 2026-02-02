import { useCallback, useEffect, useState } from "react";
import type { MealTypeRecord } from "@/types/api";
import type { Meal } from "@/data/mock";
import { ensureMealTypes, ensureUser } from "@/lib/api";
import { getMealRecommendation } from "@/lib/nutrition";

export const useMealTypes = () => {
  const [items, setItems] = useState<MealTypeRecord[]>([]);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      await ensureUser();
      const response = await ensureMealTypes();
      setItems(response.items);
      setMeals(
        response.items.map((item) => ({
          id: item.id,
          label: item.label,
          emoji: item.emoji ?? "🍽️",
          recommended: getMealRecommendation(item.label),
        })),
      );
      setStatus("idle");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unable to load meals.";
      setError(detail);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { items, meals, status, error, reload: load };
};
