import { useEffect, useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MICRO_GOALS_KEY } from "@/lib/storageKeys";
import type { MacroTarget } from "@/data/mock";
import type { NutritionSummaryMicros } from "@/lib/api";
import { Target } from "lucide-react";

export type MicroGoals = {
  fiber_g: number | null;
  sodium_mg: number | null;
  sugar_g: number | null;
};

const loadMicroGoals = (): MicroGoals => {
  if (typeof window === "undefined")
    return { fiber_g: null, sodium_mg: null, sugar_g: null };
  try {
    const raw = window.localStorage.getItem(MICRO_GOALS_KEY);
    if (!raw) return { fiber_g: null, sodium_mg: null, sugar_g: null };
    const parsed = JSON.parse(raw) as MicroGoals;
    return {
      fiber_g: typeof parsed.fiber_g === "number" ? parsed.fiber_g : null,
      sodium_mg: typeof parsed.sodium_mg === "number" ? parsed.sodium_mg : null,
      sugar_g: typeof parsed.sugar_g === "number" ? parsed.sugar_g : null,
    };
  } catch {
    return { fiber_g: null, sodium_mg: null, sugar_g: null };
  }
};

const saveMicroGoals = (goals: MicroGoals) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MICRO_GOALS_KEY, JSON.stringify(goals));
};

type MacroMicroGoalSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  macros: MacroTarget[];
  micros: NutritionSummaryMicros | null;
  calorieGoal: number;
  onSaveMacros: (next: { carbs?: number; protein?: number; fat?: number }) => void;
  onSaveCalorieGoal?: (goal: number) => void;
};

export const MacroMicroGoalSheet = ({
  open,
  onOpenChange,
  macros,
  micros,
  calorieGoal,
  onSaveMacros,
  onSaveCalorieGoal,
}: MacroMicroGoalSheetProps) => {
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [sodium, setSodium] = useState("");
  const [sugar, setSugar] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!open) return;
    const p = macros.find((m) => m.key === "protein");
    const c = macros.find((m) => m.key === "carbs");
    const f = macros.find((m) => m.key === "fat");
    setProtein(p ? String(Math.round(p.goal)) : "");
    setCarbs(c ? String(Math.round(c.goal)) : "");
    setFat(f ? String(Math.round(f.goal)) : "");
    const microGoals = loadMicroGoals();
    setFiber(microGoals.fiber_g != null ? String(microGoals.fiber_g) : "");
    setSodium(microGoals.sodium_mg != null ? String(microGoals.sodium_mg) : "");
    setSugar(microGoals.sugar_g != null ? String(microGoals.sugar_g) : "");
    setSaved(false);
  }, [open, macros]);

  const handleSave = () => {
    const proteinNum = Number(protein);
    const carbsNum = Number(carbs);
    const fatNum = Number(fat);
    const fiberNum = fiber.trim() ? Number(fiber) : null;
    const sodiumNum = sodium.trim() ? Number(sodium) : null;
    const sugarNum = sugar.trim() ? Number(sugar) : null;

    if (
      Number.isFinite(proteinNum) ||
      Number.isFinite(carbsNum) ||
      Number.isFinite(fatNum)
    ) {
      onSaveMacros({
        protein: Number.isFinite(proteinNum) ? proteinNum : undefined,
        carbs: Number.isFinite(carbsNum) ? carbsNum : undefined,
        fat: Number.isFinite(fatNum) ? fatNum : undefined,
      });
    }

    if (
      fiberNum != null ||
      sodiumNum != null ||
      sugarNum != null
    ) {
      saveMicroGoals({
        fiber_g: Number.isFinite(Number(fiberNum)) ? Number(fiberNum) : null,
        sodium_mg: Number.isFinite(Number(sodiumNum)) ? Number(sodiumNum) : null,
        sugar_g: Number.isFinite(Number(sugarNum)) ? Number(sugarNum) : null,
      });
    }

    setSaved(true);
    const t = window.setTimeout(() => {
      setSaved(false);
      onOpenChange(false);
    }, 600);
    return () => window.clearTimeout(t);
  };

  const fiberTotal = micros?.fiber_g ?? 0;
  const sodiumTotal = micros?.sodium_mg ?? 0;
  const sugarTotal = micros?.sugar_g ?? 0;

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[28px] border-t border-border/60 bg-card">
        <div className="mx-auto w-full max-w-[420px] px-5 pb-8 pt-2">
          <div className="mx-auto h-1 w-12 rounded-full bg-muted" />
          <div className="mt-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-primary">
              <Target className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-display font-semibold text-foreground">
                Nutrition goals
              </h2>
              <p className="text-xs text-muted-foreground">
                Set daily targets. Micro goals are saved on this device.
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary/80">
                Macros (g)
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="goal-protein" className="text-xs text-muted-foreground">
                    Protein
                  </Label>
                  <Input
                    id="goal-protein"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="mt-1 rounded-xl border-border/60"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="goal-carbs" className="text-xs text-muted-foreground">
                    Carbs
                  </Label>
                  <Input
                    id="goal-carbs"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="mt-1 rounded-xl border-border/60"
                    placeholder="0"
                  />
                </div>
                <div>
                  <Label htmlFor="goal-fat" className="text-xs text-muted-foreground">
                    Fat
                  </Label>
                  <Input
                    id="goal-fat"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="mt-1 rounded-xl border-border/60"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            <div>
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary/80">
                Micros
              </p>
              <p className="mb-2 text-[11px] text-muted-foreground">
                Today: Fiber {Math.round(fiberTotal)}g · Sodium {Math.round(sodiumTotal)} mg · Sugar {Math.round(sugarTotal)}g
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <Label htmlFor="goal-fiber" className="text-xs text-muted-foreground">
                    Fiber (g)
                  </Label>
                  <Input
                    id="goal-fiber"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={fiber}
                    onChange={(e) => setFiber(e.target.value)}
                    className="mt-1 rounded-xl border-border/60"
                    placeholder="—"
                  />
                </div>
                <div>
                  <Label htmlFor="goal-sodium" className="text-xs text-muted-foreground">
                    Sodium (mg)
                  </Label>
                  <Input
                    id="goal-sodium"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={sodium}
                    onChange={(e) => setSodium(e.target.value)}
                    className="mt-1 rounded-xl border-border/60"
                    placeholder="—"
                  />
                </div>
                <div>
                  <Label htmlFor="goal-sugar" className="text-xs text-muted-foreground">
                    Sugar (g)
                  </Label>
                  <Input
                    id="goal-sugar"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={sugar}
                    onChange={(e) => setSugar(e.target.value)}
                    className="mt-1 rounded-xl border-border/60"
                    placeholder="—"
                  />
                </div>
              </div>
            </div>
          </div>

          <Button
            className={cn(
              "mt-6 w-full rounded-full font-semibold",
              saved && "bg-primary/90 text-primary-foreground",
            )}
            onClick={handleSave}
          >
            {saved ? "Saved" : "Save goals"}
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
