import { useEffect, useMemo, useRef, useState } from "react";
import { formatShortDate } from "@/lib/progressChartUtils";
import { buildSmoothPath } from "@/lib/progressChartUtils";
import type { WeightEntry } from "@/types/progress";

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 160;
const PADDING = 22;
const LEFT_LABEL_WIDTH = 36;

export const WeightChart = ({
  entries,
  caloriesByDate,
  onActiveDateChange,
}: {
  entries: WeightEntry[];
  caloriesByDate: Record<string, number | null | undefined>;
  onActiveDateChange?: (date: string | null) => void;
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const plotted = useMemo(() => {
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
        PADDING +
        ((time - minTime) / timeSpan) * (VIEW_WIDTH - PADDING * 2);
      const y =
        PADDING +
        (1 - (entry.weight - minWeight) / weightSpan) *
          (VIEW_HEIGHT - PADDING * 2);
      return { entry, x, y };
    });
  }, [entries]);

  const points = useMemo(
    () => plotted.map((point) => ({ x: point.x, y: point.y })),
    [plotted],
  );
  const path = buildSmoothPath(points);
  const activePoint = activeIndex !== null ? plotted[activeIndex] : null;
  const activeDate = activePoint?.entry.date ?? null;

  const minWeight = useMemo(
    () =>
      plotted.length > 0 ? Math.min(...plotted.map((p) => p.entry.weight)) : 0,
    [plotted],
  );
  const maxWeight = useMemo(
    () =>
      plotted.length > 0 ? Math.max(...plotted.map((p) => p.entry.weight)) : 0,
    [plotted],
  );
  const weightSpan = Math.max(maxWeight - minWeight, 1);
  const yAxisTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    yPercent: (PADDING + ratio * (VIEW_HEIGHT - PADDING * 2)) / VIEW_HEIGHT,
    value: Math.round((maxWeight - ratio * weightSpan) * 10) / 10,
  }));
  const activeCalories =
    activeDate && activeDate in caloriesByDate
      ? caloriesByDate[activeDate]
      : undefined;

  useEffect(() => {
    onActiveDateChange?.(activeDate);
  }, [activeDate, onActiveDateChange]);

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || plotted.length === 0) return;
    const bounds = svgRef.current.getBoundingClientRect();
    const relativeX =
      ((event.clientX - bounds.left) / bounds.width) * VIEW_WIDTH;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    plotted.forEach((point, index) => {
      const distance = Math.abs(point.x - relativeX);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    setActiveIndex(closestIndex);
  };

  return (
    <div className="relative flex">
      {plotted.length > 0 && (
        <div
          className="relative shrink-0 text-right text-[10px] font-medium tabular-nums text-primary/70"
          style={{ width: LEFT_LABEL_WIDTH, height: 160 }}
        >
          {yAxisTicks.map((tick, i) => (
            <span
              key={i}
              className="absolute -translate-y-1/2"
              style={{ top: `${tick.yPercent * 100}%`, right: 4 }}
            >
              {tick.value} lb
            </span>
          ))}
        </div>
      )}
      <div className="relative min-w-0 flex-1">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className="h-40 w-full touch-none"
          preserveAspectRatio="none"
          onPointerMove={handlePointerMove}
          onPointerDown={handlePointerMove}
          onPointerLeave={() => setActiveIndex(null)}
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
            width={VIEW_WIDTH}
            height={VIEW_HEIGHT}
            rx="20"
            fill="transparent"
          />
          <g stroke="rgba(16,185,129,0.12)" strokeWidth="1">
            {[0.25, 0.5, 0.75].map((ratio) => {
              const y = PADDING + ratio * (VIEW_HEIGHT - PADDING * 2);
              return (
                <line
                  key={ratio}
                  x1={PADDING}
                  x2={VIEW_WIDTH - PADDING}
                  y1={y}
                  y2={y}
                />
              );
            })}
          </g>
          {path && (
            <>
              <path
                d={`${path} L ${VIEW_WIDTH - PADDING} ${VIEW_HEIGHT - PADDING} L ${PADDING} ${
                  VIEW_HEIGHT - PADDING
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
          {activePoint ? (
            <>
              <line
                x1={activePoint.x}
                x2={activePoint.x}
                y1={PADDING}
                y2={VIEW_HEIGHT - PADDING}
                stroke="rgba(16,185,129,0.35)"
                strokeDasharray="4 4"
              />
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="5"
                fill="#10b981"
                stroke="#ffffff"
                strokeWidth="2"
              />
            </>
          ) : null}
        </svg>
        {activePoint ? (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-[14px] bg-card px-3 py-2 text-xs text-foreground shadow-[0_12px_28px_rgba(16,185,129,0.18)]"
            style={{
              left: `${(activePoint.x / VIEW_WIDTH) * 100}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="text-[11px] font-semibold text-secondary-foreground">
              {activePoint.entry.weight} lb
            </div>
            <div className="text-[10px] text-muted-foreground">
              {formatShortDate(activePoint.entry.date)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              Calories{" "}
              {activeCalories === undefined
                ? "…"
                : activeCalories === null || activeCalories === 0
                  ? "N/A"
                  : `${Math.round(activeCalories)} cal`}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
