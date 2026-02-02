const defaultRecommendations: Record<string, string> = {
  Breakfast: "555 — 777 kcal",
  Lunch: "253 — 776 kcal",
  Dinner: "655 — 878 kcal",
  Snack: "120 — 240 kcal",
};

export const getMealRecommendation = (label: string) =>
  defaultRecommendations[label] ?? "—";
