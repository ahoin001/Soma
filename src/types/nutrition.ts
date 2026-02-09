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
  saturatedFatG?: number | null;
  transFatG?: number | null;
  cholesterolMg?: number | null;
  potassiumMg?: number | null;
  ingredients?: string;
};
