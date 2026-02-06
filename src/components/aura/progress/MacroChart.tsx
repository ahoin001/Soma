import { useMemo, useRef, useState } from "react";
import { formatShortDate } from "@/lib/progressChartUtils";
import { buildSmoothPath } from "@/lib/progressChartUtils";
import type { MacroSeriesItem, TrendEntry } from "@/types/progress";

const VIEW_WIDTH = 320;
const VIEW_HEIGHT = 160;
const PADDING = 22;
const LEFT_LABEL_WIDTH = 36;

export const MacroChart = ({ series }: { series: MacroSeriesItem[] }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const {
    hasData,
    minValue,
    maxValue,
    xByIndex,
    buildPath,
  } = useMemo(() => {
    const flattened = series.flatMap((item) => item.entries);
    const values = flattened
      .map((entry) => entry.value)
      .filter((value): value is number => value !== null);
    const hasData = values.length >= 2;
    if (!hasData) {
      return {
        hasData: false,
        minValue: 0,
        maxValue: 0,
        xByIndex: [] as number[],
        buildPath: () => "",
      };
    }
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valueSpan = Math.max(maxVal - minVal, 1);
    const dates = series[0]?.entries.map((entry) => entry.date) ?? [];
    const times = dates.map((date) => new Date(date).getTime());
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeSpan = Math.max(maxTime - minTime, 1);
    const xByIndex = dates.map((date) => {
      const time = new Date(date).getTime();
      return (
        PADDING +
        ((time - minTime) / timeSpan) * (VIEW_WIDTH - PADDING * 2)
      );
    });
    const buildPathFn = (entries: TrendEntry[]) => {
      const pts = entries
        .filter((entry) => entry.value !== null)
        .map((entry) => {
          const time = new Date(entry.date).getTime();
          const x =
            PADDING +
            ((time - minTime) / timeSpan) * (VIEW_WIDTH - PADDING * 2);
          const y =
            PADDING +
            (1 - ((entry.value ?? 0) - minVal) / valueSpan) *
              (VIEW_HEIGHT - PADDING * 2);
          return { x, y };
        });
      return buildSmoothPath(pts);
    };
    return {
      hasData: true,
      minValue: minVal,
      maxValue: maxVal,
      xByIndex,
      buildPath: buildPathFn,
    };
  }, [series]);

  if (!hasData) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-emerald-700/70">
        Log meals to see macro trends.
      </div>
    );
  }

  const valueSpan = Math.max(maxValue - minValue, 1);
  const yAxisTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    yPercent: (PADDING + ratio * (VIEW_HEIGHT - PADDING * 2)) / VIEW_HEIGHT,
    value: Math.round(maxValue - ratio * valueSpan),
  }));

  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current || xByIndex.length === 0) return;
    const bounds = svgRef.current.getBoundingClientRect();
    const relativeX =
      ((event.clientX - bounds.left) / bounds.width) * VIEW_WIDTH;
    let closestIndex = 0;
    let closestDistance = Number.POSITIVE_INFINITY;
    xByIndex.forEach((x, index) => {
      const distance = Math.abs(x - relativeX);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestIndex = index;
      }
    });
    setActiveIndex(closestIndex);
  };

  const dates = series[0]?.entries.map((e) => e.date) ?? [];
  const activeDate =
    activeIndex !== null && activeIndex < dates.length
      ? dates[activeIndex]
      : null;
  const activeMacros =
    activeDate && series
      ? series.map((s) => {
          const entry = s.entries.find((e) => e.date === activeDate);
          return { label: s.label, color: s.color, value: entry?.value ?? null };
        })
      : [];

  return (
    <div className="relative flex">
      <div
        className="relative shrink-0 text-right text-[10px] font-medium tabular-nums text-emerald-600/70"
        style={{ width: LEFT_LABEL_WIDTH, height: 160 }}
      >
        {yAxisTicks.map((tick, i) => (
          <span
            key={i}
            className="absolute -translate-y-1/2"
            style={{ top: `${tick.yPercent * 100}%`, right: 4 }}
          >
            {tick.value}g
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
          {series.map((item) => (
            <path
              key={item.key}
              d={buildPath(item.entries)}
              fill="none"
              stroke={item.color}
              strokeWidth="3"
              strokeLinecap="round"
            />
          ))}
          {activeIndex !== null && xByIndex[activeIndex] !== undefined ? (
            <line
              x1={xByIndex[activeIndex]}
              x2={xByIndex[activeIndex]}
              y1={PADDING}
              y2={VIEW_HEIGHT - PADDING}
              stroke="rgba(16,185,129,0.35)"
              strokeDasharray="4 4"
            />
          ) : null}
        </svg>
        {activeDate && activeMacros.length > 0 ? (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-y-full rounded-[14px] bg-white px-3 py-2 text-xs text-emerald-800 shadow-[0_12px_28px_rgba(16,185,129,0.18)]"
            style={{
              left: `${((xByIndex[activeIndex!] ?? VIEW_WIDTH / 2) / VIEW_WIDTH) * 100}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <div className="text-[10px] font-semibold text-emerald-700">
              {formatShortDate(activeDate)}
            </div>
            <div className="mt-1 space-y-0.5">
              {activeMacros.map((m) => (
                <div
                  key={m.label}
                  className="flex items-center justify-between gap-3"
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: m.color }}
                    />
                    {m.label}
                  </span>
                  <span className="font-mono font-medium tabular-nums">
                    {m.value !== null ? `${Math.round(m.value)}g` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
