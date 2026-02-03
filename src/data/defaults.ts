import type { MacroTarget } from "@/data/mock";

export const defaultSummary = {
  eaten: 0,
  burned: 0,
  kcalLeft: 0,
  goal: 0,
};

export const defaultMacroTargets: MacroTarget[] = [
  { key: "carbs", label: "Carbs", current: 0, goal: 0, unit: "g" },
  { key: "protein", label: "Protein", current: 0, goal: 0, unit: "g" },
  { key: "fat", label: "Fat", current: 0, goal: 0, unit: "g" },
];
