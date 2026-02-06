import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { useAppStore } from "@/state/AppStore";
import { ChevronDown } from "lucide-react";
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

const GOALS_DRAFT_KEY = "aurafit-goals-draft-v1";

const Goals = () => {
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
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const draftTimerRef = useRef<number | null>(null);
  const { nutrition, userProfile, setUserProfile } = useAppStore();

  useEffect(() => {
    if (hydrated) return;
    if (typeof window !== "undefined") {
      const stored = window.localStorage.getItem(GOALS_DRAFT_KEY);
      if (stored) {
        try {
          const draft = JSON.parse(stored) as Partial<{
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
          }>;
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
          setHydrated(true);
          return;
        } catch {
          window.localStorage.removeItem(GOALS_DRAFT_KEY);
        }
      }
    }
    if (userProfile.sex) setSex(userProfile.sex);
    if (userProfile.age) setAge(String(userProfile.age));
    if (userProfile.activity) setActivity(userProfile.activity);
    if (userProfile.goal) setGoalType(userProfile.goal);
    if (Number.isFinite(userProfile.heightCm)) {
      setHeightUnit("metric");
      setHeightCm(String(Math.round(userProfile.heightCm ?? 0)));
    }
    if (Number.isFinite(userProfile.weightKg)) {
      setWeightKg(String(Math.round(userProfile.weightKg ?? 0)));
    }
    setHydrated(true);
  }, [hydrated, userProfile]);

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
    optionalOpen,
    protein,
    sex,
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
      toast("Enter a calorie goal", {
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
    toast("Goals saved", {
      description: `Daily goal set to ${Math.round(goalNum)} cal.`,
    });
  };

  return (
    <AppShell experience="nutrition">
      {/* pt includes safe-area for immersive edge-to-edge display */}
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10" style={{ paddingTop: "calc(1.5rem + var(--sat, env(safe-area-inset-top)))" }}>
        <div className="rounded-[28px] bg-gradient-to-br from-emerald-100 via-emerald-50 to-white px-5 py-6 shadow-[0_18px_40px_rgba(16,185,129,0.2)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-500">
            Goals
          </p>
          <h1 className="text-2xl font-display font-semibold text-emerald-950">
            Choose your path
          </h1>
          <p className="mt-1 text-sm text-emerald-700/70">
            Pick a focus and we will compute daily calories.
          </p>
        </div>

        <Card className="mt-6 rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            Goal type
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            {([
              { value: "cut", label: "Cut" },
              { value: "balance", label: "Maintain" },
              { value: "bulk", label: "Bulk" },
            ] as { value: GoalType; label: string }[]).map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setGoalType(item.value)}
                className={`rounded-[18px] px-3 py-3 text-center text-sm font-semibold transition ${
                  goalType === item.value
                    ? "bg-emerald-500 text-white shadow-[0_10px_24px_rgba(16,185,129,0.3)]"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </Card>

        <Card className="mt-6 rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            Your stats
          </p>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="goal-age">Age</Label>
              <Input
                id="goal-age"
                value={age}
                onChange={(event) => setAge(event.target.value)}
                placeholder="Years"
                inputMode="numeric"
                type="number"
                className="h-11 rounded-full"
              />
            </div>
            <div className="space-y-2">
              <Label>{heightUnit === "imperial" ? "Weight (lb)" : "Weight (kg)"}</Label>
              <Input
                value={heightUnit === "imperial" ? weightLb : weightKg}
                onChange={(event) =>
                  heightUnit === "imperial"
                    ? setWeightLb(event.target.value)
                    : setWeightKg(event.target.value)
                }
                placeholder={heightUnit === "imperial" ? "lbs" : "kg"}
                inputMode="numeric"
                type="number"
                className="h-11 rounded-full"
              />
            </div>
          </div>
          {heightUnit === "imperial" ? (
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Input
                value={heightFt}
                onChange={(event) => setHeightFt(event.target.value)}
                placeholder="Height (ft)"
                inputMode="numeric"
                type="number"
                className="h-11 rounded-full"
              />
              <Input
                value={heightIn}
                onChange={(event) => setHeightIn(event.target.value)}
                placeholder="Height (in)"
                inputMode="numeric"
                type="number"
                className="h-11 rounded-full"
              />
              <button
                type="button"
                onClick={() => setHeightUnit("metric")}
                className="h-11 rounded-full border border-emerald-100 bg-emerald-50 text-xs font-semibold text-emerald-700"
              >
                Use cm / kg
              </button>
            </div>
          ) : (
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Input
                value={heightCm}
                onChange={(event) => setHeightCm(event.target.value)}
                placeholder="Height (cm)"
                inputMode="numeric"
                type="number"
                className="h-11 rounded-full"
              />
              <button
                type="button"
                onClick={() => setHeightUnit("imperial")}
                className="h-11 rounded-full border border-emerald-100 bg-emerald-50 text-xs font-semibold text-emerald-700"
              >
                Use ft / lb
              </button>
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
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          {selectedActivity && (
            <p className="mt-3 text-xs text-slate-500">
              {selectedActivity.description}
            </p>
          )}

          <div className="mt-4 rounded-[20px] border border-emerald-100 bg-emerald-50/60 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
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
          <div className="mt-4 rounded-[20px] border border-emerald-100 bg-white/90 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
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
                      ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {value === "mifflin" ? "Mifflin-St Jeor" : "Katch-McArdle"}
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-500">
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
                className="w-full justify-between rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
              >
                Optional details
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    optionalOpen ? "rotate-180" : ""
                  }`}
                />
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-3 rounded-[20px] border border-emerald-100 bg-white/80 px-4 py-4">
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
                  <p className="text-xs text-slate-500">
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
                  <p className="text-xs text-slate-500">
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
                  <p className="text-xs text-slate-500">
                    Captures daily movement outside workouts.
                  </p>
                </div>
              </div>
            </CollapsibleContent>
          </Collapsible>
        </Card>

        <Card className="mt-6 rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            Calories
          </p>
          {calculatedTargets ? (
            <div className="mt-4 grid gap-3 text-sm">
              <div className="rounded-[18px] bg-emerald-50/80 px-4 py-4">
                <p className="text-xs text-emerald-500">Recommended range</p>
                <p className="text-lg font-semibold text-emerald-900">
                  {calculatedTargets.caloriesRange.min}–{calculatedTargets.caloriesRange.max} cal
                </p>
              </div>
              <div className="rounded-[18px] bg-emerald-500/90 px-4 py-4 text-white">
                <p className="text-xs text-white/80">Suggested target</p>
                <p className="text-lg font-semibold">
                  {dynamicTargets?.calories ?? calculatedTargets.calories} cal
                </p>
                <p className="mt-2 text-xs text-white/80">
                  Adjust the daily target if you want a faster or gentler pace.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="goal-kcal">Daily goal</Label>
                <Input
                  id="goal-kcal"
                  value={kcalGoal}
                  onChange={(event) => {
                    setTargetsTouched(true);
                    setKcalGoal(event.target.value);
                  }}
                  placeholder="e.g. 2100"
                  inputMode="numeric"
                  type="number"
                  className="h-11 rounded-full"
                />
              </div>
            </div>
          ) : (
            <p className="mt-4 text-sm text-slate-500">
              Enter your stats to compute calories.
            </p>
          )}
          <Button
            type="button"
            className="mt-4 w-full rounded-full bg-aura-primary py-5 text-sm font-semibold text-white shadow-[0_16px_30px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90"
            onClick={() => {
              if (!dynamicTargets) return;
              const target = Math.round(dynamicTargets.calories);
              void saveAllTargets(target);
            }}
            disabled={!dynamicTargets}
          >
            Use as daily goal
          </Button>
        </Card>

        <Card className="mt-6 rounded-[28px] border border-black/5 bg-white px-5 py-5 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            Macro targets
          </p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Carbs (g)</Label>
              <Input
                value={carbs}
                onChange={(event) => {
                  setMacrosTouched(true);
                  setCarbs(event.target.value);
                }}
                placeholder="0"
                inputMode="numeric"
                className="h-11 rounded-full"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Protein (g)</Label>
              <Input
                value={protein}
                onChange={(event) => {
                  setMacrosTouched(true);
                  setProtein(event.target.value);
                }}
                placeholder="0"
                inputMode="numeric"
                className="h-11 rounded-full"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-slate-500">Fat (g)</Label>
              <Input
                value={fat}
                onChange={(event) => {
                  setMacrosTouched(true);
                  setFat(event.target.value);
                }}
                placeholder="0"
                inputMode="numeric"
                className="h-11 rounded-full"
              />
            </div>
          </div>
          <Button
            type="button"
            className="mt-4 w-full rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
            onClick={() => {
              void saveAllTargets();
            }}
            disabled={!dynamicTargets}
          >
            Save macros
          </Button>
        </Card>
      </div>
    </AppShell>
  );
};

export default Goals;
