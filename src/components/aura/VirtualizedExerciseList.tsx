import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import type { Exercise } from "@/types/fitness";
import { ExerciseImage } from "@/components/aura/ExerciseImage";

type VirtualizedExerciseListProps = {
  items: Exercise[];
  className?: string;
  height?: number;
  itemHeight?: number;
  selectedId?: number | null;
  selectedIds?: number[];
  selectedOrderById?: Record<number, number>;
  onSelect?: (exercise: Exercise) => void;
};

export const VirtualizedExerciseList = ({
  items,
  className,
  height = 320,
  itemHeight = 84,
  selectedId,
  selectedIds,
  selectedOrderById,
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
      className={cn("relative overflow-auto rounded-2xl border border-border/70", className)}
      style={{ height }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
    >
      <div className="relative" style={{ height: totalHeight }}>
        {visibleItems.map((item, index) => {
          const offsetIndex = startIndex + index;
          const isSelected =
            selectedId === item.id || Boolean(selectedIds?.includes(item.id));
          const primaryMuscle = item.muscles[0] ?? item.category;
          const secondaryMuscle = item.muscles[1] ?? null;
          const equipment = item.equipment[0] ?? "Bodyweight";
          const selectedOrder = selectedOrderById?.[item.id];
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
                  "flex w-full items-center gap-3 rounded-2xl border px-3 py-2 text-left text-foreground transition-transform",
                  "active:scale-[0.98]",
                  "hover:-translate-y-0.5 hover:border-border",
                  isSelected
                    ? "border-primary/60 bg-primary/12"
                    : "border-border/70 bg-card/55",
                )}
              >
                <ExerciseImage
                  src={item.imageUrl}
                  alt={`${item.name} preview`}
                  className="h-12 w-12 rounded-2xl border border-border/70 object-cover object-center"
                  containerClassName="h-12 w-12 rounded-2xl"
                  fallback={<span>{primaryMuscle.slice(0, 3)}</span>}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{item.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span className="rounded-full border border-border/70 px-2 py-0.5">
                      {primaryMuscle}
                    </span>
                    {secondaryMuscle ? (
                      <span className="rounded-full border border-border/70 px-2 py-0.5">
                        {secondaryMuscle}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-border/70 px-2 py-0.5">
                      {equipment}
                    </span>
                  </div>
                </div>
                {selectedOrder ? (
                  <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-semibold text-primary-foreground">
                    {selectedOrder}
                  </span>
                ) : null}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
