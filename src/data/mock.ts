import type { LogSection } from "@/types/log";

export type MacroKey = "carbs" | "protein" | "fat";

export type MacroTarget = {
  key: MacroKey;
  label: string;
  current: number;
  goal: number;
  unit: string;
};

export type Meal = {
  id: string;
  label: string;
  recommended: string;
  emoji: string;
};

export type FoodItem = {
  id: string;
  name: string;
  brand?: string;
  portion: string;
  kcal: number;
  emoji: string;
  barcode?: string;
  source?: "local" | "api";
  macros: Record<MacroKey, number>;
  macroPercent: Record<MacroKey, number>;
};

export const dailySummary = {
  eaten: 23,
  burned: 34,
  kcalLeft: 1170,
  goal: 2200,
};

export const macroTargets: MacroTarget[] = [
  { key: "carbs", label: "Carbs", current: 21, goal: 477, unit: "g" },
  { key: "protein", label: "Protein", current: 23, goal: 97, unit: "g" },
  { key: "fat", label: "Fat", current: 20, goal: 77, unit: "g" },
];

export const meals: Meal[] = [
  { id: "breakfast", label: "Breakfast", recommended: "555 — 777 kcal", emoji: "☕" },
  { id: "lunch", label: "Lunch", recommended: "253 — 776 kcal", emoji: "🥪" },
  { id: "dinner", label: "Dinner", recommended: "655 — 878 kcal", emoji: "🐟" },
  { id: "snack", label: "Snack", recommended: "120 — 240 kcal", emoji: "🍓" },
];

export const foods: FoodItem[] = [
  {
    id: "grilled-chicken-salad",
    name: "Grilled chicken salad",
    brand: "Aura Kitchen",
    portion: "1 portion (338 g)",
    kcal: 543,
    emoji: "🥗",
    barcode: "012345678905",
    source: "local",
    macros: { carbs: 14, protein: 43, fat: 18 },
    macroPercent: { carbs: 22, protein: 63, fat: 37 },
  },
  {
    id: "avocado-toast",
    name: "Avocado toast",
    brand: "Daily Bake",
    portion: "1 slice (120 g)",
    kcal: 320,
    emoji: "🥑",
    barcode: "036000291452",
    source: "local",
    macros: { carbs: 32, protein: 8, fat: 16 },
    macroPercent: { carbs: 49, protein: 12, fat: 39 },
  },
  {
    id: "berry-yogurt",
    name: "Greek yogurt bowl",
    brand: "Fresh Farm",
    portion: "1 bowl (210 g)",
    kcal: 220,
    emoji: "🫐",
    barcode: "042100005264",
    source: "local",
    macros: { carbs: 28, protein: 18, fat: 6 },
    macroPercent: { carbs: 51, protein: 33, fat: 16 },
  },
  {
    id: "oat-latte",
    name: "Oat milk latte",
    brand: "Cloud Cafe",
    portion: "12 oz",
    kcal: 180,
    emoji: "☕",
    barcode: "076746020772",
    source: "local",
    macros: { carbs: 26, protein: 4, fat: 6 },
    macroPercent: { carbs: 58, protein: 9, fat: 33 },
  },
  {
    id: "salmon-bowl",
    name: "Salmon power bowl",
    brand: "Green Leaf",
    portion: "1 bowl (280 g)",
    kcal: 490,
    emoji: "🍣",
    barcode: "030000012853",
    source: "local",
    macros: { carbs: 35, protein: 32, fat: 18 },
    macroPercent: { carbs: 42, protein: 38, fat: 20 },
  },
];

export const recentFoods = [foods[0], foods[2], foods[3]];
export const likedFoods = [foods[0], foods[4]];
export const historyFoods = [foods[1], foods[3], foods[2]];
export const quickAddFoods = [foods[0], foods[1], foods[2]];

export const weeklyPreview = [
  { day: "Mon", kcal: 1720 },
  { day: "Tue", kcal: 1980 },
  { day: "Wed", kcal: 2100 },
  { day: "Thu", kcal: 1860 },
  { day: "Fri", kcal: 2200 },
  { day: "Sat", kcal: 1940 },
  { day: "Sun", kcal: 1780 },
];

export const streakSummary = {
  days: 6,
  bestWeek: 5,
  message: "You are on your best rhythm this month.",
};

export const todayLog: LogSection[] = [
  {
    meal: "Breakfast",
    time: "08:20",
    items: [
      {
        name: "Greek yogurt bowl",
        kcal: 220,
        macros: { carbs: 24, protein: 14, fat: 6 },
        emoji: "🫐",
      },
      {
        name: "Oat milk latte",
        kcal: 180,
        macros: { carbs: 20, protein: 3, fat: 7 },
        emoji: "☕",
      },
    ],
  },
  {
    meal: "Lunch",
    time: "12:45",
    items: [
      {
        name: "Grilled chicken salad",
        kcal: 543,
        macros: { carbs: 22, protein: 38, fat: 26 },
        emoji: "🥗",
      },
      {
        name: "Avocado toast",
        kcal: 320,
        macros: { carbs: 28, protein: 7, fat: 18 },
        emoji: "🥑",
      },
    ],
  },
  {
    meal: "Dinner",
    time: "19:05",
    items: [
      {
        name: "Salmon power bowl",
        kcal: 490,
        macros: { carbs: 34, protein: 32, fat: 22 },
        emoji: "🍣",
      },
    ],
  },
];

export const dayCompletion = 72;

export const weightEntries = [
  { date: "2024-10-01", weight: 182 },
  { date: "2024-10-12", weight: 181.2 },
  { date: "2024-11-18", weight: 179.6 },
  { date: "2024-12-22", weight: 180.4 },
  { date: "2025-01-15", weight: 178.8 },
  { date: "2025-02-02", weight: 177.4 },
];
