import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Meal } from "@/data/mock";
import type { LogItem, LogSection } from "@/types/log";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

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
  onRemoveItem,
}: MealLogPanelProps) => {
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
            section?.items.reduce((sum, item) => sum + item.kcal, 0) ?? 0;

          return (
            <Collapsible
              key={meal.id}
              defaultOpen={itemCount > 0}
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
                          {itemCount > 0
                            ? `${itemCount} items • ${kcalTotal} kcal`
                            : "No items logged yet"}
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

              <CollapsibleContent className="mt-3 space-y-2">
                {section ? (
                  <>
                    <MealSummary items={section.items} />
                    <LogItems
                      meal={section.meal}
                      items={section.items}
                      onEditItem={onEditItem}
                      onRemoveItem={onRemoveItem}
                    />
                  </>
                ) : (
                  <div className="rounded-[16px] border border-dashed border-emerald-200 bg-white/80 px-4 py-4 text-xs text-slate-500">
                    No items logged yet. Tap add to start tracking.
                  </div>
                )}
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
  onRemoveItem,
}: {
  meal: string;
  items: LogItem[];
  onEditItem?: (item: LogItem) => void;
  onRemoveItem?: (item: LogItem) => void;
}) => {
  const [removedKeys, setRemovedKeys] = useState<string[]>([]);

  const visibleItems = useMemo(
    () =>
      items.filter(
        (item) => !removedKeys.includes(`${meal}-${item.name}`),
      ),
    [items, meal, removedKeys],
  );

  const handleRemove = (item: LogItem) => {
    const key = `${meal}-${item.name}`;
    setRemovedKeys((prev) => [...prev, key]);
    if (navigator.vibrate) {
      navigator.vibrate(20);
    }
    onRemoveItem?.(item);
  };

  return (
    <AnimatePresence initial={false}>
      {visibleItems.map((item) => {
        const key = `${meal}-${item.name}`;
        return (
          <LogRow
            key={key}
            item={item}
            onEdit={() => onEditItem?.(item)}
            onRemove={() => handleRemove(item)}
          />
        );
      })}
    </AnimatePresence>
  );
};

const LogRow = ({
  item,
  onEdit,
  onRemove,
}: {
  item: LogItem;
  onEdit: () => void;
  onRemove: () => void;
}) => {
  const x = useMotionValue(0);
  const removeOpacity = useTransform(x, [-120, -40, 0], [1, 0.35, 0]);
  const editOpacity = useTransform(x, [0, 40, 120], [0, 0.35, 1]);
  const dragged = useRef(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, height: 0, marginTop: 0 }}
      className="relative overflow-hidden rounded-[16px]"
    >
      <motion.div
        style={{ opacity: editOpacity }}
        className="absolute inset-0 flex items-center justify-start bg-emerald-500/90 pl-4 text-white"
      >
        <Pencil className="h-4 w-4" />
      </motion.div>
      <motion.div
        style={{ opacity: removeOpacity }}
        className="absolute inset-0 flex items-center justify-end bg-rose-500/90 pr-4 text-white"
      >
        <Trash2 className="h-4 w-4" />
      </motion.div>
      <motion.div
        drag="x"
        dragConstraints={{ left: -120, right: 120 }}
        dragElastic={0.15}
        whileDrag={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
        onDragStart={() => {
          dragged.current = true;
        }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -80) {
            onRemove();
          }
          if (info.offset.x > 80) {
            onEdit();
          }
        }}
        style={{ touchAction: "pan-y", x }}
        className="flex w-full items-center justify-between bg-white px-3 py-3 text-sm text-slate-700 shadow-[0_8px_20px_rgba(15,23,42,0.08)] cursor-pointer"
        onClick={onEdit}
        role="button"
        tabIndex={0}
        onPointerDown={() => {
          dragged.current = false;
        }}
        onPointerUp={() => {
          if (!dragged.current) {
            onEdit();
          }
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-base">{item.emoji}</span>
          <span className="font-medium">{item.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-emerald-600">{item.kcal} kcal</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

const MealSummary = ({ items }: { items: LogItem[] }) => {
  const totals = items.reduce(
    (acc, item) => ({
      kcal: acc.kcal + item.kcal,
      carbs: acc.carbs + item.macros.carbs,
      protein: acc.protein + item.macros.protein,
      fat: acc.fat + item.macros.fat,
    }),
    { kcal: 0, carbs: 0, protein: 0, fat: 0 },
  );

  return (
    <div className="rounded-[24px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 px-4 py-4 shadow-[0_14px_30px_rgba(16,185,129,0.12)]">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
        <span>Meal summary</span>
        <span>{totals.kcal} kcal</span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-emerald-700/80">
        <div className="rounded-[16px] bg-white/90 px-3 py-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400">
            Carbs
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-800">
            {totals.carbs}g
          </p>
        </div>
        <div className="rounded-[16px] bg-white/90 px-3 py-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400">
            Protein
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-800">
            {totals.protein}g
          </p>
        </div>
        <div className="rounded-[16px] bg-white/90 px-3 py-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400">
            Fat
          </p>
          <p className="mt-1 text-sm font-semibold text-emerald-800">
            {totals.fat}g
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
