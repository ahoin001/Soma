import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import type { FoodItem, MacroTarget } from "@/data/mock";
import { useEffect, useMemo, useRef, useState } from "react";

type FoodDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  food: FoodItem | null;
  macros: MacroTarget[];
  onTrack: (food: FoodItem) => void;
  onUpdateFood: (food: FoodItem, next: NutritionDraft) => void;
};

type NutritionDraft = {
  portion: string;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
};

export const FoodDetailSheet = ({
  open,
  onOpenChange,
  food,
  macros,
  onTrack,
  onUpdateFood,
}: FoodDetailSheetProps) => {
  const [sparkle, setSparkle] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<NutritionDraft | null>(null);
  const [servings, setServings] = useState(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!sparkle) return;
    const timer = window.setTimeout(() => setSparkle(false), 480);
    return () => window.clearTimeout(timer);
  }, [sparkle]);

  useEffect(() => {
    if (!food || !open) {
      setEditing(false);
      setDraft(null);
      setServings(1);
      return;
    }
    setDraft({
      portion: food.portion,
      kcal: food.kcal,
      carbs: food.macros.carbs,
      protein: food.macros.protein,
      fat: food.macros.fat,
    });
    setServings(1);
  }, [food, open]);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    scrollRef.current.scrollTop = 0;
  }, [open, food?.id]);

  const canSave = useMemo(() => {
    if (!draft) return false;
    return (
      draft.portion.trim().length > 0 &&
      [draft.kcal, draft.carbs, draft.protein, draft.fat].every(
        (value) => Number.isFinite(value) && value >= 0,
      )
    );
  }, [draft]);

  const handleDraftChange = (
    key: keyof NutritionDraft,
    value: string,
  ) => {
    if (!draft) return;
    if (key === "portion") {
      setDraft({ ...draft, portion: value });
      return;
    }
    const numeric = Number(value);
    setDraft({ ...draft, [key]: Number.isFinite(numeric) ? numeric : 0 });
  };

  const scaled = useMemo(() => {
    if (!food) {
      return { kcal: 0, carbs: 0, protein: 0, fat: 0 };
    }
    const multiplier = Math.max(servings, 0);
    return {
      kcal: Math.round(food.kcal * multiplier),
      carbs: Math.round(food.macros.carbs * multiplier),
      protein: Math.round(food.macros.protein * multiplier),
      fat: Math.round(food.macros.fat * multiplier),
    };
  }, [food, servings]);

  const clampServings = (value: number) =>
    Math.min(10, Math.max(0.25, Number.isFinite(value) ? value : 1));

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-[calc(1.5rem+env(safe-area-inset-bottom))] overflow-hidden">
        {food && (
          <div
            ref={scrollRef}
            className="max-h-[85vh] overflow-y-auto px-5 pb-6 pt-2"
            data-vaul-no-drag
          >
            <div className="flex items-center justify-center">
              <div className="-mt-12 flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-white text-3xl shadow-[0_14px_30px_rgba(15,23,42,0.1)]">
                {food.emoji}
              </div>
            </div>

            <div className="mt-4 text-center">
              <h3 className="text-xl font-display font-semibold text-slate-900">
                {food.name}
              </h3>
              <p className="text-sm text-slate-500">
                {food.portion} • {scaled.kcal} kcal
              </p>
            </div>

            <Card className="mt-6 rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                <span>Meal impact</span>
                <span>{scaled.kcal} kcal</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-emerald-700/80">
                <div className="rounded-[16px] bg-white/90 px-3 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400">
                    Carbs
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-800">
                    {scaled.carbs}g
                  </p>
                </div>
                <div className="rounded-[16px] bg-white/90 px-3 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400">
                    Protein
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-800">
                    {scaled.protein}g
                  </p>
                </div>
                <div className="rounded-[16px] bg-white/90 px-3 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-emerald-400">
                    Fat
                  </p>
                  <p className="mt-1 text-sm font-semibold text-emerald-800">
                    {scaled.fat}g
                  </p>
                </div>
              </div>
            </Card>

            <div className="mt-4 rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">Amount</p>
                  <p className="text-xs text-slate-500">
                    Adjust serving size
                  </p>
                </div>
                <div className="rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                  {servings.toFixed(2)}x
                </div>
              </div>

              <div className="mt-4 rounded-[20px] border border-emerald-100 bg-emerald-50/60 px-4 py-4">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.2em] text-emerald-500/80">
                  <span>Serving size</span>
                  <span>{food.portion}</span>
                </div>
                <Slider
                  value={[servings]}
                  min={0.25}
                  max={3}
                  step={0.25}
                  onValueChange={(value) =>
                    setServings(clampServings(value[0]))
                  }
                  className="mt-4"
                />
                <div className="mt-3 flex items-center justify-between text-[11px] text-emerald-500/70">
                  <span>0.25x</span>
                  <span>3x</span>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {[0.5, 1, 1.5, 2].map((value) => (
                  <button
                    key={value}
                    type="button"
                    className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                      Math.abs(servings - value) < 0.01
                        ? "bg-emerald-500 text-white shadow-[0_8px_20px_rgba(16,185,129,0.24)]"
                        : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                    }`}
                    onClick={() => setServings(clampServings(value))}
                  >
                    {value}x
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    onClick={() =>
                      setServings((prev) =>
                        clampServings(Number((prev - 0.25).toFixed(2))),
                      )
                    }
                  >
                    −
                  </Button>
                  <Input
                    type="number"
                    min={0.25}
                    step={0.25}
                    value={servings}
                    onChange={(event) =>
                      setServings(
                        clampServings(Number(event.target.value || 1)),
                      )
                    }
                    className="h-9 w-16 rounded-full text-center"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                    onClick={() =>
                      setServings((prev) =>
                        clampServings(Number((prev + 0.25).toFixed(2))),
                      )
                    }
                  >
                    +
                  </Button>
                </div>
              </div>
            </div>

            <Card className="mt-4 rounded-[28px] border border-black/5 bg-white px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                <span>Nutrition information</span>
                <span>{food.kcal} kcal</span>
              </div>
              <div className="mt-4 space-y-4">
                {macros.map((macro) => (
                  <div key={macro.key} className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium text-slate-700">
                      <span>{macro.label}</span>
                      <span className="text-emerald-500">
                        {food.macroPercent[macro.key]}%
                      </span>
                    </div>
                    <Progress
                      value={food.macroPercent[macro.key]}
                      className="h-2 bg-emerald-100"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-slate-500">
                <div>
                  <p className="font-medium text-slate-700">Carbs</p>
                  <p>{food.macros.carbs} g</p>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Protein</p>
                  <p>{food.macros.protein} g</p>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Fat</p>
                  <p>{food.macros.fat} g</p>
                </div>
              </div>
            </Card>

            <div className="mt-4 rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  Adjust nutrition facts
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 rounded-full px-3 text-xs font-semibold"
                  onClick={() => setEditing((prev) => !prev)}
                >
                  {editing ? "Cancel" : "Edit"}
                </Button>
              </div>
              {editing && draft && (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Portion
                    </p>
                    <Input
                      value={draft.portion}
                      onChange={(event) =>
                        handleDraftChange("portion", event.target.value)
                      }
                      className="mt-1 h-10 rounded-full"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Calories
                      </p>
                      <Input
                        type="number"
                        min={0}
                        value={draft.kcal}
                        onChange={(event) =>
                          handleDraftChange("kcal", event.target.value)
                        }
                        className="mt-1 h-10 rounded-full"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Carbs (g)
                      </p>
                      <Input
                        type="number"
                        min={0}
                        value={draft.carbs}
                        onChange={(event) =>
                          handleDraftChange("carbs", event.target.value)
                        }
                        className="mt-1 h-10 rounded-full"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Protein (g)
                      </p>
                      <Input
                        type="number"
                        min={0}
                        value={draft.protein}
                        onChange={(event) =>
                          handleDraftChange("protein", event.target.value)
                        }
                        className="mt-1 h-10 rounded-full"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Fat (g)
                      </p>
                      <Input
                        type="number"
                        min={0}
                        value={draft.fat}
                        onChange={(event) =>
                          handleDraftChange("fat", event.target.value)
                        }
                        className="mt-1 h-10 rounded-full"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    className="w-full rounded-full bg-aura-primary py-5 text-sm font-semibold text-white"
                    onClick={() => {
                      if (!draft || !canSave) return;
                      onUpdateFood(food, draft);
                      setEditing(false);
                    }}
                    disabled={!canSave}
                  >
                    Save nutrition
                  </Button>
                </div>
              )}
            </div>

            <Button
              className="relative mt-6 w-full overflow-hidden rounded-full bg-aura-primary py-6 text-base font-semibold text-white shadow-[0_16px_30px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90"
              onClick={() => {
                setSparkle(true);
                const adjustedFood = {
                  ...food,
                  kcal: scaled.kcal,
                  macros: {
                    carbs: scaled.carbs,
                    protein: scaled.protein,
                    fat: scaled.fat,
                  },
                  portion: `${servings.toFixed(2)} × ${food.portion}`,
                };
                onTrack(adjustedFood);
                onOpenChange(false);
              }}
            >
              {sparkle && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="h-16 w-16 rounded-full bg-white/50 blur-sm animate-ping" />
                </span>
              )}
              Track
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};
