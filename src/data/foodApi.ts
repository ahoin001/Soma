import type { FoodItem, MacroKey } from "@/data/mock";

const API_BASE = "https://world.openfoodfacts.org";

type OpenFoodFactsProduct = {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number>;
};

type SearchResponse = {
  products?: OpenFoodFactsProduct[];
};

type ProductResponse = {
  product?: OpenFoodFactsProduct;
  status?: number;
};

const roundTo = (value: number, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const coerceNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const resolveNutrient = (nutriments: Record<string, number>, key: string) =>
  coerceNumber(nutriments[key]) ||
  coerceNumber(nutriments[`${key}_100g`]) ||
  0;

export const calculateMacroPercent = (
  macros: Record<MacroKey, number>,
): Record<MacroKey, number> => {
  const total = Object.values(macros).reduce((sum, value) => sum + value, 0);
  if (!total) {
    return { carbs: 0, protein: 0, fat: 0 };
  }
  return {
    carbs: Math.round((macros.carbs / total) * 100),
    protein: Math.round((macros.protein / total) * 100),
    fat: Math.round((macros.fat / total) * 100),
  };
};

const mapProductToFood = (product: OpenFoodFactsProduct): FoodItem => {
  const nutriments = product.nutriments ?? {};
  const calories =
    resolveNutrient(nutriments, "energy-kcal") ||
    resolveNutrient(nutriments, "energy");
  const carbs = resolveNutrient(nutriments, "carbohydrates");
  const protein = resolveNutrient(nutriments, "proteins");
  const fat = resolveNutrient(nutriments, "fat");

  const macros = {
    carbs: roundTo(carbs),
    protein: roundTo(protein),
    fat: roundTo(fat),
  };

  const name =
    product.product_name ||
    product.product_name_en ||
    product.generic_name ||
    "Unknown item";
  const barcode = product.code;

  return {
    id: barcode ? `barcode:${barcode}` : `off:${name.toLowerCase()}`,
    name,
    brand: product.brands,
    portion: product.serving_size || "100 g",
    kcal: Math.round(calories),
    emoji: "🍽️",
    barcode,
    source: "api",
    macros,
    macroPercent: calculateMacroPercent(macros),
  };
};

export const searchFoodProducts = async (
  query: string,
): Promise<FoodItem[]> => {
  const url = new URL(`${API_BASE}/cgi/search.pl`);
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", "20");
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("Unable to reach the food database.");
  }
  const data = (await response.json()) as SearchResponse;
  return (data.products ?? []).map(mapProductToFood);
};

export const fetchFoodByBarcode = async (
  barcode: string,
): Promise<FoodItem | null> => {
  const response = await fetch(`${API_BASE}/api/v2/product/${barcode}.json`);
  if (!response.ok) {
    throw new Error("Unable to reach the food database.");
  }
  const data = (await response.json()) as ProductResponse;
  if (data.status !== 1 || !data.product) {
    return null;
  }
  return mapProductToFood(data.product);
};
