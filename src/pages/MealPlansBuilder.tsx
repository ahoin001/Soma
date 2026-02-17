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
import { MealIcon } from "@/components/aura/MealIcon";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ListEmptyState } from "@/components/ui/empty-state";
import { fetchFoodHistory, searchFoods } from "@/lib/api";
import { cn } from "@/lib/utils";
import { useMealPlans } from "@/hooks/useMealPlans";
import type { FoodRecord } from "@/types/api";
import {
  CalendarDays,
  Copy,
  GripVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  WandSparkles,
} from "lucide-react";

type WeekdayId = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

type MealPlanSlot = "protein" | "carbs" | "balance";

type SlotConfig = {
  id: MealPlanSlot;
  label: string;
  tone: string;
};

type DbFoodOption = {
  id: string;
  name: string;
  brand: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  micronutrients: Record<string, unknown>;
};

const SLOT_CONFIG: SlotConfig[] = [
  {
    id: "protein",
    label: "Protein",
    tone: "border-emerald-200 bg-emerald-50/70 text-emerald-700",
  },
  {
    id: "carbs",
    label: "Carbs",
    tone: "border-sky-200 bg-sky-50/70 text-sky-700",
  },
  {
    id: "balance",
    label: "Fat / Veg / Fruit",
    tone: "border-amber-200 bg-amber-50/70 text-amber-700",
  },
];

const SLOT_CHIP_CLASS: Record<MealPlanSlot, string> = {
  protein: "bg-emerald-100 text-emerald-800 border-emerald-200/80",
  carbs: "bg-sky-100 text-sky-800 border-sky-200/80",
  balance: "bg-amber-100 text-amber-800 border-amber-200/80",
};

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

const toNum = (value: unknown, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const mapFoodRecord = (row: FoodRecord): DbFoodOption => ({
  id: row.id,
  name: row.name,
  brand: row.brand_name ?? row.brand ?? null,
  kcal: toNum(row.kcal),
  protein: toNum(row.protein_g),
  carbs: toNum(row.carbs_g),
  fat: toNum(row.fat_g),
  micronutrients: row.micronutrients ?? {},
});

const inferSlot = (food: DbFoodOption): MealPlanSlot => {
  const fiber = toNum((food.micronutrients as { fiber_g?: unknown })?.fiber_g);
  if (fiber >= 3) return "balance";
  if (food.protein >= food.carbs && food.protein >= food.fat) return "protein";
  if (food.carbs >= food.protein && food.carbs >= food.fat) return "carbs";
  return "balance";
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
    groups,
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
    addGroup,
    patchGroup,
    removeGroup,
    addItem,
    removeItem,
    reorderMeals,
    reorderItems,
    applyToWeekdays,
    clearWeekday,
  } = useMealPlans();

  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [newDayName, setNewDayName] = useState("");
  const [targetDraft, setTargetDraft] = useState(DEFAULT_TARGETS);
  const [selectedWeekdays, setSelectedWeekdays] = useState<Record<WeekdayId, boolean>>({
    mon: false,
    tue: false,
    wed: false,
    thu: false,
    fri: false,
    sat: false,
    sun: false,
  });
  const [pulseMealId, setPulseMealId] = useState<string | null>(null);
  const [foodSheetOpen, setFoodSheetOpen] = useState(false);
  const [foodSheetMealId, setFoodSheetMealId] = useState<string | null>(null);
  const [foodQuery, setFoodQuery] = useState("");
  const [foodQuantityDraft, setFoodQuantityDraft] = useState("1");
  const [foodSearchStatus, setFoodSearchStatus] = useState<"idle" | "loading" | "error">("idle");
  const [foodSearchError, setFoodSearchError] = useState<string | null>(null);
  const [foodOptions, setFoodOptions] = useState<DbFoodOption[]>([]);
  const [editingDayName, setEditingDayName] = useState<string | null>(null);
  const [dayNameDraft, setDayNameDraft] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const searchRequestRef = useRef(0);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

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

  const activeMealForFoodSheet = useMemo(
    () => meals.find((meal) => meal.id === foodSheetMealId) ?? null,
    [meals, foodSheetMealId],
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
        items.filter((item) => item.mealId === meal.id).sort((a, b) => a.sortOrder - b.sortOrder),
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
    if (!foodSheetOpen) return;
    const requestId = ++searchRequestRef.current;
    setFoodSearchStatus("loading");
    setFoodSearchError(null);

    const timer = window.setTimeout(async () => {
      try {
        const trimmed = foodQuery.trim();
        const response = trimmed.length
          ? await searchFoods(trimmed, 40, false)
          : await fetchFoodHistory(40);
        if (requestId !== searchRequestRef.current) return;
        setFoodOptions((response.items ?? []).map(mapFoodRecord));
        setFoodSearchStatus("idle");
      } catch (searchError) {
        if (requestId !== searchRequestRef.current) return;
        setFoodSearchStatus("error");
        setFoodSearchError(
          searchError instanceof Error ? searchError.message : "Unable to load foods.",
        );
      }
    }, 220);

    return () => {
      window.clearTimeout(timer);
    };
  }, [foodSheetOpen, foodQuery]);

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

  const openFoodPicker = (mealId: string) => {
    setFoodSheetMealId(mealId);
    setFoodSheetOpen(true);
    setFoodQuery("");
    setFoodQuantityDraft("1");
  };

  const addFoodFromDb = (food: DbFoodOption) => {
    if (!foodSheetMealId) return;
    const quantity = Math.max(0.25, coerceNumber(foodQuantityDraft, 1));
    void addItem(foodSheetMealId, {
      foodId: food.id,
      foodName: food.name,
      quantity,
      slot: inferSlot(food),
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    });
    setPulseMealId(foodSheetMealId);
    triggerLightFeedback();
    window.setTimeout(() => setPulseMealId(null), 280);
    setFoodSheetOpen(false);
  };

  const removeMealItem = (itemId: string) => {
    void removeItem(itemId);
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

  const startRenameDay = () => {
    if (!activeDay) return;
    setEditingDayName(activeDay.id);
    setDayNameDraft(activeDay.name);
  };

  const commitRenameDay = () => {
    if (!editingDayName || !dayNameDraft.trim()) {
      setEditingDayName(null);
      return;
    }
    void patchDay(editingDayName, { name: dayNameDraft.trim() });
    setEditingDayName(null);
  };

  const assignDayToGroup = (groupId: string | null) => {
    if (!activeDay) return;
    void patchDay(activeDay.id, { groupId });
  };

  const createGroupAndAssign = () => {
    const name = newGroupName.trim() || "New group";
    void addGroup(name).then((group) => {
      if (group && activeDay) void patchDay(activeDay.id, { groupId: group.id });
      setNewGroupName("");
    });
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
      const sameSlotIds = mealItems
        .filter((item) => item.slot === activeItem.slot)
        .map((item) => item.id);
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
        <Card
          className={cn(
            "rounded-[24px] border border-border/60 bg-card px-4 py-6",
            showHeader ? "mt-6" : "mt-4",
          )}
        >
          <p className="text-sm text-muted-foreground">Loading meal plans...</p>
        </Card>
      </div>
    );
  }

  if (status === "error" && days.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10">
        <Card
          className={cn(
            "rounded-[24px] border border-border/60 bg-card px-4 py-6",
            showHeader ? "mt-6" : "mt-4",
          )}
        >
          <p className="text-sm font-semibold text-foreground">Meal plans unavailable</p>
          <p className="mt-1 text-xs text-muted-foreground">{error ?? "Unable to load meal plans."}</p>
        </Card>
      </div>
    );
  }

  if (days.length === 0) {
    return (
      <div className="mx-auto w-full max-w-[440px] px-5 pb-16">
        {showHeader && (
          <div className="rounded-[28px] border border-border/30 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent px-6 py-8 shadow-sm">
            <p className="text-xs font-medium uppercase tracking-widest text-primary/90">Meal plans</p>
            <h1 className="mt-2 text-2xl font-display font-semibold tracking-tight text-foreground">
              Build day templates
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Save meal-plan days you can follow when you need ideas.
            </p>
          </div>
        )}
        <Card
          className={cn(
            "rounded-[28px] border border-border/40 bg-card/95 px-5 py-5 shadow-sm",
            showHeader ? "mt-8" : "mt-6",
          )}
        >
          <p className="text-sm font-medium text-foreground">Plan days</p>
          <p className="mt-2 text-xs text-muted-foreground">Add your first day below.</p>
          <div className="mt-4 flex items-center gap-2">
            <Input
              value={newDayName}
              onChange={(event) => setNewDayName(event.target.value)}
              placeholder="New day (e.g. Training day 1)"
              className="h-10 rounded-full border-border/50"
              onKeyDown={(e) => e.key === "Enter" && createPlanDay()}
            />
            <Button type="button" className="rounded-full" onClick={createPlanDay}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!activeDay) {
    return null;
  }

  const kcalOver = dayTotals.kcal > activeDay.targets.kcal;
  const proteinHit = dayTotals.protein >= activeDay.targets.protein;

  return (
    <div className="mx-auto w-full max-w-[440px] px-5 pb-16">
      {showHeader && (
        <div className="rounded-[28px] border border-border/30 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent px-6 py-8 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-primary/90">Meal plans</p>
          <h1 className="mt-2 text-2xl font-display font-semibold tracking-tight text-foreground">
            Build day templates
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Save meal-plan days you can follow when you need ideas.
          </p>
        </div>
      )}

      <Card
        className={cn(
          "rounded-[28px] border border-border/40 bg-card/95 px-5 py-5 shadow-sm",
          showHeader ? "mt-8" : "mt-6",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-foreground">Plan days</p>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={duplicateActiveDay}>
              <Copy className="mr-1.5 h-3.5 w-3.5" />
              Duplicate
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="rounded-full"
              onClick={deleteActiveDay}
              disabled={days.length <= 1}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              Delete
            </Button>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {days.map((day) => (
            <div
              key={day.id}
              className={cn(
                "flex items-center gap-1 rounded-full border pr-1 transition",
                day.id === activeDay.id
                  ? "border-primary/50 bg-primary/15"
                  : "border-border/50 bg-muted/40",
              )}
            >
              <button
                type="button"
                onClick={() => setActiveDayId(day.id)}
                className={cn(
                  "rounded-full px-4 py-2 text-left text-xs font-medium transition",
                  day.id === activeDay.id ? "text-primary" : "text-muted-foreground hover:bg-muted/60",
                )}
              >
                {day.name}
              </button>
              {day.id === activeDay.id && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 rounded-full text-primary hover:bg-primary/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveDayId(day.id);
                    setEditingDayName(day.id);
                    setDayNameDraft(day.name);
                  }}
                  aria-label="Rename day"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center gap-2">
          <Input
            value={newDayName}
            onChange={(event) => setNewDayName(event.target.value)}
            placeholder="New day (e.g. Training day 1)"
            className="h-10 rounded-full border-border/50"
            onKeyDown={(e) => e.key === "Enter" && createPlanDay()}
          />
          <Button type="button" className="rounded-full" onClick={createPlanDay}>
            <Plus className="mr-1.5 h-4 w-4" />
            Add
          </Button>
        </div>
      </Card>

      <Card className="mt-6 rounded-[28px] border border-border/40 bg-card/95 px-5 py-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium uppercase tracking-widest text-primary/90">Targets</p>
            {editingDayName === activeDay.id ? (
              <div className="mt-2 flex items-center gap-2">
                <Input
                  value={dayNameDraft}
                  onChange={(e) => setDayNameDraft(e.target.value)}
                  onBlur={commitRenameDay}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRenameDay();
                    if (e.key === "Escape") setEditingDayName(null);
                  }}
                  className="h-9 rounded-full border-border/50 text-sm"
                  autoFocus
                />
              </div>
            ) : (
              <div className="mt-2 flex items-center gap-2">
                <p className="text-base font-semibold text-foreground">{activeDay.name}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                  onClick={startRenameDay}
                  aria-label="Rename day"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
          <CalendarDays className="h-5 w-5 shrink-0 text-primary/70" />
        </div>
        <div className="mt-4 rounded-2xl border border-border/40 bg-muted/20 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">Group</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={activeDay.groupId ?? ""}
              onChange={(e) => assignDayToGroup(e.target.value || null)}
              className="h-9 rounded-full border border-border/50 bg-background px-3 text-sm"
            >
              <option value="">No group</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
            <Input
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              placeholder="New group name"
              className="h-9 w-32 rounded-full border-border/50 text-sm"
              onKeyDown={(e) => e.key === "Enter" && createGroupAndAssign()}
            />
            <Button type="button" size="sm" className="rounded-full" onClick={createGroupAndAssign}>
              Add
            </Button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <TargetField
            label="Calories target"
            suffix="kcal"
            value={String(targetDraft.kcal)}
            onChange={(value) => updateTargetsDraft("kcal", value)}
            onBlur={() => commitTarget("kcal")}
            placeholder="2200"
          />
          <TargetField
            label="Protein target"
            suffix="g"
            value={String(targetDraft.protein)}
            onChange={(value) => updateTargetsDraft("protein", value)}
            onBlur={() => commitTarget("protein")}
            placeholder="180"
          />
          <TargetField
            label="Carbs target"
            suffix="g"
            value={String(targetDraft.carbs)}
            onChange={(value) => updateTargetsDraft("carbs", value)}
            onBlur={() => commitTarget("carbs")}
            placeholder="220"
          />
          <TargetField
            label="Fat target"
            suffix="g"
            value={String(targetDraft.fat)}
            onChange={(value) => updateTargetsDraft("fat", value)}
            onBlur={() => commitTarget("fat")}
            placeholder="70"
          />
        </div>
        <div className="mt-5 grid grid-cols-2 gap-2.5 text-xs">
          <Badge
            variant="secondary"
            className={cn(
              "justify-between rounded-full px-3 py-1.5",
              kcalOver
                ? "border border-rose-200 bg-rose-100 text-rose-700"
                : "bg-secondary text-secondary-foreground",
            )}
          >
            kcal <span>{Math.round(dayTotals.kcal)} / {activeDay.targets.kcal}</span>
          </Badge>
          <Badge
            variant="secondary"
            className={cn(
              "justify-between rounded-full border px-3 py-1.5",
              proteinHit
                ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                : "border-amber-200 bg-amber-100 text-amber-700",
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
      </Card>

      <Card className="mt-6 rounded-[28px] border border-border/40 bg-card/95 px-5 py-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-primary/90">Quick apply to week</p>
            <p className="mt-2 text-sm font-medium text-foreground">
              Apply <span className="text-primary">{activeDay.name}</span> to selected days
            </p>
          </div>
          <WandSparkles className="h-5 w-5 shrink-0 text-primary/70" />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {WEEKDAYS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => toggleWeekday(id)}
              className={cn(
                "rounded-full border px-4 py-2 text-xs font-medium transition",
                selectedWeekdays[id]
                  ? "border-primary/50 bg-primary/15 text-primary"
                  : "border-border/50 bg-muted/40 text-muted-foreground hover:bg-muted/60",
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between gap-2">
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

      <div className="mt-8">
        <div className="rounded-[28px] border border-border/40 bg-card/80 px-5 py-5 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-primary/80">Day of eating</p>
          <h2 className="mt-2 text-lg font-display font-semibold tracking-tight text-foreground">
            {activeDay.name}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Drag meals and foods to reorder. Foods are grouped by dominant macro.
          </p>
        </div>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={dayMeals.map((meal) => `meal:${meal.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="mt-5 space-y-4">
            {dayMeals.map((meal) => {
              const mealItems = mealItemsMap.get(meal.id) ?? [];
              const mealTotals = getTotals(mealItems);
              const grouped = SLOT_CONFIG.map((slot) => ({
                ...slot,
                items: mealItems.filter((item) => item.slot === slot.id),
              }));

              return (
                <SortableMealCard
                  key={meal.id}
                  id={`meal:${meal.id}`}
                  className={cn(
                    "rounded-[24px] border border-border/40 bg-card/95 px-4 py-4 shadow-sm",
                    pulseMealId === meal.id && "ring-2 ring-primary/30",
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/60" />
                      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                        <MealIcon mealId={meal.id} size={18} className="shrink-0 text-primary" />
                        {meal.label}
                      </p>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-9 shrink-0 rounded-full px-3"
                      onClick={() => openFoodPicker(meal.id)}
                    >
                      <Search className="mr-1.5 h-3.5 w-3.5" />
                      Add food
                    </Button>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="rounded-full border border-border/50 bg-muted/50 px-2.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                      {mealItems.length} items · {Math.round(mealTotals.kcal)} cal
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[10px] font-medium",
                        SLOT_CHIP_CLASS.protein,
                      )}
                    >
                      P {Math.round(mealTotals.protein)}g
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[10px] font-medium",
                        SLOT_CHIP_CLASS.carbs,
                      )}
                    >
                      C {Math.round(mealTotals.carbs)}g
                    </span>
                    <span
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[10px] font-medium",
                        SLOT_CHIP_CLASS.balance,
                      )}
                    >
                      F {Math.round(mealTotals.fat)}g
                    </span>
                  </div>

                  <div className="mt-3 space-y-2">
                    {grouped.map((slot) => (
                      <div key={slot.id} className={cn("rounded-2xl border px-3 py-2.5", slot.tone)}>
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
                                    <div className="min-w-0 flex-1">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <p className="truncate text-xs font-medium text-slate-700">
                                          {item.foodName}
                                        </p>
                                        <span
                                          className={cn(
                                            "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium",
                                            SLOT_CHIP_CLASS[item.slot],
                                          )}
                                        >
                                          {SLOT_CONFIG.find((s) => s.id === item.slot)?.label ?? item.slot}
                                        </span>
                                      </div>
                                      <p className="mt-0.5 text-[10px] text-slate-500">
                                        Qty {qty.toFixed(2)} · {Math.round(item.kcal * qty)} cal · P{" "}
                                        {Math.round(item.protein * qty)} · C{" "}
                                        {Math.round(item.carbs * qty)} · F{" "}
                                        {Math.round(item.fat * qty)}
                                      </p>
                                    </div>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 shrink-0 rounded-full"
                                      onClick={() => removeMealItem(item.id)}
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </SortableMealItemRow>
                                );
                              })}
                            </SortableContext>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </SortableMealCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>

      <Drawer open={foodSheetOpen} onOpenChange={setFoodSheetOpen}>
        <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-6 overflow-hidden">
          <div className="aura-sheet-scroll px-4 pb-4">
            <div className="pt-1">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Meal food search</p>
              <h3 className="text-lg font-display font-semibold text-foreground">
                {activeMealForFoodSheet?.emoji ?? "🍽️"} {activeMealForFoodSheet?.label ?? "Select meal"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Search foods in your database and add to this meal.
              </p>
            </div>

            <div className="mt-3 grid grid-cols-[1fr_88px] gap-2">
              <Input
                value={foodQuery}
                onChange={(event) => setFoodQuery(event.target.value)}
                placeholder="Search foods..."
                className="h-10 rounded-full"
              />
              <Input
                value={foodQuantityDraft}
                onChange={(event) => setFoodQuantityDraft(event.target.value)}
                placeholder="Qty"
                inputMode="decimal"
                className="h-10 rounded-full"
              />
            </div>

            {foodSearchStatus === "loading" ? (
              <p className="mt-3 text-xs font-semibold text-primary">Searching foods...</p>
            ) : null}
            {foodSearchStatus === "error" ? (
              <p className="mt-3 text-xs font-semibold text-destructive">
                {foodSearchError ?? "Unable to search foods."}
              </p>
            ) : null}

            <div className="mt-3 space-y-2">
              {foodOptions.length === 0 && foodSearchStatus === "idle" ? (
                <ListEmptyState
                  itemName="foods"
                  className="w-full rounded-[16px] border border-dashed border-border/70 bg-card/70 py-6"
                />
              ) : null}
              {foodOptions.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => addFoodFromDb(food)}
                  className="w-full rounded-[16px] border border-border/60 bg-card px-3 py-3 text-left shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition hover:border-primary/30 hover:bg-card/80"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{food.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {food.brand ?? "Unbranded"} • {Math.round(food.kcal)} cal • P{" "}
                        {Math.round(food.protein)} • C {Math.round(food.carbs)} • F{" "}
                        {Math.round(food.fat)}
                      </p>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                      {SLOT_CONFIG.find((slot) => slot.id === inferSlot(food))?.label ?? "Balance"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

const TargetField = ({
  label,
  value,
  suffix,
  placeholder,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  suffix: string;
  placeholder: string;
  onChange: (value: string) => void;
  onBlur: () => void;
}) => (
  <div className="rounded-2xl border border-border/40 bg-muted/30 px-3 py-2.5">
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {label}
    </p>
    <div className="mt-1 flex items-center gap-2">
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        inputMode="decimal"
        className="h-8 rounded-full border-border/60 bg-card/85"
      />
      <span className="min-w-8 text-right text-xs font-semibold text-muted-foreground">{suffix}</span>
    </div>
  </div>
);

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
      className="flex items-center justify-between gap-2 rounded-[12px] bg-white/75 px-2 py-1.5"
    >
      <div {...attributes} {...listeners} className="flex min-w-0 flex-1 items-center gap-1">
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
