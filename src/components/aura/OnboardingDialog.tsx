import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ChevronDown, Sparkles, Target, Zap } from "lucide-react";
import {
  ensureUser,
  upsertNutritionSettings,
  upsertNutritionTargets,
  upsertUserProfile,
  upsertWeightLog,
} from "@/lib/api";
import { calculateDynamicTargets, calculateTargets } from "@/lib/nutritionTargets";
import { useAppStore } from "@/state/AppStore";
import { useAuth } from "@/hooks/useAuth";

const STORAGE_KEY = "aurafit-onboarded-v1";

const toLocalDate = (date: Date) => date.toISOString().slice(0, 10);

export const OnboardingDialog = ({
  onComplete,
}: {
  onComplete?: () => void;
}) => {
  const { nutrition, setUserProfile } = useAppStore();
  const { userId, status } = useAuth();
  const [open, setOpen] = useState(false);
  const [hasSeen, setHasSeen] = useState<boolean | null>(null);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState("You");
  const [sex, setSex] = useState<"male" | "female" | "other" | "">("");
  const [age, setAge] = useState("");
  const [heightUnit, setHeightUnit] = useState<"imperial" | "metric">("imperial");
  const [heightFt, setHeightFt] = useState("");
  const [heightIn, setHeightIn] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [weightLb, setWeightLb] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [activity, setActivity] = useState<"sedentary" | "light" | "moderate" | "active" | "athlete">("moderate");
  const [goalType, setGoalType] = useState<"cut" | "balance" | "bulk">("balance");
  const [formula, setFormula] = useState<"mifflin" | "katch">("mifflin");
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
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const isSignedIn = status === "ready" && Boolean(userId);
  const hasGoal = nutrition.summary.goal > 0;
  const hasMacroTargets = nutrition.macros.some((macro) => macro.goal > 0);
  const nutritionReady = !nutrition.isLoading;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const seen = window.localStorage.getItem(STORAGE_KEY);
    setHasSeen(Boolean(seen));
  }, []);

  useEffect(() => {
    if (!isSignedIn || !nutritionReady || hasSeen === null) {
      setOpen(false);
      return;
    }

    if (hasGoal || hasMacroTargets) {
      if (typeof window !== "undefined" && !hasSeen) {
        window.localStorage.setItem(STORAGE_KEY, "true");
        setHasSeen(true);
      }
      setOpen(false);
      return;
    }

    setOpen(!hasSeen);
  }, [hasGoal, hasMacroTargets, hasSeen, isSignedIn, nutritionReady]);

  useEffect(() => {
    if (targetsTouched) return;
    setCarbs(String(nutrition.macros.find((m) => m.key === "carbs")?.goal ?? ""));
    setProtein(String(nutrition.macros.find((m) => m.key === "protein")?.goal ?? ""));
    setFat(String(nutrition.macros.find((m) => m.key === "fat")?.goal ?? ""));
  }, [nutrition.macros, targetsTouched]);

  const calculatedTargets = useMemo(() => {
    const weight =
      heightUnit === "imperial"
        ? Number(weightLb) * 0.453592
        : Number(weightKg);
    const height =
      heightUnit === "imperial"
        ? (Number(heightFt) * 12 + Number(heightIn)) * 2.54
        : Number(heightCm);
    const years = Number(age);
    if (!Number.isFinite(weight) || !Number.isFinite(height) || !Number.isFinite(years)) {
      return null;
    }
    return calculateTargets({
      weightKg: weight,
      heightCm: height,
      age: years,
      sex: sex || "other",
      goalType,
      formula,
      activity,
      bodyFat: Number(bodyFat),
      trainingDays: Number(trainingDays),
      stepsPerDay: Number(stepsPerDay),
    });
  }, [
    age,
    bodyFat,
    formula,
    goalType,
    heightCm,
    heightFt,
    heightIn,
    heightUnit,
    sex,
    weightKg,
    weightLb,
    activity,
    trainingDays,
    stepsPerDay,
  ]);

  const dynamicTargets = useMemo(() => {
    return calculateDynamicTargets(calculatedTargets, kcalGoal);
  }, [calculatedTargets, kcalGoal]);

  useEffect(() => {
    if (step !== 2 || targetsTouched || !calculatedTargets) return;
    setKcalGoal(String(calculatedTargets.calories));
    setProtein(String(calculatedTargets.proteinG));
    setFat(String(calculatedTargets.fatG));
    setCarbs(String(calculatedTargets.carbsG));
  }, [calculatedTargets, step, targetsTouched]);

  const canContinueBasics = useMemo(() => {
    const heightValid =
      heightUnit === "imperial"
        ? Number(heightFt) > 0
        : Number(heightCm) > 0;
    const weightValid =
      heightUnit === "imperial"
        ? Number(weightLb) > 0
        : Number(weightKg) > 0;
    return Number(age) > 0 && heightValid && weightValid && sex !== "";
  }, [age, heightCm, heightFt, heightUnit, weightKg, weightLb, sex]);

  const canSave = useMemo(() => {
    const goalNum = Number(kcalGoal);
    return Number.isFinite(goalNum) && goalNum > 0;
  }, [kcalGoal]);

  const handleSave = async () => {
    const localDate = toLocalDate(new Date());
    const goalNum = Number(kcalGoal);
    const carbsNum = Number(carbs);
    const proteinNum = Number(protein);
    const fatNum = Number(fat);
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

    await ensureUser();
    await upsertUserProfile({
      displayName: name.trim() || "You",
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
      displayName: name.trim() || "You",
      goal: goalType,
      sex: sex || "other",
      age: Number.isFinite(ageNum) ? ageNum : undefined,
      heightCm: Number.isFinite(heightNum) ? heightNum : undefined,
      weightKg: Number.isFinite(weightNum) ? weightNum : undefined,
      activity,
    });

    if (typeof window !== "undefined") {
      window.localStorage.setItem(STORAGE_KEY, "true");
      setHasSeen(true);
    }
    onComplete?.();
    setOpen(false);
  };

  if (!open) return null;

  const stepVariants = {
    hidden: { opacity: 0, y: 12 },
    show: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
  };

  const stepIcons = [Sparkles, Target, Zap];
  const stepTitles = ["Let's get to know you", "Your body, your way", "Set your goals"];
  const stepDescriptions = [
    "A quick intro so we can personalize your experience",
    "We'll use this to calculate your ideal targets",
    "Fine-tune your daily calorie and macro goals"
  ];
  const StepIcon = stepIcons[step];

  return (
    <div className="fixed inset-0 z-[70] overflow-auto bg-gradient-to-br from-emerald-100 via-emerald-50 to-white">
      {/* Decorative background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-10 top-20 h-40 w-40 rounded-full bg-emerald-200/50 blur-3xl" />
        <div className="absolute right-[-40px] top-40 h-48 w-48 rounded-full bg-emerald-300/40 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-sm flex-col px-5 pb-10 pt-[calc(env(safe-area-inset-top)+1.5rem)]">
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">AuraFit</p>
          <button
            type="button"
            className="rounded-full bg-white/80 px-3 py-2 text-xs font-semibold text-emerald-700 shadow-[0_8px_20px_rgba(16,185,129,0.15)]"
            onClick={() => {
              window.localStorage.setItem(STORAGE_KEY, "true");
              setHasSeen(true);
              setOpen(false);
            }}
          >
            Skip for now
          </button>
        </div>

        {/* Animated step header */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`header-${step}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="mt-6 text-center"
          >
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[20px] bg-white shadow-[0_12px_28px_rgba(16,185,129,0.2)]">
              <StepIcon className="h-6 w-6 text-emerald-500" />
            </div>
            <h1 className="mt-4 text-2xl font-display font-semibold text-emerald-950">
              {stepTitles[step]}
            </h1>
            <p className="mt-1 text-sm text-emerald-700/70">
              {stepDescriptions[step]}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Step indicators */}
        <div className="mt-5 flex items-center justify-center gap-2">
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === step ? "w-8 bg-emerald-400" : idx < step ? "w-2 bg-emerald-400" : "w-2 bg-emerald-200"
              }`}
            />
          ))}
        </div>

        <div className="mt-5 space-y-4 rounded-[28px] border border-emerald-100 bg-white/90 px-4 py-4 shadow-[0_14px_30px_rgba(16,185,129,0.12)]">
          <AnimatePresence mode="wait" initial={false}>
            {step === 0 && (
              <motion.div
                key="step-0"
                variants={stepVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    What should we call you?
                  </label>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Your name"
                    className="rounded-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    What's your main goal?
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["cut", "balance", "bulk"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setGoalType(value)}
                        className={`rounded-full border px-3 py-2.5 text-xs font-semibold transition-all ${
                          goalType === value
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700 shadow-[0_4px_12px_rgba(16,185,129,0.15)]"
                            : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                        }`}
                      >
                        {value === "cut" ? "🔥 Fat loss" : value === "bulk" ? "💪 Build" : "⚖️ Maintain"}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step-1"
                variants={stepVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Biological sex
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["female", "male", "other"] as const).map((value) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setSex(value)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition-all ${
                          sex === value
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                        }`}
                      >
                        {value === "female" ? "Female" : value === "male" ? "Male" : "Other"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    value={age}
                    onChange={(event) => setAge(event.target.value)}
                    placeholder="Age"
                    inputMode="numeric"
                    type="number"
                    className="rounded-full"
                  />
                  {heightUnit === "imperial" ? (
                    <Input
                      value={weightLb}
                      onChange={(event) => setWeightLb(event.target.value)}
                      placeholder="Weight (lb)"
                      inputMode="numeric"
                      type="number"
                      className="rounded-full"
                    />
                  ) : (
                    <Input
                      value={weightKg}
                      onChange={(event) => setWeightKg(event.target.value)}
                      placeholder="Weight (kg)"
                      inputMode="numeric"
                      type="number"
                      className="rounded-full"
                    />
                  )}
                </div>
                {heightUnit === "imperial" ? (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={heightFt}
                      onChange={(event) => setHeightFt(event.target.value)}
                      placeholder="Height (ft)"
                      inputMode="numeric"
                      type="number"
                      className="rounded-full"
                    />
                    <Input
                      value={heightIn}
                      onChange={(event) => setHeightIn(event.target.value)}
                      placeholder="Height (in)"
                      inputMode="numeric"
                      type="number"
                      className="rounded-full"
                    />
                    <button
                      type="button"
                      onClick={() => setHeightUnit("metric")}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-emerald-200"
                    >
                      Use cm / kg
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      value={heightCm}
                      onChange={(event) => setHeightCm(event.target.value)}
                      placeholder="Height (cm)"
                      inputMode="numeric"
                      type="number"
                      className="rounded-full"
                    />
                    <div className="text-xs text-slate-500" />
                    <button
                      type="button"
                      onClick={() => setHeightUnit("imperial")}
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:border-emerald-200"
                    >
                      Use ft / lb
                    </button>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Activity level
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { value: "sedentary", label: "🪑 Sedentary" },
                      { value: "light", label: "🚶 Light" },
                      { value: "moderate", label: "🏃 Moderate" },
                      { value: "active", label: "⚡ Active" },
                      { value: "athlete", label: "🏆 Athlete" },
                    ] as const).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setActivity(option.value)}
                        className={`rounded-full border px-3 py-2 text-xs font-semibold transition-all ${
                          activity === option.value
                            ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                            : "border-slate-200 bg-white text-slate-600 hover:border-emerald-200"
                        }`}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    {activity === "sedentary" &&
                      "Office or remote work with little movement."}
                    {activity === "light" &&
                      "Mostly desk work but you walk daily or do light workouts 1-3x/week."}
                    {activity === "moderate" &&
                      "Mix of desk work + regular training 3-5x/week."}
                    {activity === "active" &&
                      "Labor-intensive job or training nearly daily."}
                    {activity === "athlete" &&
                      "Very high volume training or physically demanding work."}
                  </p>
                </div>
                <Collapsible open={optionalOpen} onOpenChange={setOptionalOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                    >
                      Add optional details
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          optionalOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-2">
                    <p className="text-xs text-slate-500">
                      These add precision if you know them. Leave blank if unsure.
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <Input
                        value={bodyFat}
                        onChange={(event) => setBodyFat(event.target.value)}
                        placeholder="Body fat %"
                        inputMode="numeric"
                        type="number"
                        className="rounded-full"
                      />
                      <Input
                        value={trainingDays}
                        onChange={(event) => setTrainingDays(event.target.value)}
                        placeholder="Training days / wk"
                        inputMode="numeric"
                        type="number"
                        className="rounded-full"
                      />
                      <Input
                        value={stepsPerDay}
                        onChange={(event) => setStepsPerDay(event.target.value)}
                        placeholder="Steps / day"
                        inputMode="numeric"
                        type="number"
                        className="rounded-full"
                      />
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step-2"
                variants={stepVariants}
                initial="hidden"
                animate="show"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeOut" }}
                className="space-y-4"
              >
                <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
                  <CollapsibleTrigger asChild>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600"
                    >
                      Advanced formula settings
                      <ChevronDown
                        className={`h-4 w-4 transition-transform ${
                          advancedOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Formula
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {([
                        { value: "mifflin", label: "Mifflin-St Jeor" },
                        { value: "katch", label: "Katch-McArdle" },
                      ] as const).map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setFormula(option.value)}
                          className={`rounded-full border px-3 py-2 text-xs font-semibold ${
                            formula === option.value
                              ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                    {formula === "katch" && !calculatedTargets?.leanMass ? (
                      <p className="text-xs text-slate-500">
                        Add body fat % to enable Katch-McArdle. Using Mifflin for now.
                      </p>
                    ) : null}
                  </CollapsibleContent>
                </Collapsible>
                <div className="rounded-[18px] border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-700">
                  ✨ Based on your info, we've calculated personalized targets. Adjust if needed!
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Daily calories
                  </label>
                  {calculatedTargets?.caloriesRange ? (
                    <p className="text-xs text-slate-500">
                      Suggested range: {calculatedTargets.caloriesRange.min}–{calculatedTargets.caloriesRange.max} cal
                    </p>
                  ) : null}
                  <Input
                    value={kcalGoal}
                    onChange={(event) => {
                      setTargetsTouched(true);
                      setKcalGoal(event.target.value);
                      setMacrosTouched(false);
                    }}
                    placeholder="e.g. 2200"
                    inputMode="numeric"
                    type="number"
                    className="rounded-full"
                  />
                  {calculatedTargets?.caloriesRange ? (
                    <div className="mt-3 rounded-[16px] border border-emerald-100 bg-emerald-50/60 px-3 py-3">
                      <Slider
                        value={[
                          Math.min(
                            Math.max(
                              Number(kcalGoal || calculatedTargets.calories),
                              calculatedTargets.caloriesRange.min,
                            ),
                            calculatedTargets.caloriesRange.max,
                          ),
                        ]}
                        min={calculatedTargets.caloriesRange.min}
                        max={calculatedTargets.caloriesRange.max}
                        step={10}
                        onValueChange={(value) => {
                          const next = value[0];
                          setTargetsTouched(true);
                          setKcalGoal(String(next));
                          if (!macrosTouched) {
                            setProtein(String(calculatedTargets.proteinG));
                            setFat(String(calculatedTargets.fatG));
                            const remaining =
                              next -
                              calculatedTargets.proteinG * 4 -
                              calculatedTargets.fatG * 9;
                            setCarbs(
                              String(Math.max(0, Math.round(remaining / 4))),
                            );
                          }
                        }}
                      />
                      <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-600/70">
                        <span>{calculatedTargets.caloriesRange.min}</span>
                        <span>{calculatedTargets.caloriesRange.max}</span>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                    Macro targets (g)
                  </label>
                  {dynamicTargets?.macroRanges ? (
                    <p className="text-xs text-slate-500">
                      Carbs {dynamicTargets.macroRanges.carbs.min}–{dynamicTargets.macroRanges.carbs.max}g · Protein {dynamicTargets.macroRanges.protein.min}–{dynamicTargets.macroRanges.protein.max}g · Fat {dynamicTargets.macroRanges.fat.min}–{dynamicTargets.macroRanges.fat.max}g
                    </p>
                  ) : null}
                  <div className="grid grid-cols-3 gap-2">
                    <Input
                      value={carbs}
                      onChange={(event) => {
                        setTargetsTouched(true);
                        setCarbs(event.target.value);
                        setMacrosTouched(true);
                      }}
                      placeholder="Carbs"
                      inputMode="numeric"
                      type="number"
                      className="rounded-full"
                    />
                    <Input
                      value={protein}
                      onChange={(event) => {
                        setTargetsTouched(true);
                        setProtein(event.target.value);
                        setMacrosTouched(true);
                      }}
                      placeholder="Protein"
                      inputMode="numeric"
                      type="number"
                      className="rounded-full"
                    />
                    <Input
                      value={fat}
                      onChange={(event) => {
                        setTargetsTouched(true);
                        setFat(event.target.value);
                        setMacrosTouched(true);
                      }}
                      placeholder="Fat"
                      inputMode="numeric"
                      type="number"
                      className="rounded-full"
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex items-center gap-2 pt-2">
            {step > 0 ? (
              <Button
                type="button"
                variant="secondary"
                className="flex-1 rounded-full"
                onClick={() => setStep((prev) => (prev - 1) as 0 | 1 | 2)}
              >
                Back
              </Button>
            ) : null}
            {step < 2 ? (
              <Button
                type="button"
                className="flex-1 rounded-full bg-aura-primary py-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(74,222,128,0.3)]"
                onClick={() => setStep((prev) => (prev + 1) as 0 | 1 | 2)}
                disabled={step === 1 && !canContinueBasics}
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                className="flex-1 rounded-full bg-aura-primary py-5 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(74,222,128,0.3)]"
                onClick={handleSave}
                disabled={!canSave}
              >
                🎉 Let's go!
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
