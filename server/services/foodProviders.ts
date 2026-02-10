import { query } from "../db.js";

const USDA_API_KEY = process.env.USDA_API_KEY ?? "";

export type FoodInsert = {
  name: string;
  brand?: string | null;
  barcode?: string | null;
  source: string;
  portionLabel?: string | null;
  portionGrams?: number | null;
  kcal: number;
  carbsG: number;
  proteinG: number;
  fatG: number;
  micronutrients?: Record<string, unknown>;
  meta?: {
    offServingProvided?: boolean;
  };
};

type OffProduct = {
  code?: string;
  product_name?: string;
  product_name_en?: string;
  generic_name?: string;
  brands?: string;
  serving_size?: string;
  nutriments?: Record<string, number>;
};

type OffSearchResponse = {
  products?: OffProduct[];
};

type OffBarcodeResponse = {
  product?: OffProduct;
  status?: number;
};

type UsdaNutrient = {
  nutrientName?: string;
  unitName?: string;
  value?: number;
};

type UsdaFood = {
  fdcId?: number;
  description?: string;
  brandName?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients?: UsdaNutrient[];
};

type UsdaSearchResponse = {
  foods?: UsdaFood[];
};

const coerceNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

const roundTo = (value: number, digits = 1) => {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
};

const normalizeName = (value?: string) => value?.trim() || "";

const toTitleCase = (value: string) =>
  value
    .toLowerCase()
    .split(" ")
    .map((part) => (part ? part[0].toUpperCase() + part.slice(1) : part))
    .join(" ");

const normalizeText = (value?: string | null) => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return toTitleCase(trimmed);
};

const parseServingSize = (value?: string | null) => {
  if (!value) return { label: "100 g", grams: 100, provided: false };
  const trimmed = value.trim();
  const gramsMatch = trimmed.match(/(\d+(\.\d+)?)\s*g/i);
  const gramsParenMatch = trimmed.match(/\((\d+(\.\d+)?)\s*g\)/i);
  const grams = Number(gramsParenMatch?.[1] ?? gramsMatch?.[1] ?? 0);
  const label = trimmed.length > 0 ? trimmed : "100 g";
  return {
    label,
    grams: Number.isFinite(grams) && grams > 0 ? grams : 100,
    provided: true,
  };
};

const resolveOffNutrient = (
  nutriments: Record<string, number>,
  key: string,
) =>
  coerceNumber(nutriments[key]) ||
  coerceNumber(nutriments[`${key}_100g`]) ||
  0;

const extractUsdaValue = (nutrients: UsdaNutrient[] = [], key: string) => {
  const match = nutrients.find((nutrient) =>
    nutrient.nutrientName?.toLowerCase().includes(key),
  );
  return coerceNumber(match?.value);
};

const mapOffProduct = (product: OffProduct): FoodInsert => {
  const nutriments = product.nutriments ?? {};
  const calories =
    resolveOffNutrient(nutriments, "energy-kcal") ||
    resolveOffNutrient(nutriments, "energy");
  const carbs = resolveOffNutrient(nutriments, "carbohydrates");
  const protein = resolveOffNutrient(nutriments, "proteins");
  const fat = resolveOffNutrient(nutriments, "fat");
  const rawName =
    product.product_name ||
    product.product_name_en ||
    product.generic_name ||
    "Unknown item";
  const name = normalizeName(rawName);
  const serving = parseServingSize(product.serving_size);

  return {
    name,
    brand: normalizeText(product.brands),
    barcode: product.code ?? null,
    source: "openfoodfacts",
    portionLabel: serving.label,
    portionGrams: serving.grams,
    kcal: Math.round(calories),
    carbsG: roundTo(carbs),
    proteinG: roundTo(protein),
    fatG: roundTo(fat),
    micronutrients: {},
    meta: {
      offServingProvided: serving.provided,
    },
  };
};

const mapUsdaFood = (food: UsdaFood): FoodInsert | null => {
  const name = normalizeName(food.description ?? "");
  if (!name) return null;
  const nutrients = food.foodNutrients ?? [];
  const calories = extractUsdaValue(nutrients, "energy");
  const protein = extractUsdaValue(nutrients, "protein");
  const carbs = extractUsdaValue(nutrients, "carbohydrate");
  const fat = extractUsdaValue(nutrients, "fat");
  const servingSize = coerceNumber(food.servingSize) || 100;
  const servingUnit = food.servingSizeUnit || "g";

  return {
    name,
    brand: food.brandName ?? null,
    barcode: null,
    source: "usda",
    portionLabel: `${servingSize} ${servingUnit}`,
    portionGrams: servingUnit.toLowerCase().includes("g") ? servingSize : null,
    kcal: Math.round(calories),
    carbsG: roundTo(carbs),
    proteinG: roundTo(protein),
    fatG: roundTo(fat),
    micronutrients: {},
  };
};

export const fetchOffSearch = async (query: string, limit: number) => {
  const url = new URL("https://world.openfoodfacts.org/cgi/search.pl");
  url.searchParams.set("search_terms", query);
  url.searchParams.set("search_simple", "1");
  url.searchParams.set("action", "process");
  url.searchParams.set("json", "1");
  url.searchParams.set("page_size", String(limit));
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("OpenFoodFacts lookup failed.");
  }
  const data = (await response.json()) as OffSearchResponse;
  return (data.products ?? []).map(mapOffProduct);
};

const isOffLowQuality = (item: FoodInsert & { meta?: { offServingProvided?: boolean } }) => {
  const name = item.name.trim().toLowerCase();
  const hasBadName =
    name.length < 3 ||
    name.includes("unknown") ||
    name.includes("undefined") ||
    name.includes("product") ||
    name.includes("test");
  const totalMacros = item.carbsG + item.proteinG + item.fatG;
  const hasNoMacros = totalMacros <= 0 || item.kcal <= 0;
  const hasDefaultServing =
    item.meta?.offServingProvided === false &&
    item.portionLabel?.toLowerCase() === "100 g";
  const hasNoBarcode = !item.barcode;
  const hasInvalidServing =
    item.portionGrams !== null &&
    item.portionGrams !== undefined &&
    (item.portionGrams <= 0 || item.portionGrams > 1000);
  return (
    hasBadName ||
    hasNoMacros ||
    hasInvalidServing ||
    (hasDefaultServing && hasNoBarcode)
  );
};

export const filterOffLowQuality = (items: FoodInsert[]) =>
  items.filter((item) => !isOffLowQuality(item));

export const fetchOffBarcode = async (barcode: string) => {
  const response = await fetch(
    `https://world.openfoodfacts.org/api/v2/product/${barcode}.json`,
  );
  if (!response.ok) {
    throw new Error("OpenFoodFacts lookup failed.");
  }
  const data = (await response.json()) as OffBarcodeResponse;
  if (data.status !== 1 || !data.product) return null;
  return mapOffProduct(data.product);
};

export const fetchUsdaFoods = async (query: string, limit: number) => {
  if (!USDA_API_KEY) return [];
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/search");
  url.searchParams.set("api_key", USDA_API_KEY);
  url.searchParams.set("query", query);
  url.searchParams.set("pageSize", String(limit));
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error("USDA lookup failed.");
  }
  const data = (await response.json()) as UsdaSearchResponse;
  return (data.foods ?? [])
    .map(mapUsdaFood)
    .filter((item): item is FoodInsert => Boolean(item));
};

export const dedupeFoodInserts = (items: FoodInsert[]) => {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = item.barcode
      ? `barcode:${item.barcode}`
      : `name:${item.name.toLowerCase()}|${(item.brand ?? "").toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

export const upsertGlobalFoods = async (items: FoodInsert[]) => {
  if (!items.length) return [];
  const withBarcode = items.filter((item) => item.barcode);
  const withoutBarcode = items.filter((item) => !item.barcode);

  const insertedWithBarcode = withBarcode.length
    ? await query(
        `
        INSERT INTO foods (
          name,
          brand,
          barcode,
          source,
          is_global,
          created_by_user_id,
          portion_label,
          portion_grams,
          kcal,
          carbs_g,
          protein_g,
          fat_g,
          micronutrients
        )
        SELECT * FROM UNNEST(
          $1::text[],
          $2::text[],
          $3::text[],
          $4::text[],
          $5::boolean[],
          $6::uuid[],
          $7::text[],
          $8::numeric[],
          $9::numeric[],
          $10::numeric[],
          $11::numeric[],
          $12::numeric[],
          $13::jsonb[]
        )
        ON CONFLICT DO NOTHING
        RETURNING *;
        `,
        [
          withBarcode.map((item) => item.name),
          withBarcode.map((item) => item.brand ?? null),
          withBarcode.map((item) => item.barcode ?? null),
          withBarcode.map((item) => item.source),
          withBarcode.map(() => true),
          withBarcode.map(() => null),
          withBarcode.map((item) => item.portionLabel ?? null),
          withBarcode.map((item) => item.portionGrams ?? null),
          withBarcode.map((item) => item.kcal),
          withBarcode.map((item) => item.carbsG),
          withBarcode.map((item) => item.proteinG),
          withBarcode.map((item) => item.fatG),
          withBarcode.map((item) => JSON.stringify(item.micronutrients ?? {})),
        ],
      )
    : { rows: [] };

  const barcodeList = withBarcode
    .map((item) => item.barcode)
    .filter((value): value is string => Boolean(value));

  const existingWithBarcode =
    barcodeList.length > 0
      ? await query(
          `
          SELECT *
          FROM foods
          WHERE is_global = true AND barcode = ANY($1);
          `,
          [barcodeList],
        )
      : { rows: [] };

  const insertedWithoutBarcode = withoutBarcode.length
    ? await query(
        `
        INSERT INTO foods (
          name,
          brand,
          barcode,
          source,
          is_global,
          created_by_user_id,
          portion_label,
          portion_grams,
          kcal,
          carbs_g,
          protein_g,
          fat_g,
          micronutrients
        )
        SELECT * FROM UNNEST(
          $1::text[],
          $2::text[],
          $3::text[],
          $4::text[],
          $5::boolean[],
          $6::uuid[],
          $7::text[],
          $8::numeric[],
          $9::numeric[],
          $10::numeric[],
          $11::numeric[],
          $12::numeric[],
          $13::jsonb[]
        )
        RETURNING *;
        `,
        [
          withoutBarcode.map((item) => item.name),
          withoutBarcode.map((item) => item.brand ?? null),
          withoutBarcode.map((item) => item.barcode ?? null),
          withoutBarcode.map((item) => item.source),
          withoutBarcode.map(() => true),
          withoutBarcode.map(() => null),
          withoutBarcode.map((item) => item.portionLabel ?? null),
          withoutBarcode.map((item) => item.portionGrams ?? null),
          withoutBarcode.map((item) => item.kcal),
          withoutBarcode.map((item) => item.carbsG),
          withoutBarcode.map((item) => item.proteinG),
          withoutBarcode.map((item) => item.fatG),
          withoutBarcode.map((item) => JSON.stringify(item.micronutrients ?? {})),
        ],
      )
    : { rows: [] };

  const combined = [
    ...existingWithBarcode.rows,
    ...insertedWithBarcode.rows,
    ...insertedWithoutBarcode.rows,
  ];
  const seen = new Set<string>();
  return combined.filter((row) => {
    if (seen.has(row.id)) return false;
    seen.add(row.id);
    return true;
  });
};
