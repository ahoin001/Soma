export type FoodRecord = {
  id: string;
  name: string;
  brand: string | null;
  barcode: string | null;
  source: string | null;
  is_global: boolean;
  created_by_user_id: string | null;
  parent_food_id: string | null;
  portion_label: string | null;
  portion_grams: number | null;
  kcal: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  micronutrients: Record<string, unknown>;
};

export type MealTypeRecord = {
  id: string;
  label: string;
  emoji: string | null;
  sort_order: number;
};

export type MealEntryRecord = {
  id: string;
  user_id: string;
  local_date: string;
  meal_type_id: string | null;
  logged_at: string;
  notes: string | null;
};

export type MealEntryItemRecord = {
  id: string;
  meal_entry_id: string;
  food_id: string | null;
  food_name: string;
  portion_label: string | null;
  portion_grams: number | null;
  quantity: number;
  kcal: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  micronutrients: Record<string, unknown>;
  sort_order: number;
  created_at: string;
};
