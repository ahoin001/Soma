import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import type { Meal } from "@/data/mock";
import type { LogItem, LogSection } from "@/types/log";
import { useUserSettings } from "@/state";
import { AnimatedNumber } from "./AnimatedNumber";
import { AnimatePresence, motion } from "framer-motion";
import { Plus } from "lucide-react";
import { forwardRef, useMemo, useState } from "react";
import { ListEmptyState } from "@/components/ui/empty-state";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FoodImage } from "./FoodImage";
import { MealIcon } from "./MealIcon";
import { triggerActionHaptic, triggerToggleHaptic } from "@/lib/haptics";

export type MealLogPanelProps = {
  meals: Meal[];
  logSections: LogSection[];
  completion: number;
  onAddMeal: (meal: Meal) => void;
  onEditItem?: (item: LogItem) => void;
  onRemoveItem?: (item: LogItem) => void;
  animateTrigger?: number;
  pulseMealId?: string;
  /** When this changes, the completion ring plays a brief pulse (e.g. after logging). */
  pulseTrigger?: number;
};

export const MealLogPanel = ({
  meals,
  logSections,
  completion,
  onAddMeal,
  onEditItem,
  animateTrigger,
  pulseMealId,
  pulseTrigger,
}: MealLogPanelProps) => {
  const [openMeals, setOpenMeals] = useState<Record<string, boolean>>({});

  const { logMap, unmatchedSections, mealStats } = useMemo(() => {
    const map = new Map<string, LogSection>();
    logSections.forEach((section) => map.set(section.meal, section));
    const matchedLabels = new Set(meals.map((m) => m.label));
    const unmatched = logSections.filter((s) => !matchedLabels.has(s.meal));
    const stats: Record<string, { itemCount: number; kcalTotal: number }> = {};
    meals.forEach((meal) => {
      const section = map.get(meal.label);
      const itemCount = section?.items.length ?? 0;
      const kcalTotal =
        section?.items.reduce((sum, item) => {
          const q = item.quantity ?? 1;
          return sum + item.kcal * q;
        }, 0) ?? 0;
      stats[meal.id] = { itemCount, kcalTotal };
    });
    return { logMap: map, unmatchedSections: unmatched, mealStats: stats };
  }, [logSections, meals]);

  return (
    <Card className="card-default relative mt-4 overflow-hidden rounded-[28px] px-5 py-4 backdrop-blur-sm">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,_hsl(var(--primary)/0.14),_transparent_45%),radial-gradient(circle_at_85%_0%,_hsl(var(--accent)/0.12),_transparent_50%),radial-gradient(circle_at_70%_85%,_hsl(var(--secondary)/0.18),_transparent_55%)] opacity-70" />
      <div className="flex items-center justify-between">
        <div>
          <p className="section-title">Meals & log</p>
          <h2 className="text-lg font-display font-semibold text-foreground">
            Add and review
          </h2>
        </div>
        <CompletionRing value={completion} label={`${completion}%`} pulseTrigger={pulseTrigger} />
      </div>

      <div className="mt-4 space-y-3">
        {meals.map((meal) => {
          const { itemCount, kcalTotal } = mealStats[meal.id] ?? {
            itemCount: 0,
            kcalTotal: 0,
          };
          const section = logMap.get(meal.label);
          const isOpen = openMeals[meal.id] ?? itemCount > 0;
          const shouldGlow = Boolean(animateTrigger) && pulseMealId === meal.id;

          return (
            <motion.div
              key={`meal-wrap-${meal.id}`}
              animate={
                shouldGlow
                  ? {
                      boxShadow: [
                        "0 0 0 rgba(16,185,129,0)",
                        "0 18px 36px rgba(16,185,129,0.25)",
                        "0 0 0 rgba(16,185,129,0)",
                      ],
                    }
                  : undefined
              }
              transition={{ duration: 0.9, ease: "easeOut" }}
              className="rounded-[22px]"
            >
            <Collapsible
              key={meal.id}
              open={isOpen}
              onOpenChange={(open) =>
                setOpenMeals((prev) => ({ ...prev, [meal.id]: open }))
              }
              className="group relative overflow-hidden rounded-[22px] border border-border/60 bg-card/70 transition-colors transition-shadow data-[state=open]:shadow-[0_10px_26px_rgba(15,23,42,0.12)]"
            >
              <div className="bg-secondary/45 p-3 transition-colors group-data-[state=open]:bg-secondary/60">
                <div className="flex items-center gap-3">
                  <CollapsibleTrigger asChild>
                    <Button
                      type="button"
                      variant="ghost"
                      className="group h-auto flex-1 justify-between gap-3 rounded-[18px] px-3 py-3 text-left transition-colors hover:text-foreground/85 active:scale-[0.99] active:text-foreground motion-reduce:transform-none"
                      aria-label={`Toggle ${meal.label} details`}
                      onClick={() => triggerToggleHaptic()}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-card text-lg shadow-[0_8px_18px_rgba(15,23,42,0.08)] text-primary">
                          <MealIcon mealId={meal.id} size={22} />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">
                            {meal.label}
                          </p>
                          <motion.p
                            className="text-xs text-muted-foreground"
                            animate={
                              shouldGlow ? { scale: [1, 1.04, 1] } : undefined
                            }
                            transition={{ duration: 0.4, ease: "easeOut" }}
                          >
                            {itemCount > 0 ? (
                              <>
                                <AnimatedNumber
                                  value={itemCount}
                                  animateTrigger={animateTrigger}
                                />{" "}
                                items •{" "}
                                <AnimatedNumber
                                  value={kcalTotal}
                                  animateTrigger={animateTrigger}
                                />{" "}
                                cal
                              </>
                            ) : (
                              "No items logged yet"
                            )}
                          </motion.p>
                        </div>
                      </div>
                      <div className="h-4 w-4" />
                    </Button>
                  </CollapsibleTrigger>
                  <Button
                    type="button"
                    onClick={() => {
                      triggerActionHaptic();
                      onAddMeal(meal);
                    }}
                    aria-label={`Add to ${meal.label}`}
                    size="icon"
                  className="h-11 w-11 shrink-0 rounded-full bg-primary/15 text-primary shadow-[0_6px_16px_rgba(15,23,42,0.14)] transition duration-150 hover:bg-primary/25 active:scale-95 motion-reduce:transform-none"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
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
                  <div className="space-y-2 px-3 pb-3 pt-2">
                    <MealSummary items={section?.items ?? []} pulse={shouldGlow} />
                    <LogItems
                      key={`log-items-${animateTrigger ?? 0}-${meal.id}`}
                      meal={meal.label}
                      items={section?.items ?? []}
                      onEditItem={onEditItem}
                      animateOnMount={Boolean(animateTrigger)}
                    />
                    {!itemCount && (
                      <ListEmptyState
                        itemName="items"
                        title={`Nothing in ${meal.label} yet`}
                        description="Tap + to log your first item."
                        onAdd={() => onAddMeal(meal)}
                        className="rounded-[16px] border border-dashed border-primary/35 bg-secondary/50 py-5"
                      />
                    )}
                  </div>
                </motion.div>
              </CollapsibleContent>
            </Collapsible>
            </motion.div>
          );
        })}
        {unmatchedSections.map((section) => {
          const itemCount = section.items.length;
          const kcalTotal = section.items.reduce(
            (sum, item) => sum + (item.quantity ?? 1) * item.kcal,
            0,
          );
          const fakeMealId = `other-${section.meal}`;
          const isOpen = openMeals[fakeMealId] ?? itemCount > 0;
          return (
            <motion.div key={`meal-wrap-${fakeMealId}`} className="rounded-[22px]">
              <Collapsible
                open={isOpen}
                onOpenChange={(open) =>
                  setOpenMeals((prev) => ({ ...prev, [fakeMealId]: open }))
                }
                className="group relative overflow-hidden rounded-[22px] border border-border/60 bg-card/70 transition-colors data-[state=open]:border-primary/30 data-[state=open]:shadow-[0_10px_26px_rgba(15,23,42,0.12)]"
              >
                <div className="bg-secondary/45 p-3">
                  <div className="flex items-center gap-3">
                    <CollapsibleTrigger asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="group h-auto flex-1 justify-between gap-3 rounded-[18px] px-3 py-3 text-left transition duration-150 active:scale-[0.99] motion-reduce:transform-none"
                        aria-label={`Toggle ${section.meal} details`}
                        onClick={() => triggerToggleHaptic()}
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-full bg-card text-lg shadow-[0_8px_18px_rgba(15,23,42,0.08)] flex items-center justify-center">
                            🍽️
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              {section.meal}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              <AnimatedNumber value={itemCount} /> items •{" "}
                              <AnimatedNumber value={kcalTotal} /> cal
                            </p>
                          </div>
                        </div>
                      </Button>
                    </CollapsibleTrigger>
                    <div className="h-11 w-11 shrink-0" />
                  </div>
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
                    <div className="space-y-2 px-3 pb-3 pt-2">
                      <MealSummary items={section.items} pulse={false} />
                      <LogItems
                        key={`log-items-other-${section.meal}`}
                        meal={section.meal}
                        items={section.items}
                        onEditItem={onEditItem}
                        animateOnMount={false}
                      />
                    </div>
                  </motion.div>
                </CollapsibleContent>
              </Collapsible>
            </motion.div>
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
  animateOnMount,
}: {
  meal: string;
  items: LogItem[];
  onEditItem?: (item: LogItem) => void;
  animateOnMount?: boolean;
}) => (
  <AnimatePresence initial={animateOnMount} mode="popLayout">
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
  const { showFoodImages } = useUserSettings();
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
      className="relative w-full overflow-hidden rounded-[16px] border border-border/70 bg-card/80 px-3 py-3 text-sm text-foreground shadow-[0_6px_14px_rgba(15,23,42,0.06)] backdrop-blur-sm transition-shadow hover:shadow-[0_10px_20px_rgba(15,23,42,0.1)] cursor-pointer"
      onClick={() => {
        triggerActionHaptic();
        onEdit();
      }}
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
        className="pointer-events-none absolute -right-4 -top-4 h-10 w-10 rounded-full bg-primary/20 blur-xl"
        animate={{ opacity: [0.2, 0.5, 0.2], scale: [1, 1.2, 1] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          {showFoodImages && item.imageUrl ? (
            <div className="h-8 w-8 shrink-0 overflow-hidden rounded-full bg-secondary">
              <FoodImage
                src={item.imageUrl}
                alt={item.name}
                className="h-full w-full object-contain object-center"
                loading="lazy"
                decoding="async"
                fallback={
                  <div className="flex h-full w-full items-center justify-center text-base">
                    {item.emoji ?? "🍽️"}
                  </div>
                }
              />
            </div>
          ) : null}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="min-w-0 truncate font-medium" title={item.name}>
                {item.name}
              </span>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-[min(20rem,85vw)]">
              <p className="break-words text-sm">{item.name}</p>
            </TooltipContent>
          </Tooltip>
          {showQuantity && (
            <span className="shrink-0 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-semibold text-secondary-foreground">
              {quantityLabel}x
            </span>
          )}
        </div>
        <span className="shrink-0 text-xs text-primary/90">{totalKcal} cal</span>
      </div>
    </motion.button>
  );
});
LogRow.displayName = "LogRow";

const MealSummary = ({ items, pulse }: { items: LogItem[]; pulse?: boolean }) => {
  const totals = items.reduce(
    (acc, item) => {
      const quantity = Number(item.quantity ?? 1) || 1;
      const macros = item.macros ?? { carbs: 0, protein: 0, fat: 0 };
      const kcal = Number(item.kcal ?? 0) || 0;
      const carbs = Number(macros.carbs ?? 0) || 0;
      const protein = Number(macros.protein ?? 0) || 0;
      const fat = Number(macros.fat ?? 0) || 0;
      return {
        kcal: acc.kcal + kcal * quantity,
        carbs: acc.carbs + carbs * quantity,
        protein: acc.protein + protein * quantity,
        fat: acc.fat + fat * quantity,
      };
    },
    { kcal: 0, carbs: 0, protein: 0, fat: 0 },
  );

  return (
    <div className="rounded-[24px] border border-border/70 bg-card/75 px-4 py-4 shadow-[0_10px_22px_rgba(15,23,42,0.1)] backdrop-blur-sm">
      <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-primary/70">
        <span>Meal summary</span>
        <motion.span
          animate={pulse ? { scale: [1, 1.08, 1] } : undefined}
          transition={{ duration: 0.45, ease: "easeOut" }}
        >
          <AnimatedNumber value={totals.kcal} /> cal
        </motion.span>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-foreground/80">
        <div className="rounded-[16px] bg-secondary/70 px-3 py-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary/70">
            Carbs
          </p>
          <motion.p
            className="mt-1 text-sm font-semibold text-foreground"
            animate={pulse ? { scale: [1, 1.06, 1] } : undefined}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <AnimatedNumber value={totals.carbs} />g
          </motion.p>
        </div>
        <div className="rounded-[16px] bg-secondary/70 px-3 py-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary/70">
            Protein
          </p>
          <motion.p
            className="mt-1 text-sm font-semibold text-foreground"
            animate={pulse ? { scale: [1, 1.06, 1] } : undefined}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <AnimatedNumber value={totals.protein} />g
          </motion.p>
        </div>
        <div className="rounded-[16px] bg-secondary/70 px-3 py-3 text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-primary/70">
            Fat
          </p>
          <motion.p
            className="mt-1 text-sm font-semibold text-foreground"
            animate={pulse ? { scale: [1, 1.06, 1] } : undefined}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <AnimatedNumber value={totals.fat} />g
          </motion.p>
        </div>
      </div>
    </div>
  );
};

const CompletionRing = ({
  value,
  label,
  pulseTrigger,
}: {
  value: number;
  label: string;
  pulseTrigger?: number;
}) => {
  const radius = 16;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(value, 100) / 100) * circumference;

  return (
    <motion.div
      className="flex items-center gap-2"
      key={pulseTrigger ?? "static"}
      animate={
        pulseTrigger != null && pulseTrigger > 0
          ? { scale: [1, 1.15, 1] }
          : undefined
      }
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90">
        <circle
          cx="20"
          cy="20"
          r={radius}
          stroke="hsl(var(--primary) / 0.2)"
          strokeWidth="4"
          fill="none"
        />
        <circle
          cx="20"
          cy="20"
          r={radius}
          stroke="hsl(var(--primary) / 0.8)"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
      </svg>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-[11px] font-semibold text-secondary-foreground">
        {label}
      </div>
    </motion.div>
  );
};
