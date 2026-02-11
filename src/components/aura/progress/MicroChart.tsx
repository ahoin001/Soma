import { useMemo, useRef, useState } from "react";
import {
  formatShortDate,
  buildTrendPath,
} from "@/lib/progressChartUtils";
import type { TrendEntry } from "@/types/progress";

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 160;
const PADDING = 22;
const LEFT_LABEL_WIDTH = 36;

type MicroChartProps = {
  entries: TrendEntry[];
  label: string;
  unit: string;
};

export const MicroChart = ({ entries, label, unit }: MicroChartProps) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { path, plotted, hasData, minValue, maxValue } = useMemo(() => {
    const result = buildTrendPath(entries, VIEW_WIDTH, VIEW_HEIGHT, PADDING);
    if (!result.hasData)
      return { ...result, plotted: [], minValue: 0, maxValue: 0 };
    const usable = entries.filter((e) => e.value !== null);
    const values = usable.map((e) => e.value ?? 0);
    return {
      path: result.path,
      plotted: result.points.map((p, i) => ({
        entry: usable[i],
        x: p.x,
        y: p.y,
      })),
      hasData: true,
      minValue: Math.min(...values),
      maxValue: Math.max(...values),
    };
  }, [entries]);

  if (!hasData) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-primary/70">
        Log foods with {label} to see trends.
      </div>
    );
  }

  const valueSpan = Math.max(maxValue - minValue, 1);
  const yAxisTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    yPercent: (PADDING + ratio * (VIEW_HEIGHT - PADDING * 2)) / VIEW_HEIGHT,
    value: Math.round(maxValue - ratio * valueSpan),
  }));

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

  const activePoint = activeIndex !== null ? plotted[activeIndex] : null;

  return (
    <div className="relative flex">
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
            {tick.value} {unit}
          </span>
        ))}
      </div>
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
            <linearGradient id="microLine" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.35" />
              <stop offset="55%" stopColor="#10b981" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.35" />
            </linearGradient>
            <linearGradient id="microFill" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g stroke="rgba(16,185,129,0.18)" strokeWidth="1">
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
          <path
            d={`${path} L ${VIEW_WIDTH - PADDING} ${VIEW_HEIGHT - PADDING} L ${PADDING} ${
              VIEW_HEIGHT - PADDING
            } Z`}
            fill="url(#microFill)"
          />
          <path
            d={path}
            fill="none"
            stroke="url(#microLine)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          {plotted.map((point, index) => (
            <circle
              key={`${point.x}-${point.y}-${index}`}
              cx={point.x}
              cy={point.y}
              r="3"
              fill="#10b981"
              fillOpacity="0.9"
            />
          ))}
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
              {Math.round(activePoint.entry.value ?? 0)} {unit}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {formatShortDate(activePoint.entry.date)}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
