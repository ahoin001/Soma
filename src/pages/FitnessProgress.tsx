import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTrainingAnalytics } from "@/hooks/useTrainingAnalytics";
import { useExerciseLibrary } from "@/hooks/useExerciseLibrary";
import { useExerciseAnalytics } from "@/hooks/useExerciseAnalytics";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, Line, LineChart, XAxis, YAxis } from "recharts";

const WEEKS = 12;

const formatWeekLabel = (weekStart: string) => {
  const d = new Date(weekStart);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
};

const formatWeekRange = (chartData: { week_start: string }[]) => {
  if (chartData.length === 0) return "";
  const first = new Date(chartData[0].week_start);
  const last = new Date(chartData[chartData.length - 1].week_start);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).formatRange(first, last);
};

const trainingChartConfig = {
  volume: {
    label: "Volume (kg)",
    color: "hsl(160 84% 39%)",
  },
  total_sets: {
    label: "Sets",
    color: "hsl(160 84% 49%)",
  },
} satisfies ChartConfig;

const liftChartConfig = {
  est_one_rm_kg: {
    label: "Estimated 1RM (kg)",
    color: "hsl(160 84% 39%)",
  },
} satisfies ChartConfig;

const FitnessProgress = () => {
  const navigate = useNavigate();
  const { items } = useTrainingAnalytics(WEEKS);
  const exerciseLibrary = useExerciseLibrary();
  const [liftQuery, setLiftQuery] = useState("");
  const [selectedLiftId, setSelectedLiftId] = useState<number | null>(null);
  const [selectedLiftName, setSelectedLiftName] = useState<string>("");
  const { items: liftItems } = useExerciseAnalytics(selectedLiftId, 84);

  useEffect(() => {
    if (!liftQuery.trim()) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      exerciseLibrary.searchExercises(liftQuery, controller.signal, "mine");
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [exerciseLibrary, liftQuery]);

  const chartData = useMemo(() => {
    return items.map((row) => ({
      week_start: row.week_start,
      weekLabel: formatWeekLabel(row.week_start),
      volume: Math.round(Number(row.volume) ?? 0),
      total_sets: Number(row.total_sets) ?? 0,
    }));
  }, [items]);

  const hasData = useMemo(
    () => chartData.some((d) => d.volume > 0 || d.total_sets > 0),
    [chartData],
  );

  const totalVolume = useMemo(
    () => chartData.reduce((sum, d) => sum + d.volume, 0),
    [chartData],
  );
  const totalSets = useMemo(
    () => chartData.reduce((sum, d) => sum + d.total_sets, 0),
    [chartData],
  );

  const weeklyAverage = useMemo(() => {
    if (chartData.length === 0) return 0;
    return Math.round(totalVolume / chartData.length);
  }, [chartData.length, totalVolume]);

  const bestWeek = useMemo(() => {
    if (chartData.length === 0) return null;
    return chartData.reduce((best, current) =>
      current.volume > best.volume ? current : best,
    );
  }, [chartData]);

  const prTimeline = useMemo(() => {
    let best = 0;
    const timeline: Array<{ day: string; max: number }> = [];
    liftItems.forEach((row) => {
      const max = Number(row.max_weight_kg) || 0;
      if (max > best) {
        best = max;
        timeline.push({ day: row.day, max });
      }
    });
    return timeline.slice(-3);
  }, [liftItems]);

  const liftTrend = useMemo(
    () =>
      liftItems.map((row) => ({
        day: row.day,
        label: new Intl.DateTimeFormat("en-US", {
          month: "short",
          day: "numeric",
        }).format(new Date(row.day)),
        est_one_rm_kg: Math.round(Number(row.est_one_rm_kg) || 0),
      })),
    [liftItems],
  );

  const latestOneRm = useMemo(() => {
    const last = [...liftItems].reverse().find((row) => Number(row.est_one_rm_kg) > 0);
    return last ? Math.round(Number(last.est_one_rm_kg)) : 0;
  }, [liftItems]);

  return (
    <AppShell
      experience="fitness"
      onAddAction={() => navigate("/fitness")}
      safeAreaTop="extra"
    >
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Pulse
            </p>
            <h1 className="mt-2 text-2xl font-display font-semibold">
              Progress
            </h1>
            <p className="mt-1 text-sm text-white/60">
              {hasData
                ? `Last ${WEEKS} weeks · volume & sets`
                : "Trends will appear as you log workouts."}
            </p>
          </div>
          <Button
            variant="ghost"
            className="h-10 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => navigate("/fitness")}
          >
            Back
          </Button>
        </div>

        {hasData ? (
          <>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Total volume
                </p>
                <p className="mt-1 text-xl font-semibold text-emerald-400">
                  {totalVolume.toLocaleString()} kg
                </p>
                <p className="text-xs text-white/50">Last {WEEKS} weeks</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Total sets
                </p>
                <p className="mt-1 text-xl font-semibold text-emerald-400">
                  {totalSets.toLocaleString()}
                </p>
                <p className="text-xs text-white/50">Last {WEEKS} weeks</p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Weekly average
                </p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {weeklyAverage.toLocaleString()} kg
                </p>
                <p className="text-xs text-white/50">Last {WEEKS} weeks</p>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Best week
                </p>
                <p className="mt-1 text-xl font-semibold text-white">
                  {bestWeek?.volume.toLocaleString() ?? "0"} kg
                </p>
                <p className="text-xs text-white/50">
                  {bestWeek ? formatWeekLabel(bestWeek.week_start) : "—"}
                </p>
              </div>
            </div>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 px-3 py-4">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Weekly volume
                </p>
                <p className="text-[10px] text-white/40">
                  {formatWeekRange(chartData)}
                </p>
              </div>
              <ChartContainer
                config={trainingChartConfig}
                className="h-[220px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-white/50"
              >
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, bottom: 24, left: 28 }}
                >
                  <XAxis
                    dataKey="weekLabel"
                    tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    label={{
                      value: "Week of",
                      position: "insideBottom",
                      offset: -18,
                      fill: "rgba(255,255,255,0.4)",
                      fontSize: 10,
                    }}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) =>
                      typeof v === "number"
                        ? v >= 1000
                          ? `${v / 1000}k`
                          : String(v)
                        : String(v)
                    }
                    label={{
                      value: "Volume (kg)",
                      angle: -90,
                      position: "insideLeft",
                      fill: "rgba(255,255,255,0.5)",
                      fontSize: 10,
                    }}
                  />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value) => [
                          `${Number(value).toLocaleString()} kg`,
                          "Volume",
                        ]}
                        labelFormatter={(_, payload) =>
                          payload?.[0]?.payload?.weekLabel ?? ""
                        }
                      />
                    }
                  />
                  <Bar
                    dataKey="volume"
                    fill="var(--color-volume)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ChartContainer>
              <p className="mt-1 text-center text-[10px] text-white/40">
                Volume in kg per week
              </p>
            </div>
          </>
        ) : (
          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 px-4 py-6 text-center">
            <p className="text-sm text-white/70">
              Your training trends will live here once you log sessions.
            </p>
            <Button
              className="mt-5 w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              onClick={() => navigate("/fitness")}
            >
              Go to workouts
            </Button>
          </div>
        )}

        <div className="mt-8 rounded-[28px] border border-white/10 bg-white/5 px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                Key lift
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {selectedLiftName || "Pick a lift to track"}
              </p>
              <p className="text-xs text-white/50">
                PR timeline · estimated 1RM trend
              </p>
            </div>
          </div>
          <div className="mt-4">
            <Input
              value={liftQuery}
              onChange={(event) => setLiftQuery(event.target.value)}
              placeholder="Search exercises"
              className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
            />
            {exerciseLibrary.results.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {exerciseLibrary.results.slice(0, 4).map((exercise) => (
                  <button
                    key={exercise.id}
                    type="button"
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white/80 hover:border-white/30"
                    onClick={() => {
                      setSelectedLiftId(exercise.id);
                      setSelectedLiftName(exercise.name);
                      setLiftQuery("");
                    }}
                  >
                    <span>{exercise.name}</span>
                    <span className="text-xs text-white/40">
                      {exercise.muscles[0] ?? exercise.category}
                    </span>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          {selectedLiftId ? (
            <div className="mt-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[20px] border border-white/10 bg-white/5 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                    Latest est 1RM
                  </p>
                  <p className="mt-1 text-lg font-semibold text-emerald-300">
                    {latestOneRm ? `${latestOneRm} kg` : "—"}
                  </p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/5 px-3 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                    PR timeline
                  </p>
                  <div className="mt-1 space-y-1 text-xs text-white/70">
                    {prTimeline.length === 0 ? (
                      <p>No PRs yet</p>
                    ) : (
                      prTimeline.map((pr) => (
                        <p key={pr.day}>
                          {new Intl.DateTimeFormat("en-US", {
                            month: "short",
                            day: "numeric",
                          }).format(new Date(pr.day))}{" "}
                          · {pr.max} kg
                        </p>
                      ))
                    )}
                  </div>
                </div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-white/5 px-3 py-3">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Estimated 1RM trend
                </p>
                <ChartContainer
                  config={liftChartConfig}
                  className="mt-3 h-[200px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-white/50"
                >
                  <LineChart data={liftTrend} margin={{ top: 8, right: 8, bottom: 16, left: 28 }}>
                    <XAxis
                      dataKey="label"
                      tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      interval="preserveStartEnd"
                    />
                    <YAxis
                      tick={{ fill: "rgba(255,255,255,0.6)", fontSize: 10 }}
                      tickLine={false}
                      axisLine={false}
                      width={32}
                    />
                    <ChartTooltip
                      content={
                        <ChartTooltipContent
                          formatter={(value) => [`${Number(value)} kg`, "Est 1RM"]}
                        />
                      }
                    />
                    <Line
                      type="monotone"
                      dataKey="est_one_rm_kg"
                      stroke="var(--color-est_one_rm_kg)"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ChartContainer>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
};

export default FitnessProgress;
