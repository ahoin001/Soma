export type WeightEntry = {
  date: string;
  weight: number;
};

export type TrendEntry = {
  date: string;
  value: number | null;
};

export type NutritionTrendMicros = {
  sodium_mg?: number;
  fiber_g?: number;
  sugar_g?: number;
  potassium_mg?: number;
  cholesterol_mg?: number;
  saturated_fat_g?: number;
};

export type NutritionTrend = {
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  micros?: NutritionTrendMicros;
};

export type MacroSeriesItem = {
  key: string;
  label: string;
  color: string;
  entries: TrendEntry[];
};
