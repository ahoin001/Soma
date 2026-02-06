import { useCallback, useEffect, useState } from "react";
import { ensureUser, fetchTrainingAnalytics } from "@/lib/api";
import {
  getTrainingAnalyticsCache,
  setTrainingAnalyticsCache,
} from "@/lib/fitnessCache";

type TrainingPoint = {
  week_start: string;
  volume: number;
  total_sets: number;
};

export const useTrainingAnalytics = (weeks = 8) => {
  const [items, setItems] = useState<TrainingPoint[]>([]);

  const refresh = useCallback(
    async (force = false) => {
      if (!force) {
        const cached = getTrainingAnalyticsCache(weeks);
        if (cached) {
          setItems(cached.items);
          return;
        }
      }
      await ensureUser();
      const result = await fetchTrainingAnalytics(weeks);
      setItems(result.items);
      setTrainingAnalyticsCache({ weeks, items: result.items });
    },
    [weeks],
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, refresh };
};
