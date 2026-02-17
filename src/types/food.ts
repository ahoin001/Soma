/**
 * Domain types for nutrition: foods, meals, and macro targets.
 * Keep mock data and fixtures in @/data/mock.
 */

export type MacroKey = "carbs" | "protein" | "fat";

export type MacroTarget = {
  key: MacroKey;
  label: string;
  current: number;
  goal: number;
  unit: string;
};

export type Meal = {
  id: string;
  label: string;
  recommended: string;
  emoji: string;
};

export type FoodItem = {
  id: string;
  name: string;
  brand?: string;
  brandId?: string;
  brandLogoUrl?: string;
  portion: string;
  portionLabel?: string;
  portionGrams?: number;
  kcal: number;
  emoji: string;
  barcode?: string;
  source?: "local" | "api";
  imageUrl?: string;
  micronutrients?: Record<string, number | string>;
  macros: Record<MacroKey, number>;
  macroPercent: Record<MacroKey, number>;
};
