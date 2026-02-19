import { csvEnumParam, enumParam, stringParam } from "@/lib/routeQuery";

export const GUIDE_TABS = ["groceries", "plans", "articles"] as const;
export const GOALS_SECTIONS = ["energy", "micros"] as const;
export const PROGRESS_CHARTS = ["weight", "calories", "macros", "micros"] as const;
export const PROGRESS_RANGES = ["7", "14", "30"] as const;
export const PROGRESS_MICROS = [
  "sodium_mg",
  "fiber_g",
  "sugar_g",
  "potassium_mg",
  "cholesterol_mg",
  "saturated_fat_g",
] as const;
export const FOOD_TABS = ["search", "recent", "liked", "history"] as const;
export const FOOD_SORTS = [
  "relevance",
  "calories_asc",
  "calories_desc",
  "protein_desc",
  "protein_asc",
  "carbs_asc",
  "carbs_desc",
] as const;
export const FOOD_TAGS = [
  "high_protein",
  "high_carb",
  "low_carb",
  "high_fat",
  "low_fat",
  "high_fiber",
  "calorie_dense",
  "low_calorie",
  "high_potassium",
  "high_sodium",
  "low_sodium",
] as const;
export const APP_SHEETS = ["quick", "admin", "detail", "edit"] as const;
export const ADD_FOOD_SHEETS = ["detail", "edit"] as const;

export const guidesQuerySchema = {
  tab: enumParam(GUIDE_TABS),
  article: stringParam(),
};

export const goalsQuerySchema = {
  section: enumParam(GOALS_SECTIONS),
};

export const progressQuerySchema = {
  chart: enumParam(PROGRESS_CHARTS),
  range: enumParam(PROGRESS_RANGES),
  micro: enumParam(PROGRESS_MICROS),
};

export const addFoodQuerySchema = {
  tab: enumParam(FOOD_TABS),
  query: stringParam(),
  sort: enumParam(FOOD_SORTS),
  tags: csvEnumParam(FOOD_TAGS),
  mealId: stringParam(),
  returnTo: stringParam(),
  sheet: enumParam(ADD_FOOD_SHEETS),
  foodId: stringParam(),
  sheetItemId: stringParam(),
};

export const nutritionQuerySchema = {
  sheet: enumParam(APP_SHEETS),
  foodId: stringParam(),
  sheetItemId: stringParam(),
  editItemId: stringParam(),
};
