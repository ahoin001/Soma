import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AppShell, PageContainer } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { appToast } from "@/lib/toast";
import { useAppStore } from "@/state/AppStore";
import { ChevronDown, ChevronLeft } from "lucide-react";
import {
  ensureUser,
  upsertNutritionSettings,
  upsertNutritionTargets,
  upsertUserProfile,
  upsertWeightLog,
} from "@/lib/api";
import {
  calculateDynamicTargets,
  calculateTargets,
  type ActivityLevel,
  type Formula,
  type GoalType,
  type Sex,
} from "@/lib/nutritionTargets";

const activityOptions: Array<{
  value: ActivityLevel;
  label: string;
  description: string;
}> = [
  {
    value: "sedentary",
    label: "Sedentary",
    description: "Office or remote work with little movement; light walks only.",
  },
  {
    value: "light",
    label: "Light",
    description: "Mostly desk work but you walk daily or do light workouts 1-3x/week.",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Mix of desk work + regular training 3-5x/week or an active job.",
  },
  {
    value: "active",
    label: "Active",
    description: "Labor-intensive job or training nearly daily; on your feet often.",
  },
  {
    value: "athlete",
    label: "Athlete",
    description: "Very high volume training, double sessions, or demanding work.",
  },
];

import {
  getMicroState,
  MICRO_OPTIONS,
  saveMicroState,
} from "@/components/aura/MacroMicroGoalSheet";
import { GOALS_DRAFT_KEY, MICRO_GOALS_KEY } from "@/lib/storageKeys";
import { cn } from "@/lib/utils";
import { TrendingDown, TrendingUp } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useRememberedTab } from "@/hooks/useRememberedTab";
import { goalsQuerySchema } from "@/lib/routeSchemas";
import { useRouteQueryState } from "@/hooks/useRouteQueryState";

const cmToImperial = (cm: number) => {
  const totalInches = cm / 2.54;
  let feet = Math.floor(totalInches / 12);
  let inches = Math.round(totalInches - feet * 12);
  if (inches === 12) {
    feet += 1;
    inches = 0;
  }
  return { feet, inches };
};

const imperialToCm = (feet: number, inches: number) =>
  Math.round((feet * 12 + inches) * 2.54);

export type MicroTargetMode = "goal" | "limit";
export type MicroGoalEntry = { value: number; mode: MicroTargetMode };
export type MicroGoals = {
  fiber_g: MicroGoalEntry | null;
  sodium_mg: MicroGoalEntry | null;
  sugar_g: MicroGoalEntry | null;
};

const parseMicroEntry = (raw: unknown): MicroGoalEntry | null => {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw)) return { value: raw, mode: "goal" };
  if (typeof raw === "object" && raw !== null && "value" in raw) {
    const v = (raw as { value: unknown; mode?: string }).value;
    const m = (raw as { value: unknown; mode?: string }).mode;
    if (typeof v === "number" && Number.isFinite(v))
      return { value: v, mode: m === "limit" ? "limit" : "goal" };
  }
  return null;
};

const loadMicroGoals = (): MicroGoals => {
  if (typeof window === "undefined") return { fiber_g: null, sodium_mg: null, sugar_g: null };
  try {
    const raw = window.localStorage.getItem(MICRO_GOALS_KEY);
    if (!raw) return { fiber_g: null, sodium_mg: null, sugar_g: null };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      fiber_g: parseMicroEntry(parsed.fiber_g),
      sodium_mg: parseMicroEntry(parsed.sodium_mg),
      sugar_g: parseMicroEntry(parsed.sugar_g),
    };
  } catch {
    return { fiber_g: null, sodium_mg: null, sugar_g: null };
  }
};

const saveMicroGoals = (goals: MicroGoals) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MICRO_GOALS_KEY, JSON.stringify(goals));
};

type CalorieTargetsSectionProps = {
  calculatedTargets: ReturnType<typeof calculateTargets> | null;
  kcalGoalValue: number;
  onGoalChange: (value: number) => void;
  onUseRecommended: () => void;
  disableUseRecommended: boolean;
  missingStats: string[];
};

const CalorieTargetsSection = ({
  calculatedTargets,
  kcalGoalValue,
  onGoalChange,
  onUseRecommended,
  disableUseRecommended,
  missingStats,
}: CalorieTargetsSectionProps) => {
  if (!calculatedTargets) {
    return (
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary/75">Calories</p>
        <div className="mt-4 rounded-xl border border-border/70 bg-muted/40 px-4 py-3">
          <p className="text-sm font-medium text-foreground">Complete required fields to see your calorie range</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {missingStats.length > 0
              ? `Missing in Your stats: ${missingStats.join(", ")}.`
              : "Fill in Age, Weight, and Height in Your stats above."}
          </p>
        </div>
      </div>
    );
  }

  const sliderValue = Math.min(
    Math.max(kcalGoalValue, calculatedTargets.caloriesRange.min),
    calculatedTargets.caloriesRange.max,
  );

  return (
    <div>
      <p className="text-xs uppercase tracking-[0.2em] text-primary/75">Calories</p>
      <div className="mt-4 grid gap-3 text-sm">
        <div className="rounded-[18px] bg-secondary/70 px-4 py-4">
          <p className="text-xs text-primary/80">Recommended range</p>
          <p className="text-lg font-semibold text-foreground">
            {calculatedTargets.caloriesRange.min}–{calculatedTargets.caloriesRange.max} cal
          </p>
        </div>
        <div className="space-y-4">
          <div className="flex items-baseline justify-between gap-2">
            <Label htmlFor="goal-kcal-slider">Daily goal</Label>
            <span className="text-lg font-semibold tabular-nums text-foreground">
              {Math.round(kcalGoalValue).toLocaleString()} cal
            </span>
          </div>
          <div className="px-1">
            <Slider
              id="goal-kcal-slider"
              min={calculatedTargets.caloriesRange.min}
              max={calculatedTargets.caloriesRange.max}
              step={50}
              value={[sliderValue]}
              onValueChange={([value]) => onGoalChange(value)}
              className="touch-none"
            />
          </div>
          <div className="flex justify-between text-[11px] font-medium text-primary/80">
            <span>{calculatedTargets.caloriesRange.min.toLocaleString()} cal</span>
            <span>{calculatedTargets.caloriesRange.max.toLocaleString()} cal</span>
          </div>
        </div>
      </div>
      <Button
        type="button"
        className="mt-4 w-full rounded-full bg-primary py-5 text-sm font-semibold text-primary-foreground shadow-[0_16px_30px_rgba(15,23,42,0.35)] hover:bg-primary/90"
        onClick={onUseRecommended}
        disabled={disableUseRecommended}
      >
        Use as daily goal
      </Button>
    </div>
  );
};

type MicroRecommendation = {
  label: string;
  value: string;
  note: string;
};

type MacroTargetsSectionProps = {
  carbs: string;
  protein: string;
  fat: string;
  onCarbsChange: (value: string) => void;
  onProteinChange: (value: string) => void;
  onFatChange: (value: string) => void;
  onSave: () => void;
  disableSave: boolean;
  missingStats: string[];
};

function MicroRow({
  id,
  label,
  unit,
  value,
  onChange,
  mode,
  onModeChange,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  mode: MicroTargetMode;
  onModeChange: (m: MicroTargetMode) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`goal-micro-${id}`} className="text-xs font-medium text-foreground">
          {label} ({unit})
        </Label>
        <div className="flex rounded-full border border-border/60 bg-background p-0.5">
          <button
            type="button"
            onClick={() => onModeChange("goal")}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition",
              mode === "goal" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <TrendingUp className="h-3 w-3" />
            Goal
          </button>
          <button
            type="button"
            onClick={() => onModeChange("limit")}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition",
              mode === "limit" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
            )}
          >
            <TrendingDown className="h-3 w-3" />
            Limit
          </button>
        </div>
      </div>
      <Input
        id={`goal-micro-${id}`}
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border-border/60"
        placeholder={mode === "limit" ? "e.g. 2000" : "—"}
      />
    </div>
  );
}

const MacroTargetsSection = ({
  carbs,
  protein,
  fat,
  onCarbsChange,
  onProteinChange,
  onFatChange,
  onSave,
  disableSave,
  missingStats,
}: MacroTargetsSectionProps) => (
  <div>
    <p className="text-xs uppercase tracking-[0.2em] text-primary/75">Macro targets</p>
    {missingStats.length > 0 && (
      <div className="mt-3 rounded-xl border border-accent/60 bg-accent/20 px-3 py-2">
        <p className="text-xs font-medium text-foreground">
          Complete in Your stats to calculate macros: {missingStats.join(", ")}.
        </p>
      </div>
    )}
    <div className="mt-4 grid grid-cols-3 gap-2">
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Carbs (g)</Label>
        <Input
          value={carbs}
          onChange={(event) => onCarbsChange(event.target.value)}
          placeholder="0"
          inputMode="numeric"
          className="h-11 rounded-full"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Protein (g)</Label>
        <Input
          value={protein}
          onChange={(event) => onProteinChange(event.target.value)}
          placeholder="0"
          inputMode="numeric"
          className="h-11 rounded-full"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs text-muted-foreground">Fat (g)</Label>
        <Input
          value={fat}
          onChange={(event) => onFatChange(event.target.value)}
          placeholder="0"
          inputMode="numeric"
          className="h-11 rounded-full"
        />
      </div>
    </div>
    <Button
      type="button"
      className="mt-4 w-full rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
      onClick={onSave}
      disabled={disableSave}
    >
      Save macros
    </Button>
  </div>
);

const Goals = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { query, mergeQueryState } = useRouteQueryState(goalsQuerySchema, {
    defaults: { section: "energy" },
  });
  const [goalType, setGoalType] = useState<GoalType>("balance");
  const [sex, setSex] = useState<Sex>("female");
  const [age, setAge] = useState("");
  const [heightUnit, setHeightUnit] = useState<"imperial" | "metric">("imperial");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightLb, setWeightLb] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activity, setActivity] = useState<ActivityLevel>("moderate");
  const [formula, setFormula] = useState<Formula>("mifflin");
  const [bodyFat, setBodyFat] = useState("");
  const [trainingDays, setTrainingDays] = useState("");
  const [stepsPerDay, setStepsPerDay] = useState("");
  const [kcalGoal, setKcalGoal] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [targetsTouched, setTargetsTouched] = useState(false);
  const [macrosTouched, setMacrosTouched] = useState(false);
  const [advancedNutritionOpen, setAdvancedNutritionOpen] = useState(false);
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [fiber, setFiber] = useState("");
  const [fiberMode, setFiberMode] = useState<MicroTargetMode>("goal");
  const [sodium, setSodium] = useState("");
  const [sodiumMode, setSodiumMode] = useState<MicroTargetMode>("limit");
  const [sugar, setSugar] = useState("");
  const [sugarMode, setSugarMode] = useState<MicroTargetMode>("limit");
  const [microSlotKeys, setMicroSlotKeys] = useState<string[]>(() => {
    const ms = getMicroState();
    return ms.slotKeys.length >= 3 ? ms.slotKeys : ["fiber_g", "sodium_mg", "sugar_g"];
  });
  const [microSlotData, setMicroSlotData] = useState<Record<string, { value: string; mode: MicroTargetMode }>>(() => {
    const ms = getMicroState();
    const out: Record<string, { value: string; mode: MicroTargetMode }> = {};
    const keys = ms.slotKeys.length >= 3 ? ms.slotKeys : ["fiber_g", "sodium_mg", "sugar_g"];
    for (const key of keys) {
      const e = ms.goals[key];
      if (e) out[key] = { value: String(e.value), mode: e.mode };
    }
    return out;
  });
  const [microSectionOpen, setMicroSectionOpen] = useState(false);
  const [sectionTab, setSectionTab] = useRememberedTab<"energy" | "micros">({
    key: "section",
    values: ["energy", "micros"] as const,
    defaultValue: "energy",
  });
  const [hydrated, setHydrated] = useState(false);
  const draftTimerRef = useRef<number | null>(null);
  const microsSectionRef = useRef<HTMLDivElement | null>(null);
  const { nutrition, userProfile, setUserProfile } = useAppStore();

  useEffect(() => {
    if (location.hash === "#micros") {
      setSectionTab("micros");
      setMicroSectionOpen(true);
      requestAnimationFrame(() => {
        microsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  }, [location.hash]);

  useEffect(() => {
    if (query.section) setSectionTab(query.section);
  }, [query.section, setSectionTab]);

  useEffect(() => {
    mergeQueryState({ section: sectionTab });
  }, [mergeQueryState, sectionTab]);

  useEffect(() => {
    if (hydrated) return;
    const hasSavedProfile =
      Boolean(userProfile.goal) ||
      Number.isFinite(userProfile.heightCm) ||
      Number.isFinite(userProfile.weightKg) ||
      Number.isFinite(userProfile.age) ||
      Boolean(userProfile.sex) ||
      Boolean(userProfile.activity);

    let draft: Partial<{
      goalType: GoalType;
      sex: Sex;
      age: string;
      heightUnit: "imperial" | "metric";
      heightFt: string;
      heightIn: string;
      heightCm: string;
      weightLb: string;
      weightKg: string;
      activity: ActivityLevel;
      formula: Formula;
      bodyFat: string;
      trainingDays: string;
      stepsPerDay: string;
      kcalGoal: string;
      carbs: string;
      protein: string;
      fat: string;
      targetsTouched: boolean;
      macrosTouched: boolean;
      optionalOpen: boolean;
      advancedNutritionOpen: boolean;
      microSectionOpen: boolean;
      fiber: string;
      fiberMode: MicroTargetMode;
      sodium: string;
      sodiumMode: MicroTargetMode;
      sugar: string;
      sugarMode: MicroTargetMode;
    }> = {};

    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(GOALS_DRAFT_KEY);
      if (stored) {
        try {
          draft = JSON.parse(stored);
        } catch {
          window.localStorage.removeItem(GOALS_DRAFT_KEY);
        }
      }
    }

    if (Object.keys(draft).length > 0) {
      if (draft.goalType) setGoalType(draft.goalType);
      if (draft.sex) setSex(draft.sex);
      if (draft.age !== undefined) setAge(draft.age);
      if (draft.heightUnit) setHeightUnit(draft.heightUnit);
      if (draft.heightFt !== undefined) setHeightFt(draft.heightFt);
      if (draft.heightIn !== undefined) setHeightIn(draft.heightIn);
      if (draft.heightCm !== undefined) setHeightCm(draft.heightCm);
      if (draft.weightLb !== undefined) setWeightLb(draft.weightLb);
      if (draft.weightKg !== undefined) setWeightKg(draft.weightKg);
      if (draft.activity) setActivity(draft.activity);
      if (draft.formula) setFormula(draft.formula);
      if (draft.bodyFat !== undefined) setBodyFat(draft.bodyFat);
      if (draft.trainingDays !== undefined) setTrainingDays(draft.trainingDays);
      if (draft.stepsPerDay !== undefined) setStepsPerDay(draft.stepsPerDay);
      if (draft.kcalGoal !== undefined) setKcalGoal(draft.kcalGoal);
      if (draft.carbs !== undefined) setCarbs(draft.carbs);
      if (draft.protein !== undefined) setProtein(draft.protein);
      if (draft.fat !== undefined) setFat(draft.fat);
      if (draft.targetsTouched !== undefined) setTargetsTouched(draft.targetsTouched);
      if (draft.macrosTouched !== undefined) setMacrosTouched(draft.macrosTouched);
      if (draft.optionalOpen !== undefined) setOptionalOpen(draft.optionalOpen);
      if (draft.advancedNutritionOpen !== undefined) setAdvancedNutritionOpen(draft.advancedNutritionOpen);
      if (draft.microSectionOpen !== undefined) setMicroSectionOpen(draft.microSectionOpen);
      if (draft.fiber !== undefined) setFiber(draft.fiber);
      if (draft.fiberMode !== undefined) setFiberMode(draft.fiberMode);
      if (draft.sodium !== undefined) setSodium(draft.sodium);
      if (draft.sodiumMode !== undefined) setSodiumMode(draft.sodiumMode);
      if (draft.sugar !== undefined) setSugar(draft.sugar);
      if (draft.sugarMode !== undefined) setSugarMode(draft.sugarMode);
    } else {
      const microGoals = loadMicroGoals();
      if (microGoals.fiber_g) {
        setFiber(String(microGoals.fiber_g.value));
        setFiberMode(microGoals.fiber_g.mode);
      }
      if (microGoals.sodium_mg) {
        setSodium(String(microGoals.sodium_mg.value));
        setSodiumMode(microGoals.sodium_mg.mode);
      }
      if (microGoals.sugar_g) {
        setSugar(String(microGoals.sugar_g.value));
        setSugarMode(microGoals.sugar_g.mode);
      }
      if (userProfile.sex) setSex(userProfile.sex);
      if (userProfile.age) setAge(String(userProfile.age));
      if (userProfile.activity) setActivity(userProfile.activity);
      if (userProfile.goal) setGoalType(userProfile.goal);
      if (Number.isFinite(userProfile.heightCm)) {
        const cmValue = Math.round(userProfile.heightCm ?? 0);
        setHeightCm(String(cmValue));
        const { feet, inches } = cmToImperial(cmValue);
        setHeightFt(String(feet));
        setHeightIn(String(inches));
        setHeightUnit("metric");
      }
      if (Number.isFinite(userProfile.weightKg)) {
        const kgValue = Number(userProfile.weightKg ?? 0);
        setWeightKg(String(Math.round(kgValue)));
        setWeightLb(String(Math.round(kgValue / 0.453592)));
      }
    }

    const ms = getMicroState();
    setMicroSlotKeys(ms.slotKeys.length >= 3 ? ms.slotKeys : ["fiber_g", "sodium_mg", "sugar_g"]);
    setMicroSlotData((prev) => {
      const next = { ...prev };
      const keys = ms.slotKeys.length >= 3 ? ms.slotKeys : ["fiber_g", "sodium_mg", "sugar_g"];
      for (const key of keys) {
        const e = ms.goals[key];
        next[key] = e ? { value: String(e.value), mode: e.mode } : { value: "", mode: "goal" };
      }
      return next;
    });
    setHydrated(true);
  }, [hydrated, userProfile]);

  const handleHeightUnitChange = (unit: "imperial" | "metric") => {
    if (unit === heightUnit) return;
    if (unit === "metric") {
      const ft = Number(heightFt);
      const inches = Number(heightIn);
      if (Number.isFinite(ft) && Number.isFinite(inches)) {
        setHeightCm(String(imperialToCm(ft, inches)));
      }
      const lb = Number(weightLb);
      if (Number.isFinite(lb)) {
        setWeightKg(String(Math.round(lb * 0.453592)));
      }
    } else {
      const cm = Number(heightCm);
      if (Number.isFinite(cm)) {
        const { feet, inches } = cmToImperial(cm);
        setHeightFt(String(feet));
        setHeightIn(String(inches));
      }
      const kg = Number(weightKg);
      if (Number.isFinite(kg)) {
        setWeightLb(String(Math.round(kg / 0.453592)));
      }
    }
    setHeightUnit(unit);
  };

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    if (draftTimerRef.current) {
      window.clearTimeout(draftTimerRef.current);
    }
    draftTimerRef.current = window.setTimeout(() => {
      window.localStorage.setItem(
        GOALS_DRAFT_KEY,
        JSON.stringify({
          goalType,
          sex,
          age,
          heightUnit,
          heightFt,
          heightIn,
          heightCm,
          weightLb,
          weightKg,
          activity,
          formula,
          bodyFat,
          trainingDays,
          stepsPerDay,
          kcalGoal,
          carbs,
          protein,
          fat,
          targetsTouched,
          macrosTouched,
          optionalOpen,
          advancedNutritionOpen,
          microSectionOpen,
          fiber,
          fiberMode,
          sodium,
          sodiumMode,
          sugar,
          sugarMode,
        }),
      );
    }, 200);
    return () => {
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }
    };
  }, [
    activity,
    age,
    bodyFat,
    carbs,
    fat,
    formula,
    goalType,
    heightCm,
    heightFt,
    heightIn,
    heightUnit,
    hydrated,
    kcalGoal,
    macrosTouched,
    advancedNutritionOpen,
    microSectionOpen,
    optionalOpen,
    fiber,
    fiberMode,
    protein,
    sex,
    sodium,
    sodiumMode,
    sugar,
    sugarMode,
    stepsPerDay,
    targetsTouched,
    trainingDays,
    weightKg,
    weightLb,
  ]);

  useEffect(() => {
    if (targetsTouched) return;
    if (nutrition.summary.goal > 0) {
      setKcalGoal(String(Math.round(nutrition.summary.goal)));
    }
  }, [nutrition.summary.goal, targetsTouched]);

  useEffect(() => {
    if (macrosTouched) return;
    setCarbs(String(nutrition.macros.find((m) => m.key === "carbs")?.goal ?? ""));
    setProtein(String(nutrition.macros.find((m) => m.key === "protein")?.goal ?? ""));
    setFat(String(nutrition.macros.find((m) => m.key === "fat")?.goal ?? ""));
  }, [nutrition.macros, macrosTouched]);

  const calculatedTargets = useMemo(() => {
    const weightNum =
      heightUnit === "imperial"
        ? Number(weightLb) * 0.453592
        : Number(weightKg);
    const heightNum =
      heightUnit === "imperial"
        ? (Number(heightFt) * 12 + Number(heightIn)) * 2.54
        : Number(heightCm);
    const ageNum = Number(age);
    if (
      !Number.isFinite(weightNum) ||
      !Number.isFinite(heightNum) ||
      !Number.isFinite(ageNum)
    ) {
      return null;
    }
    return calculateTargets({
      weightKg: weightNum,
      heightCm: heightNum,
      age: ageNum,
      sex,
      goalType,
      formula,
      activity,
      bodyFat: Number(bodyFat),
      trainingDays: Number(trainingDays),
      stepsPerDay: Number(stepsPerDay),
    });
  }, [
    activity,
    age,
    bodyFat,
    formula,
    goalType,
    heightCm,
    heightFt,
    heightIn,
    heightUnit,
    sex,
    stepsPerDay,
    trainingDays,
    weightKg,
    weightLb,
  ]);

  const dynamicTargets = useMemo(
    () => calculateDynamicTargets(calculatedTargets, kcalGoal),
    [calculatedTargets, kcalGoal],
  );

  const activeCalorieGoal = useMemo(() => {
    const manual = Number(kcalGoal);
    if (Number.isFinite(manual) && manual > 0) return manual;
    if (dynamicTargets?.calories) return dynamicTargets.calories;
    if (calculatedTargets?.calories) return calculatedTargets.calories;
    return 0;
  }, [calculatedTargets?.calories, dynamicTargets?.calories, kcalGoal]);

  const microRecommendations = useMemo<MicroRecommendation[]>(() => {
    const caloriesBase = Math.max(Math.round(activeCalorieGoal || 2000), 1200);
    const fiberBase = Math.round((caloriesBase / 1000) * 14);
    const fiberGoal =
      goalType === "cut" ? fiberBase + 4 : goalType === "bulk" ? Math.max(30, fiberBase) : fiberBase;
    const sodiumLimit = 2300;
    const sugarLimit = Math.max(25, Math.round((caloriesBase * 0.1) / 4));
    const satFatLimit = Math.max(13, Math.round((caloriesBase * 0.1) / 9));
    const potassiumGoal = sex === "male" ? 3400 : sex === "female" ? 2600 : 3000;

    return [
      {
        label: "Fiber",
        value: `${fiberGoal} g/day goal`,
        note: "Higher fiber supports satiety, digestion, and steadier energy.",
      },
      {
        label: "Sodium",
        value: `<= ${sodiumLimit.toLocaleString()} mg/day`,
        note: "Keep sodium moderated to support blood pressure and recovery balance.",
      },
      {
        label: "Added sugar",
        value: `<= ${sugarLimit} g/day`,
        note: "Limit added sugars to ~10% of calories to protect energy stability.",
      },
      {
        label: "Saturated fat",
        value: `<= ${satFatLimit} g/day`,
        note: "A practical cap to support long-term heart health while hitting macros.",
      },
      {
        label: "Potassium",
        value: `${potassiumGoal.toLocaleString()} mg/day goal`,
        note: "Potassium helps hydration, nerve function, and muscle contraction.",
      },
    ];
  }, [activeCalorieGoal, goalType, sex]);

  const missingStats = useMemo(() => {
    const out: string[] = [];
    if (!age.trim()) out.push("Age");
    const weightVal = heightUnit === "imperial" ? weightLb : weightKg;
    if (!weightVal.trim()) out.push("Weight");
    if (heightUnit === "imperial") {
      if (!heightFt.trim() || !heightIn.trim()) out.push("Height");
    } else {
      if (!heightCm.trim()) out.push("Height");
    }
    return out;
  }, [age, heightCm, heightFt, heightIn, heightUnit, weightKg, weightLb]);

  useEffect(() => {
    if (targetsTouched || !calculatedTargets) return;
    setKcalGoal(String(calculatedTargets.calories));
  }, [calculatedTargets, targetsTouched]);

  useEffect(() => {
    if (macrosTouched || !dynamicTargets) return;
    setCarbs(String(dynamicTargets.carbsG));
    setProtein(String(dynamicTargets.proteinG));
    setFat(String(dynamicTargets.fatG));
  }, [dynamicTargets, macrosTouched]);

  useEffect(() => {
    if (!hydrated) return;
    const goals: Record<string, { value: number; mode: MicroTargetMode }> = {};
    for (const key of microSlotKeys) {
      const d = microSlotData[key];
      if (d && String(d.value).trim() && Number.isFinite(Number(d.value))) {
        goals[key] = { value: Number(d.value), mode: d.mode };
      }
    }
    saveMicroState({ slotKeys: microSlotKeys, goals });
  }, [hydrated, microSlotKeys, microSlotData]);

  const selectedActivity = useMemo(
    () => activityOptions.find((option) => option.value === activity),
    [activity],
  );

  const toLocalDate = (date: Date) => date.toISOString().slice(0, 10);

  const saveAllTargets = async (overrideGoal?: number) => {
    const manualGoal = Number(kcalGoal);
    const weightNum =
      heightUnit === "imperial"
        ? Number(weightLb) * 0.453592
        : Number(weightKg);
    const heightNum =
      heightUnit === "imperial"
        ? (Number(heightFt) * 12 + Number(heightIn)) * 2.54
        : Number(heightCm);
    const ageNum = Number(age);
    const today = new Date();
    const dob = Number.isFinite(ageNum)
      ? new Date(today.getFullYear() - ageNum, today.getMonth(), today.getDate())
      : null;
    const goalNum =
      Number.isFinite(overrideGoal) && overrideGoal
        ? overrideGoal
        : Number.isFinite(manualGoal) && manualGoal > 0
          ? manualGoal
          : dynamicTargets?.calories;
    if (!goalNum) {
      appToast.info("Enter a calorie goal", {
        description: "Add a daily goal to save your targets.",
      });
      return;
    }
    const carbsNum = Number(carbs);
    const proteinNum = Number(protein);
    const fatNum = Number(fat);
    const localDate = toLocalDate(today);

    await ensureUser();
    await upsertUserProfile({
      displayName: userProfile.displayName ?? "You",
      sex: sex || null,
      dob: dob ? toLocalDate(dob) : null,
      heightCm: Number.isFinite(heightNum) ? heightNum : null,
      units: "metric",
    });
    if (Number.isFinite(weightNum) && weightNum > 0) {
      await upsertWeightLog({
        localDate,
        weight: weightNum,
        unit: "kg",
      });
    }
    await upsertNutritionTargets({
      localDate,
      kcalGoal: goalNum,
      carbsG: Number.isFinite(carbsNum) ? carbsNum : undefined,
      proteinG: Number.isFinite(proteinNum) ? proteinNum : undefined,
      fatG: Number.isFinite(fatNum) ? fatNum : undefined,
    });
    await upsertNutritionSettings({
      kcalGoal: goalNum,
      carbsG: Number.isFinite(carbsNum) ? carbsNum : undefined,
      proteinG: Number.isFinite(proteinNum) ? proteinNum : undefined,
      fatG: Number.isFinite(fatNum) ? fatNum : undefined,
    });
    nutrition.setGoal(goalNum);
    nutrition.setMacroTargets({
      carbs: Number.isFinite(carbsNum) ? carbsNum : undefined,
      protein: Number.isFinite(proteinNum) ? proteinNum : undefined,
      fat: Number.isFinite(fatNum) ? fatNum : undefined,
    });
    setUserProfile({
      displayName: userProfile.displayName ?? "You",
      goal: goalType,
      sex,
      age: Number.isFinite(ageNum) ? ageNum : undefined,
      heightCm: Number.isFinite(heightNum) ? heightNum : undefined,
      weightKg: Number.isFinite(weightNum) ? weightNum : undefined,
      activity,
    });
    const microGoals: Record<string, { value: number; mode: MicroTargetMode }> = {};
    for (const key of microSlotKeys) {
      const d = microSlotData[key];
      if (d && d.value.trim() && Number.isFinite(Number(d.value))) {
        microGoals[key] = { value: Number(d.value), mode: d.mode };
      }
    }
    saveMicroState({ slotKeys: microSlotKeys, goals: microGoals });
    appToast.info("Goals saved", {
      description: `Daily goal set to ${Math.round(goalNum)} cal.`,
    });
  };

  return (
    <AppShell experience="nutrition">
      <PageContainer>
        <div className="flex items-center gap-2 py-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            aria-label="Back"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-display font-semibold text-foreground">
            Nutrition goals
          </h1>
        </div>

        {/* Daily targets at a glance — matches HUD/sheet so this page is the single source of truth */}
        <Card className="mt-4 rounded-[24px] border border-border/60 bg-card/95 px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">
            Daily targets
          </p>
          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">Calories</span>
              <p className="font-semibold tabular-nums text-foreground">
                {Math.round(activeCalorieGoal || 0).toLocaleString()} cal
              </p>
            </div>
            <div>
              <span className="text-muted-foreground">Protein</span>
              <p className="font-semibold tabular-nums text-foreground">{protein || "—"} g</p>
            </div>
            <div>
              <span className="text-muted-foreground">Carbs</span>
              <p className="font-semibold tabular-nums text-foreground">{carbs || "—"} g</p>
            </div>
            <div>
              <span className="text-muted-foreground">Fat</span>
              <p className="font-semibold tabular-nums text-foreground">{fat || "—"} g</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border/50 pt-3">
            {microSlotKeys.map((key) => {
              const opt = MICRO_OPTIONS.find((o) => o.key === key);
              const data = microSlotData[key];
              if (!opt) return null;
              const mode = data?.mode ?? "goal";
              const val = data?.value ?? "";
              return (
                <span
                  key={key}
                  className="rounded-full bg-muted/70 px-2.5 py-1 text-xs font-medium text-foreground"
                >
                  {opt.label} {mode === "limit" ? "≤" : "≥"} {val || "—"} {opt.unit}
                </span>
              );
            })}
          </div>
        </Card>

        <Card className="mt-4 rounded-[22px] border border-primary/20 bg-gradient-to-br from-background via-card to-secondary/55 px-3 py-3 shadow-[0_12px_30px_rgba(14,165,233,0.12)]">
          <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/80">
            Quick sections
          </p>
          <Tabs
            value={sectionTab}
            onValueChange={(value) => {
              const next = value as "energy" | "micros";
              setSectionTab(next);
              if (next === "micros") setMicroSectionOpen(true);
            }}
            className="mt-2"
          >
            <TabsList className="grid h-10 w-full grid-cols-2 rounded-full bg-secondary/70 p-1">
              <TabsTrigger
                value="energy"
                className="rounded-full text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground"
              >
                Energy & Macros
              </TabsTrigger>
              <TabsTrigger
                value="micros"
                className="rounded-full text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-foreground"
              >
                Micronutrients
              </TabsTrigger>
            </TabsList>
            <TabsContent value="energy" className="mt-0">
        <div className="mt-6 rounded-[28px] bg-gradient-to-br from-background via-card to-secondary/60 px-5 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.2)]">
          <p className="text-xs uppercase tracking-[0.2em] text-primary/80">
            Your path
          </p>
          <h2 className="mt-1 text-xl font-display font-semibold text-foreground">
            Choose your focus
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick cut, maintain, or bulk and we’ll compute daily calories.
          </p>
        </div>

        <Card className="mt-8 rounded-[28px] border border-border/60 bg-card px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs uppercase tracking-[0.2em] text-primary/75">
            Goal type
          </p>
          <SegmentedControl
            value={goalType}
            onValueChange={(v) => setGoalType(v as GoalType)}
            options={[
              { value: "cut", label: "Cut" },
              { value: "balance", label: "Maintain" },
              { value: "bulk", label: "Bulk" },
            ]}
            className="mt-4"
          />
        </Card>

        <Card className="mt-8 rounded-[28px] border border-border/60 bg-card px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs uppercase tracking-[0.2em] text-primary/75">
            Your stats
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Required for calorie and macro calculations. Optional details can fine-tune results.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal-age" className="flex items-center gap-1">
                Age <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id="goal-age"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                placeholder="Years"
                inputMode="numeric"
                type="number"
                aria-required="true"
                aria-invalid={!age.trim()}
                className={cn("h-11 rounded-full", !age.trim() && "border-accent/70 focus-visible:ring-accent/30")}
              />
              {!age.trim() && (
                <p className="text-xs text-muted-foreground">Required</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-weight" className="flex items-center gap-1">
                {heightUnit === "imperial" ? "Weight (lb)" : "Weight (kg)"} <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id="goal-weight"
                value={heightUnit === "imperial" ? weightLb : weightKg}
                onChange={(event) =>
                  heightUnit === "imperial"
                    ? setWeightLb(event.target.value)
                    : setWeightKg(event.target.value)
                }
                placeholder={heightUnit === "imperial" ? "lbs" : "kg"}
                inputMode="numeric"
                type="number"
                aria-required="true"
                aria-invalid={!(heightUnit === "imperial" ? weightLb : weightKg).trim()}
                className={cn(
                  "h-11 rounded-full",
                  !(heightUnit === "imperial" ? weightLb : weightKg).trim() && "border-accent/70 focus-visible:ring-accent/30",
                )}
              />
              {!(heightUnit === "imperial" ? weightLb : weightKg).trim() && (
                <p className="text-xs text-muted-foreground">Required</p>
              )}
            </div>
          </div>
          <div className="mt-3 rounded-[18px] border border-border/70 bg-secondary/55 p-2">
            <SegmentedControl
              value={heightUnit}
              onValueChange={(value) =>
                handleHeightUnitChange(value as "imperial" | "metric")
              }
              options={[
                { value: "imperial", label: "ft / lb" },
                { value: "metric", label: "cm / kg" },
              ]}
            />
          </div>
          {heightUnit === "imperial" ? (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="goal-height-ft" className="flex items-center gap-1">
                  Height (ft) <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input
                  id="goal-height-ft"
                  value={heightFt}
                  onChange={(event) => setHeightFt(event.target.value)}
                  placeholder="ft"
                  inputMode="numeric"
                  type="number"
                  min={3}
                  max={8}
                  aria-required="true"
                  aria-invalid={!heightFt.trim() || !heightIn.trim()}
                  className={cn("h-11 rounded-full", (!heightFt.trim() || !heightIn.trim()) && "border-accent/70 focus-visible:ring-accent/30")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-height-in" className="flex items-center gap-1">
                  Height (in) <span className="text-destructive" aria-hidden="true">*</span>
                </Label>
                <Input
                  id="goal-height-in"
                  value={heightIn}
                  onChange={(event) => setHeightIn(event.target.value)}
                  placeholder="in"
                  inputMode="numeric"
                  type="number"
                  min={0}
                  max={11}
                  aria-required="true"
                  aria-invalid={!heightFt.trim() || !heightIn.trim()}
                  className={cn("h-11 rounded-full", (!heightFt.trim() || !heightIn.trim()) && "border-accent/70 focus-visible:ring-accent/30")}
                />
              </div>
              {(!heightFt.trim() || !heightIn.trim()) && (
                <p className="col-span-2 text-xs text-muted-foreground">Required</p>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-2">
              <Label htmlFor="goal-height-cm" className="flex items-center gap-1">
                Height (cm) <span className="text-destructive" aria-hidden="true">*</span>
              </Label>
              <Input
                id="goal-height-cm"
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
                placeholder="cm"
                inputMode="numeric"
                type="number"
                min={90}
                max={250}
                aria-required="true"
                aria-invalid={!heightCm.trim()}
                className={cn("h-11 rounded-full", !heightCm.trim() && "border-accent/70 focus-visible:ring-accent/30")}
              />
              {!heightCm.trim() && (
                <p className="text-xs text-muted-foreground">Required</p>
              )}
            </div>
          )}
          <div className="mt-4 space-y-2">
            <Label>Activity level</Label>
            <div className="grid grid-cols-2 gap-2">
              {activityOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setActivity(option.value)}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                    activity === option.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {selectedActivity && (
            <p className="mt-3 text-xs text-muted-foreground">
              {selectedActivity.description}
            </p>
          )}

          <div className="mt-4 rounded-[20px] border border-border/70 bg-secondary/55 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-primary/75">
              Sex
            </p>
            <RadioGroup
              value={sex}
              onValueChange={setSex}
              className="mt-3 flex gap-4"
            >
              <div className="flex items-center gap-2">
                <RadioGroupItem value="female" id="female" />
                <Label htmlFor="female">Female</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="male" id="male" />
                <Label htmlFor="male">Male</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="other" id="other" />
                <Label htmlFor="other">Other</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="mt-4 rounded-[20px] border border-border/70 bg-card/90 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-primary/75">
              Formula
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {(["mifflin", "katch"] as Formula[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFormula(value)}
                  className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                    formula === value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {value === "mifflin" ? "Mifflin-St Jeor" : "Katch-McArdle"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Katch is more accurate when body fat % is provided.
            </p>
          </div>
          <Collapsible
            open={optionalOpen}
            onOpenChange={setOptionalOpen}
            className="mt-4"
          >
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
              >
                Optional details
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    optionalOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 rounded-[20px] border border-border/70 bg-card/80 px-4 py-4">
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label htmlFor="goal-bodyfat">Body fat % (optional)</Label>
                  <Input
                    id="goal-bodyfat"
                    value={bodyFat}
                    onChange={(event) => setBodyFat(event.target.value)}
                    placeholder="e.g. 22"
                    inputMode="numeric"
                    type="number"
                    className="h-11 rounded-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Adds precision using lean‑mass estimation.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-training">Training days / week (optional)</Label>
                  <Input
                    id="goal-training"
                    value={trainingDays}
                    onChange={(event) => setTrainingDays(event.target.value)}
                    placeholder="e.g. 4"
                    inputMode="numeric"
                    type="number"
                    className="h-11 rounded-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Helps fine‑tune activity adjustment.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="goal-steps">Steps per day (optional)</Label>
                  <Input
                    id="goal-steps"
                    value={stepsPerDay}
                    onChange={(event) => setStepsPerDay(event.target.value)}
                    placeholder="e.g. 6500"
                    inputMode="numeric"
                    type="number"
                    className="h-11 rounded-full"
                  />
                  <p className="text-xs text-muted-foreground">
                    Captures daily movement outside workouts.
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card className="mt-8 rounded-[28px] border border-border/60 bg-card px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs uppercase tracking-[0.2em] text-primary/75">
            Calorie + macro targets
          </p>
          <div className="mt-4 space-y-6">
            <CalorieTargetsSection
              calculatedTargets={calculatedTargets}
              kcalGoalValue={activeCalorieGoal}
              onGoalChange={(value) => {
                setTargetsTouched(true);
                setKcalGoal(String(Math.round(value)));
              }}
              onUseRecommended={() => {
                if (!dynamicTargets) return;
                const target = Math.round(dynamicTargets.calories);
                void saveAllTargets(target);
              }}
              disableUseRecommended={!dynamicTargets}
              missingStats={missingStats}
            />

            <div className="h-px bg-border/60" />

            <MacroTargetsSection
              carbs={carbs}
              protein={protein}
              fat={fat}
              onCarbsChange={(value) => {
                setMacrosTouched(true);
                setCarbs(value);
              }}
              onProteinChange={(value) => {
                setMacrosTouched(true);
                setProtein(value);
              }}
              onFatChange={(value) => {
                setMacrosTouched(true);
                setFat(value);
              }}
              onSave={() => {
                void saveAllTargets();
              }}
              disableSave={!dynamicTargets}
              missingStats={missingStats}
            />
          </div>
        </Card>
            </TabsContent>
            <TabsContent value="micros" className="mt-0">
          <Card ref={microsSectionRef} className="mt-6 rounded-[28px] border border-border/60 bg-card px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <Collapsible open={microSectionOpen} onOpenChange={setMicroSectionOpen}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-between gap-3 rounded-full py-2 text-left"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">
                    Micronutrients
                  </p>
                  <p className="mt-0.5 break-words text-xs text-muted-foreground">
                    Choose which 3 to show on your dashboard. Goal = meet or exceed; Limit = stay under.
                  </p>
                </div>
                <ChevronDown
                  className={cn("h-4 w-4 shrink-0 transition-transform", microSectionOpen && "rotate-180")}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 space-y-4">
              {[0, 1, 2].map((index) => {
                const slotKey = microSlotKeys[index] ?? "fiber_g";
                const opt = MICRO_OPTIONS.find((o) => o.key === slotKey) ?? MICRO_OPTIONS[0];
                const data = microSlotData[slotKey] ?? { value: "", mode: "goal" as MicroTargetMode };
                const usedKeys = new Set(microSlotKeys);
                return (
                  <div
                    key={`${index}-${slotKey}`}
                    className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <Label className="text-xs font-medium text-foreground">Track</Label>
                      <Select
                        value={slotKey}
                        onValueChange={(next) => {
                          const nextKeys = [...microSlotKeys];
                          nextKeys[index] = next;
                          setMicroSlotKeys(nextKeys);
                          setMicroSlotData((p) => {
                            if (p[next]) return p;
                            return { ...p, [next]: { value: "", mode: "goal" } };
                          });
                        }}
                      >
                        <SelectTrigger className="h-8 rounded-lg border-border/60 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {MICRO_OPTIONS.map((o) => (
                            <SelectItem
                              key={o.key}
                              value={o.key}
                              disabled={o.key !== slotKey && usedKeys.has(o.key)}
                            >
                              {o.label} ({o.unit})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <div className="flex rounded-full border border-border/60 bg-background p-0.5">
                        <button
                          type="button"
                          onClick={() => {
                            setMicroSlotData((p) => ({ ...p, [slotKey]: { ...(p[slotKey] ?? { value: "", mode: "goal" }), mode: "goal" } }));
                          }}
                          className={cn(
                            "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition",
                            data.mode === "goal" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <TrendingUp className="h-3 w-3" />
                          Goal
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMicroSlotData((p) => ({ ...p, [slotKey]: { ...(p[slotKey] ?? { value: "", mode: "goal" }), mode: "limit" } }));
                          }}
                          className={cn(
                            "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition",
                            data.mode === "limit" ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
                          )}
                        >
                          <TrendingDown className="h-3 w-3" />
                          Limit
                        </button>
                      </div>
                      <Input
                        type="number"
                        min={0}
                        inputMode="numeric"
                        value={data.value}
                        onChange={(e) => {
                          const v = e.target.value;
                          setMicroSlotData((p) => ({ ...p, [slotKey]: { ...(p[slotKey] ?? { value: "", mode: "goal" }), value: v } }));
                        }}
                        onBlur={() => {}}
                        className="h-8 flex-1 rounded-lg border-border/60 text-xs"
                        placeholder={data.mode === "limit" ? "e.g. 2300" : "—"}
                      />
                    </div>
                  </div>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
          </Card>
            </TabsContent>
          </Tabs>
        </Card>
      </PageContainer>
    </AppShell>
  );
};

export default Goals;
