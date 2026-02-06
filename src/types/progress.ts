export type WeightEntry = {
  date: string;
  weight: number;
};

export type TrendEntry = {
  date: string;
  value: number | null;
};

export type NutritionTrend = {
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
};

export type MacroSeriesItem = {
  key: string;
  label: string;
  color: string;
  entries: TrendEntry[];
};
