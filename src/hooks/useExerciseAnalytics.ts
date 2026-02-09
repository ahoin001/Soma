import { useCallback, useEffect, useState } from "react";
import { ensureUser, fetchExerciseAnalytics } from "@/lib/api";

type ExercisePoint = {
  day: string;
  total_sets: number;
  total_volume_kg: number;
  max_weight_kg: number;
  est_one_rm_kg: number;
};

export const useExerciseAnalytics = (exerciseId: number | null, days = 84) => {
  const [items, setItems] = useState<ExercisePoint[]>([]);

  const refresh = useCallback(
    async (force = false) => {
      if (!exerciseId) {
        setItems([]);
        return;
      }
      if (!force && items.length > 0) return;
      await ensureUser();
      const result = await fetchExerciseAnalytics(exerciseId, days);
      setItems(result.items);
    },
    [days, exerciseId, items.length],
  );

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  return { items, refresh };
};
