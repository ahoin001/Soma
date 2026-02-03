export type GoalType = "cut" | "balance" | "bulk";
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "athlete";
export type Formula = "mifflin" | "katch";
export type Sex = "male" | "female" | "other";

type TargetInputs = {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: Sex;
  goalType: GoalType;
  formula: Formula;
  activity: ActivityLevel;
  bodyFat?: number | null;
  trainingDays?: number | null;
  stepsPerDay?: number | null;
};

export const getActivityMultiplier = (
  activity: ActivityLevel,
  trainingDays?: number | null,
  stepsPerDay?: number | null,
) => {
  let base = 1.55;
  switch (activity) {
    case "sedentary":
      base = 1.2;
      break;
    case "light":
      base = 1.375;
      break;
    case "moderate":
      base = 1.55;
      break;
    case "active":
      base = 1.725;
      break;
    case "athlete":
      base = 1.9;
      break;
    default:
      base = 1.55;
      break;
  }
  const days = Number(trainingDays);
  if (Number.isFinite(days) && days > 0) {
    const adjustment = Math.min(Math.max((days - 3) * 0.03, -0.06), 0.12);
    base += adjustment;
  }
  const steps = Number(stepsPerDay);
  if (Number.isFinite(steps) && steps > 0) {
    const stepDelta = (steps - 6000) / 2000;
    const stepAdjustment = Math.min(Math.max(stepDelta * 0.03, -0.06), 0.09);
    base += stepAdjustment;
  }
  return base;
};

export const calculateTargets = (inputs: TargetInputs) => {
  const {
    weightKg,
    heightCm,
    age,
    sex,
    goalType,
    formula,
    activity,
    bodyFat,
    trainingDays,
    stepsPerDay,
  } = inputs;

  if (
    !Number.isFinite(weightKg) ||
    !Number.isFinite(heightCm) ||
    !Number.isFinite(age)
  ) {
    return null;
  }

  const sexModifier = sex === "male" ? 5 : sex === "female" ? -161 : -78;
  const bodyFatNum = Number(bodyFat);
  const leanMass =
    Number.isFinite(bodyFatNum) && bodyFatNum > 0 && bodyFatNum < 60
      ? weightKg * (1 - bodyFatNum / 100)
      : null;
  const mifflinBmr = 10 * weightKg + 6.25 * heightCm - 5 * age + sexModifier;
  const katchBmr = leanMass ? 370 + 21.6 * leanMass : null;
  const bmr = formula === "katch" && katchBmr ? katchBmr : mifflinBmr;
  const maintenance = bmr * getActivityMultiplier(activity, trainingDays, stepsPerDay);
  const range =
    goalType === "cut"
      ? { min: maintenance - 500, max: maintenance - 250 }
      : goalType === "bulk"
        ? { min: maintenance + 250, max: maintenance + 500 }
        : { min: maintenance - 100, max: maintenance + 100 };
  const calories = Math.max(1200, Math.round((range.min + range.max) / 2));
  const proteinPerKg = goalType === "cut" ? 2.2 : goalType === "bulk" ? 2.0 : 1.6;
  const fatPerKg = goalType === "cut" ? 0.7 : goalType === "bulk" ? 0.9 : 0.8;
  const proteinG = Math.round(weightKg * proteinPerKg);
  const fatG = Math.round(weightKg * fatPerKg);
  const remainingCals = calories - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, Math.round(remainingCals / 4));
  const macroRange = (value: number) => ({
    min: Math.max(0, Math.round(value * 0.9)),
    max: Math.max(0, Math.round(value * 1.1)),
  });
  return {
    calories,
    caloriesRange: {
      min: Math.max(1200, Math.round(range.min)),
      max: Math.max(1200, Math.round(range.max)),
    },
    proteinG,
    fatG,
    carbsG,
    macroRanges: {
      protein: macroRange(proteinG),
      fat: macroRange(fatG),
      carbs: macroRange(carbsG),
    },
    formulaUsed: formula === "katch" && katchBmr ? "katch" : "mifflin",
    leanMass,
  };
};

export const calculateDynamicTargets = (
  calculatedTargets: ReturnType<typeof calculateTargets>,
  kcalGoalInput: string,
) => {
  if (!calculatedTargets) return null;
  const kcalInput = Number(kcalGoalInput);
  const targetCalories =
    Number.isFinite(kcalInput) && kcalInput > 0
      ? kcalInput
      : calculatedTargets.calories;
  const proteinG = calculatedTargets.proteinG;
  const fatG = calculatedTargets.fatG;
  const remaining = targetCalories - proteinG * 4 - fatG * 9;
  const carbsG = Math.max(0, Math.round(remaining / 4));
  const macroRange = (value: number) => ({
    min: Math.max(0, Math.round(value * 0.9)),
    max: Math.max(0, Math.round(value * 1.1)),
  });
  return {
    calories: targetCalories,
    proteinG,
    fatG,
    carbsG,
    macroRanges: {
      protein: macroRange(proteinG),
      fat: macroRange(fatG),
      carbs: macroRange(carbsG),
    },
  };
};
