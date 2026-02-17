import type { FoodItem, MacroKey, MacroTarget } from "@/data/mock";

/**
 * Per-food override for kcal, portion, and macros (used by food catalog overrides).
 */
export type FoodOverride = {
  kcal: number;
  portion: string;
  macros: Record<MacroKey, number>;
};

/** Daily nutrition summary (eaten, burned, goal, kcal left). */
export type Summary = {
  eaten: number;
  burned: number;
  kcalLeft: number;
  goal: number;
};

/** Sync state for daily intake (idle vs syncing). */
export type SyncState = "idle" | "syncing";

/** Last logged item for undo; legacy hook also stores previousSummary/previousMacros. */
export type LastLog = {
  food: FoodItem;
  itemId?: string;
  previousSummary?: Summary;
  previousMacros?: MacroTarget[];
};

/**
 * Shared draft type for updating food nutrition (override or master).
 * All numeric fields are numbers; form components normalize "" to number before calling callbacks.
 */
export type NutritionDraft = {
  name?: string;
  brand?: string;
  brandId?: string | null;
  portion: string;
  portionGrams?: number | null;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  sodiumMg?: number | null;
  fiberG?: number | null;
  sugarG?: number | null;
  addedSugarG?: number | null;
  saturatedFatG?: number | null;
  transFatG?: number | null;
  cholesterolMg?: number | null;
  potassiumMg?: number | null;
  ingredients?: string;
};

/**
 * Form state for nutrition draft inputs. Numeric fields allow "" for empty inputs.
 * Use when binding to inputs; normalize to NutritionDraft before API/callbacks.
 */
export type NutritionDraftForm = {
  name: string;
  brand: string;
  brandId: string | null;
  portion: string;
  portionGrams: number | null;
  kcal: number | "";
  carbs: number | "";
  protein: number | "";
  fat: number | "";
  sodiumMg: number | null;
  fiberG: number | null;
  sugarG: number | null;
  addedSugarG: number | null;
  saturatedFatG: number | null;
  transFatG: number | null;
  cholesterolMg: number | null;
  potassiumMg: number | null;
  ingredients: string;
};
