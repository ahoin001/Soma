import { useEffect, useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MICRO_GOALS_KEY } from "@/lib/storageKeys";
import type { MacroTarget } from "@/data/mock";
import type { NutritionSummaryMicros } from "@/lib/api";
import { Target, TrendingUp, TrendingDown } from "lucide-react";
import { MicroGoalProgress } from "@/components/aura/MicroGoalProgress";
import { MicroLimitBudget } from "@/components/aura/MicroLimitBudget";

export type MicroTargetMode = "goal" | "limit";

export type MicroGoalEntry = {
  value: number;
  mode: MicroTargetMode;
};

export type MicroGoals = {
  fiber_g: MicroGoalEntry | null;
  sodium_mg: MicroGoalEntry | null;
  sugar_g: MicroGoalEntry | null;
};

const parseEntry = (raw: unknown): MicroGoalEntry | null => {
  if (raw == null) return null;
  if (typeof raw === "number" && Number.isFinite(raw))
    return { value: raw, mode: "goal" };
  if (typeof raw === "object" && raw !== null && "value" in raw) {
    const v = (raw as { value: unknown; mode?: string }).value;
    const m = (raw as { value: unknown; mode?: string }).mode;
    if (typeof v === "number" && Number.isFinite(v))
      return { value: v, mode: m === "limit" ? "limit" : "goal" };
  }
  return null;
};

const loadMicroGoals = (): MicroGoals => {
  if (typeof window === "undefined")
    return { fiber_g: null, sodium_mg: null, sugar_g: null };
  try {
    const raw = window.localStorage.getItem(MICRO_GOALS_KEY);
    if (!raw) return { fiber_g: null, sodium_mg: null, sugar_g: null };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return {
      fiber_g: parseEntry(parsed.fiber_g),
      sodium_mg: parseEntry(parsed.sodium_mg),
      sugar_g: parseEntry(parsed.sugar_g),
    };
  } catch {
    return { fiber_g: null, sodium_mg: null, sugar_g: null };
  }
};

const saveMicroGoals = (goals: MicroGoals) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(MICRO_GOALS_KEY, JSON.stringify(goals));
};

function MicroRow({
  id,
  label,
  unit,
  value,
  onChange,
  mode,
  onModeChange,
}: {
  id: string;
  label: string;
  unit: string;
  value: string;
  onChange: (v: string) => void;
  mode: MicroTargetMode;
  onModeChange: (m: MicroTargetMode) => void;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-xl border border-border/50 bg-muted/30 px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={`goal-${id}`} className="text-xs font-medium text-foreground">
          {label} ({unit})
        </Label>
        <div className="flex rounded-full border border-border/60 bg-background p-0.5">
          <button
            type="button"
            onClick={() => onModeChange("goal")}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition",
              mode === "goal"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <TrendingUp className="h-3 w-3" />
            Goal
          </button>
          <button
            type="button"
            onClick={() => onModeChange("limit")}
            className={cn(
              "flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-medium transition",
              mode === "limit"
                ? "bg-amber-500/90 text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <TrendingDown className="h-3 w-3" />
            Limit
          </button>
        </div>
      </div>
      <Input
        id={`goal-${id}`}
        type="number"
        min={0}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border-border/60"
        placeholder={mode === "limit" ? "e.g. 2000" : "—"}
      />
    </div>
  );
}

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
  const [fiberMode, setFiberMode] = useState<MicroTargetMode>("goal");
  const [sodium, setSodium] = useState("");
  const [sodiumMode, setSodiumMode] = useState<MicroTargetMode>("goal");
  const [sugar, setSugar] = useState("");
  const [sugarMode, setSugarMode] = useState<MicroTargetMode>("goal");
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
    setFiber(microGoals.fiber_g != null ? String(microGoals.fiber_g.value) : "");
    setFiberMode(microGoals.fiber_g?.mode ?? "goal");
    setSodium(microGoals.sodium_mg != null ? String(microGoals.sodium_mg.value) : "");
    setSodiumMode(microGoals.sodium_mg?.mode ?? "goal");
    setSugar(microGoals.sugar_g != null ? String(microGoals.sugar_g.value) : "");
    setSugarMode(microGoals.sugar_g?.mode ?? "goal");
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

    saveMicroGoals({
      fiber_g:
        fiber.trim() && Number.isFinite(Number(fiber))
          ? { value: Number(fiber), mode: fiberMode }
          : null,
      sodium_mg:
        sodium.trim() && Number.isFinite(Number(sodium))
          ? { value: Number(sodium), mode: sodiumMode }
          : null,
      sugar_g:
        sugar.trim() && Number.isFinite(Number(sugar))
          ? { value: Number(sugar), mode: sugarMode }
          : null,
    });

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
              <p className="mb-3 text-[11px] text-muted-foreground">
                Goal = get at least this much. Limit = stay below this.
              </p>
              {(fiber.trim() && Number.isFinite(Number(fiber))) ||
               (sodium.trim() && Number.isFinite(Number(sodium))) ||
               (sugar.trim() && Number.isFinite(Number(sugar))) ? (
                <div className="mb-4 space-y-3">
                  {fiber.trim() && Number.isFinite(Number(fiber)) && (
                    fiberMode === "goal" ? (
                      <MicroGoalProgress
                        label="Fiber"
                        current={Math.round(fiberTotal * 10) / 10}
                        goal={Number(fiber)}
                        unit="g"
                      />
                    ) : (
                      <MicroLimitBudget
                        label="Fiber"
                        current={Math.round(fiberTotal * 10) / 10}
                        limit={Number(fiber)}
                        unit="g"
                      />
                    )
                  )}
                  {sodium.trim() && Number.isFinite(Number(sodium)) && (
                    sodiumMode === "goal" ? (
                      <MicroGoalProgress
                        label="Sodium"
                        current={Math.round(sodiumTotal)}
                        goal={Number(sodium)}
                        unit="mg"
                      />
                    ) : (
                      <MicroLimitBudget
                        label="Sodium"
                        current={Math.round(sodiumTotal)}
                        limit={Number(sodium)}
                        unit="mg"
                      />
                    )
                  )}
                  {sugar.trim() && Number.isFinite(Number(sugar)) && (
                    sugarMode === "goal" ? (
                      <MicroGoalProgress
                        label="Added sugar"
                        current={Math.round(sugarTotal * 10) / 10}
                        goal={Number(sugar)}
                        unit="g"
                      />
                    ) : (
                      <MicroLimitBudget
                        label="Added sugar"
                        current={Math.round(sugarTotal * 10) / 10}
                        limit={Number(sugar)}
                        unit="g"
                      />
                    )
                  )}
                </div>
              ) : null}
              <p className="mb-2 text-[11px] text-muted-foreground">
                Today: Fiber {Math.round(fiberTotal)}g · Sodium {Math.round(sodiumTotal)} mg · Sugar {Math.round(sugarTotal)}g
              </p>
              <div className="space-y-4">
                <MicroRow
                  id="fiber"
                  label="Fiber"
                  unit="g"
                  value={fiber}
                  onChange={setFiber}
                  mode={fiberMode}
                  onModeChange={setFiberMode}
                />
                <MicroRow
                  id="sodium"
                  label="Sodium"
                  unit="mg"
                  value={sodium}
                  onChange={setSodium}
                  mode={sodiumMode}
                  onModeChange={setSodiumMode}
                />
                <MicroRow
                  id="sugar"
                  label="Sugar"
                  unit="g"
                  value={sugar}
                  onChange={setSugar}
                  mode={sugarMode}
                  onModeChange={setSugarMode}
                />
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
