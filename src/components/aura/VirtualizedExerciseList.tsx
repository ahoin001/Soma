import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types/fitness";

type VirtualizedExerciseListProps = {
  items: Exercise[];
  className?: string;
  height?: number;
  itemHeight?: number;
  selectedId?: number | null;
  onSelect?: (exercise: Exercise) => void;
};

export const VirtualizedExerciseList = ({
  items,
  className,
  height = 320,
  itemHeight = 84,
  selectedId,
  onSelect,
}: VirtualizedExerciseListProps) => {
  const [scrollTop, setScrollTop] = useState(0);
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(Math.floor(scrollTop / itemHeight) - 4, 0);
  const endIndex = Math.min(
    Math.ceil((scrollTop + height) / itemHeight) + 4,
    items.length,
  );

  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex),
    [items, startIndex, endIndex],
  );

  return (
    <div
      className={cn("relative overflow-auto rounded-2xl border border-white/10", className)}
      style={{ height }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div className="relative" style={{ height: totalHeight }}>
        {visibleItems.map((item, index) => {
          const offsetIndex = startIndex + index;
          const isSelected = selectedId === item.id;
          const primaryMuscle = item.muscles[0] ?? item.category;
          const secondaryMuscle = item.muscles[1] ?? null;
          const equipment = item.equipment[0] ?? "Bodyweight";
          return (
            <div
              key={item.id}
              className="absolute left-0 right-0 px-4 py-3"
              style={{ top: offsetIndex * itemHeight, height: itemHeight }}
            >
              <button
                type="button"
                onClick={() => onSelect?.(item)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-white transition-transform",
                  "active:scale-[0.98]",
                  "hover:-translate-y-0.5 hover:border-white/30",
                  isSelected
                    ? "border-emerald-400/60 bg-emerald-400/10"
                    : "border-white/10 bg-white/5",
                )}
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={`${item.name} preview`}
                    className="h-12 w-12 rounded-2xl border border-white/10 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-400/20 via-slate-950 to-slate-900 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                    {primaryMuscle.slice(0, 3)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-white/60">
                    <span className="rounded-full border border-white/10 px-2 py-0.5">
                      {primaryMuscle}
                    </span>
                    {secondaryMuscle ? (
                      <span className="rounded-full border border-white/10 px-2 py-0.5">
                        {secondaryMuscle}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-white/10 px-2 py-0.5">
                      {equipment}
                    </span>
                  </div>
                </div>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
