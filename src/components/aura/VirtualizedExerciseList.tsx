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
  itemHeight = 64,
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
                  "flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2 text-left text-white transition",
                  isSelected
                    ? "border-emerald-400/60 bg-emerald-400/10"
                    : "border-white/10 bg-white/5 hover:border-white/30",
                )}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <p className="truncate text-xs text-white/60">
                    {item.category}
                    {item.muscles.length ? ` · ${item.muscles[0]}` : ""}
                  </p>
                </div>
                <span className="text-xs uppercase tracking-[0.2em] text-white/40">
                  {item.equipment[0] ?? "Bodyweight"}
                </span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
