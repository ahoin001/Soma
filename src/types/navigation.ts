import type { FoodItem } from "@/data/mock";

/** Location state when navigating to EditFood (e.g. from Nutrition). */
export type EditFoodLocationState = {
  food?: FoodItem;
  returnTo?: string;
};
