export type LogItem = {
  id?: string;
  foodId?: string | null;
  mealTypeId?: string | null;
  mealLabel?: string | null;
  mealEmoji?: string | null;
  name: string;
  quantity?: number;
  portionLabel?: string | null;
  portionGrams?: number | null;
  kcal: number;
  macros: {
    carbs: number;
    protein: number;
    fat: number;
  };
  /** Per-serving micronutrients (e.g. fiber_g, sodium_mg). Contribution = value * quantity. */
  micronutrients?: Record<string, number>;
  emoji: string;
  imageUrl?: string | null;
};

export type LogSection = {
  meal: string;
  time: string;
  items: LogItem[];
};
