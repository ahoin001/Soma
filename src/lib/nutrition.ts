const defaultRecommendations: Record<string, string> = {
  Breakfast: "555 — 777 cal",
  Lunch: "253 — 776 cal",
  Dinner: "655 — 878 cal",
  Snack: "120 — 240 cal",
};

export const getMealRecommendation = (label: string) =>
  defaultRecommendations[label] ?? "—";
