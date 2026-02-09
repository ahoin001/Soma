/**
 * Shared serving options cache and unit normalization.
 * Used by FoodDetailSheet and EditFood to avoid duplicate logic.
 */

import { SERVING_CACHE_KEY } from "./storageKeys";

export type ServingOption = {
  id: string;
  label: string;
  grams?: number | null;
  kind?: "serving" | "weight" | "custom";
};

const cache = new Map<string, ServingOption[]>();
const isBrowser = typeof window !== "undefined";

function load(): void {
  if (!isBrowser) return;
  try {
    const raw = window.localStorage.getItem(SERVING_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, ServingOption[]>;
    Object.entries(parsed).forEach(([foodId, options]) => {
      if (Array.isArray(options)) {
        cache.set(foodId, options);
      }
    });
  } catch {
    // ignore cache errors
  }
}

function persist(): void {
  if (!isBrowser) return;
  try {
    const payload = Object.fromEntries(cache.entries());
    window.localStorage.setItem(SERVING_CACHE_KEY, JSON.stringify(payload));
  } catch {
    // ignore cache errors
  }
}

load();

/** Get cached serving options for a food (returns empty array if none). */
export function getServingOptions(foodId: string): ServingOption[] {
  return cache.get(foodId) ?? [];
}

/** Set serving options for a food and persist to localStorage. */
export function setServingOptions(foodId: string, options: ServingOption[]): void {
  cache.set(foodId, options);
  persist();
}

/** Check if cache has options for a food (e.g. to skip preload). */
export function hasServingOptions(foodId: string): boolean {
  return cache.has(foodId);
}

/**
 * Normalize a user- or API-entered unit string to a canonical form.
 * Used for portion labels and serving unit inputs.
 */
export function normalizeUnit(raw: string): string {
  const unit = raw.trim().toLowerCase();
  if (!unit) return "serving";
  if (unit.startsWith("g") || unit.includes("gram")) return "g";
  if (unit.includes("kg") || unit.includes("kilogram")) return "kg";
  if (unit.includes("ml") || unit.includes("milliliter")) return "ml";
  if (unit === "l" || unit.includes("liter")) return "l";
  if (unit.includes("fl oz") || unit.includes("fluid ounce")) return "fl oz";
  if (unit.includes("cup")) return "cup";
  if (unit.includes("pint")) return "pint";
  if (unit.includes("quart")) return "quart";
  if (unit.includes("gallon")) return "gallon";
  if (unit.includes("tbsp") || unit.includes("tablespoon")) return "tbsp";
  if (unit.includes("tsp") || unit.includes("teaspoon")) return "tsp";
  if (unit.includes("oz") || unit.includes("ounce")) return "oz";
  if (unit.includes("lb") || unit.includes("pound")) return "lb";
  if (unit.includes("slice")) return "slice";
  if (unit.includes("piece") || unit.includes("pc")) return "piece";
  if (unit.includes("packet") || unit.includes("pack")) return "packet";
  if (unit.includes("can")) return "can";
  if (unit.includes("bottle")) return "bottle";
  if (unit.includes("bar")) return "bar";
  if (unit.includes("egg")) return "egg";
  if (unit.includes("container")) return "container";
  if (unit.includes("apple")) return "apple";
  if (unit.includes("bagel")) return "bagel";
  if (unit.includes("banana")) return "banana";
  if (unit.includes("serving")) return "serving";
  return "serving";
}
