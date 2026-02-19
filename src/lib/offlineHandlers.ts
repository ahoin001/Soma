/**
 * Offline Mutation Handlers
 *
 * Registers handlers for each mutation type so they can be
 * replayed when coming back online.
 *
 * Import this file early in app initialization to register all handlers.
 */
import {
  registerMutationDedupe,
  registerMutationHandler,
  type MutationType,
} from "./offlineQueue";
import {
  createFood,
  createMealEntry,
  deleteMealEntryItem,
  ensureUser,
  toggleFoodFavorite,
  updateMealEntryItem,
  upsertActivityGoals,
  upsertNutritionSettings,
  upsertNutritionTargets,
  upsertStepsLog,
  upsertWaterLog,
  setWaterLogTotal,
  upsertWeightLog,
} from "./api";

// ============================================================================
// Nutrition Handlers
// ============================================================================

registerMutationHandler("nutrition.logFood", async (payload) => {
  const { food, mealTypeId, localDate } = payload as {
    food: {
      id: string;
      name: string;
      portion: string;
      kcal: number;
      macros: { carbs: number; protein: number; fat: number };
    };
    mealTypeId?: string;
    localDate: string;
  };

  await ensureUser();
  await createMealEntry({
    localDate,
    mealTypeId,
    items: [
      {
        foodId: food.id,
        foodName: food.name,
        portionLabel: food.portion,
        kcal: food.kcal,
        carbsG: food.macros.carbs,
        proteinG: food.macros.protein,
        fatG: food.macros.fat,
      },
    ],
  });
});

registerMutationHandler("nutrition.removeLogItem", async (payload) => {
  const { itemId } = payload as { itemId: string };
  await deleteMealEntryItem(itemId);
});

registerMutationHandler("nutrition.updateLogItem", async (payload) => {
  const { itemId, quantity } = payload as { itemId: string; quantity: number };
  await ensureUser();
  await updateMealEntryItem(itemId, { quantity });
});

registerMutationHandler("nutrition.setGoal", async (payload) => {
  const { localDate, goal } = payload as { localDate: string; goal: number };
  await upsertNutritionTargets({ localDate, kcalGoal: goal });
  await upsertNutritionSettings({ kcalGoal: goal });
});

registerMutationHandler("nutrition.setMacroTargets", async (payload) => {
  const { localDate, goal, carbs, protein, fat } = payload as {
    localDate: string;
    goal: number;
    carbs?: number;
    protein?: number;
    fat?: number;
  };
  await upsertNutritionTargets({
    localDate,
    kcalGoal: goal,
    carbsG: carbs,
    proteinG: protein,
    fatG: fat,
  });
  await upsertNutritionSettings({
    carbsG: carbs,
    proteinG: protein,
    fatG: fat,
  });
});

// ============================================================================
// Tracking Handlers
// ============================================================================

registerMutationHandler("tracking.addWeight", async (payload) => {
  const { date, weight, unit } = payload as {
    date: string;
    weight: number;
    unit?: string;
  };
  await ensureUser();
  await upsertWeightLog({
    localDate: date,
    weight,
    unit: unit ?? "lb",
  });
});

registerMutationHandler("tracking.addWater", async (payload) => {
  const { localDate, amountMl } = payload as {
    localDate: string;
    amountMl: number;
  };
  await ensureUser();
  await upsertWaterLog({ localDate, amountMl, source: "manual" });
});

registerMutationHandler("tracking.setWaterTotal", async (payload) => {
  const { localDate, totalMl } = payload as {
    localDate: string;
    totalMl: number;
  };
  await ensureUser();
  await setWaterLogTotal({ localDate, totalMl, source: "manual" });
});

registerMutationHandler("tracking.setSteps", async (payload) => {
  const { localDate, steps } = payload as {
    localDate: string;
    steps: number;
  };
  await ensureUser();
  await upsertStepsLog({ localDate, steps, source: "manual" });
});

registerMutationHandler("tracking.updateStepsGoal", async (payload) => {
  const { goal } = payload as { goal: number };
  await ensureUser();
  await upsertActivityGoals({ stepsGoal: goal });
});

registerMutationHandler("tracking.updateWaterGoal", async (payload) => {
  const { goal } = payload as { goal: number };
  await ensureUser();
  await upsertActivityGoals({ waterGoalMl: goal });
});

// ============================================================================
// Food Handlers
// ============================================================================

registerMutationHandler("food.create", async (payload) => {
  const data = payload as {
    name: string;
    brand?: string;
    portionLabel?: string;
    portionGrams?: number;
    kcal: number;
    carbs: number;
    protein: number;
    fat: number;
    micronutrients?: Record<string, unknown>;
    imageUrl?: string;
  };

  await ensureUser();
  await createFood({
    name: data.name,
    brand: data.brand,
    portionLabel: data.portionLabel,
    portionGrams: data.portionGrams,
    kcal: data.kcal,
    carbsG: data.carbs,
    proteinG: data.protein,
    fatG: data.fat,
    micronutrients: data.micronutrients,
    imageUrl: data.imageUrl,
  });
});

registerMutationHandler("food.toggleFavorite", async (payload) => {
  const { foodId, favorite } = payload as { foodId: string; favorite: boolean };
  await ensureUser();
  await toggleFoodFavorite(foodId, favorite);
});

// ============================================================================
// Dedupe Strategies (latest-write-wins for idempotent updates)
// ============================================================================

registerMutationDedupe("nutrition.setGoal", (payload) => {
  const p = payload as { localDate?: string };
  return p.localDate ? `nutrition.setGoal:${p.localDate}` : "nutrition.setGoal";
});

registerMutationDedupe("nutrition.setMacroTargets", (payload) => {
  const p = payload as { localDate?: string };
  return p.localDate
    ? `nutrition.setMacroTargets:${p.localDate}`
    : "nutrition.setMacroTargets";
});

registerMutationDedupe("tracking.setSteps", (payload) => {
  const p = payload as { localDate?: string };
  return p.localDate ? `tracking.setSteps:${p.localDate}` : "tracking.setSteps";
});

registerMutationDedupe("tracking.setWaterTotal", (payload) => {
  const p = payload as { localDate?: string };
  return p.localDate
    ? `tracking.setWaterTotal:${p.localDate}`
    : "tracking.setWaterTotal";
});

registerMutationDedupe("tracking.updateStepsGoal", () => "tracking.updateStepsGoal");
registerMutationDedupe("tracking.updateWaterGoal", () => "tracking.updateWaterGoal");
registerMutationDedupe("food.toggleFavorite", (payload) => {
  const p = payload as { foodId?: string };
  return p.foodId ? `food.toggleFavorite:${p.foodId}` : null;
});

// ============================================================================
// Log registration
// ============================================================================

if (import.meta.env.DEV) {
  console.info("[OfflineQueue] Registered mutation handlers:", [
    "nutrition.logFood",
    "nutrition.removeLogItem",
    "nutrition.updateLogItem",
    "nutrition.setGoal",
    "nutrition.setMacroTargets",
    "tracking.addWeight",
    "tracking.addWater",
    "tracking.setWaterTotal",
    "tracking.setSteps",
    "tracking.updateStepsGoal",
    "tracking.updateWaterGoal",
    "food.create",
    "food.toggleFavorite",
  ]);
}
