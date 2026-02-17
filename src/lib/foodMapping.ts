/**
 * Single place to map API FoodRecord to app FoodItem.
 * Use this everywhere (catalog, prefetch, meal plans) to avoid drift.
 */
import type { FoodRecord } from "@/types/api";
import type { FoodItem } from "@/types/food";
import { calculateMacroPercent } from "@/data/foodApi";

export function recordToFoodItem(record: FoodRecord): FoodItem {
  const macros = {
    carbs: Number(record.carbs_g ?? 0),
    protein: Number(record.protein_g ?? 0),
    fat: Number(record.fat_g ?? 0),
  };
  return {
    id: record.id,
    name: record.name,
    brand: record.brand_name ?? record.brand ?? undefined,
    brandId: record.brand_id ?? undefined,
    brandLogoUrl: record.brand_logo_url ?? undefined,
    portion:
      record.portion_label ??
      (record.portion_grams ? `${record.portion_grams} g` : "100 g"),
    portionLabel: record.portion_label ?? undefined,
    portionGrams: record.portion_grams ?? undefined,
    kcal: Number(record.kcal ?? 0),
    emoji: "🍽️",
    barcode: record.barcode ?? undefined,
    source: record.is_global ? "api" : "local",
    imageUrl: record.image_url ?? undefined,
    micronutrients: record.micronutrients as Record<string, number | string> | undefined,
    macros,
    macroPercent: calculateMacroPercent(macros),
  };
}
