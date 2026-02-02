import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { FoodItem } from "@/data/mock";
import { Plus } from "lucide-react";
import { Pressable } from "./Pressable";

type QuickAddProps = {
  foods: FoodItem[];
  onSelect: (food: FoodItem) => void;
};

export const QuickAdd = ({ foods, onSelect }: QuickAddProps) => (
  <Card className="mt-6 rounded-[28px] border border-black/5 bg-white px-5 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
          Quick add
        </p>
        <h3 className="text-lg font-display font-semibold text-slate-900">
          Frequent foods
        </h3>
      </div>
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
        <Plus className="h-5 w-5" />
      </div>
    </div>
    <div className="mt-4 flex flex-wrap gap-2">
      {foods.map((food) => (
        <Pressable key={food.id}>
          <Button
            variant="secondary"
            className="h-10 rounded-full bg-emerald-50 px-4 text-sm font-semibold text-emerald-700 shadow-[0_8px_16px_rgba(16,185,129,0.18)] hover:bg-emerald-100"
            onClick={() => onSelect(food)}
          >
            <span className="mr-2 text-base">{food.emoji}</span>
            {food.name}
          </Button>
        </Pressable>
      ))}
    </div>
  </Card>
);
