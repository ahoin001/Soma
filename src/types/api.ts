export type FoodRecord = {
  id: string;
  name: string;
  brand: string | null;
  brand_id?: string | null;
  brand_name?: string | null;
  brand_logo_url?: string | null;
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
  fiber_g?: number | null;
  sugar_g?: number | null;
  added_sugar_g?: number | null;
  sodium_mg?: number | null;
  potassium_mg?: number | null;
  cholesterol_mg?: number | null;
  saturated_fat_g?: number | null;
  trans_fat_g?: number | null;
  calcium_mg?: number | null;
  iron_mg?: number | null;
  magnesium_mg?: number | null;
  zinc_mg?: number | null;
  vitamin_d_mcg?: number | null;
  vitamin_c_mg?: number | null;
  vitamin_a_mcg?: number | null;
  vitamin_b12_mcg?: number | null;
  folate_mcg?: number | null;
  omega3_g?: number | null;
  omega6_g?: number | null;
  image_url?: string | null;
};

export type BrandRecord = {
  id: string;
  name: string;
  is_verified: boolean;
  website_url: string | null;
  logo_url: string | null;
};

export type FoodServingRecord = {
  id: string;
  food_id: string;
  label: string;
  grams: number;
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
  image_url?: string | null;
  portion_label: string | null;
  portion_grams: number | null;
  quantity: number;
  kcal: number;
  carbs_g: number;
  protein_g: number;
  fat_g: number;
  micronutrients: Record<string, unknown>;
  fiber_g?: number | null;
  sugar_g?: number | null;
  added_sugar_g?: number | null;
  sodium_mg?: number | null;
  potassium_mg?: number | null;
  cholesterol_mg?: number | null;
  saturated_fat_g?: number | null;
  trans_fat_g?: number | null;
  calcium_mg?: number | null;
  iron_mg?: number | null;
  magnesium_mg?: number | null;
  zinc_mg?: number | null;
  vitamin_d_mcg?: number | null;
  vitamin_c_mg?: number | null;
  vitamin_a_mcg?: number | null;
  vitamin_b12_mcg?: number | null;
  folate_mcg?: number | null;
  omega3_g?: number | null;
  omega6_g?: number | null;
  sort_order: number;
  created_at: string;
};

export type MealPlanGroupRecord = {
  id: string;
  user_id: string;
  name: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type MealPlanDayRecord = {
  id: string;
  user_id: string;
  name: string;
  target_kcal: number | string;
  target_protein_g: number | string;
  target_carbs_g: number | string;
  target_fat_g: number | string;
  target_kcal_min?: number | string | null;
  target_kcal_max?: number | string | null;
  target_protein_g_min?: number | string | null;
  target_protein_g_max?: number | string | null;
  target_carbs_g_min?: number | string | null;
  target_carbs_g_max?: number | string | null;
  target_fat_g_min?: number | string | null;
  target_fat_g_max?: number | string | null;
  group_id: string | null;
  created_at: string;
  updated_at: string;
};

export type MealPlanTargetPresetRecord = {
  id: string;
  user_id: string;
  name: string;
  target_kcal: number | string;
  target_protein_g: number | string;
  target_carbs_g: number | string;
  target_fat_g: number | string;
  target_kcal_min?: number | string | null;
  target_kcal_max?: number | string | null;
  target_protein_g_min?: number | string | null;
  target_protein_g_max?: number | string | null;
  target_carbs_g_min?: number | string | null;
  target_carbs_g_max?: number | string | null;
  target_fat_g_min?: number | string | null;
  target_fat_g_max?: number | string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type MealPlanMealRecord = {
  id: string;
  day_id: string;
  label: string;
  emoji: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type MealPlanItemRecord = {
  id: string;
  meal_id: string;
  food_id: string | null;
  food_name: string;
  quantity: number | string;
  slot: "protein" | "carbs" | "balance";
  kcal: number | string;
  protein_g: number | string;
  carbs_g: number | string;
  fat_g: number | string;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type MealPlanWeekAssignmentRecord = {
  user_id: string;
  weekday: number;
  day_id: string | null;
  updated_at: string;
};
