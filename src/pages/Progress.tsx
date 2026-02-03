import { useMemo, useState } from "react";
import { AppShell } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/state/AppStore";
import { toast } from "sonner";
import { useWeightLogs } from "@/hooks/useTracking";
import { useTrainingAnalytics } from "@/hooks/useTrainingAnalytics";

type WeightEntry = {
  date: string;
  weight: number;
};

const formatShortDate = (value: string) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(value));

const buildSmoothPath = (points: { x: number; y: number }[]) => {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${points[0].x} ${points[0].y}`;
  }
  const midPoint = (p1: { x: number; y: number }, p2: { x: number; y: number }) => ({
    x: (p1.x + p2.x) / 2,
    y: (p1.y + p2.y) / 2,
  });
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let index = 1; index < points.length; index += 1) {
    const prev = points[index - 1];
    const current = points[index];
    const mid = midPoint(prev, current);
    path += ` Q ${prev.x} ${prev.y} ${mid.x} ${mid.y}`;
  }
  const last = points[points.length - 1];
  path += ` T ${last.x} ${last.y}`;
  return path;
};

const WeightChart = ({ entries }: { entries: WeightEntry[] }) => {
  const viewWidth = 320;
  const viewHeight = 160;
  const padding = 22;

  const points = useMemo(() => {
    if (entries.length === 0) return [];
    const sorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const times = sorted.map((entry) => new Date(entry.date).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const weights = sorted.map((entry) => entry.weight);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const timeSpan = Math.max(maxTime - minTime, 1);
    const weightSpan = Math.max(maxWeight - minWeight, 1);

    return sorted.map((entry) => {
      const time = new Date(entry.date).getTime();
      const x =
        padding +
        ((time - minTime) / timeSpan) * (viewWidth - padding * 2);
      const y =
        padding +
        (1 - (entry.weight - minWeight) / weightSpan) *
          (viewHeight - padding * 2);
      return { x, y };
    });
  }, [entries]);

  const path = buildSmoothPath(points);

  return (
    <svg
      viewBox={`0 0 ${viewWidth} ${viewHeight}`}
      className="h-40 w-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="weightLine" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
          <stop offset="55%" stopColor="#10b981" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#34d399" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id="weightFill" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect
        x="0"
        y="0"
        width={viewWidth}
        height={viewHeight}
        rx="20"
        fill="transparent"
      />
      <g stroke="rgba(16,185,129,0.12)" strokeWidth="1">
        {[0.25, 0.5, 0.75].map((ratio) => {
          const y =
            padding +
            ratio * (viewHeight - padding * 2);
          return (
            <line
              key={ratio}
              x1={padding}
              x2={viewWidth - padding}
              y1={y}
              y2={y}
            />
          );
        })}
      </g>
      {path && (
        <>
          <path
            d={`${path} L ${viewWidth - padding} ${viewHeight - padding} L ${padding} ${
              viewHeight - padding
            } Z`}
            fill="url(#weightFill)"
          />
          <path
            d={path}
            fill="none"
            stroke="url(#weightLine)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {points.map((point, index) => (
            <circle
              key={`${point.x}-${point.y}-${index}`}
              cx={point.x}
              cy={point.y}
              r="3"
              fill="#10b981"
              fillOpacity="0.9"
            />
          ))}
        </>
      )}
    </svg>
  );
};

const Progress = () => {
  const { entries, addEntry } = useWeightLogs();
  const [weight, setWeight] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const { userProfile, nutrition } = useAppStore();
  const training = useTrainingAnalytics(8);
  const maxVolume = useMemo(
    () =>
      Math.max(
        ...training.items.map((entry) => Number(entry.volume ?? 0)),
        1,
      ),
    [training.items],
  );

  const saveEntry = async () => {
    const numeric = Number(weight);
    if (!Number.isFinite(numeric) || numeric <= 0) return;
    await addEntry({ date, weight: numeric, unit: "lb" });
    setWeight("");
  };

  const latest = useMemo(() => {
    if (entries.length === 0) return null;
    return [...entries].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    )[0];
  }, [entries]);

  const stats = useMemo(() => {
    if (entries.length === 0) return null;
    const sorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const weights = sorted.map((entry) => entry.weight);
    const minWeight = Math.min(...weights);
    const maxWeight = Math.max(...weights);
    const startDate = sorted[0].date;
    const endDate = sorted[sorted.length - 1].date;
    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();
    const spanDays = Math.round((endTime - startTime) / 86400000);
    const midDate =
      spanDays >= 14
        ? new Date((startTime + endTime) / 2)
            .toISOString()
            .slice(0, 10)
        : null;
    return { minWeight, maxWeight, startDate, midDate, endDate };
  }, [entries]);

  const trend = useMemo(() => {
    if (entries.length < 2) return null;
    const sorted = [...entries].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
    const lastDate = new Date(sorted[sorted.length - 1].date).getTime();
    const windowStart = lastDate - 28 * 86400000;
    const windowEntries = sorted.filter(
      (entry) => new Date(entry.date).getTime() >= windowStart,
    );
    const activeEntries = windowEntries.length >= 2 ? windowEntries : sorted;
    const start = activeEntries[0];
    const end = activeEntries[activeEntries.length - 1];
    const startTime = new Date(start.date).getTime();
    const endTime = new Date(end.date).getTime();
    const days = Math.max((endTime - startTime) / 86400000, 1);
    const delta = end.weight - start.weight;
    const ratePerWeek = delta / (days / 7);
    return { ratePerWeek, days, delta };
  }, [entries]);

  const guidance = useMemo(() => {
    if (!trend) return null;
    const goal =
      userProfile.goal === "balance" ? "recomp" : userProfile.goal;
    const ranges = {
      cut: { min: -0.75, max: -0.25 },
      recomp: { min: -0.25, max: 0.25 },
      bulk: { min: 0.25, max: 0.75 },
    } as const;
    const { min, max } = ranges[goal as keyof typeof ranges];
    const rate = trend.ratePerWeek;
    let status: "on" | "slow" | "fast" = "on";
    if (rate < min) status = "slow";
    if (rate > max) status = "fast";
    const adjust = status === "on" ? 0 : status === "slow" ? 150 : -150;
    return {
      goal,
      min,
      max,
      rate,
      status,
      adjust,
    };
  }, [trend, userProfile.goal]);

  return (
    <AppShell experience="nutrition">
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6">
        <div className="rounded-[28px] bg-gradient-to-br from-emerald-100 via-emerald-50 to-white px-5 py-6 shadow-[0_18px_40px_rgba(16,185,129,0.2)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-500">
            Progress
          </p>
          <h1 className="text-2xl font-display font-semibold text-emerald-950">
            Weight trend
          </h1>
          <p className="mt-1 text-sm text-emerald-700/70">
            Log any time. The chart adapts to gaps.
          </p>
          <div className="mt-4 rounded-[22px] border border-emerald-100 bg-white/80 p-3 shadow-[0_12px_28px_rgba(16,185,129,0.12)]">
            <WeightChart entries={entries} />
            {stats && (
              <>
                <div className="mt-3 flex items-center justify-between text-xs text-emerald-700/80">
                  <span>Low {stats.minWeight} lb</span>
                  <span>High {stats.maxWeight} lb</span>
                </div>
                <div className="mt-2 grid grid-cols-3 text-[11px] text-emerald-500/70">
                  <span>{formatShortDate(stats.startDate)}</span>
                  <span className="text-center">
                    {stats.midDate ? formatShortDate(stats.midDate) : ""}
                  </span>
                  <span className="text-right">
                    {formatShortDate(stats.endDate)}
                  </span>
                </div>
              </>
            )}
          </div>
          {latest && (
            <div className="mt-4 flex items-center justify-between rounded-[20px] bg-white/80 px-4 py-3 text-sm text-emerald-800">
              <span>Latest</span>
              <span className="font-semibold">
                {latest.weight} lb • {formatShortDate(latest.date)}
              </span>
            </div>
          )}
        </div>

        {guidance && (
          <Card className="mt-6 rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
              Smart coach
            </p>
            <h2 className="mt-2 text-lg font-display font-semibold text-slate-900">
              {guidance.status === "on"
                ? "You are on track"
                : guidance.status === "slow"
                  ? "Progress is slower than expected"
                  : "Progress is faster than expected"}
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Current trend is{" "}
              <span className="font-semibold text-emerald-700">
                {guidance.rate.toFixed(2)} lb/week
              </span>{" "}
              for your {guidance.goal} goal. Ideal range is{" "}
              {guidance.min} to {guidance.max} lb/week.
            </p>
            {guidance.adjust !== 0 ? (
              <div className="mt-4 rounded-[18px] bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
                Consider{" "}
                {guidance.adjust > 0 ? "increasing" : "decreasing"} your
                calorie goal by about{" "}
                <span className="font-semibold">
                  {Math.abs(guidance.adjust)} cal
                </span>{" "}
                per day.
              </div>
            ) : (
              <div className="mt-4 rounded-[18px] bg-emerald-50/80 px-4 py-3 text-sm text-emerald-800">
                Keep your current goal steady and check in weekly.
              </div>
            )}
            {guidance.adjust !== 0 && (
              <Button
                type="button"
                className="mt-4 w-full rounded-full bg-aura-primary py-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90"
                onClick={() => {
                  const nextGoal = Math.max(
                    (nutrition.summary.goal ?? 0) + guidance.adjust,
                    1200,
                  );
                  nutrition.setGoal?.(nextGoal);
                  toast("Goal updated", {
                    description: `Daily goal set to ${nextGoal} cal.`,
                  });
                }}
              >
                Apply suggestion
              </Button>
            )}
          </Card>
        )}

        <Card className="mt-6 rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            Training trend
          </p>
          <h2 className="mt-2 text-lg font-display font-semibold text-slate-900">
            Weekly volume
          </h2>
          <div className="mt-4 space-y-3">
            {training.items.map((item) => {
              const volume = Number(item.volume ?? 0);
              const width = Math.round((volume / maxVolume) * 100);
              return (
                <div key={item.week_start} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{formatShortDate(item.week_start)}</span>
                    <span>{Math.round(volume)} vol • {item.total_sets} sets</span>
                  </div>
                  <div className="h-2 rounded-full bg-emerald-100">
                    <div
                      className="h-2 rounded-full bg-emerald-400"
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
            {!training.items.length && (
              <p className="text-sm text-slate-500">
                Log a workout session to see your trend.
              </p>
            )}
          </div>
        </Card>

        <Card className="mt-6 rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
                Add weight
              </p>
              <h2 className="text-lg font-display font-semibold text-slate-900">
                Log a check-in
              </h2>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Input
              type="number"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
              placeholder="Weight (lb)"
              className="h-11 rounded-full"
            />
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              className="h-11 rounded-full"
            />
          </div>
          <Button
            type="button"
            className="mt-4 w-full rounded-full bg-aura-primary py-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90"
            onClick={saveEntry}
          >
            Save check-in
          </Button>
        </Card>
      </div>
    </AppShell>
  );
};

export default Progress;
