import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ListEmptyState } from "@/components/ui/empty-state";
import { fetchFoodHistory, searchFoods } from "@/lib/api";
import { toLocalDate } from "@/lib/nutritionData";
import { cn } from "@/lib/utils";
import { useMealPlans } from "@/hooks/useMealPlans";
import type { FoodRecord } from "@/types/api";
import {
  ArrowLeft,
  CalendarDays,
  ChevronRight,
  Copy,
  GripVertical,
  Minus,
  Pencil,
  Plus,
  Search,
  Trash2,
  WandSparkles,
  ClipboardList,
  Check,
} from "lucide-react";
import { toast } from "sonner";

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

const DEFAULT_TARGETS = {
  kcal: 2200,
  protein: 180,
  carbs: 220,
  fat: 70,
  kcalMin: undefined as number | null | undefined,
  kcalMax: undefined as number | null | undefined,
  proteinMin: undefined as number | null | undefined,
  proteinMax: undefined as number | null | undefined,
  carbsMin: undefined as number | null | undefined,
  carbsMax: undefined as number | null | undefined,
  fatMin: undefined as number | null | undefined,
  fatMax: undefined as number | null | undefined,
};

type ViewStep = "days" | "targets" | "meals";

const PANEL_TRANSITION = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.25, ease: "easeOut" },
};

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

const RANGE_KEYS = [
  "kcalMin",
  "kcalMax",
  "proteinMin",
  "proteinMax",
  "carbsMin",
  "carbsMax",
  "fatMin",
  "fatMax",
] as const;

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

/** Circular progress: value 0..maxDisplay (e.g. 1 = 100%). Ring fills proportionally. */
const ProgressRing = ({
  value,
  maxDisplay = 1,
  strokeClassName,
  size = 40,
  strokeWidth = 3,
}: {
  value: number;
  maxDisplay?: number;
  strokeClassName: string;
  size?: number;
  strokeWidth?: number;
}) => {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(value, maxDisplay));
  const progress = maxDisplay > 0 ? clamped / maxDisplay : 0;
  const strokeDashoffset = circumference * (1 - progress);
  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90" aria-hidden>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted/30"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className={cn("transition-[stroke-dashoffset]", strokeClassName)}
      />
    </svg>
  );
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
    patchItem,
    removeItem,
    reorderMeals,
    reorderItems,
    applyToWeekdays,
    clearWeekday,
    presets,
    createPreset,
    deletePreset,
  } = useMealPlans();

  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [viewStep, setViewStep] = useState<ViewStep>("days");
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
  const navigate = useNavigate();
  const [selectedGroupFilterId, setSelectedGroupFilterId] = useState<string | null>(null);
  const [logPlanSheetOpen, setLogPlanSheetOpen] = useState(false);
  const [logPlanCustomDate, setLogPlanCustomDate] = useState("");
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [presetNameDraft, setPresetNameDraft] = useState("");

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

  const filteredDays = useMemo(() => {
    if (!selectedGroupFilterId) return days;
    return days.filter((day) => day.groupId === selectedGroupFilterId);
  }, [days, selectedGroupFilterId]);

  const activeDay = useMemo(
    () => days.find((day) => day.id === activeDayId) ?? null,
    [days, activeDayId],
  );

  useEffect(() => {
    if (!filteredDays.length) return;
    if (!activeDayId || !filteredDays.some((d) => d.id === activeDayId)) {
      setActiveDayId(filteredDays[0].id);
    }
  }, [filteredDays, activeDayId]);

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
    void removeDay(activeDay.id).then(() => {
      setViewStep("days");
      setActiveDayId(null);
    });
  };

  const duplicateActiveDay = () => {
    if (!activeDay) return;
    void duplicateDay(activeDay.id, `${activeDay.name} copy`).then((copy) => {
      if (copy?.id) setActiveDayId(copy.id);
      triggerLightFeedback();
    });
  };

  const targetDraftRef = useRef(targetDraft);
  useEffect(() => {
    targetDraftRef.current = targetDraft;
  }, [targetDraft]);

  const updateTargetsDraft = (key: keyof typeof DEFAULT_TARGETS, raw: string) => {
    setTargetDraft((prev) => {
      const isRange = RANGE_KEYS.includes(key as (typeof RANGE_KEYS)[number]);
      const value =
        isRange && raw.trim() === ""
          ? null
          : coerceNumber(raw, typeof prev[key] === "number" ? (prev[key] as number) : 0);
      return { ...prev, [key]: value };
    });
  };

  const commitAllTargets = () => {
    if (!activeDay) return;
    const d = targetDraftRef.current;
    void patchDay(activeDay.id, {
      targets: {
        kcal: d.kcal,
        protein: d.protein,
        carbs: d.carbs,
        fat: d.fat,
        kcalMin: d.kcalMin ?? null,
        kcalMax: d.kcalMax ?? null,
        proteinMin: d.proteinMin ?? null,
        proteinMax: d.proteinMax ?? null,
        carbsMin: d.carbsMin ?? null,
        carbsMax: d.carbsMax ?? null,
        fatMin: d.fatMin ?? null,
        fatMax: d.fatMax ?? null,
      },
    });
  };

  const applyPreset = (preset: { targets: typeof DEFAULT_TARGETS }) => {
    setTargetDraft((prev) => ({ ...prev, ...preset.targets }));
    triggerLightFeedback();
  };

  const handleSaveAsPreset = () => {
    const name = presetNameDraft.trim() || "My preset";
    void createPreset({ name, targets: targetDraftRef.current }).then(() => {
      setSavePresetOpen(false);
      setPresetNameDraft("");
      toast.success("Preset saved", { description: name });
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
              Day templates to hit your targets—use as a reference when planning what to eat.
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

  const kcalOver = activeDay ? dayTotals.kcal > activeDay.targets.kcal : false;
  const proteinHit = activeDay ? dayTotals.protein >= activeDay.targets.protein : false;

  const goToTargets = (dayId: string) => {
    setActiveDayId(dayId);
    setViewStep("targets");
    triggerLightFeedback();
  };

  const goToMeals = () => {
    setViewStep("meals");
    triggerLightFeedback();
  };

  const goBackToDays = () => {
    setViewStep("days");
    triggerLightFeedback();
  };

  const goBackToTargets = () => {
    setViewStep("targets");
    triggerLightFeedback();
  };

  return (
    <div className="mx-auto w-full max-w-[440px] px-5 pb-24">
      {showHeader && (
        <div className="rounded-[28px] border border-border/30 bg-gradient-to-br from-primary/15 via-primary/8 to-transparent px-6 py-8 shadow-sm">
          <p className="text-xs font-medium uppercase tracking-widest text-primary/90">Meal plans</p>
          <h1 className="mt-2 text-2xl font-display font-semibold tracking-tight text-foreground">
            Build day templates
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Day templates to hit your targets—use as a reference when planning what to eat.
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ─── Step 1: Day manager ───────────────────────────────────────── */}
        {viewStep === "days" && (
          <motion.div
            key="days"
            className={cn(showHeader ? "mt-6" : "mt-4", "space-y-6")}
            {...PANEL_TRANSITION}
          >
            <div className="overflow-x-auto pb-1 pt-1">
              <div className="flex gap-2 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedGroupFilterId(null)}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition",
                    selectedGroupFilterId === null
                      ? "border-primary/50 bg-primary/15 text-primary"
                      : "border-border/50 bg-muted/40 text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  All
                </button>
                {groups.map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setSelectedGroupFilterId(g.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-4 py-2 text-xs font-medium transition",
                      selectedGroupFilterId === g.id
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border/50 bg-muted/40 text-muted-foreground hover:bg-muted/60",
                    )}
                  >
                    {g.name}
                  </button>
                ))}
              </div>
            </div>

            <Card className="rounded-[28px] border border-border/40 bg-card/95 px-5 py-5 shadow-sm">
              <p className="text-sm font-medium text-foreground">Plan days</p>
              <p className="mt-1 text-xs text-muted-foreground">Select a day to set targets and meals.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {filteredDays.map((day) => (
                  <div
                    key={day.id}
                    className={cn(
                      "flex items-center gap-1 rounded-full border pr-1 transition",
                      day.id === activeDayId
                        ? "border-primary/50 bg-primary/15"
                        : "border-border/50 bg-muted/40",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => goToTargets(day.id)}
                      className={cn(
                        "rounded-full px-4 py-2 text-left text-xs font-medium transition flex items-center gap-1.5",
                        day.id === activeDayId ? "text-primary" : "text-muted-foreground hover:bg-muted/60",
                      )}
                    >
                      {day.name}
                      <ChevronRight className="h-3.5 w-3.5 opacity-70" />
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDayName(day.id);
                        setDayNameDraft(day.name);
                      }}
                      aria-label="Rename day"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
              {editingDayName && (
                <div className="mt-3 flex items-center gap-2">
                  <Input
                    value={dayNameDraft}
                    onChange={(e) => setDayNameDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") commitRenameDay();
                      if (e.key === "Escape") setEditingDayName(null);
                    }}
                    className="h-9 rounded-full text-sm"
                    placeholder="Day name"
                  />
                  <Button type="button" size="sm" className="rounded-full" onClick={commitRenameDay}>
                    Save
                  </Button>
                  <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setEditingDayName(null)}>
                    Cancel
                  </Button>
                </div>
              )}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Input
                  value={newDayName}
                  onChange={(event) => setNewDayName(event.target.value)}
                  placeholder="New day (e.g. Training day 1)"
                  className="h-10 flex-1 min-w-0 rounded-full border-border/50"
                  onKeyDown={(e) => e.key === "Enter" && createPlanDay()}
                />
                <Button type="button" className="rounded-full shrink-0" onClick={createPlanDay}>
                  <Plus className="mr-1.5 h-4 w-4" />
                  Add day
                </Button>
              </div>
              {activeDayId && (
                <div className="mt-4 flex items-center gap-2 border-t border-border/40 pt-4">
                  <Button type="button" size="sm" variant="outline" className="rounded-full" onClick={duplicateActiveDay}>
                    <Copy className="mr-1.5 h-3.5 w-3.5" />
                    Duplicate
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="rounded-full text-destructive hover:text-destructive"
                    onClick={deleteActiveDay}
                    disabled={days.length <= 1}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                  <select
                    value={activeDay?.groupId ?? ""}
                    onChange={(e) => activeDay && patchDay(activeDay.id, { groupId: e.target.value || null })}
                    className="h-9 rounded-full border border-border/50 bg-background px-3 text-sm"
                  >
                    <option value="">No group</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </Card>

            {/* Week reference — subsection of day manager */}
            <Card className="rounded-[28px] border border-border/40 bg-card/95 px-5 py-5 shadow-sm">
              <div className="flex items-center gap-2">
                <WandSparkles className="h-5 w-5 shrink-0 text-primary/70" />
                <div>
                  <p className="text-sm font-medium text-foreground">Reference for the week</p>
                  <p className="text-xs text-muted-foreground">Which template to use on which day (doesn’t log food).</p>
                </div>
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
              <div className="mt-3 flex items-center gap-2">
                <Button type="button" size="sm" className="rounded-full" onClick={applyActiveDayToWeekSelection} disabled={!activeDayId}>
                  Set as reference
                </Button>
                {WEEKDAYS.map(({ id, label }) => (
                  <Button key={`clear-${id}`} type="button" variant="ghost" size="sm" className="h-7 rounded-full px-3 text-[11px]" onClick={() => clearMappedWeekday(id)}>
                    Clear {label}
                  </Button>
                ))}
              </div>
            </Card>
          </motion.div>
        )}

        {/* ─── Step 2: Targets (when a day is selected) ───────────────────── */}
        {viewStep === "targets" && activeDay && (
          <motion.div
            key="targets"
            className={cn(showHeader ? "mt-6" : "mt-4", "space-y-6")}
            {...PANEL_TRANSITION}
          >
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" size="icon" className="rounded-full shrink-0" onClick={goBackToDays} aria-label="Back to days">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-widest text-primary/90">Targets</p>
                <h2 className="text-lg font-display font-semibold text-foreground truncate">{activeDay.name}</h2>
              </div>
              <Button type="button" variant="ghost" size="icon" className="rounded-full shrink-0" onClick={duplicateActiveDay} aria-label="Duplicate day">
                <Copy className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="rounded-full shrink-0 text-destructive hover:text-destructive" onClick={deleteActiveDay} disabled={days.length <= 1} aria-label="Delete day">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <Card className="rounded-[28px] border border-border/40 bg-card/95 px-5 py-5 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <select
                  value={activeDay.groupId ?? ""}
                  onChange={(e) => assignDayToGroup(e.target.value || null)}
                  className="h-9 rounded-full border border-border/50 bg-background px-3 text-sm"
                >
                  <option value="">No group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                <CalendarDays className="h-5 w-5 shrink-0 text-primary/70" />
              </div>
                    <div className="mt-4 flex flex-wrap items-center gap-6">
                <div className="flex items-center gap-2">
                  <ProgressRing
                    value={Math.min(dayTotals.kcal / (activeDay.targets.kcal || 1), 1.5)}
                    maxDisplay={1}
                    strokeClassName={kcalOver ? "stroke-rose-500" : "stroke-primary"}
                    size={44}
                    strokeWidth={4}
                  />
                  <span className="text-xs font-medium text-muted-foreground">kcal</span>
                </div>
                <div className="flex items-center gap-2">
                  <ProgressRing
                    value={Math.min(dayTotals.protein / (activeDay.targets.protein || 1), 1.5)}
                    maxDisplay={1}
                    strokeClassName={proteinHit ? "stroke-emerald-500" : "stroke-amber-500"}
                    size={44}
                    strokeWidth={4}
                  />
                  <span className="text-xs font-medium text-muted-foreground">protein</span>
                </div>
              </div>
              {/* Apply preset */}
              {presets.length > 0 && (
                <div className="mt-4">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground mb-1.5">Apply preset</p>
                  <select
                    className="h-9 w-full rounded-full border border-border/50 bg-background px-3 text-sm"
                    value=""
                    onChange={(e) => {
                      const id = e.target.value;
                      if (!id) return;
                      const p = presets.find((x) => x.id === id);
                      if (p) applyPreset(p);
                      e.target.value = "";
                    }}
                  >
                    <option value="">Choose a preset…</option>
                    {presets.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mt-4 grid grid-cols-2 gap-3">
                <TargetField label="Calories" suffix="kcal" value={String(targetDraft.kcal)} onChange={(v) => updateTargetsDraft("kcal", v)} onBlur={commitAllTargets} placeholder="2200" />
                <TargetFieldWithRange label="Calories range" suffix="kcal" minValue={targetDraft.kcalMin} maxValue={targetDraft.kcalMax} onMinChange={(v) => updateTargetsDraft("kcalMin", v)} onMaxChange={(v) => updateTargetsDraft("kcalMax", v)} onBlur={commitAllTargets} />
                <TargetField label="Protein" suffix="g" value={String(targetDraft.protein)} onChange={(v) => updateTargetsDraft("protein", v)} onBlur={commitAllTargets} placeholder="180" />
                <TargetFieldWithRange label="Protein range" suffix="g" minValue={targetDraft.proteinMin} maxValue={targetDraft.proteinMax} onMinChange={(v) => updateTargetsDraft("proteinMin", v)} onMaxChange={(v) => updateTargetsDraft("proteinMax", v)} onBlur={commitAllTargets} />
                <TargetField label="Carbs" suffix="g" value={String(targetDraft.carbs)} onChange={(v) => updateTargetsDraft("carbs", v)} onBlur={commitAllTargets} placeholder="220" />
                <TargetFieldWithRange label="Carbs range" suffix="g" minValue={targetDraft.carbsMin} maxValue={targetDraft.carbsMax} onMinChange={(v) => updateTargetsDraft("carbsMin", v)} onMaxChange={(v) => updateTargetsDraft("carbsMax", v)} onBlur={commitAllTargets} />
                <TargetField label="Fat" suffix="g" value={String(targetDraft.fat)} onChange={(v) => updateTargetsDraft("fat", v)} onBlur={commitAllTargets} placeholder="70" />
                <TargetFieldWithRange label="Fat range" suffix="g" minValue={targetDraft.fatMin} maxValue={targetDraft.fatMax} onMinChange={(v) => updateTargetsDraft("fatMin", v)} onMaxChange={(v) => updateTargetsDraft("fatMax", v)} onBlur={commitAllTargets} />
              </div>

              <Button type="button" variant="outline" className="mt-4 w-full rounded-full" onClick={() => setSavePresetOpen(true)}>
                Save current targets as preset
              </Button>
              <div className="mt-5 grid grid-cols-2 gap-2.5 text-xs">
                <Badge variant="secondary" className={cn("justify-between rounded-full px-3 py-1.5", kcalOver ? "border border-rose-200 bg-rose-100 text-rose-700" : "bg-secondary text-secondary-foreground")}>
                  kcal <span>{Math.round(dayTotals.kcal)} / {activeDay.targets.kcal}</span>
                </Badge>
                <Badge variant="secondary" className={cn("justify-between rounded-full border px-3 py-1.5", proteinHit ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-amber-200 bg-amber-100 text-amber-700")}>
                  protein <span>{Math.round(dayTotals.protein)}g / {activeDay.targets.protein}g</span>
                </Badge>
                <Badge variant="secondary" className="justify-between rounded-full px-3 py-1.5">carbs <span>{Math.round(dayTotals.carbs)}g / {activeDay.targets.carbs}g</span></Badge>
                <Badge variant="secondary" className="justify-between rounded-full px-3 py-1.5">fat <span>{Math.round(dayTotals.fat)}g / {activeDay.targets.fat}g</span></Badge>
              </div>
              {proteinHit && !kcalOver && (
                <p className="mt-3 text-xs font-medium text-emerald-600">This day looks on target—use it as your reference when eating.</p>
              )}
              <Button type="button" className="mt-6 w-full rounded-full" onClick={goToMeals}>
                Next: Set up meals
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <Button type="button" variant="outline" className="mt-3 w-full rounded-full border-primary/40" onClick={() => setLogPlanSheetOpen(true)}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Log this plan to a date…
              </Button>
            </Card>
          </motion.div>
        )}

        {/* ─── Step 3: Day of eating (meals) ────────────────────────────── */}
        {viewStep === "meals" && activeDay && (
          <motion.div
            key="meals"
            className={cn(showHeader ? "mt-6" : "mt-4", "pb-24")}
            {...PANEL_TRANSITION}
          >
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" size="icon" className="rounded-full shrink-0" onClick={goBackToTargets} aria-label="Back to targets">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-widest text-primary/90">Day of eating</p>
                <h2 className="text-lg font-display font-semibold text-foreground truncate">{activeDay.name}</h2>
              </div>
            </div>

            <p className="mt-3 text-sm text-muted-foreground">
              Add foods to each meal. Tap ± to change servings; drag to reorder.
            </p>

      <Drawer open={logPlanSheetOpen} onOpenChange={setLogPlanSheetOpen}>
        <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-6 overflow-hidden">
          <div className="aura-sheet-scroll px-4 pb-4">
            <div className="pt-1">
              <p className="text-xs uppercase tracking-[0.2em] text-primary">Log this plan</p>
              <h3 className="mt-1 text-lg font-display font-semibold text-foreground">
                {activeDay?.name ?? "Plan"}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Pick which day to log this plan to. You can then add meals one-by-one or log the full day.
              </p>
            </div>
            <div className="mt-6 flex flex-col gap-3">
              <Button
                type="button"
                className="w-full rounded-full"
                onClick={() => {
                  if (!activeDay) return;
                  const planItems = items.filter((item) => dayMeals.some((m) => m.id === item.mealId));
                  setLogPlanSheetOpen(false);
                  navigate("/nutrition", {
                    state: {
                      suggestedPlanDay: {
                        id: activeDay.id,
                        name: activeDay.name,
                        meals: dayMeals,
                        items: planItems,
                      },
                      targetDate: toLocalDate(new Date()),
                    },
                  });
                }}
              >
                Log to Today
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full"
                onClick={() => {
                  if (!activeDay) return;
                  const planItems = items.filter((item) => dayMeals.some((m) => m.id === item.mealId));
                  const tomorrow = new Date();
                  tomorrow.setDate(tomorrow.getDate() + 1);
                  setLogPlanSheetOpen(false);
                  navigate("/nutrition", {
                    state: {
                      suggestedPlanDay: {
                        id: activeDay.id,
                        name: activeDay.name,
                        meals: dayMeals,
                        items: planItems,
                      },
                      targetDate: toLocalDate(tomorrow),
                    },
                  });
                }}
              >
                Log to Tomorrow
              </Button>
              <div className="flex flex-col gap-2">
                <label htmlFor="log-plan-date" className="text-xs font-medium text-muted-foreground">
                  Or pick a date
                </label>
                <div className="flex gap-2">
                  <Input
                    id="log-plan-date"
                    type="date"
                    className="rounded-full flex-1"
                    value={logPlanCustomDate}
                    onChange={(e) => setLogPlanCustomDate(e.target.value)}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-full shrink-0"
                    disabled={!logPlanCustomDate}
                    onClick={() => {
                      if (!activeDay || !logPlanCustomDate) return;
                      const planItems = items.filter((item) => dayMeals.some((m) => m.id === item.mealId));
                      setLogPlanSheetOpen(false);
                      navigate("/nutrition", {
                        state: {
                          suggestedPlanDay: {
                            id: activeDay.id,
                            name: activeDay.name,
                            meals: dayMeals,
                            items: planItems,
                          },
                          targetDate: logPlanCustomDate,
                        },
                      });
                    }}
                  >
                    Log
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </DrawerContent>
      </Drawer>

            <motion.div
              className="mt-6"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: 0.04 } } }}
            >
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext
          items={dayMeals.map((meal) => `meal:${meal.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-4">
            {dayMeals.map((meal) => {
              const mealItems = mealItemsMap.get(meal.id) ?? [];
              const mealTotals = getTotals(mealItems);
              const grouped = SLOT_CONFIG.map((slot) => ({
                ...slot,
                items: mealItems.filter((item) => item.slot === slot.id),
              }));

              return (
                <motion.div key={meal.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}>
                <SortableMealCard
                  id={`meal:${meal.id}`}
                  className={cn(
                    "rounded-[24px] border border-border/40 bg-card/95 px-4 py-4 shadow-sm transition-shadow",
                    pulseMealId === meal.id && "ring-2 ring-primary/30 shadow-md",
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
                            <p className="text-[11px] opacity-70">
                              No items yet. Add food to get closer to your targets.
                            </p>
                          ) : (
                            <SortableContext
                              items={slot.items.map((item) => `item:${item.id}`)}
                              strategy={verticalListSortingStrategy}
                            >
                              {slot.items.map((item) => {
                                const qty = item.quantity || 1;
                                const step = 0.25;
                                const setQuantity = (newQty: number) => {
                                  const clamped = Math.max(0.25, Math.min(20, Math.round(newQty * 100) / 100));
                                  void patchItem(item.id, { quantity: clamped });
                                };
                                return (
                                  <SortableMealItemRow
                                    key={item.id}
                                    id={`item:${item.id}`}
                                    rightContent={
                                      <div className="flex shrink-0 items-center gap-0.5">
                                        <div className="flex items-center rounded-full border border-border/60 bg-muted/40">
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-l-full"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              triggerLightFeedback();
                                              setQuantity(qty - step);
                                            }}
                                            aria-label="Decrease quantity"
                                          >
                                            <Minus className="h-3 w-3" />
                                          </Button>
                                          <span className="min-w-[2.25rem] py-0.5 text-center text-xs tabular-nums text-foreground">
                                            {qty % 1 === 0 ? qty : qty.toFixed(2)}
                                          </span>
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 rounded-r-full"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              triggerLightFeedback();
                                              setQuantity(qty + step);
                                            }}
                                            aria-label="Increase quantity"
                                          >
                                            <Plus className="h-3 w-3" />
                                          </Button>
                                        </div>
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-7 w-7 shrink-0 rounded-full"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            removeMealItem(item.id);
                                          }}
                                          aria-label="Remove food"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                      </div>
                                    }
                                  >
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
                                        {Math.round(item.kcal * qty)} cal · P{" "}
                                        {Math.round(item.protein * qty)} · C{" "}
                                        {Math.round(item.carbs * qty)} · F{" "}
                                        {Math.round(item.fat * qty)}
                                      </p>
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
                </SortableMealCard>
                </motion.div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
            </motion.div>

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

            {/* Sticky Save — finalize day */}
            <div className="sticky bottom-0 left-0 right-0 z-10 mt-6 flex justify-center pt-4 pb-6 bg-gradient-to-t from-background via-background/98 to-transparent">
              <Button
                type="button"
                className="rounded-full shadow-lg min-w-[200px]"
                onClick={() => {
                  triggerLightFeedback();
                  toast.success("Changes saved", { description: `${activeDay?.name ?? "Day"} is up to date.` });
                }}
              >
                <Check className="mr-2 h-4 w-4" />
                Save changes
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Save as preset dialog */}
      <Dialog open={savePresetOpen} onOpenChange={setSavePresetOpen}>
        <DialogContent className="rounded-[24px] border-border/40 bg-card max-w-[min(360px,92vw)]">
          <DialogHeader>
            <DialogTitle>Save as preset</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Save your current target numbers (and ranges) so you can apply them to other days.
          </p>
          <Input
            value={presetNameDraft}
            onChange={(e) => setPresetNameDraft(e.target.value)}
            placeholder="Preset name (e.g. High protein)"
            className="rounded-full"
            onKeyDown={(e) => e.key === "Enter" && handleSaveAsPreset()}
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" className="rounded-full" onClick={() => setSavePresetOpen(false)}>
              Cancel
            </Button>
            <Button type="button" className="rounded-full" onClick={handleSaveAsPreset}>
              Save preset
            </Button>
          </div>
        </DialogContent>
      </Dialog>
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

const TargetFieldWithRange = ({
  label,
  suffix,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  onBlur,
}: {
  label: string;
  suffix: string;
  minValue: number | null | undefined;
  maxValue: number | null | undefined;
  onMinChange: (value: string) => void;
  onMaxChange: (value: string) => void;
  onBlur: () => void;
}) => (
  <div className="rounded-2xl border border-border/40 bg-muted/20 px-3 py-2.5">
    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
      {label}
    </p>
    <div className="mt-1 flex items-center gap-2">
      <Input
        value={minValue != null && minValue !== 0 ? String(minValue) : ""}
        onChange={(e) => onMinChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Min"
        inputMode="decimal"
        className="h-8 flex-1 rounded-full border-border/60 bg-card/85"
      />
      <span className="text-muted-foreground/70">–</span>
      <Input
        value={maxValue != null && maxValue !== 0 ? String(maxValue) : ""}
        onChange={(e) => onMaxChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Max"
        inputMode="decimal"
        className="h-8 flex-1 rounded-full border-border/60 bg-card/85"
      />
      <span className="min-w-6 text-right text-xs font-semibold text-muted-foreground">{suffix}</span>
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
  rightContent,
}: {
  id: string;
  children: ReactNode;
  rightContent?: ReactNode;
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
      {rightContent}
    </div>
  );
};

const MealPlansBuilder = () => (
  <AppShell experience="nutrition">
    <MealPlansContent />
  </AppShell>
);

export default MealPlansBuilder;
