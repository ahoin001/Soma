import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
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
import { Drawer, DrawerContent, DrawerStickyActions } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { ListEmptyState } from "@/components/ui/empty-state";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { fetchFoodById, fetchFoodHistory, searchFoods } from "@/lib/api";
import { normalizeFoodImageUrl } from "@/lib/foodImageUrl";
import { toLocalDate } from "@/lib/nutritionData";
import { MEAL_PLAN_TEMPLATES_KEY } from "@/lib/storageKeys";
import { cn } from "@/lib/utils";
import { useMealPlans } from "@/hooks/useMealPlans";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePendingMutationsCount } from "@/hooks/useOfflineQueue";
import type { FoodRecord } from "@/types/api";
import {
  AlertCircle,
  ArrowLeft,
  ChevronDown,
  Copy,
  History,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  ClipboardList,
  Check,
  X,
} from "lucide-react";
import { appToast } from "@/lib/toast";

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
  imageUrl: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  micronutrients: Record<string, unknown>;
};

type MealTemplateItem = {
  foodId: string | null;
  foodName: string;
  quantity: number;
  slot: MealPlanSlot;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

type MealPlanTemplate = {
  id: string;
  name: string;
  items: MealTemplateItem[];
  createdAt: number;
};

type UndoAction = {
  id: string;
  label: string;
  createdAt: number;
  undo: () => void | Promise<void>;
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

type ViewStep = "days" | "planner";

const PANEL_TRANSITION = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -16 },
  transition: { duration: 0.28, ease: [0.22, 1, 0.36, 1] },
};
const EASE_CALM: [number, number, number, number] = [0.22, 1, 0.36, 1];
const TRANSITION_FAST = { duration: 0.22, ease: EASE_CALM };
const TRANSITION_MEDIUM = { duration: 0.3, ease: EASE_CALM };
const STAGGER_CALM = 0.055;


const coerceNumber = (value: string, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
};

const macroDiffers = (a: number, b: number, epsilon = 0.5) => Math.abs(a - b) > epsilon;

const readMealPlanTemplates = (): MealPlanTemplate[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(MEAL_PLAN_TEMPLATES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as MealPlanTemplate[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry?.id && entry?.name && Array.isArray(entry?.items));
  } catch {
    return [];
  }
};

const writeMealPlanTemplates = (templates: MealPlanTemplate[]) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MEAL_PLAN_TEMPLATES_KEY, JSON.stringify(templates));
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

type CoreMicroKey = "fiber_g" | "sodium_mg" | "potassium_mg";

type CoreMicroSnapshot = Record<CoreMicroKey, number>;

const CORE_MICRO_GUIDE: Record<CoreMicroKey, { label: string; unit: string; target: number; mode: "goal" | "limit" }> = {
  fiber_g: { label: "Fiber", unit: "g", target: 30, mode: "goal" },
  sodium_mg: { label: "Sodium", unit: "mg", target: 2300, mode: "limit" },
  potassium_mg: { label: "Potassium", unit: "mg", target: 3500, mode: "goal" },
};

const CORE_MICRO_ALIAS_KEYS: Record<CoreMicroKey, string[]> = {
  fiber_g: ["fiber_g", "fiber", "fiberG", "dietary_fiber", "dietaryFiber"],
  sodium_mg: ["sodium_mg", "sodium", "sodiumMg"],
  potassium_mg: ["potassium_mg", "potassium", "potassiumMg"],
};

const EMPTY_CORE_MICROS: CoreMicroSnapshot = {
  fiber_g: 0,
  sodium_mg: 0,
  potassium_mg: 0,
};

const readCoreMicros = (food: FoodRecord): CoreMicroSnapshot => {
  const micros = ((food.micronutrients as Record<string, unknown> | null) ?? {}) as Record<string, unknown>;
  const out: CoreMicroSnapshot = { ...EMPTY_CORE_MICROS };
  (Object.keys(CORE_MICRO_ALIAS_KEYS) as CoreMicroKey[]).forEach((key) => {
    const typedVal = toNum((food as Record<string, unknown>)[key], NaN);
    if (Number.isFinite(typedVal)) {
      out[key] = typedVal;
      return;
    }
    const match = CORE_MICRO_ALIAS_KEYS[key]
      .map((alias) => toNum(micros[alias], NaN))
      .find((n) => Number.isFinite(n));
    out[key] = Number.isFinite(match as number) ? (match as number) : 0;
  });
  return out;
};

const mapFoodRecord = (row: FoodRecord): DbFoodOption => ({
  id: row.id,
  name: row.name,
  brand: row.brand_name ?? row.brand ?? null,
  imageUrl: normalizeFoodImageUrl(row.image_url),
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

type MealPlansContentProps = { showHeader?: boolean };

export const MealPlansContent = ({ showHeader = true }: MealPlansContentProps) => {
  const {
    groups,
    days,
    meals,
    items,
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
    presets,
    createPreset,
    deletePreset,
  } = useMealPlans();

  const [activeDayId, setActiveDayId] = useState<string | null>(null);
  const [viewStep, setViewStep] = useState<ViewStep>("days");
  const [showAdvancedTargets, setShowAdvancedTargets] = useState(false);
  const [showCoreMicros, setShowCoreMicros] = useState(false);
  const [coreMicrosLoading, setCoreMicrosLoading] = useState(false);
  const [coreMicrosByFoodId, setCoreMicrosByFoodId] = useState<Record<string, CoreMicroSnapshot>>({});
  const [focusedMealId, setFocusedMealId] = useState<string | null>(null);
  const [plannerSection, setPlannerSection] = useState<"targets" | "progress" | "meals">("targets");
  const [newDayName, setNewDayName] = useState("");
  const [targetDraft, setTargetDraft] = useState(DEFAULT_TARGETS);
  const [pulseMealId, setPulseMealId] = useState<string | null>(null);
  const [foodSheetOpen, setFoodSheetOpen] = useState(false);
  const [foodSheetMealId, setFoodSheetMealId] = useState<string | null>(null);
  const [foodQuery, setFoodQuery] = useState("");
  const [foodQuantityDraft, setFoodQuantityDraft] = useState("1");
  const [selectedFoodOrder, setSelectedFoodOrder] = useState<string[]>([]);
  const [selectedFoodsById, setSelectedFoodsById] = useState<Record<string, DbFoodOption>>({});
  const [showSelectedOnly, setShowSelectedOnly] = useState(false);
  const [foodSearchStatus, setFoodSearchStatus] = useState<"idle" | "loading" | "error">("idle");
  const [foodSearchError, setFoodSearchError] = useState<string | null>(null);
  const [foodOptions, setFoodOptions] = useState<DbFoodOption[]>([]);
  const [duplicateMealSheetOpen, setDuplicateMealSheetOpen] = useState(false);
  const [duplicateSourceMealId, setDuplicateSourceMealId] = useState<string | null>(null);
  const [duplicateTargetDayId, setDuplicateTargetDayId] = useState<string | null>(null);
  const [duplicateTargetMealId, setDuplicateTargetMealId] = useState<string | null>(null);
  const [copyDaySheetOpen, setCopyDaySheetOpen] = useState(false);
  const [copyTargetDayId, setCopyTargetDayId] = useState<string | null>(null);
  const [mealTemplates, setMealTemplates] = useState<MealPlanTemplate[]>([]);
  const [mealTemplateNameDraft, setMealTemplateNameDraft] = useState("");
  const [templatePickerMealId, setTemplatePickerMealId] = useState<string | null>(null);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [undoHistoryOpen, setUndoHistoryOpen] = useState(false);
  const [undoHistory, setUndoHistory] = useState<UndoAction[]>([]);
  const [foodSyncById, setFoodSyncById] = useState<Record<string, DbFoodOption>>({});
  const [foodSyncLoading, setFoodSyncLoading] = useState(false);
  const [editingDayName, setEditingDayName] = useState<string | null>(null);
  const [dayNameDraft, setDayNameDraft] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const searchRequestRef = useRef(0);
  const foodSearchCacheRef = useRef<Map<string, DbFoodOption[]>>(new Map());
  const navigate = useNavigate();
  const [selectedGroupFilterId, setSelectedGroupFilterId] = useState<string | null>(null);
  const [logPlanSheetOpen, setLogPlanSheetOpen] = useState(false);
  const [logPlanCustomDate, setLogPlanCustomDate] = useState("");
  const [savePresetOpen, setSavePresetOpen] = useState(false);
  const [presetNameDraft, setPresetNameDraft] = useState("");
  const isOnline = useOnlineStatus();
  const pendingMutations = usePendingMutationsCount();
  const targetsSectionRef = useRef<HTMLDivElement | null>(null);
  const progressSectionRef = useRef<HTMLDivElement | null>(null);
  const mealsSectionRef = useRef<HTMLDivElement | null>(null);

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
  const duplicateSourceMeal = useMemo(
    () => meals.find((meal) => meal.id === duplicateSourceMealId) ?? null,
    [meals, duplicateSourceMealId],
  );
  const templatePickerMeal = useMemo(
    () => meals.find((meal) => meal.id === templatePickerMealId) ?? null,
    [meals, templatePickerMealId],
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
  const mealsByDayId = useMemo(() => {
    const grouped = new Map<string, typeof meals>();
    days.forEach((day) => {
      grouped.set(
        day.id,
        meals.filter((meal) => meal.dayId === day.id).sort((a, b) => a.sortOrder - b.sortOrder),
      );
    });
    return grouped;
  }, [days, meals]);
  const duplicateTargetDayMeals = useMemo(
    () => (duplicateTargetDayId ? mealsByDayId.get(duplicateTargetDayId) ?? [] : []),
    [duplicateTargetDayId, mealsByDayId],
  );
  const selectedFoods = useMemo(
    () => selectedFoodOrder.map((id) => selectedFoodsById[id]).filter(Boolean),
    [selectedFoodOrder, selectedFoodsById],
  );
  const visibleFoodOptions = useMemo(() => {
    if (!showSelectedOnly) return foodOptions;
    const selectedIdSet = new Set(selectedFoodOrder);
    return foodOptions.filter((food) => selectedIdSet.has(food.id));
  }, [showSelectedOnly, foodOptions, selectedFoodOrder]);
  const selectedOnlyHiddenCount = Math.max(0, foodOptions.length - visibleFoodOptions.length);

  useEffect(() => {
    setMealTemplates(readMealPlanTemplates());
  }, []);

  useEffect(() => {
    if (!dayMeals.length) {
      setFocusedMealId(null);
      return;
    }
    if (!focusedMealId || !dayMeals.some((meal) => meal.id === focusedMealId)) {
      setFocusedMealId(dayMeals[0].id);
    }
  }, [dayMeals, focusedMealId]);

  useEffect(() => {
    if (!duplicateMealSheetOpen) return;
    if (!duplicateSourceMeal) {
      setDuplicateTargetDayId(null);
      setDuplicateTargetMealId(null);
      return;
    }
    setDuplicateTargetDayId((prev) => prev ?? duplicateSourceMeal.dayId);
  }, [duplicateMealSheetOpen, duplicateSourceMeal]);

  useEffect(() => {
    if (!duplicateMealSheetOpen) return;
    if (!duplicateTargetDayId) {
      setDuplicateTargetMealId(null);
      return;
    }
    const dayMealsForTarget = mealsByDayId.get(duplicateTargetDayId) ?? [];
    if (!dayMealsForTarget.length) {
      setDuplicateTargetMealId(null);
      return;
    }
    setDuplicateTargetMealId((prev) => {
      if (prev && dayMealsForTarget.some((meal) => meal.id === prev)) return prev;
      return dayMealsForTarget[0].id;
    });
  }, [duplicateMealSheetOpen, duplicateTargetDayId, mealsByDayId]);

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

  const dayItems = useMemo(() => {
    if (!activeDay) return [];
    const dayMealIds = new Set(dayMeals.map((meal) => meal.id));
    return items.filter((item) => dayMealIds.has(item.mealId));
  }, [activeDay, dayMeals, items]);

  const dayFoodIds = useMemo(
    () => Array.from(new Set(dayItems.map((item) => item.foodId).filter((id): id is string => Boolean(id)))),
    [dayItems],
  );
  const stalePlanItems = useMemo(
    () =>
      dayItems.filter((item) => {
        if (!item.foodId) return false;
        const sourceFood = foodSyncById[item.foodId];
        if (!sourceFood) return false;
        return (
          item.foodName !== sourceFood.name
          || macroDiffers(item.kcal, sourceFood.kcal)
          || macroDiffers(item.protein, sourceFood.protein)
          || macroDiffers(item.carbs, sourceFood.carbs)
          || macroDiffers(item.fat, sourceFood.fat)
        );
      }),
    [dayItems, foodSyncById],
  );

  const hasUnsavedTargets = useMemo(() => {
    if (!activeDay) return false;
    const keys: Array<keyof typeof DEFAULT_TARGETS> = [
      "kcal",
      "protein",
      "carbs",
      "fat",
      "kcalMin",
      "kcalMax",
      "proteinMin",
      "proteinMax",
      "carbsMin",
      "carbsMax",
      "fatMin",
      "fatMax",
    ];
    return keys.some((key) => (targetDraft[key] ?? null) !== (activeDay.targets[key] ?? null));
  }, [activeDay, targetDraft]);

  useEffect(() => {
    const missingFoodIds = dayFoodIds.filter((foodId) => !coreMicrosByFoodId[foodId]);
    if (!missingFoodIds.length) return;
    let cancelled = false;
    setCoreMicrosLoading(true);
    void Promise.allSettled(
      missingFoodIds.map(async (foodId) => {
        const response = await fetchFoodById(foodId);
        return { foodId, snapshot: response.item ? readCoreMicros(response.item) : EMPTY_CORE_MICROS };
      }),
    )
      .then((results) => {
        if (cancelled) return;
        const next: Record<string, CoreMicroSnapshot> = {};
        results.forEach((result, idx) => {
          const fallbackId = missingFoodIds[idx];
          if (result.status === "fulfilled") {
            next[result.value.foodId] = result.value.snapshot;
          } else if (fallbackId) {
            next[fallbackId] = EMPTY_CORE_MICROS;
          }
        });
        if (Object.keys(next).length) {
          setCoreMicrosByFoodId((prev) => ({ ...prev, ...next }));
        }
      })
      .finally(() => {
        if (!cancelled) setCoreMicrosLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dayFoodIds, coreMicrosByFoodId]);

  useEffect(() => {
    const missingFoodIds = dayFoodIds.filter((foodId) => !foodSyncById[foodId]);
    if (!missingFoodIds.length) return;
    let cancelled = false;
    setFoodSyncLoading(true);
    void Promise.allSettled(
      missingFoodIds.map(async (foodId) => {
        const response = await fetchFoodById(foodId);
        return { foodId, item: response.item ? mapFoodRecord(response.item) : null };
      }),
    )
      .then((results) => {
        if (cancelled) return;
        const next: Record<string, DbFoodOption> = {};
        results.forEach((result) => {
          if (result.status === "fulfilled" && result.value.item) {
            next[result.value.foodId] = result.value.item;
          }
        });
        if (Object.keys(next).length) {
          setFoodSyncById((prev) => ({ ...prev, ...next }));
        }
      })
      .finally(() => {
        if (!cancelled) setFoodSyncLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dayFoodIds, foodSyncById]);

  const coreMicroTotals = useMemo(() => {
    const totals: CoreMicroSnapshot = { ...EMPTY_CORE_MICROS };
    dayItems.forEach((item) => {
      if (!item.foodId) return;
      const micros = coreMicrosByFoodId[item.foodId];
      if (!micros) return;
      const qty = item.quantity || 1;
      totals.fiber_g += micros.fiber_g * qty;
      totals.sodium_mg += micros.sodium_mg * qty;
      totals.potassium_mg += micros.potassium_mg * qty;
    });
    return totals;
  }, [dayItems, coreMicrosByFoodId]);

  const coreMicrosCoverage = useMemo(() => {
    const withLinkedFood = dayItems.filter((item) => Boolean(item.foodId)).length;
    const withMicrosLoaded = dayItems.filter(
      (item) => item.foodId && coreMicrosByFoodId[item.foodId] != null,
    ).length;
    return { withLinkedFood, withMicrosLoaded, totalItems: dayItems.length };
  }, [dayItems, coreMicrosByFoodId]);

  const scrollToPlannerSection = useCallback((section: "targets" | "progress" | "meals") => {
    setPlannerSection(section);
    const ref =
      section === "targets" ? targetsSectionRef : section === "progress" ? progressSectionRef : mealsSectionRef;
    ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useEffect(() => {
    if (viewStep !== "planner" || !activeDay) return;

    let ticking = false;
    const pickActiveSection = () => {
      const markerY = 132;
      const sections: Array<{ key: "targets" | "progress" | "meals"; top: number }> = [
        { key: "targets", top: targetsSectionRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY },
        { key: "progress", top: progressSectionRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY },
        { key: "meals", top: mealsSectionRef.current?.getBoundingClientRect().top ?? Number.POSITIVE_INFINITY },
      ];

      const valid = sections.filter((section) => Number.isFinite(section.top));
      if (!valid.length) return;

      const passed = valid.filter((section) => section.top <= markerY);
      const next = passed.length
        ? passed[passed.length - 1].key
        : valid.slice().sort((a, b) => a.top - b.top)[0].key;
      setPlannerSection((prev) => (prev === next ? prev : next));
    };

    const onScrollOrResize = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        ticking = false;
        pickActiveSection();
      });
    };

    pickActiveSection();
    window.addEventListener("scroll", onScrollOrResize, { passive: true });
    window.addEventListener("resize", onScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [viewStep, activeDay]);

  useEffect(() => {
    if (!foodSheetOpen) return;
    const requestId = ++searchRequestRef.current;
    const queryKey = foodQuery.trim().toLowerCase() || "__recent__";
    const cached = foodSearchCacheRef.current.get(queryKey);
    if (cached) {
      setFoodOptions(cached);
      setFoodSearchStatus("idle");
      setFoodSearchError(null);
      return;
    }
    setFoodSearchStatus("loading");
    setFoodSearchError(null);

    const timer = window.setTimeout(async () => {
      try {
        const trimmed = foodQuery.trim();
        const response = trimmed.length
          ? await searchFoods(trimmed, 40, false)
          : await fetchFoodHistory(40);
        if (requestId !== searchRequestRef.current) return;
        const mapped = (response.items ?? []).map(mapFoodRecord);
        foodSearchCacheRef.current.set(queryKey, mapped);
        setFoodOptions(mapped);
        setFoodSearchStatus("idle");
      } catch (searchError) {
        if (requestId !== searchRequestRef.current) return;
        setFoodSearchStatus("error");
        setFoodSearchError(
          searchError instanceof Error ? searchError.message : "Unable to load foods.",
        );
      }
    }, 160);

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
      appToast.success("Preset saved", { description: name });
    });
  };

  const openFoodPicker = (mealId: string) => {
    setFoodSheetMealId(mealId);
    setFoodSheetOpen(true);
    setFoodQuery("");
    setFoodQuantityDraft("1");
    setShowSelectedOnly(false);
    setSelectedFoodOrder([]);
    setSelectedFoodsById({});
  };

  const toggleFoodSelection = (food: DbFoodOption) => {
    const isSelected = selectedFoodOrder.includes(food.id);
    if (isSelected) {
      setSelectedFoodOrder((prev) => prev.filter((id) => id !== food.id));
      setSelectedFoodsById((prev) => {
        const next = { ...prev };
        delete next[food.id];
        return next;
      });
      triggerLightFeedback();
      return;
    }
    setSelectedFoodOrder((prev) => [...prev, food.id]);
    setSelectedFoodsById((prev) => ({ ...prev, [food.id]: food }));
    triggerLightFeedback();
  };

  const removeSelectedFood = (foodId: string) => {
    triggerLightFeedback();
    setSelectedFoodOrder((prev) => prev.filter((id) => id !== foodId));
    setSelectedFoodsById((prev) => {
      const next = { ...prev };
      delete next[foodId];
      return next;
    });
  };

  const clearSelectedFoods = () => {
    triggerLightFeedback();
    setSelectedFoodOrder([]);
    setSelectedFoodsById({});
    setShowSelectedOnly(false);
  };

  const addSelectedFoodsToMeal = () => {
    if (!foodSheetMealId || selectedFoods.length === 0) return;
    const mealId = foodSheetMealId;
    const quantity = Math.max(0.25, coerceNumber(foodQuantityDraft, 1));
    const addQueue = selectedFoods.map((food) => ({
      foodId: food.id,
      foodName: food.name,
      quantity,
      slot: inferSlot(food),
      kcal: food.kcal,
      protein: food.protein,
      carbs: food.carbs,
      fat: food.fat,
    }));
    void (async () => {
      for (const payload of addQueue) {
        await addItem(mealId, payload);
      }
      setPulseMealId(mealId);
      window.setTimeout(() => setPulseMealId(null), 280);
      appToast.success("Foods added", {
        description: `${addQueue.length} item${addQueue.length === 1 ? "" : "s"} added to ${activeMealForFoodSheet?.label ?? "meal"}.`,
      });
      setFoodSheetOpen(false);
      clearSelectedFoods();
      setFoodQuery("");
      triggerLightFeedback();
    })().catch((error) => {
      appToast.error(error instanceof Error ? error.message : "Unable to add selected foods.");
    });
  };

  const removeMealItem = (itemId: string) => {
    void removeItem(itemId);
    triggerLightFeedback();
  };

  const restoreItemsToMeal = async (
    mealId: string,
    mealItems: MealTemplateItem[],
  ) => {
    for (const item of mealItems) {
      await addItem(mealId, {
        foodId: item.foodId,
        foodName: item.foodName,
        quantity: item.quantity,
        slot: item.slot,
        kcal: item.kcal,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      });
    }
  };

  const pushUndoAction = (label: string, undo: () => void | Promise<void>) => {
    const action: UndoAction = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label,
      createdAt: Date.now(),
      undo,
    };
    setUndoHistory((prev) => [action, ...prev].slice(0, 12));
    return action;
  };

  const runUndoAction = (action: UndoAction) => {
    triggerLightFeedback();
    void Promise.resolve(action.undo())
      .then(() => {
        setUndoHistory((prev) => prev.filter((entry) => entry.id !== action.id));
        appToast.success("Undid action", { description: action.label });
      })
      .catch((error) => {
        appToast.error(error instanceof Error ? error.message : "Unable to undo this action.");
      });
  };

  const clearMealItems = (mealId: string) => {
    triggerLightFeedback();
    const mealItems = mealItemsMap.get(mealId) ?? [];
    if (!mealItems.length) {
      appToast.info("Meal is already empty.");
      return;
    }
    const snapshot = mealItems.map((item) => ({
      foodId: item.foodId,
      foodName: item.foodName,
      quantity: item.quantity,
      slot: item.slot,
      kcal: item.kcal,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
    }));
    void Promise.all(mealItems.map((item) => removeItem(item.id)))
      .then(() => {
        const undo = pushUndoAction("Clear meal", () => restoreItemsToMeal(mealId, snapshot));
        appToast.success("Meal cleared", {
          description: `${mealItems.length} item${mealItems.length === 1 ? "" : "s"} removed.`,
          action: {
            label: "Undo",
            onClick: () => runUndoAction(undo),
          },
        });
      })
      .catch((error) => {
        appToast.error(error instanceof Error ? error.message : "Unable to clear meal.");
      });
  };

  const openDuplicateMealSheet = (mealId: string) => {
    triggerLightFeedback();
    setDuplicateSourceMealId(mealId);
    setDuplicateMealSheetOpen(true);
  };

  const duplicateMealItemsToTarget = () => {
    triggerLightFeedback();
    if (!duplicateSourceMealId || !duplicateTargetMealId) return;
    const mealItems = mealItemsMap.get(duplicateSourceMealId) ?? [];
    if (!mealItems.length) {
      appToast.info("Add at least one food to duplicate this meal.");
      return;
    }
    const snapshot = mealItems.map((item) => ({
      foodId: item.foodId,
      foodName: item.foodName,
      quantity: item.quantity,
      slot: item.slot,
      kcal: item.kcal,
      protein: item.protein,
      carbs: item.carbs,
      fat: item.fat,
    }));
    const targetMealId = duplicateTargetMealId;
    void restoreItemsToMeal(targetMealId, snapshot)
      .then(() => {
        setDuplicateMealSheetOpen(false);
        const undo = pushUndoAction("Duplicate meal", async () => {
          const targetMealItems = items
            .filter((item) => item.mealId === targetMealId)
            .slice(-snapshot.length);
          await Promise.all(targetMealItems.map((item) => removeItem(item.id)));
        });
        const sourceMeal = meals.find((meal) => meal.id === duplicateSourceMealId);
        const targetMeal = meals.find((meal) => meal.id === targetMealId);
        appToast.success("Meal duplicated", {
          description: `${snapshot.length} item${snapshot.length === 1 ? "" : "s"} copied from ${sourceMeal?.label ?? "meal"} to ${targetMeal?.label ?? "meal"}.`,
          action: { label: "Undo", onClick: () => runUndoAction(undo) },
        });
      })
      .catch((error) => {
        appToast.error(error instanceof Error ? error.message : "Unable to duplicate meal.");
      });
  };

  const clearActiveDay = () => {
    triggerLightFeedback();
    if (!activeDay) return;
    const mealIds = dayMeals.map((meal) => meal.id);
    const dayItemsSnapshot = items.filter((item) => mealIds.includes(item.mealId));
    if (!dayItemsSnapshot.length) {
      appToast.info("Day is already empty.");
      return;
    }
    void Promise.all(dayItemsSnapshot.map((item) => removeItem(item.id)))
      .then(() => {
        const undo = pushUndoAction("Clear day", async () => {
          for (const item of dayItemsSnapshot) {
            await addItem(item.mealId, {
              foodId: item.foodId,
              foodName: item.foodName,
              quantity: item.quantity,
              slot: item.slot,
              kcal: item.kcal,
              protein: item.protein,
              carbs: item.carbs,
              fat: item.fat,
            });
          }
        });
        appToast.success("Day cleared", {
          description: `${dayItemsSnapshot.length} food${dayItemsSnapshot.length === 1 ? "" : "s"} removed from ${activeDay.name}.`,
          action: { label: "Undo", onClick: () => runUndoAction(undo) },
        });
      })
      .catch((error) => {
        appToast.error(error instanceof Error ? error.message : "Unable to clear day.");
      });
  };

  const copyActiveDayToTarget = () => {
    triggerLightFeedback();
    if (!activeDay || !copyTargetDayId) return;
    const targetMeals = mealsByDayId.get(copyTargetDayId) ?? [];
    const targetMealByLabel = new Map(targetMeals.map((meal) => [meal.label.toLowerCase(), meal.id]));
    const sourceItems = items.filter((item) => {
      const sourceMeal = dayMeals.find((meal) => meal.id === item.mealId);
      return Boolean(sourceMeal);
    });
    if (!sourceItems.length) {
      appToast.info("Add foods to this day before copying.");
      return;
    }
    void (async () => {
      const copied: string[] = [];
      for (const item of sourceItems) {
        const sourceMeal = dayMeals.find((meal) => meal.id === item.mealId);
        if (!sourceMeal) continue;
        const targetMealId = targetMealByLabel.get(sourceMeal.label.toLowerCase()) ?? targetMeals[0]?.id;
        if (!targetMealId) continue;
        const created = await addItem(targetMealId, {
          foodId: item.foodId,
          foodName: item.foodName,
          quantity: item.quantity,
          slot: item.slot,
          kcal: item.kcal,
          protein: item.protein,
          carbs: item.carbs,
          fat: item.fat,
        });
        if (created?.id) copied.push(created.id);
      }
      setCopyDaySheetOpen(false);
      const undo = pushUndoAction("Copy day", async () => {
        await Promise.all(copied.map((id) => removeItem(id)));
      });
      const targetDay = days.find((day) => day.id === copyTargetDayId);
      appToast.success("Day copied", {
        description: `${sourceItems.length} planned food${sourceItems.length === 1 ? "" : "s"} copied to ${targetDay?.name ?? "target day"}.`,
        action: { label: "Undo", onClick: () => runUndoAction(undo) },
      });
    })().catch((error) => {
      appToast.error(error instanceof Error ? error.message : "Unable to copy day.");
    });
  };

  const saveMealAsTemplate = (mealId: string) => {
    triggerLightFeedback();
    const meal = meals.find((entry) => entry.id === mealId);
    const mealItems = mealItemsMap.get(mealId) ?? [];
    if (!meal || !mealItems.length) {
      appToast.info("Add foods to this meal before saving as template.");
      return;
    }
    const template: MealPlanTemplate = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: mealTemplateNameDraft.trim() || `${meal.label} template`,
      items: mealItems.map((item) => ({
        foodId: item.foodId,
        foodName: item.foodName,
        quantity: item.quantity,
        slot: item.slot,
        kcal: item.kcal,
        protein: item.protein,
        carbs: item.carbs,
        fat: item.fat,
      })),
      createdAt: Date.now(),
    };
    setMealTemplates((prev) => {
      const next = [template, ...prev].slice(0, 60);
      writeMealPlanTemplates(next);
      return next;
    });
    setMealTemplateNameDraft("");
    appToast.success("Template saved", { description: template.name });
  };

  const applyTemplateToMeal = (mealId: string, template: MealPlanTemplate) => {
    triggerLightFeedback();
    void restoreItemsToMeal(mealId, template.items)
      .then(() => {
        setTemplatePickerOpen(false);
        appToast.success("Template applied", { description: template.name });
      })
      .catch((error) => {
        appToast.error(error instanceof Error ? error.message : "Unable to apply template.");
      });
  };

  const deleteMealTemplate = (templateId: string) => {
    triggerLightFeedback();
    setMealTemplates((prev) => {
      const next = prev.filter((template) => template.id !== templateId);
      writeMealPlanTemplates(next);
      return next;
    });
  };

  const openTemplatePicker = (mealId: string) => {
    triggerLightFeedback();
    setTemplatePickerMealId(mealId);
    setTemplatePickerOpen(true);
  };

  const applySourceFoodUpdate = (itemId: string) => {
    triggerLightFeedback();
    const item = items.find((entry) => entry.id === itemId);
    if (!item?.foodId) return;
    const sourceFood = foodSyncById[item.foodId];
    if (!sourceFood) return;
    void patchItem(itemId, {
      foodName: sourceFood.name,
      kcal: sourceFood.kcal,
      protein: sourceFood.protein,
      carbs: sourceFood.carbs,
      fat: sourceFood.fat,
    });
    appToast.success("Updated from source", { description: sourceFood.name });
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
              Day templates to hit your targets - use as a reference when planning what to eat.
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

  const openPlannerForDay = (dayId: string) => {
    setActiveDayId(dayId);
    setShowAdvancedTargets(false);
    setShowCoreMicros(false);
    setPlannerSection("targets");
    setViewStep("planner");
    triggerLightFeedback();
  };

  const goBackToDays = () => {
    if (hasUnsavedTargets) {
      const shouldLeave = window.confirm(
        "You have unsaved target edits. Leave planner and discard them?",
      );
      if (!shouldLeave) return;
      if (activeDay) setTargetDraft(activeDay.targets);
    }
    setViewStep("days");
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
            Day templates to hit your targets - use as a reference when planning what to eat.
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* Step 1: Day manager */}
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
              <p className="text-sm font-medium text-foreground">Days manager</p>
              <p className="mt-1 text-xs text-muted-foreground">Select a day to manage targets and meals in one planner.</p>
              <div className="mt-4 space-y-2">
                {filteredDays.map((day) => (
                  <div
                    key={day.id}
                    className={cn(
                      "flex items-center gap-2 rounded-2xl border px-2 py-2 transition",
                      day.id === activeDayId
                        ? "border-primary/40 bg-primary/10"
                        : "border-border/50 bg-card",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => openPlannerForDay(day.id)}
                      className={cn(
                        "flex min-w-0 flex-1 items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition",
                        day.id === activeDayId
                          ? "text-primary"
                          : "text-muted-foreground hover:bg-muted/60",
                      )}
                    >
                      <span className="truncate">{day.name}</span>
                      <ChevronRight className="h-4 w-4 opacity-70" />
                    </button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-full text-muted-foreground hover:text-foreground"
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

          </motion.div>
        )}

        {/* Unified day planner */}
        {viewStep === "planner" && activeDay && (
          <motion.div
            key="meals"
            className={cn(showHeader ? "mt-6" : "mt-4", "pb-24")}
            {...PANEL_TRANSITION}
          >
            <div className="flex items-center gap-3">
              <Button type="button" variant="ghost" size="icon" className="rounded-full shrink-0" onClick={goBackToDays} aria-label="Back to days">
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-widest text-primary/90">Day planner</p>
                <h2 className="text-lg font-display font-semibold text-foreground truncate">{activeDay.name}</h2>
              </div>
              <Button type="button" variant="ghost" size="icon" className="rounded-full shrink-0" onClick={duplicateActiveDay} aria-label="Duplicate day">
                <Copy className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full shrink-0"
                onClick={() => {
                  triggerLightFeedback();
                  setCopyTargetDayId(days.find((day) => day.id !== activeDay.id)?.id ?? null);
                  setCopyDaySheetOpen(true);
                }}
                aria-label="Copy day to another day"
              >
                <Sparkles className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full shrink-0"
                onClick={() => {
                  triggerLightFeedback();
                  setUndoHistoryOpen(true);
                }}
                aria-label="Open undo history"
              >
                <History className="h-4 w-4" />
              </Button>
              <Button type="button" variant="ghost" size="icon" className="rounded-full shrink-0 text-destructive hover:text-destructive" onClick={deleteActiveDay} disabled={days.length <= 1} aria-label="Delete day">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 overflow-x-auto pb-1">
              <div className="flex min-w-0 gap-2">
                {filteredDays.map((day) => (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => openPlannerForDay(day.id)}
                    className={cn(
                      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
                      day.id === activeDay.id
                        ? "border-primary/50 bg-primary/15 text-primary"
                        : "border-border/50 bg-muted/35 text-muted-foreground hover:bg-muted/60",
                    )}
                  >
                    {day.name}
                  </button>
                ))}
              </div>
            </div>

            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Plan calmly on one canvas. Edits save continuously and stay in sync as you go.
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {!isOnline ? (
                <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  Offline • changes queue automatically
                </span>
              ) : null}
              {pendingMutations > 0 ? (
                <span className="rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {pendingMutations} pending change{pendingMutations === 1 ? "" : "s"}
                </span>
              ) : null}
              {foodSyncLoading ? (
                <span className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-[11px] text-muted-foreground">
                  Checking for food updates...
                </span>
              ) : null}
              {stalePlanItems.length > 0 ? (
                <span className="rounded-full border border-amber-300 bg-amber-100 px-2.5 py-1 text-[11px] font-semibold text-amber-700">
                  {stalePlanItems.length} food update{stalePlanItems.length === 1 ? "" : "s"} available
                </span>
              ) : null}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 rounded-full px-2.5 text-[11px]"
                onClick={clearActiveDay}
              >
                Clear day
              </Button>
            </div>

            <div className="sticky top-2 z-20 mt-3">
              <div className="inline-flex rounded-full border border-border/50 bg-background/90 p-1 shadow-sm backdrop-blur">
                {([
                  { key: "targets", label: "Targets" },
                  { key: "progress", label: "Progress" },
                  { key: "meals", label: "Meals" },
                ] as const).map((section) => (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => scrollToPlannerSection(section.key)}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-[11px] font-semibold transition",
                      plannerSection === section.key
                        ? "bg-primary/15 text-primary shadow-[0_0_10px_hsl(var(--primary)/0.2)]"
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </div>

            <div ref={targetsSectionRef}>
            <Card className="mt-4 rounded-[22px] border border-border/50 bg-card/95 px-4 py-4 shadow-sm">
              <div ref={progressSectionRef} className="mb-3 flex flex-wrap items-center gap-5">
                <div className="flex items-center gap-2">
                  <ProgressRing
                    value={Math.min(dayTotals.kcal / (activeDay.targets.kcal || 1), 1.5)}
                    maxDisplay={1}
                    strokeClassName={kcalOver ? "stroke-rose-500" : "stroke-primary"}
                    size={42}
                    strokeWidth={4}
                  />
                  <span className="text-xs font-medium text-muted-foreground">kcal pace</span>
                </div>
                <div className="flex items-center gap-2">
                  <ProgressRing
                    value={Math.min(dayTotals.protein / (activeDay.targets.protein || 1), 1.5)}
                    maxDisplay={1}
                    strokeClassName={proteinHit ? "stroke-emerald-500" : "stroke-amber-500"}
                    size={42}
                    strokeWidth={4}
                  />
                  <span className="text-xs font-medium text-muted-foreground">protein pace</span>
                </div>
              </div>
              <div className="mb-3 grid grid-cols-2 gap-2.5 text-xs">
                <Badge variant="secondary" className={cn("justify-between rounded-full px-3 py-1.5", kcalOver ? "border border-rose-200 bg-rose-100 text-rose-700" : "bg-secondary text-secondary-foreground")}>
                  kcal <span>{Math.round(dayTotals.kcal)} / {activeDay.targets.kcal}</span>
                </Badge>
                <Badge variant="secondary" className={cn("justify-between rounded-full border px-3 py-1.5", proteinHit ? "border-emerald-200 bg-emerald-100 text-emerald-700" : "border-amber-200 bg-amber-100 text-amber-700")}>
                  protein <span>{Math.round(dayTotals.protein)}g / {activeDay.targets.protein}g</span>
                </Badge>
                <Badge variant="secondary" className="justify-between rounded-full px-3 py-1.5">carbs <span>{Math.round(dayTotals.carbs)}g / {activeDay.targets.carbs}g</span></Badge>
                <Badge variant="secondary" className="justify-between rounded-full px-3 py-1.5">fat <span>{Math.round(dayTotals.fat)}g / {activeDay.targets.fat}g</span></Badge>
              </div>
              <div className="mb-3 rounded-2xl border border-border/50 bg-background/45 px-3 py-2.5">
                <button
                  type="button"
                  onClick={() => setShowCoreMicros((prev) => !prev)}
                  className="flex w-full items-center justify-between gap-2 text-left"
                >
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/80">
                      Core micros
                    </p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Fiber, sodium, potassium impact (from linked foods).
                    </p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                      showCoreMicros && "rotate-180",
                    )}
                  />
                </button>
                {showCoreMicros && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={TRANSITION_FAST}
                    className="mt-3 space-y-2.5"
                  >
                    {(Object.keys(CORE_MICRO_GUIDE) as CoreMicroKey[]).map((key) => {
                      const guide = CORE_MICRO_GUIDE[key];
                      const current = coreMicroTotals[key];
                      const ratio = guide.target > 0 ? current / guide.target : 0;
                      const fillPct = Math.max(0, Math.min(ratio, 1.35)) * 100;
                      const hit = guide.mode === "goal" ? current >= guide.target : current <= guide.target;
                      return (
                        <div key={key} className="rounded-xl border border-border/50 bg-card/80 px-2.5 py-2">
                          <div className="flex items-center justify-between gap-2 text-[11px]">
                            <span className="font-semibold text-foreground">{guide.label}</span>
                            <span className={cn("font-medium", hit ? "text-emerald-600" : guide.mode === "limit" ? "text-rose-600" : "text-amber-600")}>
                              {Math.round(current).toLocaleString()} / {guide.target.toLocaleString()} {guide.unit}
                            </span>
                          </div>
                          <div className="mt-1.5 h-1.5 rounded-full bg-muted/60">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                hit ? "bg-emerald-500" : guide.mode === "limit" ? "bg-rose-500" : "bg-amber-500",
                              )}
                              style={{ width: `${Math.min(fillPct, 100)}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex items-center justify-between rounded-xl border border-border/50 bg-card/70 px-2.5 py-2 text-[11px]">
                      <span className="text-muted-foreground">K:Na ratio</span>
                      <span className="font-semibold text-foreground">
                        {(coreMicroTotals.sodium_mg > 0
                          ? coreMicroTotals.potassium_mg / coreMicroTotals.sodium_mg
                          : 0
                        ).toFixed(2)}
                        :1
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      {coreMicrosLoading
                        ? "Refreshing core micros..."
                        : `Coverage: ${coreMicrosCoverage.withMicrosLoaded}/${coreMicrosCoverage.totalItems} items with known micros.`}
                    </p>
                  </motion.div>
                )}
              </div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary/80">
                  Day targets
                </p>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-full px-3 text-[11px]"
                  onClick={() => setShowAdvancedTargets((prev) => !prev)}
                >
                  {showAdvancedTargets ? "Hide advanced" : "Show advanced"}
                </Button>
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <select
                  value={activeDay.groupId ?? ""}
                  onChange={(e) => assignDayToGroup(e.target.value || null)}
                  className="h-8 min-w-[128px] rounded-full border border-border/50 bg-background px-3 text-xs"
                >
                  <option value="">No group</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
                {proteinHit && !kcalOver ? (
                  <span className="text-[11px] font-medium text-emerald-600">On target</span>
                ) : (
                  <span className="text-[11px] text-muted-foreground">Keep adjusting meals to match targets</span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <TargetField label="Calories" suffix="kcal" value={String(targetDraft.kcal)} onChange={(v) => updateTargetsDraft("kcal", v)} onBlur={commitAllTargets} placeholder="2200" />
                <TargetField label="Protein" suffix="g" value={String(targetDraft.protein)} onChange={(v) => updateTargetsDraft("protein", v)} onBlur={commitAllTargets} placeholder="180" />
                <TargetField label="Carbs" suffix="g" value={String(targetDraft.carbs)} onChange={(v) => updateTargetsDraft("carbs", v)} onBlur={commitAllTargets} placeholder="220" />
                <TargetField label="Fat" suffix="g" value={String(targetDraft.fat)} onChange={(v) => updateTargetsDraft("fat", v)} onBlur={commitAllTargets} placeholder="70" />
              </div>
              {showAdvancedTargets && (
                <>
                  {presets.length > 0 && (
                    <div className="mt-4">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Apply preset</p>
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
                        <option value="">Choose a preset</option>
                        {presets.map((p) => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="mt-4 grid grid-cols-1 gap-3">
                    <TargetFieldWithRange label="Calories range" suffix="kcal" minValue={targetDraft.kcalMin} maxValue={targetDraft.kcalMax} onMinChange={(v) => updateTargetsDraft("kcalMin", v)} onMaxChange={(v) => updateTargetsDraft("kcalMax", v)} onBlur={commitAllTargets} />
                    <TargetFieldWithRange label="Protein range" suffix="g" minValue={targetDraft.proteinMin} maxValue={targetDraft.proteinMax} onMinChange={(v) => updateTargetsDraft("proteinMin", v)} onMaxChange={(v) => updateTargetsDraft("proteinMax", v)} onBlur={commitAllTargets} />
                    <TargetFieldWithRange label="Carbs range" suffix="g" minValue={targetDraft.carbsMin} maxValue={targetDraft.carbsMax} onMinChange={(v) => updateTargetsDraft("carbsMin", v)} onMaxChange={(v) => updateTargetsDraft("carbsMax", v)} onBlur={commitAllTargets} />
                    <TargetFieldWithRange label="Fat range" suffix="g" minValue={targetDraft.fatMin} maxValue={targetDraft.fatMax} onMinChange={(v) => updateTargetsDraft("fatMin", v)} onMaxChange={(v) => updateTargetsDraft("fatMax", v)} onBlur={commitAllTargets} />
                  </div>
                  <Button type="button" variant="outline" className="mt-4 w-full rounded-full" onClick={() => setSavePresetOpen(true)}>
                    Save current targets as preset
                  </Button>
                </>
              )}
              <Button type="button" variant="outline" className="mt-4 w-full rounded-full border-primary/40" onClick={() => setLogPlanSheetOpen(true)}>
                <ClipboardList className="mr-2 h-4 w-4" />
                Log this plan to a date
              </Button>
            </Card>
            </div>

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
              ref={mealsSectionRef}
              className="mt-6"
              initial="hidden"
              animate="show"
              variants={{ show: { transition: { staggerChildren: STAGGER_CALM } } }}
            >
          <div className="space-y-3">
            {dayMeals.map((meal) => {
              const mealItems = mealItemsMap.get(meal.id) ?? [];
              const mealTotals = getTotals(mealItems);
              const grouped = SLOT_CONFIG.map((slot) => ({
                ...slot,
                items: mealItems.filter((item) => item.slot === slot.id),
              }));
              const staleCount = mealItems.filter((item) => stalePlanItems.some((stale) => stale.id === item.id)).length;
              const isFocusedMeal = focusedMealId === meal.id;

              return (
                <motion.div
                  key={meal.id}
                  variants={{
                    hidden: { opacity: 0, y: 10 },
                    show: { opacity: 1, y: 0, transition: TRANSITION_MEDIUM },
                  }}
                >
                <Card
                  className={cn(
                    "overflow-hidden rounded-[24px] border border-border/60 bg-card/85 shadow-[0_10px_24px_rgba(15,23,42,0.1)] transition-shadow",
                    pulseMealId === meal.id && "ring-2 ring-primary/30 shadow-md",
                  )}
                >
                  <div className={cn("px-3 py-3", isFocusedMeal ? "bg-secondary/50" : "bg-secondary/35")}>
                    <div className="flex items-center justify-between gap-3">
                      <p className="flex min-w-0 items-center gap-2 text-sm font-semibold text-foreground">
                        <MealIcon mealId={meal.id} size={18} className="shrink-0 text-primary" />
                        <span className="truncate">{meal.label}</span>
                      </p>
                      <div className="flex items-center gap-1.5">
                        {staleCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-300 bg-amber-100 px-2 py-1 text-[10px] font-semibold text-amber-700">
                            <AlertCircle className="h-3 w-3" />
                            {staleCount} update{staleCount === 1 ? "" : "s"}
                          </span>
                        ) : null}
                        <button
                          type="button"
                          className="shrink-0 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
                          onClick={() => setFocusedMealId(isFocusedMeal ? null : meal.id)}
                        >
                          {isFocusedMeal ? "Collapse" : "Focus"}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 px-3">
                    <motion.div
                      className="rounded-[18px] border border-border/60 bg-card/70 px-3 py-3 shadow-[0_6px_16px_rgba(15,23,42,0.06)]"
                      animate={pulseMealId === meal.id ? { scale: [1, 1.02, 1] } : undefined}
                      transition={{ duration: 0.34, ease: EASE_CALM }}
                    >
                      <div className="flex items-center justify-between text-[10px] font-semibold uppercase tracking-[0.16em] text-primary/75">
                        <span>Meal summary</span>
                        <span className="text-muted-foreground">{mealItems.length} items</span>
                      </div>
                      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
                        <div className="rounded-[12px] bg-secondary/70 px-2 py-2">
                          <p className="text-[9px] uppercase tracking-[0.16em] text-primary/70">Cal</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-foreground">
                            {Math.round(mealTotals.kcal)}
                          </p>
                        </div>
                        <div className="rounded-[12px] bg-secondary/70 px-2 py-2">
                          <p className="text-[9px] uppercase tracking-[0.16em] text-primary/70">P</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-foreground">
                            {Math.round(mealTotals.protein)}g
                          </p>
                        </div>
                        <div className="rounded-[12px] bg-secondary/70 px-2 py-2">
                          <p className="text-[9px] uppercase tracking-[0.16em] text-primary/70">C</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-foreground">
                            {Math.round(mealTotals.carbs)}g
                          </p>
                        </div>
                        <div className="rounded-[12px] bg-secondary/70 px-2 py-2">
                          <p className="text-[9px] uppercase tracking-[0.16em] text-primary/70">F</p>
                          <p className="mt-0.5 text-[11px] font-semibold text-foreground">
                            {Math.round(mealTotals.fat)}g
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  </div>

                  {isFocusedMeal ? (
                    <div className="mt-2 px-3 pb-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-full px-3"
                          onClick={() => openFoodPicker(meal.id)}
                        >
                          <Search className="mr-1.5 h-3.5 w-3.5" />
                          Add food
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-full px-3 text-muted-foreground"
                          onClick={() => openDuplicateMealSheet(meal.id)}
                        >
                          <Copy className="mr-1.5 h-3.5 w-3.5" />
                          Duplicate
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-full px-3 text-muted-foreground"
                          onClick={() => openTemplatePicker(meal.id)}
                        >
                          <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                          Apply template
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-full px-3 text-destructive hover:text-destructive"
                          onClick={() => clearMealItems(meal.id)}
                        >
                          <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                          Clear
                        </Button>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          value={mealTemplateNameDraft}
                          onChange={(event) => setMealTemplateNameDraft(event.target.value)}
                          placeholder="Template name (optional)"
                          className="h-8 rounded-full text-xs"
                        />
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-full px-3"
                          onClick={() => saveMealAsTemplate(meal.id)}
                        >
                          Save template
                        </Button>
                      </div>
                    </div>
                  ) : mealItems.length > 0 ? (
                    <div className="mt-2 px-3 pb-1">
                      <p className="line-clamp-1 text-xs text-muted-foreground">
                        {mealItems.slice(0, 3).map((item) => item.foodName).join(" • ")}
                        {mealItems.length > 3 ? " • ..." : ""}
                      </p>
                    </div>
                  ) : (
                    <div className="mt-2 px-3 pb-1">
                      <p className="text-xs text-muted-foreground">No foods yet. Tap Focus to design this meal.</p>
                    </div>
                  )}

                  {isFocusedMeal && (
                  <div className="mt-2.5 space-y-1.5 px-3 pb-3">
                    {grouped.map((slot) => (
                      <div key={slot.id} className={cn("rounded-[14px] border border-border/45 bg-background/45 px-2.5 py-2", slot.tone)}>
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-foreground/75">{slot.label}</p>
                        <div className="mt-1.5 space-y-1">
                          {slot.items.length === 0 ? (
                            <p className="text-[11px] opacity-70">
                              No items yet. Add food to get closer to your targets.
                            </p>
                          ) : (
                            <>
                              {slot.items.map((item) => {
                                const qty = item.quantity || 1;
                                const setQuantity = (newQty: number) => {
                                  const clamped = Math.max(0.25, Math.min(20, Math.round(newQty * 100) / 100));
                                  void patchItem(item.id, { quantity: clamped });
                                  setPulseMealId(meal.id);
                                  window.setTimeout(() => setPulseMealId((prev) => (prev === meal.id ? null : prev)), 280);
                                };
                                return (
                                  <MealItemRow
                                    key={item.id}
                                    rightContent={
                                      <div className="flex shrink-0 items-center gap-1.5">
                                        <Input
                                          defaultValue={String(Number.isInteger(qty) ? qty : Number(qty.toFixed(2)))}
                                          type="number"
                                          min={0.25}
                                          max={20}
                                          step={0.25}
                                          inputMode="decimal"
                                          className="h-7 w-20 rounded-full border-border/60 bg-background/90 px-2 text-center text-[11px]"
                                          onBlur={(e) => {
                                            triggerLightFeedback();
                                            setQuantity(coerceNumber(e.target.value, qty));
                                          }}
                                          onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                              (e.currentTarget as HTMLInputElement).blur();
                                            }
                                          }}
                                          aria-label="Food quantity"
                                        />
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
                                      <div className="flex items-center justify-between gap-2">
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <p className="truncate text-xs font-semibold text-slate-700" title={item.foodName}>
                                              {item.foodName}
                                            </p>
                                          </TooltipTrigger>
                                          <TooltipContent side="top" className="max-w-[min(20rem,85vw)]">
                                            <p className="break-words text-sm">{item.foodName}</p>
                                          </TooltipContent>
                                        </Tooltip>
                                        <span className="shrink-0 text-[10px] font-semibold text-primary/90">
                                          {Math.round(item.kcal * qty)} cal
                                        </span>
                                      </div>
                                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-slate-500">
                                        <span className="rounded-full bg-secondary/70 px-2 py-0.5">
                                          P {Math.round(item.protein * qty)}g
                                        </span>
                                        <span className="rounded-full bg-secondary/70 px-2 py-0.5">
                                          C {Math.round(item.carbs * qty)}g
                                        </span>
                                        <span className="rounded-full bg-secondary/70 px-2 py-0.5">
                                          F {Math.round(item.fat * qty)}g
                                        </span>
                                      </div>
                                      {stalePlanItems.some((stale) => stale.id === item.id) ? (
                                        <div className="mt-1.5 flex items-center gap-2">
                                          <span className="text-[10px] font-medium text-amber-700">
                                            Food was updated
                                          </span>
                                          <button
                                            type="button"
                                            className="text-[10px] font-semibold text-primary underline-offset-2 hover:underline"
                                            onClick={() => applySourceFoodUpdate(item.id)}
                                          >
                                            Use latest
                                          </button>
                                        </div>
                                      ) : null}
                                    </div>
                                  </MealItemRow>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  )}
                </Card>
                </motion.div>
              );
            })}
          </div>
            </motion.div>

      <Drawer open={foodSheetOpen} onOpenChange={setFoodSheetOpen}>
        <DrawerContent className="max-h-[86svh] rounded-t-[36px] border-none bg-background pb-0 overflow-hidden">
          <div className="aura-sheet-scroll max-h-[calc(86svh-56px)] px-4 pb-0">
            <div className="pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/90">Meal food search</p>
              <h3 className="mt-1 text-lg font-display font-semibold text-foreground">
                {activeMealForFoodSheet?.emoji ?? "Meal"} {activeMealForFoodSheet?.label ?? "Select meal"}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Search foods in your database and add to this meal.
              </p>
            </div>

            <div className="aura-sticky-search mt-3">
              <div className="grid grid-cols-[1fr_88px] gap-2">
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
                  type="number"
                  min={0.25}
                  step={0.25}
                  inputMode="decimal"
                  className="h-10 rounded-full"
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[11px] font-medium text-muted-foreground">
                  {selectedFoods.length} selected
                </p>
                <div className="flex items-center gap-1.5">
                  {selectedFoods.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        triggerLightFeedback();
                        setShowSelectedOnly((prev) => !prev);
                      }}
                      className={cn(
                        "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition",
                        showSelectedOnly
                          ? "border-primary/40 bg-primary/10 text-primary"
                          : "border-border/50 bg-background/70 text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {showSelectedOnly ? "Show all" : "Selected only"}
                    </button>
                  ) : null}
                  {selectedFoods.length > 0 ? (
                    <button
                      type="button"
                      onClick={clearSelectedFoods}
                      className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-muted-foreground transition hover:text-foreground"
                    >
                      Clear selection
                    </button>
                  ) : null}
                </div>
              </div>
              {selectedFoods.length > 0 ? (
                <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                  {selectedFoods.map((food) => (
                    <button
                      key={food.id}
                      type="button"
                      onClick={() => removeSelectedFood(food.id)}
                      className="inline-flex shrink-0 items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary"
                    >
                      <span className="max-w-[140px] truncate">{food.name}</span>
                      <X className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            {foodSearchStatus === "loading" ? (
              <p className="mt-3 text-xs font-semibold text-primary">Searching foods...</p>
            ) : null}
            {foodSearchStatus === "error" ? (
              <p className="mt-3 text-xs font-semibold text-destructive">
                {foodSearchError ?? "Unable to search foods."}
              </p>
            ) : null}
            {showSelectedOnly && selectedOnlyHiddenCount > 0 ? (
              <p className="mt-2 text-[11px] text-muted-foreground">
                {selectedOnlyHiddenCount} matching result{selectedOnlyHiddenCount === 1 ? "" : "s"} hidden while Selected only is on.
              </p>
            ) : null}

            <div className="mt-3 space-y-2 pb-2">
              {visibleFoodOptions.length === 0 && foodSearchStatus === "idle" ? (
                <ListEmptyState
                  itemName="foods"
                  className="w-full rounded-[16px] border border-dashed border-border/70 bg-card/70 py-6"
                />
              ) : null}
              {visibleFoodOptions.map((food) => {
                const isSelected = selectedFoodOrder.includes(food.id);
                const selectedIndex = selectedFoodOrder.indexOf(food.id);
                return (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => toggleFoodSelection(food)}
                  className={cn(
                    "w-full rounded-[16px] border bg-card px-3 py-3 text-left shadow-[0_8px_20px_rgba(15,23,42,0.05)] transition",
                    isSelected
                      ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
                      : "border-border/60 hover:border-primary/30 hover:bg-card/80",
                  )}
                  aria-pressed={isSelected}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-border/60 bg-secondary/40">
                      {food.imageUrl ? (
                        <img src={food.imageUrl} alt={food.name} className="h-full w-full object-cover" />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-lg">
                          {activeMealForFoodSheet?.emoji ?? "Meal"}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold text-foreground">{food.name}</p>
                        <div className="flex items-center gap-1.5">
                          {isSelected ? (
                            <span className="rounded-full border border-primary/30 bg-primary/15 px-2 py-1 text-[10px] font-semibold text-primary">
                              #{selectedIndex + 1}
                            </span>
                          ) : null}
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-primary">
                            {SLOT_CONFIG.find((slot) => slot.id === inferSlot(food))?.label ?? "Balance"}
                          </span>
                        </div>
                      </div>
                      <p className="truncate text-xs text-muted-foreground">
                        {food.brand ?? "Unbranded"} - {Math.round(food.kcal)} cal
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        P {Math.round(food.protein)}g | C {Math.round(food.carbs)}g | F {Math.round(food.fat)}g
                      </p>
                    </div>
                  </div>
                </button>
                );
              })}
            </div>

            <DrawerStickyActions className="px-0">
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setFoodSheetOpen(false)}
                >
                  Close
                </Button>
                <Button
                  type="button"
                  className="rounded-full"
                  onClick={addSelectedFoodsToMeal}
                  disabled={selectedFoods.length === 0}
                >
                  <Check className="mr-1.5 h-4 w-4" />
                  Add {selectedFoods.length > 0 ? selectedFoods.length : ""} food{selectedFoods.length === 1 ? "" : "s"}
                </Button>
              </div>
            </DrawerStickyActions>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={duplicateMealSheetOpen} onOpenChange={setDuplicateMealSheetOpen}>
        <DrawerContent className="max-h-[84svh] rounded-t-[36px] border-none bg-background pb-0 overflow-hidden">
          <div className="aura-sheet-scroll max-h-[calc(84svh-56px)] px-4 pb-0">
            <div className="pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/90">Duplicate meal</p>
              <h3 className="mt-1 text-lg font-display font-semibold text-foreground">
                {duplicateSourceMeal?.emoji ?? "Meal"} {duplicateSourceMeal?.label ?? "Select source"}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                Copy this meal into a target day and meal slot.
              </p>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-[16px] border border-border/50 bg-card/70 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Target day
                </p>
                <select
                  className="mt-2 h-10 w-full rounded-full border border-border/60 bg-background px-3 text-sm"
                  value={duplicateTargetDayId ?? ""}
                  onChange={(e) => setDuplicateTargetDayId(e.target.value || null)}
                >
                  {days.map((day) => (
                    <option key={day.id} value={day.id}>
                      {day.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="rounded-[16px] border border-border/50 bg-card/70 px-3 py-3">
                <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
                  Target meal
                </p>
                <select
                  className="mt-2 h-10 w-full rounded-full border border-border/60 bg-background px-3 text-sm"
                  value={duplicateTargetMealId ?? ""}
                  onChange={(e) => setDuplicateTargetMealId(e.target.value || null)}
                  disabled={duplicateTargetDayMeals.length === 0}
                >
                  {duplicateTargetDayMeals.length === 0 ? (
                    <option value="">No meals available</option>
                  ) : (
                    duplicateTargetDayMeals.map((meal) => (
                      <option key={meal.id} value={meal.id}>
                        {meal.emoji ? `${meal.emoji} ` : ""}{meal.label}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>
            <DrawerStickyActions className="px-0">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setDuplicateMealSheetOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" className="rounded-full" onClick={duplicateMealItemsToTarget} disabled={!duplicateSourceMealId || !duplicateTargetMealId}>
                  <Copy className="mr-1.5 h-4 w-4" />
                  Duplicate
                </Button>
              </div>
            </DrawerStickyActions>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={copyDaySheetOpen} onOpenChange={setCopyDaySheetOpen}>
        <DrawerContent className="max-h-[78svh] rounded-t-[36px] border-none bg-background pb-0 overflow-hidden">
          <div className="aura-sheet-scroll max-h-[calc(78svh-56px)] px-4 pb-0">
            <div className="pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/90">Copy day</p>
              <h3 className="mt-1 text-lg font-display font-semibold text-foreground">{activeDay?.name ?? "Current day"}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Copy foods into another day using matching meal labels.</p>
            </div>
            <div className="mt-4 rounded-[16px] border border-border/50 bg-card/70 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">Target day</p>
              <select
                className="mt-2 h-10 w-full rounded-full border border-border/60 bg-background px-3 text-sm"
                value={copyTargetDayId ?? ""}
                onChange={(e) => setCopyTargetDayId(e.target.value || null)}
              >
                {days.filter((day) => day.id !== activeDay?.id).map((day) => (
                  <option key={day.id} value={day.id}>
                    {day.name}
                  </option>
                ))}
              </select>
            </div>
            <DrawerStickyActions className="px-0">
              <div className="grid grid-cols-2 gap-2">
                <Button type="button" variant="outline" className="rounded-full" onClick={() => setCopyDaySheetOpen(false)}>
                  Cancel
                </Button>
                <Button type="button" className="rounded-full" onClick={copyActiveDayToTarget} disabled={!copyTargetDayId}>
                  <Sparkles className="mr-1.5 h-4 w-4" />
                  Copy day
                </Button>
              </div>
            </DrawerStickyActions>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={templatePickerOpen} onOpenChange={setTemplatePickerOpen}>
        <DrawerContent className="max-h-[84svh] rounded-t-[36px] border-none bg-background pb-0 overflow-hidden">
          <div className="aura-sheet-scroll max-h-[calc(84svh-56px)] px-4 pb-0">
            <div className="pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/90">Meal templates</p>
              <h3 className="mt-1 text-lg font-display font-semibold text-foreground">
                {templatePickerMeal?.emoji ?? "Meal"} {templatePickerMeal?.label ?? "Select meal"}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">Apply a saved template to this meal.</p>
            </div>
            <div className="mt-3 space-y-2 pb-2">
              {mealTemplates.length === 0 ? (
                <ListEmptyState
                  itemName="templates"
                  className="w-full rounded-[16px] border border-dashed border-border/70 bg-card/70 py-6"
                />
              ) : (
                mealTemplates.map((template) => (
                  <div key={template.id} className="rounded-[16px] border border-border/60 bg-card px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{template.name}</p>
                        <p className="text-[11px] text-muted-foreground">{template.items.length} items</p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Button type="button" size="sm" className="h-8 rounded-full px-3" onClick={() => templatePickerMealId && applyTemplateToMeal(templatePickerMealId, template)}>
                          Apply
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8 rounded-full text-destructive hover:text-destructive" onClick={() => deleteMealTemplate(template.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <Drawer open={undoHistoryOpen} onOpenChange={setUndoHistoryOpen}>
        <DrawerContent className="max-h-[78svh] rounded-t-[36px] border-none bg-background pb-0 overflow-hidden">
          <div className="aura-sheet-scroll max-h-[calc(78svh-56px)] px-4 pb-0">
            <div className="pt-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary/90">Undo history</p>
              <h3 className="mt-1 text-lg font-display font-semibold text-foreground">Recent planner actions</h3>
            </div>
            <div className="mt-3 space-y-2 pb-2">
              {undoHistory.length === 0 ? (
                <ListEmptyState
                  itemName="actions"
                  className="w-full rounded-[16px] border border-dashed border-border/70 bg-card/70 py-6"
                />
              ) : (
                undoHistory.map((action) => (
                  <div key={action.id} className="rounded-[16px] border border-border/60 bg-card px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">{action.label}</p>
                        <p className="text-[11px] text-muted-foreground">{new Date(action.createdAt).toLocaleTimeString()}</p>
                      </div>
                      <Button type="button" size="sm" variant="outline" className="h-8 rounded-full px-3" onClick={() => runUndoAction(action)}>
                        Undo
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </DrawerContent>
      </Drawer>

            {/* Sticky save area */}
            <div className="pointer-events-none sticky bottom-0 left-0 right-0 z-10 mt-4 flex justify-end pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
              <Button
                type="button"
                className="pointer-events-auto rounded-full shadow-lg"
                onClick={() => {
                  triggerLightFeedback();
                  appToast.success("Changes saved", { description: `${activeDay?.name ?? "Day"} is up to date.` });
                }}
              >
                <Check className="mr-2 h-4 w-4" />
                Save
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
        type="number"
        min={0}
        step={1}
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
        type="number"
        min={0}
        step={1}
        inputMode="decimal"
        className="h-8 flex-1 rounded-full border-border/60 bg-card/85"
      />
      <span className="text-muted-foreground/70">to</span>
      <Input
        value={maxValue != null && maxValue !== 0 ? String(maxValue) : ""}
        onChange={(e) => onMaxChange(e.target.value)}
        onBlur={onBlur}
        placeholder="Max"
        type="number"
        min={0}
        step={1}
        inputMode="decimal"
        className="h-8 flex-1 rounded-full border-border/60 bg-card/85"
      />
      <span className="min-w-6 text-right text-xs font-semibold text-muted-foreground">{suffix}</span>
    </div>
  </div>
);

const MealItemRow = ({
  children,
  rightContent,
}: {
  children: ReactNode;
  rightContent?: ReactNode;
}) => {
  return (
    <div
      className="flex items-center justify-between gap-2 rounded-[16px] border border-border/60 bg-card/80 px-2.5 py-2 shadow-[0_6px_14px_rgba(15,23,42,0.06)]"
    >
      <div className="flex min-w-0 flex-1 items-center">
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
