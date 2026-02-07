import type { Meal } from "@/data/mock";
import type { MealEntryItemRecord, MealEntryRecord } from "@/types/api";
import type { LogSection } from "@/types/log";

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
      ...entryItems.map((item) => {
        const quantity = Number(item.quantity ?? 1) || 1;
        const kcal = Number(item.kcal ?? 0) || 0;
        const carbs = Number(item.carbs_g ?? 0) || 0;
        const protein = Number(item.protein_g ?? 0) || 0;
        const fat = Number(item.fat_g ?? 0) || 0;
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
          emoji: mealEmoji,
          imageUrl: item.image_url ?? null,
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
