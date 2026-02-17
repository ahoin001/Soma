import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { AppShell } from "@/components/aura";
import { Button } from "@/components/ui/button";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Line, LineChart, XAxis, YAxis } from "recharts";
import { useExerciseAnalytics } from "@/hooks/useExerciseAnalytics";
import { fetchExerciseById } from "@/lib/api";

const liftChartConfig = {
  est_one_rm_kg: {
    label: "Estimated 1RM (kg)",
    color: "hsl(160 84% 39%)",
  },
} satisfies ChartConfig;

const FitnessProgressExercise = () => {
  const { exerciseId } = useParams<{ exerciseId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const id = exerciseId ? parseInt(exerciseId, 10) : null;
  const [name, setName] = useState<string>(
    (location.state as { name?: string } | null)?.name ?? "",
  );

  const { items: liftItems } = useExerciseAnalytics(id, 84);

  useEffect(() => {
    if (!id || name) return;
    let cancelled = false;
    fetchExerciseById(id)
      .then((res) => {
        if (!cancelled && res?.exercise?.name) {
          setName(String(res.exercise.name));
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id, name]);

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

  const historyReversed = useMemo(
    () =>
      [...liftItems]
        .reverse()
        .filter((row) => Number(row.est_one_rm_kg) > 0 || Number(row.total_sets) > 0),
    [liftItems],
  );

  if (id == null || Number.isNaN(id)) {
    return (
      <AppShell experience="fitness" onAddAction={() => navigate("/fitness")} safeAreaTop="extra">
        <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6">
          <p className="text-muted-foreground">Invalid exercise.</p>
          <Button
            variant="outline"
            className="mt-4 rounded-full"
            onClick={() => navigate("/fitness/progress")}
          >
            Back to Progress
          </Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell experience="fitness" onAddAction={() => navigate("/fitness")} safeAreaTop="extra">
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6 text-foreground">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
            onClick={() => navigate("/fitness/progress")}
          >
            ✕
          </Button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Key lift
            </p>
            <h1 className="mt-1 text-lg font-display font-semibold">
              {name || "Loading…"}
            </h1>
          </div>
          <div className="w-10" />
        </div>

        <div className="mt-6 rounded-[28px] border border-border/70 bg-card/55 px-3 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Estimated 1RM over time
          </p>
          <ChartContainer
            config={liftChartConfig}
            className="mt-3 h-[220px] w-full [&_.recharts-cartesian-axis-tick_text]:fill-foreground/50"
          >
            <LineChart data={liftTrend} margin={{ top: 8, right: 8, bottom: 24, left: 28 }}>
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

        <div className="mt-6 rounded-[28px] border border-border/70 bg-card/55 px-4 py-4">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            History
          </p>
          <p className="mt-1 text-sm text-foreground/85">
            Days with activity (est. 1RM or sets)
          </p>
          {historyReversed.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No sessions recorded for this lift yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {historyReversed.slice(0, 30).map((row) => (
                <li
                  key={row.day}
                  className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/60 px-3 py-2 text-sm"
                >
                  <span className="text-foreground/90">
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(row.day))}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {Number(row.est_one_rm_kg) > 0
                      ? `${Math.round(Number(row.est_one_rm_kg))} kg est 1RM`
                      : ""}
                    {Number(row.est_one_rm_kg) > 0 && row.total_sets > 0 ? " · " : ""}
                    {row.total_sets > 0 ? `${row.total_sets} sets` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default FitnessProgressExercise;
