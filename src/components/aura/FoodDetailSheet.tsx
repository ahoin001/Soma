import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FoodItem, MacroTarget } from "@/data/mock";
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, PencilLine, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { fetchFoodServings } from "@/lib/api";
import {
  getServingOptions,
  hasServingOptions,
  normalizeUnit,
  setServingOptions,
  type ServingOption,
} from "@/lib/servingCache";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useUserSettings } from "@/state";
import { servingUnits } from "@/lib/schemas/food";
import { FoodImage } from "./FoodImage";

export type FoodDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  food: FoodItem | null;
  macros: MacroTarget[];
  onTrack: (
    food: FoodItem,
    options?: {
      quantity?: number;
      portionLabel?: string;
      portionGrams?: number | null;
    }
  ) => Promise<void>;
  onUpdateFood: (food: FoodItem, next: import("@/types/nutrition").NutritionDraft) => void;
  onUpdateMaster?: (
    food: FoodItem,
    next: import("@/types/nutrition").NutritionDraft,
    micros: Record<string, number | string>,
  ) => Promise<void>;
  isFavorite?: boolean;
  onToggleFavorite?: (favorite: boolean) => void;
};

export const preloadFoodDetail = async (foodId: string) => {
  if (!foodId) return;
  if (hasServingOptions(foodId)) return;
  try {
    const response = await fetchFoodServings(foodId);
    const extra = response.servings
      .filter((serving) => serving.grams > 0)
      .map((serving) => ({
        id: serving.id,
        label: serving.label,
        grams: serving.grams,
        kind: "custom" as const,
      }));
    if (extra.length) {
      setServingOptions(foodId, extra);
    }
  } catch {
    // ignore preload failures
  }
};

export const FoodDetailSheet = ({
  open,
  onOpenChange,
  food,
  macros,
  onTrack,
  onUpdateFood,
  onUpdateMaster,
  isFavorite = false,
  onToggleFavorite,
}: FoodDetailSheetProps) => {
  const navigate = useNavigate();
  const [sparkle, setSparkle] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState("1");
  const [servingOptions, setServingOptionsState] = useState<ServingOption[]>([]);
  const [selectedServingId, setSelectedServingId] = useState<string>("grams");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [amountPulse, setAmountPulse] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  useAuth();
  const { showFoodImages } = useUserSettings();
  const isAdmin = useIsAdmin();

  useEffect(() => {
    if (!sparkle) return;
    const timer = window.setTimeout(() => setSparkle(false), 480);
    return () => window.clearTimeout(timer);
  }, [sparkle]);

  useEffect(() => {
    if (!food || !open) {
      setQuantity(1);
      setQuantityInput("1");
      setServingOptionsState([]);
      setSelectedServingId("grams");
      setImageUrl(null);
      return;
    }
    setQuantity(1);
    setQuantityInput("1");
    const options: ServingOption[] = [];
    const baseLabel = (food.portionLabel ?? food.portion)?.trim() || "Serving";
    const baseGrams = parsePortionGrams(baseLabel, food.portionGrams);
    options.push({
      id: "base",
      label: baseLabel,
      grams: baseGrams,
      kind: baseGrams ? "weight" : "serving",
    });
    options.push({ id: "grams", label: "Grams", grams: 1, kind: "weight" });
    options.push({
      id: "ounces",
      label: "Ounces",
      grams: 28.3495,
      kind: "weight",
    });
    setServingOptionsState(options);
    setSelectedServingId(options[0]?.id ?? "grams");
    setImageUrl(food.imageUrl ?? null);
    const cachedServings = getServingOptions(food.id);
    if (cachedServings.length) {
      setServingOptionsState((prev) => {
        const merged = [...prev, ...cachedServings];
        const seen = new Set<string>();
        return merged.filter((option) => {
          const key = `${option.label}:${option.grams}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
    }
    fetchFoodServings(food.id)
      .then((response) => {
        const extra = response.servings
          .filter((serving) => serving.grams > 0)
          .map((serving) => ({
            id: serving.id,
            label: serving.label,
            grams: serving.grams,
            kind: "custom" as const,
          }));
        if (extra.length) {
          setServingOptions(food.id, extra);
          setServingOptionsState((prev) => {
            const merged = [...prev, ...extra];
            const seen = new Set<string>();
            return merged.filter((option) => {
              const key = `${option.label}:${option.grams}`;
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
            });
          });
        }
      })
      .catch(() => {});
  }, [food, open]);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    scrollRef.current.scrollTop = 0;
  }, [open, food?.id]);

  useEffect(() => {
    setAmountPulse(true);
    const timer = window.setTimeout(() => setAmountPulse(false), 220);
    return () => window.clearTimeout(timer);
  }, [quantity, selectedServingId]);

  const microEntries = useMemo(() => {
    if (!food?.micronutrients) return [];
    const entries: Array<{ label: string; value: string }> = [];
    const add = (key: string, label: string, unit: string) => {
      const raw = food.micronutrients?.[key];
      if (raw === null || raw === undefined || raw === "") return;
      entries.push({ label, value: `${raw}${unit}` });
    };
    add("sodium_mg", "Sodium", "mg");
    add("fiber_g", "Fiber", "g");
    add("sugar_g", "Total sugar", "g");
    add("added_sugar_g", "Added sugar", "g");
    add("saturated_fat_g", "Sat fat", "g");
    add("trans_fat_g", "Trans fat", "g");
    add("cholesterol_mg", "Chol", "mg");
    add("potassium_mg", "Potassium", "mg");
    return entries;
  }, [food?.micronutrients]);

  const ingredientText = useMemo(() => {
    const raw = food?.micronutrients?.ingredients;
    return typeof raw === "string" ? raw : "";
  }, [food?.micronutrients]);

  const handleOpenEditPage = () => {
    if (!food) return;
    onOpenChange(false);
    navigate("/nutrition/food/edit", {
      state: { food, returnTo: "/nutrition" },
    });
  };

  const selectedServing = useMemo(
    () => servingOptions.find((option) => option.id === selectedServingId),
    [servingOptions, selectedServingId],
  );

  const parseNumber = (raw: string) => {
    const cleaned = raw.trim();
    if (!cleaned) return null;
    const parts = cleaned.split(" ");
    let total = 0;
    for (const part of parts) {
      if (!part) continue;
      if (part.includes("/")) {
        const [top, bottom] = part.split("/");
        const num = Number(top);
        const den = Number(bottom);
        if (Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
          total += num / den;
        }
        continue;
      }
      const value = Number(part);
      if (Number.isFinite(value)) {
        total += value;
      }
    }
    return Number.isFinite(total) && total > 0 ? total : null;
  };

  const unitToGrams = (unit: string) => {
    if (unit === "g") return 1;
    if (unit === "kg") return 1000;
    if (unit === "oz") return 28.3495;
    if (unit === "lb") return 453.592;
    return null;
  };

  const parsePortionGrams = (portionLabel?: string | null, portionGrams?: number | null) => {
    if (Number.isFinite(portionGrams ?? undefined) && (portionGrams ?? 0) > 0) {
      return Number(portionGrams);
    }
    if (!portionLabel) return null;
    const match = portionLabel.trim().match(/^\s*([\d./\s]+)\s*([a-zA-Z ]+)\s*$/);
    if (!match) return null;
    const amount = parseNumber(match[1]);
    const unit = normalizeUnit(match[2]);
    const gramsPerUnit = unitToGrams(unit);
    if (!amount || !gramsPerUnit) return null;
    return amount * gramsPerUnit;
  };

  const basePortionGrams = useMemo(() => {
    if (!food) return null;
    const label = (food.portionLabel ?? food.portion)?.trim();
    return parsePortionGrams(label, food.portionGrams);
  }, [food, parsePortionGrams]);

  const formatServingLabel = (quantityValue: number, label: string) => {
    if (!label) return `${quantityValue} servings`;
    const hasNumber = /^\s*[\d./]/.test(label);
    if (quantityValue !== 1 && hasNumber) {
      return `${quantityValue} Ã— ${label}`;
    }
    return `${quantityValue} ${label}`;
  };

  const scaled = useMemo(() => {
    if (!food) {
      return { kcal: 0, carbs: 0, protein: 0, fat: 0, grams: 0, multiplier: 1 };
    }
    const safeQuantity = Math.max(quantity, 0);
    const gramsPer = selectedServing?.grams ?? null;
    const hasWeight =
      selectedServing?.kind === "weight" &&
      Number.isFinite(gramsPer ?? undefined) &&
      (gramsPer ?? 0) > 0;
    const baseGrams = basePortionGrams ?? null;
    let multiplier = safeQuantity;
    let grams = 0;

    if (hasWeight && baseGrams && baseGrams > 0) {
      grams = safeQuantity * (gramsPer ?? 0);
      multiplier = grams / baseGrams;
    } else if (hasWeight) {
      grams = safeQuantity * (gramsPer ?? 0);
      multiplier = safeQuantity;
    } else if (baseGrams && baseGrams > 0) {
      grams = safeQuantity * baseGrams;
      multiplier = safeQuantity;
    }

    return {
      kcal: Math.round(food.kcal * multiplier),
      carbs: Math.round(food.macros.carbs * multiplier),
      protein: Math.round(food.macros.protein * multiplier),
      fat: Math.round(food.macros.fat * multiplier),
      grams: Math.round(grams),
      multiplier,
    };
  }, [food, quantity, selectedServing, selectedServingId, basePortionGrams]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && tracking) return;
    onOpenChange(nextOpen);
  };
  const handleTrack = async () => {
    if (!food || tracking) return;
    setSparkle(true);
    setTracking(true);
    const servingLabel = selectedServing?.label ?? food.portion;
    const baseGramsRaw = basePortionGrams ?? food.portionGrams ?? null;
    const baseGrams = Number.isFinite(Number(baseGramsRaw))
      ? Number(baseGramsRaw)
      : null;
    const quantityForLog = scaled.multiplier;
    if (!Number.isFinite(quantityForLog) || quantityForLog <= 0) {
      setTracking(false);
      return;
    }
    const baseFood = {
      ...food,
      portion: servingLabel,
      portionLabel: servingLabel,
      portionGrams: baseGrams ?? undefined,
    };
    try {
      await onTrack(baseFood, {
        quantity: quantityForLog,
        portionLabel: servingLabel,
        portionGrams: baseGrams,
      });
      onOpenChange(false);
    } finally {
      setTracking(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="relative flex max-h-[90dvh] flex-col overflow-hidden rounded-t-[36px] border-none bg-background">
        {tracking && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-card/70 text-sm font-semibold text-primary backdrop-blur">
            Logging food...
          </div>
        )}
        <DrawerHeader className="sr-only">
          <DrawerTitle>Food details</DrawerTitle>
        </DrawerHeader>
        {food && (
          <div
            ref={scrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-4"
            style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
          >
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs uppercase tracking-[0.3em] text-primary">
                Food details
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-card/80 text-secondary-foreground shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                onClick={() => handleOpenChange(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center pt-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-card bg-card text-3xl shadow-[0_14px_30px_rgba(15,23,42,0.1)]">
                {showFoodImages && imageUrl ? (
                  <FoodImage
                    src={imageUrl}
                    alt={food.name}
                    className="h-full w-full object-contain object-center"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  food.emoji
                )}
              </div>
            </div>

            <div className="mt-4 text-center">
              <div className="flex items-center justify-center gap-2">
                {food.brandLogoUrl && (
                  <img
                    src={food.brandLogoUrl}
                    alt={food.brand ?? "Brand logo"}
                    className="h-6 w-6 rounded-full object-contain object-center"
                    loading="lazy"
                    decoding="async"
                  />
                )}
                <h3 className="text-xl font-display font-semibold text-foreground">
                  {food.name}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-secondary text-primary hover:bg-primary/15"
                  onClick={() => onToggleFavorite?.(!isFavorite)}
                  aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
                >
                  <Heart className={isFavorite ? "fill-primary" : ""} />
                </Button>
                {isAdmin && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    onClick={handleOpenEditPage}
                    aria-label="Edit food"
                  >
                    <PencilLine className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {food.brand ? `${food.brand} â€¢ ` : ""}
                {formatServingLabel(
                  quantity,
                  selectedServing?.label ?? food.portion,
                )}{" "}
                â€¢ {scaled.kcal} cal
              </p>
            </div>

            <Card className="mt-6 rounded-[28px] border border-border/70 bg-gradient-to-br from-secondary via-card to-primary/10 px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <span>Meal impact</span>
                <span>{scaled.kcal} cal</span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs text-secondary-foreground">
                <div className="rounded-[16px] bg-card/90 px-3 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
                    Carbs
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {scaled.carbs}g
                  </p>
                </div>
                <div className="rounded-[16px] bg-card/90 px-3 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
                    Protein
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {scaled.protein}g
                  </p>
                </div>
                <div className="rounded-[16px] bg-card/90 px-3 py-3 text-center">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-primary">
                    Fat
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">
                    {scaled.fat}g
                  </p>
                </div>
              </div>
            </Card>

            <div className="mt-4 rounded-[24px] border border-border/60 bg-card px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-secondary-foreground">Amount</p>
                  <p className="text-xs text-muted-foreground">
                    Choose a serving size
                  </p>
                </div>
                <div className="relative">
                  {amountPulse && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-primary/30 blur-sm" />
                  )}
                  <div className="relative rounded-full bg-secondary px-3 py-2 text-sm font-semibold text-primary">
                    {scaled.grams ? `${scaled.grams} g` : "â€”"}
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-[1fr_1.2fr] gap-3">
                <Input
                  type="number"
                  min={0}
                  step={0.1}
                  inputMode="decimal"
                  value={quantityInput}
                  onChange={(event) => {
                    const raw = event.target.value;
                    setQuantityInput(raw);
                    if (raw === "") {
                      setQuantity(0);
                      return;
                    }
                    const value = Number(raw);
                    if (!Number.isFinite(value)) return;
                    setQuantity(Math.max(0, value));
                  }}
                  onBlur={() => {
                    if (quantityInput.trim() === "") {
                      setQuantity(1);
                      setQuantityInput("1");
                    }
                  }}
                  className="h-11 rounded-full text-center"
                />
                <Select
                  value={selectedServingId}
                  onValueChange={setSelectedServingId}
                >
                  <SelectTrigger className="h-11 rounded-full">
                    <SelectValue placeholder="Serving size" />
                  </SelectTrigger>
                  <SelectContent>
                    {servingOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.label}
                        {option.grams ? ` (${option.grams} g)` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Card className="mt-4 rounded-[28px] border border-border/60 bg-card px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                <span>Nutrition information</span>
                <span>{scaled.kcal} cal</span>
              </div>
              <div className="mt-4 space-y-4">
                {macros.map((macro) => (
                  <div key={macro.key} className="space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium text-secondary-foreground">
                      <span>{macro.label}</span>
                      <span className="text-primary">
                        {food.macroPercent[macro.key]}%
                      </span>
                    </div>
                    <Progress
                      value={food.macroPercent[macro.key]}
                      className="h-2 bg-primary/15"
                    />
                  </div>
                ))}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-xs text-muted-foreground">
                <div>
                  <p className="font-medium text-secondary-foreground">Carbs</p>
                  <p>{scaled.carbs} g</p>
                </div>
                <div>
                  <p className="font-medium text-secondary-foreground">Protein</p>
                  <p>{scaled.protein} g</p>
                </div>
                <div>
                  <p className="font-medium text-secondary-foreground">Fat</p>
                  <p>{scaled.fat} g</p>
                </div>
              </div>
              {microEntries.length > 0 && (
                <div className="mt-4 rounded-[18px] border border-border/70 bg-card/90 px-3 py-3 text-xs text-secondary-foreground">
                  <div className="flex flex-wrap gap-3">
                    {microEntries.map((entry) => (
                      <span key={entry.label}>
                        {entry.label} {entry.value}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {ingredientText && (
                <div className="mt-3 rounded-[18px] border border-border/70 bg-card/90 px-3 py-3 text-xs text-secondary-foreground">
                  <span className="font-semibold text-primary">Ingredients</span>
                  <p className="mt-1 text-xs text-muted-foreground">{ingredientText}</p>
                </div>
              )}
            </Card>

          </div>
        )}
        {food && (
          <div className="shrink-0 border-t border-border/60 bg-background px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
            <Button
              className="relative w-full overflow-hidden rounded-full bg-primary py-4 text-base font-semibold text-primary-foreground shadow-[0_12px_24px_rgba(15,23,42,0.25)] hover:bg-primary/90"
              onClick={handleTrack}
              disabled={tracking}
            >
              {sparkle && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="h-12 w-12 animate-ping rounded-full bg-primary/40 blur-sm" />
                </span>
              )}
              {tracking ? "Tracking..." : "Track"}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="mt-2 h-10 w-full rounded-full text-secondary-foreground hover:bg-secondary/60"
              onClick={() => handleOpenChange(false)}
            >
              Back
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};
