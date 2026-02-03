import { useCallback, useEffect, useMemo, useState } from "react";
import { ensureUser, fetchNutritionAnalytics, fetchNutritionStreak, fetchNutritionWeekly } from "@/lib/api";

type WeeklyPoint = {
  day: string;
  kcal: number;
};

type StreakSummary = {
  days: number;
  bestWeek: number;
  message: string;
};

const formatDay = (value: string) =>
  new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(new Date(value));

export const useNutritionInsights = (date: Date) => {
  const [weekly, setWeekly] = useState<WeeklyPoint[]>([]);
  const [average, setAverage] = useState(0);
  const [streak, setStreak] = useState<StreakSummary>({
    days: 0,
    bestWeek: 0,
    message: "Start your first streak.",
  });

  const startOfWeek = useMemo(() => {
    const start = new Date(date);
    start.setDate(date.getDate() - 6);
    return start.toISOString().slice(0, 10);
  }, [date]);

  const refresh = useCallback(async () => {
    await ensureUser();
    const [weeklyRes, streakRes, analyticsRes] = await Promise.all([
      fetchNutritionWeekly(startOfWeek),
      fetchNutritionStreak(),
      fetchNutritionAnalytics(28),
    ]);

    setWeekly(
      weeklyRes.items.map((item) => ({
        day: formatDay(item.day),
        kcal: Number(item.kcal ?? 0),
      })),
    );

    const message =
      streakRes.current > 0
        ? `You are ${streakRes.current} days in.`
        : "Start your first streak.";

    setStreak({
      days: streakRes.current,
      bestWeek: streakRes.best,
      message,
    });
    setAverage(Number(analyticsRes.average ?? 0));
  }, [startOfWeek]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { weekly, streak, average, refresh };
};
