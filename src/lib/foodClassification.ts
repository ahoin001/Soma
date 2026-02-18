import type { FoodItem } from "@/data/mock";

export type FoodTagId =
  | "high_protein"
  | "high_carb"
  | "low_carb"
  | "high_fat"
  | "low_fat"
  | "high_fiber"
  | "calorie_dense"
  | "low_calorie";

export type FoodSortOption =
  | "relevance"
  | "calories_asc"
  | "calories_desc"
  | "protein_desc"
  | "protein_asc"
  | "carbs_asc"
  | "carbs_desc";

export type FoodGoalPresetId = "cutting" | "bulking" | "recomp" | "keto";

export type FoodGoalPreset = {
  id: FoodGoalPresetId;
  label: string;
  tags: FoodTagId[];
  sortBy: FoodSortOption;
};

type FoodTagDefinition = {
  id: FoodTagId;
  label: string;
  matches: (food: FoodItem) => boolean;
};

const HIGH_PROTEIN_G = 15;
const HIGH_CARB_G = 30;
const LOW_CARB_G = 10;
const HIGH_FAT_G = 15;
const LOW_FAT_G = 3;
const HIGH_FIBER_G = 5;
const CALORIE_DENSE_KCAL = 400;
const LOW_CALORIE_KCAL = 150;

const readFiber = (food: FoodItem): number | null => {
  const micros = food.micronutrients;
  if (!micros) return null;
  const candidates = [
    micros.fiber,
    micros.fiber_g,
    micros.fiberG,
    micros.dietary_fiber,
    micros.dietary_fiber_g,
  ];
  for (const raw of candidates) {
    const value = Number(raw);
    if (Number.isFinite(value) && value >= 0) {
      return value;
    }
  }
  return null;
};

/**
 * Low-carb uses net carbs when fiber is available; otherwise it falls back to total carbs.
 * This keeps behavior deterministic for foods with missing fiber data.
 */
const readNetCarbs = (food: FoodItem): number => {
  const carbs = Number(food.macros.carbs ?? 0);
  const fiber = readFiber(food);
  if (fiber === null) return carbs;
  return Math.max(0, carbs - fiber);
};

export const FOOD_TAG_DEFINITIONS: FoodTagDefinition[] = [
  {
    id: "high_protein",
    label: "High Protein",
    matches: (food) => Number(food.macros.protein ?? 0) >= HIGH_PROTEIN_G,
  },
  {
    id: "high_carb",
    label: "High Carb",
    matches: (food) => Number(food.macros.carbs ?? 0) >= HIGH_CARB_G,
  },
  {
    id: "low_carb",
    label: "Low Carb",
    matches: (food) => readNetCarbs(food) <= LOW_CARB_G,
  },
  {
    id: "high_fat",
    label: "High Fat",
    matches: (food) => Number(food.macros.fat ?? 0) >= HIGH_FAT_G,
  },
  {
    id: "low_fat",
    label: "Low Fat",
    matches: (food) => Number(food.macros.fat ?? 0) <= LOW_FAT_G,
  },
  {
    id: "high_fiber",
    label: "High Fiber",
    matches: (food) => {
      const fiber = readFiber(food);
      return fiber !== null && fiber >= HIGH_FIBER_G;
    },
  },
  {
    id: "calorie_dense",
    label: "Calorie Dense",
    matches: (food) => Number(food.kcal ?? 0) >= CALORIE_DENSE_KCAL,
  },
  {
    id: "low_calorie",
    label: "Low Calorie",
    matches: (food) => Number(food.kcal ?? 0) <= LOW_CALORIE_KCAL,
  },
];

export const FOOD_GOAL_PRESETS: FoodGoalPreset[] = [
  {
    id: "cutting",
    label: "Cutting",
    tags: ["high_protein", "low_calorie"],
    sortBy: "calories_asc",
  },
  {
    id: "bulking",
    label: "Bulking",
    tags: ["high_protein", "calorie_dense"],
    sortBy: "calories_desc",
  },
  {
    id: "recomp",
    label: "Recomp",
    tags: ["high_protein", "low_carb"],
    sortBy: "protein_desc",
  },
  {
    id: "keto",
    label: "Keto",
    tags: ["low_carb", "high_fat"],
    sortBy: "carbs_asc",
  },
];

const tagLabelMap = new Map(FOOD_TAG_DEFINITIONS.map((entry) => [entry.id, entry.label]));

export const getFoodTagLabel = (tag: FoodTagId): string => {
  return tagLabelMap.get(tag) ?? tag;
};

export const deriveFoodTags = (food: FoodItem): FoodTagId[] => {
  return FOOD_TAG_DEFINITIONS.filter((definition) => definition.matches(food)).map(
    (definition) => definition.id,
  );
};

export const matchesAllFoodTags = (food: FoodItem, selectedTags: FoodTagId[]): boolean => {
  if (!selectedTags.length) return true;
  const tags = new Set(deriveFoodTags(food));
  return selectedTags.every((selected) => tags.has(selected));
};

export const sortFoods = (foods: FoodItem[], sort: FoodSortOption): FoodItem[] => {
  if (sort === "relevance") return foods;
  const items = [...foods];
  items.sort((a, b) => {
    if (sort === "calories_asc") return a.kcal - b.kcal;
    if (sort === "calories_desc") return b.kcal - a.kcal;
    if (sort === "protein_desc") return b.macros.protein - a.macros.protein;
    if (sort === "protein_asc") return a.macros.protein - b.macros.protein;
    if (sort === "carbs_asc") return a.macros.carbs - b.macros.carbs;
    return b.macros.carbs - a.macros.carbs;
  });
  return items;
};

const sameTagSet = (a: FoodTagId[], b: FoodTagId[]) => {
  if (a.length !== b.length) return false;
  const setA = new Set(a);
  return b.every((entry) => setA.has(entry));
};

export const getGoalPresetForSelection = (
  selectedTags: FoodTagId[],
  sortBy: FoodSortOption,
): FoodGoalPresetId | null => {
  const match = FOOD_GOAL_PRESETS.find(
    (preset) => preset.sortBy === sortBy && sameTagSet(preset.tags, selectedTags),
  );
  return match?.id ?? null;
};
