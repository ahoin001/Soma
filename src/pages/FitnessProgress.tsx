import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { useTrainingAnalytics } from "@/hooks/useTrainingAnalytics";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Bar, BarChart, XAxis, YAxis } from "recharts";

const WEEKS = 12;

const formatWeekLabel = (weekStart: string) => {
  const d = new Date(weekStart);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
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

const FitnessProgress = () => {
  const navigate = useNavigate();
  const { items } = useTrainingAnalytics(WEEKS);

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

  return (
    <AppShell
      experience="fitness"
      onAddAction={() => navigate("/fitness")}
      safeAreaTop="extra"
    >
      <div className="mx-auto w-full max-w-sm px-5 pb-10 pt-6 text-white">
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

            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 px-3 py-4">
              <p className="mb-3 text-xs uppercase tracking-[0.2em] text-white/50">
                Weekly volume
              </p>
              <ChartContainer
                config={trainingChartConfig}
                className="h-[220px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-white/50"
              >
                <BarChart
                  data={chartData}
                  margin={{ top: 8, right: 8, bottom: 8, left: 8 }}
                >
                  <XAxis
                    dataKey="weekLabel"
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 10 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => (v >= 1000 ? `${v / 1000}k` : String(v))}
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
      </div>
    </AppShell>
  );
};

export default FitnessProgress;
