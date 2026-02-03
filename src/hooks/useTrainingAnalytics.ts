import { useCallback, useEffect, useState } from "react";
import { ensureUser, fetchTrainingAnalytics } from "@/lib/api";

type TrainingPoint = {
  week_start: string;
  volume: number;
  total_sets: number;
};

export const useTrainingAnalytics = (weeks = 8) => {
  const [items, setItems] = useState<TrainingPoint[]>([]);

  const refresh = useCallback(async () => {
    await ensureUser();
    const result = await fetchTrainingAnalytics(weeks);
    setItems(result.items);
  }, [weeks]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { items, refresh };
};
