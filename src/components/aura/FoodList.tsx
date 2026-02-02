import type { FoodItem } from "@/data/mock";
import { Plus } from "lucide-react";
import { Pressable } from "./Pressable";

type FoodListProps = {
  foods: FoodItem[];
  onSelect: (food: FoodItem) => void;
};

export const FoodList = ({ foods, onSelect }: FoodListProps) => (
  <div className="space-y-3">
    {foods.map((food) => (
      <Pressable key={food.id}>
        <button
          type="button"
          onClick={() => onSelect(food)}
          className="flex w-full items-center justify-between rounded-[24px] border border-black/5 bg-white px-4 py-3 text-left shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-xl">
              {food.emoji}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">{food.name}</p>
              <p className="text-xs text-slate-500">
                {food.portion} • {food.kcal} kcal
              </p>
            </div>
          </div>
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
            <Plus className="h-4 w-4" />
          </div>
        </button>
      </Pressable>
    ))}
  </div>
);
