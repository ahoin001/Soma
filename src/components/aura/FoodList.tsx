import type { FoodItem } from "@/data/mock";
import { Plus } from "lucide-react";
import { Pressable } from "./Pressable";
import { useAppStore } from "@/state/AppStore";
import { preloadFoodDetail } from "./FoodDetailSheet";

type FoodListProps = {
  foods: FoodItem[];
  onSelect: (food: FoodItem) => void;
  onQuickAdd?: (food: FoodItem) => void;
};

export const FoodList = ({ foods, onSelect, onQuickAdd }: FoodListProps) => {
  const { showFoodImages } = useAppStore();

  return (
    <div className="space-y-3">
      {foods.map((food) => (
        <div
          key={food.id}
          className="flex w-full items-center justify-between rounded-[24px] border border-black/5 bg-white px-4 py-3 text-left shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
        >
          <Pressable className="flex-1">
            <button
              type="button"
              onClick={() => onSelect(food)}
              onPointerDown={() => preloadFoodDetail(food.id)}
              onMouseEnter={() => preloadFoodDetail(food.id)}
              className="flex w-full items-center gap-3 text-left"
            >
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-xl">
                {showFoodImages && food.imageUrl ? (
                  <img
                    src={food.imageUrl}
                    alt={food.name}
                    className="h-full w-full object-cover object-center"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  food.emoji
                )}
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-800">{food.name}</p>
                <p className="text-xs text-slate-500">
                  {food.brand ? `${food.brand} • ` : ""}
                  {food.portion} • {food.kcal} cal
                </p>
              </div>
            </button>
          </Pressable>
          <Pressable>
            <button
              type="button"
              onClick={() => onQuickAdd?.(food)}
              onPointerDown={() => preloadFoodDetail(food.id)}
              onMouseEnter={() => preloadFoodDetail(food.id)}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-500"
              aria-label={`Add ${food.name}`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </Pressable>
        </div>
      ))}
    </div>
  );
};
