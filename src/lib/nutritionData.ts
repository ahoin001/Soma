import type { Meal } from "@/data/mock";
import type { MealEntryItemRecord, MealEntryRecord } from "@/types/api";
import type { LogItem, LogSection } from "@/types/log";
import { normalizeFoodImageUrl } from "@/lib/foodImageUrl";

const MICRO_KEY_ALIASES: Record<string, string> = {
  fiber: "fiber_g",
  fiber_g: "fiber_g",
  fiberG: "fiber_g",
  dietary_fiber: "fiber_g",
  dietary_fiber_g: "fiber_g",
  dietaryFiber: "fiber_g",
  dietaryFiberG: "fiber_g",
  sodium: "sodium_mg",
  sodium_mg: "sodium_mg",
  sodiumMg: "sodium_mg",
  potassium: "potassium_mg",
  potassium_mg: "potassium_mg",
  potassiumMg: "potassium_mg",
  cholesterol: "cholesterol_mg",
  cholesterol_mg: "cholesterol_mg",
  cholesterolMg: "cholesterol_mg",
  saturated_fat: "saturated_fat_g",
  saturated_fat_g: "saturated_fat_g",
  saturatedFat: "saturated_fat_g",
  saturatedFatG: "saturated_fat_g",
  sugar: "sugar_g",
  sugar_g: "sugar_g",
  sugarG: "sugar_g",
  total_sugar: "sugar_g",
  total_sugar_g: "sugar_g",
  added_sugar: "added_sugar_g",
  added_sugar_g: "added_sugar_g",
  addedSugar: "added_sugar_g",
  addedSugarG: "added_sugar_g",
};

/** Coerce micronutrients from API (unknown) to Record<string, number> for per-serving values. */
function toMicroRecord(raw: Record<string, unknown> | null | undefined): Record<string, number> | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const out: Record<string, number> = {};
  for (const [key, val] of Object.entries(raw)) {
    const n = typeof val === "number" && Number.isFinite(val) ? val : Number(val);
    if (!Number.isFinite(n)) continue;
    const mappedKey = MICRO_KEY_ALIASES[key] ?? key;
    out[mappedKey] = (out[mappedKey] ?? 0) + n;
  }
  // Backward-compat for existing UI slot key ("sugar_g") when foods only provide added sugar.
  if (out.sugar_g == null && out.added_sugar_g != null) {
    out.sugar_g = out.added_sugar_g;
  }
  return Object.keys(out).length ? out : undefined;
}

/** Shared micronutrient normalizer for UI/API payloads (canonical keys + numeric coercion). */
export const normalizeMicroRecord = (
  raw: Record<string, unknown> | null | undefined,
): Record<string, number> | undefined => toMicroRecord(raw);

/**
 * Local date formatter for nutrition queries.
 */
export const toLocalDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

/**
 * Transform API response to LogSections.
 */
export const computeLogSections = (
  entries: MealEntryRecord[],
  items: MealEntryItemRecord[],
  meals: Meal[]
): LogSection[] => {
  const itemsByEntry = new Map<string, MealEntryItemRecord[]>();
  items.forEach((item) => {
    const list = itemsByEntry.get(item.meal_entry_id) ?? [];
    list.push(item);
    itemsByEntry.set(item.meal_entry_id, list);
  });

  const mealMap = new Map<string, Meal>();
  meals.forEach((meal) => mealMap.set(meal.id, meal));

  const sectionsByMeal = new Map<
    string,
    { section: LogSection; latestLoggedAt: number }
  >();

  for (const entry of entries) {
    const meal = entry.meal_type_id ? mealMap.get(entry.meal_type_id) : null;
    const mealKey = entry.meal_type_id ?? "meal";
    const mealLabel = meal?.label ?? "Meal";
    const mealEmoji = meal?.emoji ?? "🍽️";
    const entryItems = itemsByEntry.get(entry.id) ?? [];
    const loggedAt = new Date(entry.logged_at).getTime();

    if (!sectionsByMeal.has(mealKey)) {
      sectionsByMeal.set(mealKey, {
        section: { meal: mealLabel, time: entry.logged_at, items: [] },
        latestLoggedAt: loggedAt,
      });
    }

    const target = sectionsByMeal.get(mealKey);
    if (!target) continue;
    target.latestLoggedAt = Math.max(target.latestLoggedAt, loggedAt);
    target.section.items.push(
      ...entryItems.map((item): LogItem => {
        const quantity = Number(item.quantity ?? 1) || 1;
        const kcal = Number(item.kcal ?? 0) || 0;
        const carbs = Number(item.carbs_g ?? 0) || 0;
        const protein = Number(item.protein_g ?? 0) || 0;
        const fat = Number(item.fat_g ?? 0) || 0;
        const columnMicros = {
          fiber_g: item.fiber_g,
          sugar_g: item.sugar_g,
          added_sugar_g: item.added_sugar_g,
          sodium_mg: item.sodium_mg,
          potassium_mg: item.potassium_mg,
          cholesterol_mg: item.cholesterol_mg,
          saturated_fat_g: item.saturated_fat_g,
          trans_fat_g: item.trans_fat_g,
          calcium_mg: item.calcium_mg,
          iron_mg: item.iron_mg,
          magnesium_mg: item.magnesium_mg,
          zinc_mg: item.zinc_mg,
          vitamin_d_mcg: item.vitamin_d_mcg,
          vitamin_c_mg: item.vitamin_c_mg,
          vitamin_a_mcg: item.vitamin_a_mcg,
          vitamin_b12_mcg: item.vitamin_b12_mcg,
          folate_mcg: item.folate_mcg,
          omega3_g: item.omega3_g,
          omega6_g: item.omega6_g,
        } as Record<string, unknown>;
        const micronutrients = toMicroRecord({
          ...(item.micronutrients as Record<string, unknown> | null | undefined),
          ...columnMicros,
        });
        return {
          id: item.id,
          foodId: item.food_id ?? null,
          mealTypeId: entry.meal_type_id ?? null,
          mealLabel,
          mealEmoji,
          name: item.food_name,
          quantity,
          portionLabel: item.portion_label ?? null,
          portionGrams: item.portion_grams ?? null,
          kcal,
          macros: { carbs, protein, fat },
          micronutrients,
          emoji: mealEmoji,
          imageUrl: normalizeFoodImageUrl(item.image_url),
        };
      })
    );
  }

  const ordered = meals
    .map((meal) => sectionsByMeal.get(meal.id))
    .filter(
      (entry): entry is { section: LogSection; latestLoggedAt: number } =>
        Boolean(entry)
    );

  const otherSections = Array.from(sectionsByMeal.entries())
    .filter(([key]) => !mealMap.has(key))
    .map(([, value]) => value);

  return [...ordered, ...otherSections].map(({ section, latestLoggedAt }) => ({
    ...section,
    time: new Date(latestLoggedAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  }));
};

/**
 * Compute micronutrient totals from log sections (per-serving × quantity).
 * Single source of truth with the diary; keys match NutritionSummaryMicros (e.g. sodium_mg, fiber_g).
 */
export const computeMicroTotals = (
  sections: LogSection[]
): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const section of sections) {
    for (const item of section.items) {
      const qty = Number(item.quantity ?? 1) || 1;
      const micro = item.micronutrients;
      if (!micro || typeof micro !== "object") continue;
      for (const [key, val] of Object.entries(micro)) {
        const n = typeof val === "number" && Number.isFinite(val) ? val : Number(val);
        if (Number.isFinite(n)) out[key] = (out[key] ?? 0) + n * qty;
      }
    }
  }
  return out;
};

/**
 * Compute totals from log sections.
 */
export const computeTotals = (sections: LogSection[]) =>
  sections.reduce(
    (acc, section) =>
      section.items.reduce((inner, entry) => {
        const quantity = Number(entry.quantity ?? 1) || 1;
        const macros = entry.macros ?? { carbs: 0, protein: 0, fat: 0 };
        const kcal = Number(entry.kcal ?? 0) || 0;
        const carbs = Number(macros.carbs ?? 0) || 0;
        const protein = Number(macros.protein ?? 0) || 0;
        const fat = Number(macros.fat ?? 0) || 0;
        return {
          kcal: inner.kcal + kcal * quantity,
          carbs: inner.carbs + carbs * quantity,
          protein: inner.protein + protein * quantity,
          fat: inner.fat + fat * quantity,
        };
      }, acc),
    { kcal: 0, carbs: 0, protein: 0, fat: 0 }
  );

export type TopSource = { name: string; quantity: number; contribution: number };

const MACRO_KEYS = ["carbs", "protein", "fat"] as const;
type MacroKey = (typeof MACRO_KEYS)[number];

/**
 * Top sources for a macro (e.g. protein). Contribution = per-serving value × quantity.
 * Sorted by contribution descending; max 10.
 */
export function getTopSourcesForMacro(
  sections: LogSection[],
  macroKey: MacroKey,
  limit = 10
): TopSource[] {
  const list: TopSource[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      const qty = Number(item.quantity ?? 1) || 1;
      const per = item.macros?.[macroKey] ?? 0;
      const contribution = per * qty;
      if (contribution <= 0) continue;
      list.push({ name: item.name, quantity: qty, contribution });
    }
  }
  list.sort((a, b) => b.contribution - a.contribution);
  return list.slice(0, limit);
}

/**
 * Top sources for a micronutrient (e.g. fiber_g, sodium_mg). Contribution = per-serving value × quantity.
 * Sorted by contribution descending; max 10.
 */
export function getTopSourcesForMicro(
  sections: LogSection[],
  microKey: string,
  limit = 10
): TopSource[] {
  const list: TopSource[] = [];
  for (const section of sections) {
    for (const item of section.items) {
      const qty = Number(item.quantity ?? 1) || 1;
      const per = item.micronutrients?.[microKey] ?? 0;
      const contribution = per * qty;
      if (contribution <= 0) continue;
      list.push({ name: item.name, quantity: qty, contribution });
    }
  }
  list.sort((a, b) => b.contribution - a.contribution);
  return list.slice(0, limit);
}
