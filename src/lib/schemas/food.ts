import { z } from "zod";

/**
 * Zod schema for creating custom food entries.
 *
 * Validates all nutrition data at runtime, providing:
 * - Type safety for form values
 * - Clear error messages for users
 * - Automatic form validation with react-hook-form
 */
export const createFoodSchema = z.object({
  // Basic info
  name: z.string().optional().default(""),
  brandId: z.string().nullable().optional(),
  brandName: z.string().optional().default(""),

  // Serving size
  baseServingAmount: z.string().optional().default("1"),
  baseServingUnit: z.string().optional().default("serving"),
  baseServingGrams: z.string().optional().default(""),

  // Required macros (as strings for input handling)
  kcal: z
    .string()
    .min(1, "Calories required")
    .refine((val) => !val || !isNaN(Number(val)), "Must be a number"),
  carbs: z
    .string()
    .min(1, "Carbs required")
    .refine((val) => !val || !isNaN(Number(val)), "Must be a number"),
  protein: z
    .string()
    .min(1, "Protein required")
    .refine((val) => !val || !isNaN(Number(val)), "Must be a number"),
  fat: z
    .string()
    .min(1, "Fat required")
    .refine((val) => !val || !isNaN(Number(val)), "Must be a number"),

  // Optional micronutrients (decimal-friendly: validated as numeric string)
  sodium: z.string().optional().default(""),
  sugar: z.string().optional().default(""),
  addedSugar: z.string().optional().default(""),
  transFat: z.string().optional().default(""),
  fiber: z.string().optional().default(""),
  cholesterol: z.string().optional().default(""),
  satFat: z.string().optional().default(""),
  potassium: z.string().optional().default(""),
  ingredients: z.string().optional().default(""),

  // Image
  imageUrl: z.string().nullable().optional(),
});

export type CreateFoodFormValues = z.infer<typeof createFoodSchema>;

/**
 * Transform form values to API payload format
 */
export const transformFoodFormToPayload = (values: CreateFoodFormValues) => {
  const micronutrients: Record<string, unknown> = {};

  if (values.sodium?.trim()) micronutrients.sodium_mg = Number(values.sodium);
  if (values.sugar?.trim()) micronutrients.sugar_g = Number(values.sugar);
  if (values.addedSugar?.trim()) micronutrients.added_sugar_g = Number(values.addedSugar);
  if (values.transFat?.trim()) micronutrients.trans_fat_g = Number(values.transFat);
  if (values.fiber?.trim()) micronutrients.fiber_g = Number(values.fiber);
  if (values.cholesterol?.trim()) micronutrients.cholesterol_mg = Number(values.cholesterol);
  if (values.satFat?.trim()) micronutrients.saturated_fat_g = Number(values.satFat);
  if (values.potassium?.trim()) micronutrients.potassium_mg = Number(values.potassium);
  if (values.ingredients?.trim()) micronutrients.ingredients = values.ingredients.trim();

  const safeAmount = values.baseServingAmount?.trim() || "1";
  const safeUnit = values.baseServingUnit?.trim() || "serving";
  const portionLabel = `${safeAmount} ${safeUnit}`.trim();
  const portionGrams = values.baseServingGrams?.trim()
    ? Number(values.baseServingGrams)
    : undefined;

  return {
    name: values.name?.trim() || "Custom food",
    brand: values.brandName?.trim() || undefined,
    brandId: values.brandId ?? undefined,
    portionLabel,
    portionGrams: Number.isFinite(portionGrams) ? portionGrams : undefined,
    kcal: Number(values.kcal) || 0,
    carbs: Number(values.carbs) || 0,
    protein: Number(values.protein) || 0,
    fat: Number(values.fat) || 0,
    micronutrients: Object.keys(micronutrients).length ? micronutrients : undefined,
    imageUrl: values.imageUrl ?? undefined,
  };
};

/**
 * Default form values
 */
export const createFoodDefaults: CreateFoodFormValues = {
  name: "",
  brandId: null,
  brandName: "",
  baseServingAmount: "1",
  baseServingUnit: "serving",
  baseServingGrams: "",
  kcal: "",
  carbs: "",
  protein: "",
  fat: "",
  sodium: "",
  sugar: "",
  addedSugar: "",
  transFat: "",
  fiber: "",
  cholesterol: "",
  satFat: "",
  potassium: "",
  ingredients: "",
  imageUrl: null,
};

/**
 * Serving unit options organized by category
 */
export const servingUnits = {
  weight: [
    { value: "g", label: "g" },
    { value: "kg", label: "kg" },
    { value: "oz", label: "oz" },
    { value: "lb", label: "lb" },
  ],
  volume: [
    { value: "ml", label: "ml" },
    { value: "l", label: "l" },
    { value: "tsp", label: "tsp" },
    { value: "tbsp", label: "tbsp" },
    { value: "fl oz", label: "fl oz" },
    { value: "cup", label: "cup" },
    { value: "pint", label: "pint" },
    { value: "quart", label: "quart" },
    { value: "gallon", label: "gallon" },
  ],
  count: [
    { value: "apple", label: "apple" },
    { value: "bagel", label: "bagel" },
    { value: "banana", label: "banana" },
    { value: "bar", label: "bar" },
    { value: "bottle", label: "bottle" },
    { value: "can", label: "can" },
    { value: "container", label: "container" },
    { value: "egg", label: "egg" },
    { value: "packet", label: "packet" },
    { value: "piece", label: "piece" },
    { value: "scoop", label: "scoop" },
    { value: "serving", label: "serving" },
    { value: "slice", label: "slice" },
  ],
} as const;
