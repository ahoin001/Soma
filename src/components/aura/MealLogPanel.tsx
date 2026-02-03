import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Meal } from "@/data/mock";
import type { LogItem, LogSection } from "@/types/log";
import { useAppStore } from "@/state/AppStore";
import { AnimatedNumber } from "./AnimatedNumber";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { forwardRef, useMemo, useState } from "react";

type MealLogPanelProps = {
  meals: Meal[];
  logSections: LogSection[];
  completion: number;
  onAddMeal: (meal: Meal) => void;
  onEditItem?: (item: LogItem) => void;
  onRemoveItem?: (item: LogItem) => void;
};

export const MealLogPanel = ({
  meals,
  logSections,
  completion,
  onAddMeal,
  onEditItem,
}: MealLogPanelProps) => {
  const [openMeals, setOpenMeals] = useState<Record<string, boolean>>({});
  const logMap = useMemo(() => {
    const map = new Map<string, LogSection>();
    logSections.forEach((section) => {
      map.set(section.meal, section);
    });
    return map;
  }, [logSections]);

  return (
    <Card className="mt-6 rounded-[28px] border border-black/5 bg-white px-5 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            Meals & log
          </p>
          <h3 className="text-lg font-display font-semibold text-slate-900">
            Add and review
          </h3>
        </div>
        <CompletionRing value={completion} label={`${completion}%`} />
      </div>

      <div className="mt-4 space-y-3">
        {meals.map((meal) => {
          const section = logMap.get(meal.label);
          const itemCount = section?.items.length ?? 0;
          const kcalTotal =
            section?.items.reduce((sum, item) => {
              const quantity = item.quantity ?? 1;
              return sum + item.kcal * quantity;
            }, 0) ?? 0;
          const isOpen = openMeals[meal.id] ?? itemCount > 0;

          return (
            <Collapsible
              key={meal.id}
              open={isOpen}
              onOpenChange={(open) =>
                setOpenMeals((prev) => ({ ...prev, [meal.id]: open }))
              }
              className="group relative overflow-hidden rounded-[22px] border border-black/5 bg-emerald-50/60 p-3 transition-colors transition-shadow data-[state=open]:border-emerald-100 data-[state=open]:bg-emerald-50/80 data-[state=open]:shadow-[0_14px_30px_rgba(16,185,129,0.16)]"
            >
              <div className="pointer-events-none absolute inset-x-4 top-2 h-px bg-emerald-200/70 opacity-0 transition-opacity group-data-[state=open]:opacity-100" />
              <div className="flex items-center gap-3">
                <CollapsibleTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    className="group h-auto flex-1 justify-between gap-3 rounded-[18px] px-3 py-3 text-left hover:bg-white/70"
                    aria-label={`Toggle ${meal.label} details`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-lg shadow-[0_10px_25px_rgba(15,23,42,0.1)]">
                        {meal.emoji}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">
                          {meal.label}
                        </p>
                        <p className="text-xs text-slate-500">
                          {itemCount > 0 ? (
                            <>
                              <AnimatedNumber value={itemCount} /> items •{" "}
                              <AnimatedNumber value={kcalTotal} /> cal
                            </>
                          ) : (
                            "No items logged yet"
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="h-4 w-4" />
                  </Button>
                </CollapsibleTrigger>
                <Button
                  type="button"
                  onClick={() => onAddMeal(meal)}
                  aria-label={`Add to ${meal.label}`}
                  size="icon"
                  className="h-11 w-11 shrink-0 rounded-full bg-emerald-100 text-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.18)] hover:bg-emerald-200"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <CollapsibleContent forceMount asChild>
                <motion.div
                  className="mt-3 overflow-hidden"
                  initial={false}
                  animate={{
                    height: isOpen ? "auto" : 0,
                    opacity: isOpen ? 1 : 0,
                  }}
                  transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                >
                  <div className="space-y-2 pb-1">
                    <MealSummary items={section?.items ?? []} />
                    <LogItems
                      meal={meal.label}
                      items={section?.items ?? []}
                      onEditItem={onEditItem}
                    />
                    {!itemCount && (
                      <div className="rounded-[16px] border border-dashed border-emerald-200 bg-white/80 px-4 py-4 text-xs text-slate-500">
                        No items logged yet. Tap add to start tracking.
                      </div>
                    )}
                  </div>
                </motion.div>
              </CollapsibleContent>
            </Collapsible>
          );
        })}
      </div>
    </Card>
  );
};

const LogItems = ({
  meal,
  items,
  onEditItem,
}: {
  meal: string;
  items: LogItem[];
  onEditItem?: (item: LogItem) => void;
}) => (
  <AnimatePresence initial={false} mode="popLayout">
    {items.map((item, index) => {
      const key = item.id ?? `${meal}-${item.name}-${index}`;
      return (
        <LogRow
          key={key}
          item={item}
          onEdit={() => onEditItem?.(item)}
        />
      );
    })}
  </AnimatePresence>
);

const LogRow = forwardRef<
  HTMLButtonElement,
  { item: LogItem; onEdit: () => void }
>(({ item, onEdit }, ref) => {
  const { showFoodImages } = useAppStore();
  const quantityValue = Number(item.quantity ?? 1);
  const normalizedQuantity = Number.isFinite(quantityValue) ? quantityValue : 1;
  const showQuantity = Math.abs(normalizedQuantity - 1) > 1e-6;
  const quantityLabel = normalizedQuantity.toFixed(1);
  const totalKcal = Math.round(item.kcal * normalizedQuantity);

  return (
    <motion.button
      ref={ref}
      initial={{ opacity: 0, y: 12, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        y: -6,
        x: 12,
        scale: 0.94,
        rotate: -3,
        height: 0,
        marginTop: 0,
      }}
      transition={{ type: "spring", stiffness: 260, damping: 20 }}
      type="button"
      className="relative w-full overflow-hidden rounded-[16px] bg-white px-3 py-3 text-sm text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)] cursor-pointer"
      onClick={onEdit}
    >
      <motion.span
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-2xl"
        initial={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0, scale: 0.6 }}
        exit={{
          opacity: [0, 1, 0],
          scale: [0.6, 1.2, 0.9],
          y: [0, -8, -18],
          rotate: [0, -6, 6],
        }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        aria-hidden
      >
        💨
      </motion.span>
      <motion.span
        className="pointer-events-none absolute -right-4 -top-4 h-10 w-10 rounded-full bg-emerald-100/70 blur-xl"
        animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.2, 1] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {showFoodImages && item.imageUrl ? (
            <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-emerald-50">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-full w-full object-cover object-center"
                loading="lazy"
                decoding="async"
              />
            </div>
          ) : null}
          <span className="font-medium">{item.name}</span>
          {showQuantity && (
            <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
              {quantityLabel}x
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-600">{totalKcal} cal</span>
        </div>
      </div>
    </motion.button>
  );
});
LogRow.displayName = "LogRow";

const MealSummary = ({ items }: { items: LogItem[] }) => {
  const totals = items.reduce(
    (acc, item) => {
      const quantity = item.quantity ?? 1;
      return {
        kcal: acc.kcal + item.kcal * quantity,
        carbs: acc.carbs + item.macros.carbs * quantity,
        protein: acc.protein + item.macros.protein * quantity,
        fat: acc.fat + item.macros.fat * quantity,
      };
    },
    { kcal: 0, carbs: 0, protein: 0, fat: 0 },
  );

  return (
    <div className="rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 px-4 py-4 shadow-[0_14px_30px_rgba(16,185,129,0.12)]">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
        <span>Meal summary</span>
        <span>
          <AnimatedNumber value={totals.kcal} /> cal
        </span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-emerald-700/80">
        <div className="rounded-[16px] bg-white/90 px-3 py-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400">
            Carbs
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-800">
            <AnimatedNumber value={totals.carbs} />g
          </p>
        </div>
        <div className="rounded-[16px] bg-white/90 px-3 py-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400">
            Protein
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-800">
            <AnimatedNumber value={totals.protein} />g
          </p>
        </div>
        <div className="rounded-[16px] bg-white/90 px-3 py-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400">
            Fat
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-800">
            <AnimatedNumber value={totals.fat} />g
          </p>
        </div>
      </div>
    </div>
  );
};

const CompletionRing = ({ value, label }: { value: number; label: string }) => {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(value, 100) / 100) * circumference;

  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90">
        <circle
          cx="20"
          cy="20"
          r={radius}
          stroke="rgba(16,185,129,0.2)"
          strokeWidth="4"
          fill="none"
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          stroke="rgba(16,185,129,0.8)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-[11px] font-semibold text-emerald-700">
        {label}
      </div>
    </div>
  );
};
