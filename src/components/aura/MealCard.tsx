import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { Meal } from "@/data/mock";
import { Plus } from "lucide-react";
import { Pressable } from "./Pressable";
import { MealIcon } from "./MealIcon";

type MealCardProps = {
  meal: Meal;
  onAdd: () => void;
};

export const MealCard = ({ meal, onAdd }: MealCardProps) => (
  <Pressable>
    <Card className="flex items-center justify-between rounded-[28px] border border-border/60 bg-card px-4 py-4 shadow-[0_14px_32px_rgba(15,23,42,0.08)]">
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
          <MealIcon mealId={meal.id} size={26} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">{meal.label}</p>
          <p className="text-xs text-muted-foreground">
            Recommended: {meal.recommended}
          </p>
        </div>
      </div>
      <Button
        size="icon"
        className="h-10 w-10 rounded-full bg-primary/15 text-primary hover:bg-primary/25"
        onClick={onAdd}
      >
        <Plus className="h-5 w-5" />
      </Button>
    </Card>
  </Pressable>
);
