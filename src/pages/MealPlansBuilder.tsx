import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AppShell } from "@/components/aura";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { CalendarDays, Copy, GripVertical, Plus, Trash2, WandSparkles } from "lucide-react";
import { ListEmptyState } from "@/components/ui/empty-state";
import { useMealPlans, type MealPlanSlot } from "@/hooks/useMealPlans";

type WeekdayId = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";
type AddDraft = { foodId: string; quantity: string };

type MealPlanFood = {
  id: string;
  name: string;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  group: MealPlanSlot;
};

type SlotConfig = {
  id: MealPlanSlot;
  label: string;
  tone: string;
};

const SLOT_CONFIG: SlotConfig[] = [
  { id: "protein", label: "Protein", tone: "border-emerald-200 bg-emerald-50/70 text-emerald-700" },
  { id: "carbs", label: "Carbs", tone: "border-sky-200 bg-sky-50/70 text-sky-700" },
  { id: "balance", label: "Fat / Veg / Fruit", tone: "border-amber-200 bg-amber-50/70 text-amber-700" },
];

const FOOD_LIBRARY: MealPlanFood[] = [
  { id: "chicken-breast", name: "Chicken breast (100g)", kcal: 165, protein: 31, carbs: 0, fat: 3.6, group: "protein" },
  { id: "lean-beef", name: "Lean beef (100g)", kcal: 176, protein: 26, carbs: 0, fat: 7.2, group: "protein" },
  { id: "salmon", name: "Salmon (100g)", kcal: 208, protein: 20, carbs: 0, fat: 13, group: "protein" },
  { id: "egg", name: "Egg (1 large)", kcal: 70, protein: 6, carbs: 0.5, fat: 5, group: "protein" },
  { id: "greek-yogurt", name: "Greek yogurt (170g)", kcal: 100, protein: 17, carbs: 6, fat: 0, group: "protein" },
  { id: "whey", name: "Whey protein (1 scoop)", kcal: 120, protein: 24, carbs: 3, fat: 1.5, group: "protein" },
  { id: "rice", name: "Rice cooked (150g)", kcal: 195, protein: 4, carbs: 42, fat: 0.4, group: "carbs" },
  { id: "oats", name: "Oats dry (50g)", kcal: 190, protein: 6, carbs: 32, fat: 3.5, group: "carbs" },
  { id: "potato", name: "Sweet potato (200g)", kcal: 180, protein: 4, carbs: 41, fat: 0.3, group: "carbs" },
  { id: "pasta", name: "Pasta cooked (150g)", kcal: 240, protein: 8, carbs: 47, fat: 1.3, group: "carbs" },
  { id: "banana", name: "Banana (1 medium)", kcal: 105, protein: 1.3, carbs: 27, fat: 0.3, group: "balance" },
  { id: "berries", name: "Berries (150g)", kcal: 70, protein: 1, carbs: 17, fat: 0.4, group: "balance" },
  { id: "broccoli", name: "Broccoli (150g)", kcal: 50, protein: 4, carbs: 10, fat: 0.6, group: "balance" },
  { id: "avocado", name: "Avocado (100g)", kcal: 160, protein: 2, carbs: 9, fat: 15, group: "balance" },
  { id: "olive-oil", name: "Olive oil (1 tbsp)", kcal: 119, protein: 0, carbs: 0, fat: 14, group: "balance" },
  { id: "peanut-butter", name: "Peanut butter (1 tbsp)", kcal: 95, protein: 4, carbs: 3, fat: 8, group: "balance" },
];

const DEFAULT_TARGETS = { kcal: 2200, protein: 180, carbs: 220, fat: 70 };

const WEEKDAYS: Array<{ id: WeekdayId; label: string; value: number }> = [
  { id: "sun", label: "Su", value: 0 },
  { id: "mon", label: "M", value: 1 },
  { id: "tue", label: "T", value: 2 },
  { id: "wed", label: "W", value: 3 },
  { id: "thu", label: "Th", value: 4 },
  { id: "fri", label: "F", value: 5 },
  { id: "sat", label: "Sa", value: 6 },
];

const coerceNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};

const triggerLightFeedback = () => {
  if (typeof window === "undefined") return;
  if (typeof window.navigator?.vibrate === "function") {
    window.navigator.vibrate(8);
  }
};

const parseDndId = (id: string) => {
  const [kind, value] = id.split(":");
  return { kind, value };
};

type MealPlansContentProps = { showHeader?: boolean };

export const MealPlansContent = ({ showHeader = true }: MealPlansContentProps) => {
  const {
    days,
    meals,
    items,
    weekAssignments,
    status,
    error,
    addDay,
    patchDay,
    removeDay,
    duplicateDay,
    addItem,
    patchItem,
    removeItem,
    reorderMeals,
    reorderItems,
    applyToWeekdays,
    clearWeekday,
  } = useMealPlans();

  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [newDayName, setNewDayName] = useState("");
  const [addDrafts, setAddDrafts] = useState<Record<string, AddDraft>>({});
  const [targetDraft, setTargetDraft] = useState(DEFAULT_TARGETS);
  const [selectedWeekdays, setSelectedWeekdays] = useState<Record<WeekdayId, boolean>>({
    mon: false, tue: false, wed: false, thu: false, fri: false, sat: false, sun: false,
  });
  const [pulseMealId, setPulseMealId] = useState<string | null>(null);
  const seededRef = useRef(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const foodById = useMemo(() => {
    const map = new Map<string, MealPlanFood>();
    FOOD_LIBRARY.forEach((food) => map.set(food.id, food));
    return map;
  }, []);

  useEffect(() => {
    if (!days.length) return;
    if (!activeDayId || !days.some((day) => day.id === activeDayId)) {
      setActiveDayId(days[0].id);
    }
  }, [days, activeDayId]);

  const activeDay = useMemo(
    () => days.find((day) => day.id === activeDayId) ?? null,
    [days, activeDayId],
  );

  useEffect(() => {
    if (!activeDay) return;
    setTargetDraft(activeDay.targets);
  }, [activeDay]);

  const dayMeals = useMemo(
    () =>
      activeDay
        ? meals.filter((meal) => meal.dayId === activeDay.id).sort((a, b) => a.sortOrder - b.sortOrder)
        : [],
    [meals, activeDay],
  );
  const mealItemsMap = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const meal of dayMeals) {
      map.set(
        meal.id,
        items
          .filter((item) => item.mealId === meal.id)
          .sort((a, b) => a.sortOrder - b.sortOrder),
      );
    }
    return map;
  }, [dayMeals, items]);

  const getTotals = useCallback(
    (source: Array<{ quantity: number; kcal: number; protein: number; carbs: number; fat: number }>) =>
      source.reduce(
        (acc, item) => {
          const qty = item.quantity || 1;
          acc.kcal += item.kcal * qty;
          acc.protein += item.protein * qty;
          acc.carbs += item.carbs * qty;
          acc.fat += item.fat * qty;
          return acc;
        },
        { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [],
  );

  const dayTotals = useMemo(() => {
    if (!activeDay) return { kcal: 0, protein: 0, carbs: 0, fat: 0 };
    const dayMealIds = new Set(dayMeals.map((meal) => meal.id));
    return getTotals(items.filter((item) => dayMealIds.has(item.mealId)));
  }, [activeDay, dayMeals, items, getTotals]);

  useEffect(() => {
    if (status !== "idle" || days.length > 0 || seededRef.current) return;
    seededRef.current = true;
    void addDay({ name: "Training day", targets: DEFAULT_TARGETS }).then(() => {
      void addDay({
        name: "Rest day",
        targets: { kcal: 1900, protein: 180, carbs: 140, fat: 75 },
      });
    });
  }, [status, days.length, addDay]);

  const createPlanDay = () => {
    const name = newDayName.trim() || `Plan ${days.length + 1}`;
    void addDay({ name, targets: DEFAULT_TARGETS }).then((next) => {
      if (next?.id) setActiveDayId(next.id);
      setNewDayName("");
    });
  };

  const deleteActiveDay = () => {
    if (!activeDay || days.length <= 1) return;
    void removeDay(activeDay.id);
  };

  const duplicateActiveDay = () => {
    if (!activeDay) return;
    void duplicateDay(activeDay.id, `${activeDay.name} copy`).then((copy) => {
      if (copy?.id) setActiveDayId(copy.id);
      triggerLightFeedback();
    });
  };

  const updateTargetsDraft = (key: keyof typeof DEFAULT_TARGETS, raw: string) => {
    setTargetDraft((prev) => ({ ...prev, [key]: coerceNumber(raw, prev[key]) }));
  };

  const commitTarget = (key: keyof typeof DEFAULT_TARGETS) => {
    if (!activeDay) return;
    void patchDay(activeDay.id, {
      targets: { ...activeDay.targets, [key]: targetDraft[key] },
    });
  };

  const setMealDraft = (mealId: string, patch: Partial<AddDraft>) => {
    setAddDrafts((prev) => ({
      ...prev,
      [mealId]: {
        foodId: prev[mealId]?.foodId ?? FOOD_LIBRARY[0].id,
        quantity: prev[mealId]?.quantity ?? "1",
        ...patch,
      },
    }));
  };

  const addFoodToMeal = (mealId: string) => {
    const draft = addDrafts[mealId] ?? { foodId: FOOD_LIBRARY[0].id, quantity: "1" };
    const food = foodById.get(draft.foodId);
    if (!food) return;
    const quantity = Math.max(0.25, coerceNumber(draft.quantity, 1));
    void addItem(mealId, {
      foodName: food.name,
      quantity,
      slot: food.group,
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
    setMealDraft(mealId, { quantity: "1" });
    setPulseMealId(mealId);
    triggerLightFeedback();
    window.setTimeout(() => setPulseMealId(null), 280);
  };

  const removeMealItem = (itemId: string) => {
    void removeItem(itemId);
    triggerLightFeedback();
  };

  const updateMealItemSlot = (itemId: string, slot: MealPlanSlot) => {
    void patchItem(itemId, { slot });
    triggerLightFeedback();
  };

  const toggleWeekday = (weekday: WeekdayId) => {
    setSelectedWeekdays((prev) => ({ ...prev, [weekday]: !prev[weekday] }));
  };

  const applyActiveDayToWeekSelection = () => {
    if (!activeDay) return;
    const weekdays = WEEKDAYS.filter(({ id }) => selectedWeekdays[id]).map(({ value }) => value);
    if (!weekdays.length) return;
    void applyToWeekdays(activeDay.id, weekdays);
    triggerLightFeedback();
  };

  const clearMappedWeekday = (weekday: WeekdayId) => {
    const value = WEEKDAYS.find((day) => day.id === weekday)?.value;
    if (value === undefined) return;
    void clearWeekday(value);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id || !activeDay) return;

    const activeMeta = parseDndId(String(active.id));
    const overMeta = parseDndId(String(over.id));

    if (activeMeta.kind === "meal" && overMeta.kind === "meal") {
      const sourceId = activeMeta.value;
      const targetId = overMeta.value;
      const sourceIndex = dayMeals.findIndex((meal) => meal.id === sourceId);
      const targetIndex = dayMeals.findIndex((meal) => meal.id === targetId);
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return;
      const reordered = arrayMove(dayMeals, sourceIndex, targetIndex);
      void reorderMeals(activeDay.id, reordered.map((meal) => meal.id));
      triggerLightFeedback();
      return;
    }

    if (activeMeta.kind === "item" && overMeta.kind === "item") {
      const activeItemId = activeMeta.value;
      const overItemId = overMeta.value;
      const activeItem = items.find((item) => item.id === activeItemId);
      const overItem = items.find((item) => item.id === overItemId);
      if (!activeItem || !overItem) return;
      if (activeItem.mealId !== overItem.mealId || activeItem.slot !== overItem.slot) return;

      const mealId = activeItem.mealId;
      const mealItems = mealItemsMap.get(mealId) ?? [];
      const sameSlotIds = mealItems.filter((item) => item.slot === activeItem.slot).map((item) => item.id);
      const fromIndex = sameSlotIds.indexOf(activeItemId);
      const toIndex = sameSlotIds.indexOf(overItemId);
      if (fromIndex < 0 || toIndex < 0 || fromIndex === toIndex) return;

      const reorderedSlotIds = arrayMove(sameSlotIds, fromIndex, toIndex);
      let slotCursor = 0;
      const reorderedMealIds = mealItems.map((item) => {
        if (item.slot !== activeItem.slot) return item.id;
        const nextId = reorderedSlotIds[slotCursor];
        slotCursor += 1;
        return nextId;
      });
      void reorderItems(mealId, reorderedMealIds);
      triggerLightFeedback();
    }
  };

  if (status === "loading" && days.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10">
        <Card className={cn("rounded-[24px] border border-border/60 bg-card px-4 py-6", showHeader ? "mt-6" : "mt-4")}>
          <p className="text-sm text-muted-foreground">Loading meal plans...</p>
        </Card>
      </div>
    );
  }

  if (status === "error" && days.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10">
        <Card className={cn("rounded-[24px] border border-border/60 bg-card px-4 py-6", showHeader ? "mt-6" : "mt-4")}>
          <p className="text-sm font-semibold text-foreground">Meal plans unavailable</p>
          <p className="mt-1 text-xs text-muted-foreground">{error ?? "Unable to load meal plans."}</p>
        </Card>
      </div>
    );
  }

  if (!activeDay) {
    return (
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10">
        <Card className={cn("rounded-[24px] border border-border/60 bg-card px-4 py-6", showHeader ? "mt-6" : "mt-4")}>
          <ListEmptyState itemName="plan days" className="w-full py-4 text-center" size="sm" />
        </Card>
      </div>
    );
  }

  const kcalOver = dayTotals.kcal > activeDay.targets.kcal;
  const proteinHit = dayTotals.protein >= activeDay.targets.protein;

  return (
    <div className="mx-auto w-full max-w-[420px] px-4 pb-10">
      {showHeader && (
        <div className="rounded-[28px] bg-gradient-to-br from-primary/30 via-primary/15 to-card px-5 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Meal plans</p>
          <h1 className="text-2xl font-display font-semibold text-foreground">Build day templates</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Save meal-plan days you can follow when you need ideas.
          </p>
        </div>
      )}

      <Card className={cn("rounded-[24px] border border-border/60 bg-card px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]", showHeader ? "mt-6" : "mt-4")}>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-semibold text-foreground">Plan days</p>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={duplicateActiveDay}>
              <Copy className="mr-1 h-3.5 w-3.5" />
              Duplicate
            </Button>
            <Button type="button" size="sm" variant="outline" onClick={deleteActiveDay} disabled={days.length <= 1}>
              <Trash2 className="mr-1 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {days.map((day) => (
            <button
              key={day.id}
              type="button"
              onClick={() => setActiveDayId(day.id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                day.id === activeDay.id
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 bg-card text-muted-foreground",
              )}
            >
              {day.name}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Input
            value={newDayName}
            onChange={(event) => setNewDayName(event.target.value)}
            placeholder="New day name (e.g. Training day)"
            className="h-9 rounded-full"
          />
          <Button type="button" className="rounded-full" onClick={createPlanDay}>
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </div>
      </Card>

      <Card className="mt-4 rounded-[24px] border border-border/60 bg-card px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Targets</p>
            <p className="mt-1 text-sm font-semibold text-foreground">{activeDay.name}</p>
          </div>
          <CalendarDays className="h-5 w-5 text-primary" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Input
            value={String(targetDraft.kcal)}
            onChange={(event) => updateTargetsDraft("kcal", event.target.value)}
            onBlur={() => commitTarget("kcal")}
            placeholder="Calories"
            className="h-9 rounded-full"
          />
          <Input
            value={String(targetDraft.protein)}
            onChange={(event) => updateTargetsDraft("protein", event.target.value)}
            onBlur={() => commitTarget("protein")}
            placeholder="Protein (g)"
            className="h-9 rounded-full"
          />
          <Input
            value={String(targetDraft.carbs)}
            onChange={(event) => updateTargetsDraft("carbs", event.target.value)}
            onBlur={() => commitTarget("carbs")}
            placeholder="Carbs (g)"
            className="h-9 rounded-full"
          />
          <Input
            value={String(targetDraft.fat)}
            onChange={(event) => updateTargetsDraft("fat", event.target.value)}
            onBlur={() => commitTarget("fat")}
            placeholder="Fat (g)"
            className="h-9 rounded-full"
          />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
          <Badge
            variant="secondary"
            className={cn(
              "justify-between rounded-full px-3 py-1.5",
              kcalOver
                ? "bg-rose-100 text-rose-700 border border-rose-200"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            kcal <span>{Math.round(dayTotals.kcal)} / {activeDay.targets.kcal}</span>
          </Badge>
          <Badge
            variant="secondary"
            className={cn(
              "justify-between rounded-full px-3 py-1.5 border",
              proteinHit
                ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                : "bg-amber-100 text-amber-700 border-amber-200",
            )}
          >
            protein <span>{Math.round(dayTotals.protein)}g / {activeDay.targets.protein}g</span>
          </Badge>
          <Badge variant="secondary" className="justify-between rounded-full px-3 py-1.5">
            carbs <span>{Math.round(dayTotals.carbs)}g / {activeDay.targets.carbs}g</span>
          </Badge>
          <Badge variant="secondary" className="justify-between rounded-full px-3 py-1.5">
            fat <span>{Math.round(dayTotals.fat)}g / {activeDay.targets.fat}g</span>
          </Badge>
        </div>
        <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
          <span>
            Calories: {kcalOver
              ? `+${Math.round(dayTotals.kcal - activeDay.targets.kcal)} over`
              : `${Math.round(activeDay.targets.kcal - dayTotals.kcal)} left`}
          </span>
          <span>
            Protein: {proteinHit
              ? "goal met"
              : `${Math.round(activeDay.targets.protein - dayTotals.protein)}g left`}
          </span>
        </div>
      </Card>

      <Card className="mt-4 rounded-[24px] border border-border/60 bg-card px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Quick apply to week</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              Apply <span className="text-primary">{activeDay.name}</span> to selected days
            </p>
          </div>
          <WandSparkles className="h-5 w-5 text-primary" />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {WEEKDAYS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleWeekday(id)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                selectedWeekdays[id]
                  ? "border-primary/40 bg-primary/10 text-primary"
                  : "border-border/60 bg-card text-muted-foreground",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex items-center justify-between gap-2">
          <Button type="button" className="rounded-full" onClick={applyActiveDayToWeekSelection}>
            Apply selected
          </Button>
          <p className="text-xs text-muted-foreground">
            Week map:{" "}
            {WEEKDAYS.map(({ value, label }) => {
              const assigned = days.find(
                (day) => day.id === weekAssignments.find((entry) => entry.weekday === value)?.dayId,
              );
              return (
                <span key={value} className="mr-2 inline-flex items-center gap-1">
                  <span className="font-semibold">{label}</span>
                  <span>{assigned ? assigned.name : "-"}</span>
                </span>
              );
            })}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {WEEKDAYS.map(({ id, label }) => (
            <Button
              key={`clear-${id}`}
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 rounded-full px-3 text-[11px]"
              onClick={() => clearMappedWeekday(id)}
            >
              Clear {label}
            </Button>
          ))}
        </div>
      </Card>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={dayMeals.map((meal) => `meal:${meal.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-4 space-y-3">
            {dayMeals.map((meal) => {
              const mealItems = mealItemsMap.get(meal.id) ?? [];
          const mealTotals = getTotals(mealItems);
          const grouped = SLOT_CONFIG.map((slot) => ({
            ...slot,
            items: mealItems.filter((item) => item.slot === slot.id),
          }));
          const mealDraft = addDrafts[meal.id] ?? { foodId: FOOD_LIBRARY[0].id, quantity: "1" };

          return (
            <SortableMealCard
              key={meal.id}
              id={`meal:${meal.id}`}
              className={cn(
                pulseMealId === meal.id && "ring-2 ring-primary/40 shadow-[0_16px_30px_rgba(16,185,129,0.18)]",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <GripVertical className="h-4 w-4 text-muted-foreground/70" />
                  <p className="text-sm font-semibold text-foreground">
                    {meal.emoji ?? "🍽️"} {meal.label}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground">{Math.round(mealTotals.kcal)} kcal</p>
              </div>

              <div className="mt-3 space-y-2">
                {grouped.map((slot) => (
                  <div key={slot.id} className={cn("rounded-[16px] border px-3 py-2", slot.tone)}>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">{slot.label}</p>
                    <div className="mt-2 space-y-1.5">
                      {slot.items.length === 0 ? (
                        <p className="text-[11px] opacity-70">No items yet</p>
                      ) : (
                        <SortableContext
                          items={slot.items.map((item) => `item:${item.id}`)}
                          strategy={verticalListSortingStrategy}
                        >
                          {slot.items.map((item) => {
                            const qty = item.quantity || 1;
                            return (
                              <SortableMealItemRow key={item.id} id={`item:${item.id}`}>
                                <div className="min-w-0">
                                  <p className="truncate text-xs font-medium text-slate-700">
                                    {item.foodName} × {qty}
                                  </p>
                                  <p className="text-[10px] text-slate-500">
                                    {Math.round(item.kcal * qty)} kcal · P {Math.round(item.protein * qty)} · C {Math.round(item.carbs * qty)} · F {Math.round(item.fat * qty)}
                                  </p>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Select
                                    value={item.slot}
                                    onValueChange={(value) => updateMealItemSlot(item.id, value as MealPlanSlot)}
                                  >
                                    <SelectTrigger className="h-7 w-[118px] rounded-full border-white bg-white/90 text-[11px]">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {SLOT_CONFIG.map((option) => (
                                        <SelectItem key={option.id} value={option.id}>
                                          {option.label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 rounded-full"
                                    onClick={() => removeMealItem(item.id)}
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </SortableMealItemRow>
                            );
                          })}
                        </SortableContext>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-3 grid grid-cols-[1fr_88px_auto] gap-2">
                <Select
                  value={mealDraft.foodId}
                  onValueChange={(value) => setMealDraft(meal.id, { foodId: value })}
                >
                  <SelectTrigger className="h-9 rounded-full">
                    <SelectValue placeholder="Pick food" />
                  </SelectTrigger>
                  <SelectContent>
                    {FOOD_LIBRARY.map((food) => (
                      <SelectItem key={food.id} value={food.id}>
                        {food.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={mealDraft.quantity}
                  onChange={(event) => setMealDraft(meal.id, { quantity: event.target.value })}
                  placeholder="Qty"
                  inputMode="decimal"
                  className="h-9 rounded-full"
                />
                <Button type="button" className="h-9 rounded-full px-4" onClick={() => addFoodToMeal(meal.id)}>
                  Add
                </Button>
              </div>
            </SortableMealCard>
          );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
};

const SortableMealCard = ({
  id,
  className,
  children,
}: {
  id: string;
  className?: string;
  children: ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "rounded-[22px] border border-border/60 bg-card px-4 py-4 shadow-[0_12px_24px_rgba(15,23,42,0.05)] transition-all duration-300",
        className,
      )}
    >
      {children}
    </Card>
  );
};

const SortableMealItemRow = ({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center justify-between gap-2 rounded-full bg-white/70 px-2 py-1"
    >
      <div className="flex min-w-0 items-center gap-1">
        <GripVertical className="h-3.5 w-3.5 shrink-0 text-slate-500/70" />
        {children}
      </div>
    </div>
  );
};

const MealPlansBuilder = () => (
  <AppShell experience="nutrition">
    <MealPlansContent />
  </AppShell>
);

export default MealPlansBuilder;
