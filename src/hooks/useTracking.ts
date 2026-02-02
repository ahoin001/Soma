import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ensureUser,
  fetchStepsLogs,
  fetchWaterLogs,
  fetchWeightLogs,
  upsertStepsLog,
  upsertWaterLog,
  upsertWeightLog,
} from "@/lib/api";

export type WeightEntry = {
  date: string;
  weight: number;
};

export const useWeightLogs = () => {
  const [entries, setEntries] = useState<WeightEntry[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus("loading");
    setError(null);
    try {
      await ensureUser();
      const response = await fetchWeightLogs({ limit: 180 });
      setEntries(
        response.items.map((item) => ({
          date: item.local_date,
          weight: Number(item.weight),
        })),
      );
      setStatus("idle");
    } catch (err) {
      const detail = err instanceof Error ? err.message : "Unable to load weight.";
      setError(detail);
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addEntry = useCallback(
    async (entry: { date: string; weight: number; unit?: string }) => {
      await ensureUser();
      await upsertWeightLog({
        localDate: entry.date,
        weight: entry.weight,
        unit: entry.unit ?? "lb",
      });
      await refresh();
    },
    [refresh],
  );

  return { entries, status, error, refresh, addEntry };
};

export const useStepsSummary = (date: Date) => {
  const [steps, setSteps] = useState(0);
  const [connected, setConnected] = useState(false);

  const localDate = useMemo(() => date.toISOString().slice(0, 10), [date]);

  const refresh = useCallback(async () => {
    await ensureUser();
    const response = await fetchStepsLogs(localDate);
    if (!response.items.length) {
      setSteps(0);
      setConnected(false);
      return;
    }
    const latest = response.items[0];
    setSteps(Number(latest.steps ?? 0));
    setConnected(true);
  }, [localDate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const setManualSteps = useCallback(
    async (value: number) => {
      await ensureUser();
      await upsertStepsLog({
        localDate,
        steps: value,
        source: "manual",
      });
      await refresh();
    },
    [localDate, refresh],
  );

  return { steps, connected, refresh, setManualSteps };
};

export const useWaterSummary = (date: Date) => {
  const [totalMl, setTotalMl] = useState(0);
  const localDate = useMemo(() => date.toISOString().slice(0, 10), [date]);

  const refresh = useCallback(async () => {
    await ensureUser();
    const response = await fetchWaterLogs(localDate);
    const total = response.items.reduce(
      (sum, item) => sum + Number(item.amount_ml ?? 0),
      0,
    );
    setTotalMl(total);
  }, [localDate]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addWater = useCallback(
    async (amountMl: number) => {
      if (!Number.isFinite(amountMl) || amountMl <= 0) return;
      await ensureUser();
      await upsertWaterLog({ localDate, amountMl, source: "manual" });
      await refresh();
    },
    [localDate, refresh],
  );

  return { totalMl, refresh, addWater };
};
