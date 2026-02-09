import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import type { Meal } from "@/data/mock";
import { PlusCircle, Search } from "lucide-react";

type QuickActionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  meals: Meal[];
  selectedMeal: Meal | null;
  onSelectMeal: (meal: Meal) => void;
  onAddFood: () => void;
  onCreateFood: () => void;
};

export const QuickActionSheet = ({
  open,
  onOpenChange,
  meals,
  selectedMeal,
  onSelectMeal,
  onAddFood,
  onCreateFood,
}: QuickActionSheetProps) => (
  <Drawer open={open} onOpenChange={onOpenChange}>
    <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-6 overflow-hidden">
      <div className="aura-sheet-scroll" data-vaul-no-drag>
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            Quick add
          </p>
          <h2 className="text-xl font-display font-semibold text-slate-900">
            Add to your day
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose a meal and jump in.
          </p>
        </div>

        <div className="mt-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Meal target
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {meals.map((meal) => (
              <button
                key={meal.id}
                type="button"
                onClick={() => onSelectMeal(meal)}
                className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold transition ${
                  selectedMeal?.id === meal.id
                    ? "border-emerald-400 bg-emerald-50 text-emerald-700"
                    : "border-slate-200 bg-white text-slate-600"
                }`}
              >
                <span>{meal.emoji}</span>
                {meal.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <Button
            type="button"
            className="h-auto flex-col items-start rounded-[22px] bg-white px-4 py-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
            onClick={onAddFood}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <Search className="h-4 w-4" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">
              Add food
            </p>
            <p className="text-xs text-slate-500">
              Search and track quickly
            </p>
          </Button>
          <Button
            type="button"
            className="h-auto flex-col items-start rounded-[22px] bg-white px-4 py-4 text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
            onClick={onCreateFood}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <PlusCircle className="h-4 w-4" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-800">
              Create food
            </p>
            <p className="text-xs text-slate-500">
              Log a custom item
            </p>
          </Button>
        </div>
      </div>
    </DrawerContent>
  </Drawer>
);
