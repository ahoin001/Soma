import { useCallback, useEffect, useState } from "react";
import { ensureUser, fetchMuscleAnalytics } from "@/lib/api";

type MusclePoint = {
  day: string;
  muscle: string;
  total_sets: number;
  total_volume_kg: number;
};

export const useMuscleAnalytics = (days = 84) => {
  const [items, setItems] = useState<MusclePoint[]>([]);

  const refresh = useCallback(
    async (force = false) => {
      if (!force && items.length > 0) return;
      await ensureUser();
      const result = await fetchMuscleAnalytics(days);
      setItems(result.items);
    },
    [days, items.length],
  );

  useEffect(() => {
    void refresh(true);
  }, [refresh]);

  return { items, refresh };
};
