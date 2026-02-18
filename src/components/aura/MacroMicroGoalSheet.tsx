import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MICRO_GOALS_KEY } from "@/lib/storageKeys";
import type { MacroTarget } from "@/data/mock";
import type { NutritionSummaryMicros } from "@/lib/api";
import { Target, TrendingUp, TrendingDown, ExternalLink } from "lucide-react";

export type MicroTargetMode = "goal" | "limit";

export type MicroGoalEntry = {
  value: number;
  mode: MicroTargetMode;
};

/** Legacy shape: fixed fiber/sodium/sugar. Still used by Goals page. */
export type MicroGoals = {
  fiber_g: MicroGoalEntry | null;
  sodium_mg: MicroGoalEntry | null;
  sugar_g: MicroGoalEntry | null;
};

/** Stored shape: 3 swappable slots + goals keyed by micro key. */
const DEFAULT_SLOT_KEYS = ["fiber_g", "sodium_mg", "sugar_g"] as const;

export const MICRO_OPTIONS = [
  { key: "fiber_g", label: "Fiber", unit: "g" },
  { key: "sodium_mg", label: "Sodium", unit: "mg" },
  { key: "sugar_g", label: "Added sugar", unit: "g" },
  { key: "potassium_mg", label: "Potassium", unit: "mg" },
  { key: "cholesterol_mg", label: "Cholesterol", unit: "mg" },
  { key: "saturated_fat_g", label: "Saturated fat", unit: "g" },
] as const;

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

export type StoredMicroState = {
  slotKeys: string[];
  goals: Record<string, MicroGoalEntry>;
};

function loadMicroState(): StoredMicroState {
  if (typeof window === "undefined") {
    return { slotKeys: [...DEFAULT_SLOT_KEYS], goals: {} };
  }
  try {
    const raw = window.localStorage.getItem(MICRO_GOALS_KEY);
    if (!raw) return { slotKeys: [...DEFAULT_SLOT_KEYS], goals: {} };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const slotKeys = Array.isArray(parsed.slotKeys)
      ? (parsed.slotKeys as string[]).slice(0, 3)
      : [...DEFAULT_SLOT_KEYS];
    const knownKeys = new Set(MICRO_OPTIONS.map((o) => o.key));
    const goals: Record<string, MicroGoalEntry> = {};
    for (const key of knownKeys) {
      const entry = parseEntry(parsed[key]);
      if (entry) goals[key] = entry;
    }
    return { slotKeys, goals };
  } catch {
    return { slotKeys: [...DEFAULT_SLOT_KEYS], goals: {} };
  }
}

/** Used by DashboardHeader to show the 3 chosen micro slots. */
export function getMicroSlotKeys(): string[] {
  return loadMicroState().slotKeys;
}

/** Used by DashboardHeader to render micro progress/limit bars on the HUD. */
export function getMicroState(): StoredMicroState {
  return loadMicroState();
}

/** Backward compat: return legacy MicroGoals for consumers that still use it. */
export const loadMicroGoals = (): MicroGoals => {
  const { goals } = loadMicroState();
  return {
    fiber_g: goals.fiber_g ?? null,
    sodium_mg: goals.sodium_mg ?? null,
    sugar_g: goals.sugar_g ?? null,
  };
};

export function saveMicroState({ slotKeys, goals }: StoredMicroState) {
  if (typeof window === "undefined") return;
  const payload: Record<string, unknown> = { slotKeys };
  for (const [key, entry] of Object.entries(goals)) {
    if (entry) payload[key] = entry;
  }
  window.localStorage.setItem(MICRO_GOALS_KEY, JSON.stringify(payload));
}

const saveMicroGoals = (goals: MicroGoals) => {
  if (typeof window === "undefined") return;
  const current = loadMicroState();
  const merged: Record<string, unknown> = { slotKeys: current.slotKeys };
  for (const [k, v] of Object.entries(current.goals)) {
    if (v) merged[k] = v;
  }
  if (goals.fiber_g) merged.fiber_g = goals.fiber_g;
  if (goals.sodium_mg) merged.sodium_mg = goals.sodium_mg;
  if (goals.sugar_g) merged.sugar_g = goals.sugar_g;
  window.localStorage.setItem(MICRO_GOALS_KEY, JSON.stringify(merged));
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
  const navigate = useNavigate();
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [slotKeys, setSlotKeys] = useState<string[]>(() => [...DEFAULT_SLOT_KEYS]);
  const [slotValues, setSlotValues] = useState<Record<string, string>>({});
  const [slotModes, setSlotModes] = useState<Record<string, MicroTargetMode>>({});
  const [saved, setSaved] = useState(false);

  const setSlotKey = useCallback((index: number, key: string) => {
    setSlotKeys((prev) => {
      const next = [...prev];
      next[index] = key;
      return next;
    });
  }, []);

  const setSlotValue = useCallback((key: string, value: string) => {
    setSlotValues((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setSlotMode = useCallback((key: string, mode: MicroTargetMode) => {
    setSlotModes((prev) => ({ ...prev, [key]: mode }));
  }, []);

  useEffect(() => {
    if (!open) return;
    const p = macros.find((m) => m.key === "protein");
    const c = macros.find((m) => m.key === "carbs");
    const f = macros.find((m) => m.key === "fat");
    setProtein(p ? String(Math.round(p.goal)) : "");
    setCarbs(c ? String(Math.round(c.goal)) : "");
    setFat(f ? String(Math.round(f.goal)) : "");
    const { slotKeys: loadedSlots, goals } = loadMicroState();
    setSlotKeys(loadedSlots.length >= 3 ? loadedSlots : [...DEFAULT_SLOT_KEYS]);
    const values: Record<string, string> = {};
    const modes: Record<string, MicroTargetMode> = {};
    for (const opt of MICRO_OPTIONS) {
      const entry = goals[opt.key];
      if (entry) {
        values[opt.key] = String(entry.value);
        modes[opt.key] = entry.mode;
      }
    }
    setSlotValues(values);
    setSlotModes(modes);
    setSaved(false);
  }, [open, macros]);

  const handleSave = () => {
    const proteinNum = Number(protein);
    const carbsNum = Number(carbs);
    const fatNum = Number(fat);

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

    const goals: Record<string, MicroGoalEntry> = {};
    for (const key of slotKeys) {
      const valueStr = slotValues[key] ?? "";
      const num = valueStr.trim() ? Number(valueStr) : NaN;
      if (Number.isFinite(num)) {
        goals[key] = {
          value: num,
          mode: slotModes[key] ?? "goal",
        };
      }
    }
    saveMicroState({ slotKeys, goals });
    saveMicroGoals({
      fiber_g: goals.fiber_g ?? null,
      sodium_mg: goals.sodium_mg ?? null,
      sugar_g: goals.sugar_g ?? null,
    });

    setSaved(true);
    const t = window.setTimeout(() => {
      setSaved(false);
      onOpenChange(false);
    }, 600);
    return () => window.clearTimeout(t);
  };

  const handleOpenFullGoals = () => {
    onOpenChange(false);
    navigate("/nutrition/goals");
  };

  const getMicroCurrent = (key: string) => {
    const n = micros?.[key as keyof NutritionSummaryMicros];
    return typeof n === "number" ? n : 0;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="flex max-h-[100svh] flex-col rounded-t-[28px] border-t border-border/60 bg-card">
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain">
          <div className="mx-auto w-full max-w-[420px] shrink-0 px-5 pb-8 pt-2">
            <div className="mx-auto h-1 w-12 rounded-full bg-muted" />
            <div className="mt-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
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
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="shrink-0 gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={handleOpenFullGoals}
              >
                <ExternalLink className="h-4 w-4" />
                Full goals
              </Button>
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
                  Goal = get at least this much. Limit = stay below. Swap any slot for another nutrient. Progress shows on the dashboard when you tap macros.
                </p>
                <p className="mb-2 text-[11px] text-muted-foreground">
                  Today:{" "}
                  {slotKeys.map((key) => {
                    const opt = MICRO_OPTIONS.find((o) => o.key === key);
                    const cur = getMicroCurrent(key);
                    return opt ? `${opt.label} ${Math.round(cur)} ${opt.unit}` : null;
                  }).filter(Boolean).join(" · ") || "—"}
                </p>
                {/* Recommended preset: 2:1 potassium to sodium */}
                <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
                  <span className="text-[11px] font-medium text-foreground">
                    Recommended: 2:1 potassium to sodium
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="h-7 rounded-full text-[11px] font-medium"
                    onClick={() => {
                      const { goals, slotKeys: currentSlotKeys } = loadMicroState();
                      const sodiumEntry = goals.sodium_mg;
                      const sodiumVal = sodiumEntry?.value ?? 2300;
                      const potassiumVal = Math.round(2 * sodiumVal);
                      const newGoals: Record<string, MicroGoalEntry> = {
                        ...goals,
                        potassium_mg: { value: potassiumVal, mode: "goal" },
                      };
                      saveMicroState({ slotKeys: currentSlotKeys, goals: newGoals });
                      saveMicroGoals({
                        fiber_g: newGoals.fiber_g ?? null,
                        sodium_mg: newGoals.sodium_mg ?? null,
                        sugar_g: newGoals.sugar_g ?? null,
                      });
                      setSlotValues((prev) => ({ ...prev, potassium_mg: String(potassiumVal) }));
                      setSlotModes((prev) => ({ ...prev, potassium_mg: "goal" }));
                    }}
                  >
                    Apply preset
                  </Button>
                </div>
                <div className="space-y-4">
                  {slotKeys.map((slotKey, index) => {
                    const opt = MICRO_OPTIONS.find((o) => o.key === slotKey) ?? MICRO_OPTIONS[0];
                    const value = slotValues[slotKey] ?? "";
                    const mode = slotModes[slotKey] ?? "goal";
                    const usedKeys = new Set(slotKeys);
                    return (
                      <div key={`${index}-${slotKey}`} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-[11px] text-muted-foreground">Track</Label>
                          <Select
                            value={slotKey}
                            onValueChange={(next) => setSlotKey(index, next)}
                          >
                            <SelectTrigger className="h-8 rounded-lg border-border/60 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {MICRO_OPTIONS.map((o) => (
                                <SelectItem
                                  key={o.key}
                                  value={o.key}
                                  disabled={o.key !== slotKey && usedKeys.has(o.key)}
                                >
                                  {o.label} ({o.unit})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <MicroRow
                          id={`micro-${index}-${slotKey}`}
                          label={opt.label}
                          unit={opt.unit}
                          value={value}
                          onChange={(v) => setSlotValue(slotKey, v)}
                          mode={mode}
                          onModeChange={(m) => setSlotMode(slotKey, m)}
                        />
                      </div>
                    );
                  })}
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
        </div>
      </DrawerContent>
    </Drawer>
  );
};
