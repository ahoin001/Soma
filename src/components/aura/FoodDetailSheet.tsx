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
import type { BrandRecord } from "@/types/api";
import { useEffect, useMemo, useRef, useState } from "react";
import { Heart, PencilLine, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  createBrand,
  fetchFoodImageSignature,
  fetchBrandLogoSignature,
  fetchBrands,
  createFoodServing,
  fetchFoodServings,
} from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/state/AppStore";
import { useUserSettings } from "@/state";
import { servingUnits } from "@/lib/schemas/food";

type FoodDetailSheetProps = {
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
  onUpdateFood: (food: FoodItem, next: NutritionDraft) => void;
  onUpdateMaster?: (
    food: FoodItem,
    next: NutritionDraft,
    micros: Record<string, number | string>,
  ) => Promise<void>;
  isFavorite?: boolean;
  onToggleFavorite?: (favorite: boolean) => void;
};

type NutritionDraft = {
  name: string;
  brand: string;
  brandId: string | null;
  portion: string;
  portionGrams: number | null;
  kcal: number | "";
  carbs: number | "";
  protein: number | "";
  fat: number | "";
  sodiumMg: number | null;
  fiberG: number | null;
  sugarG: number | null;
  saturatedFatG: number | null;
  transFatG: number | null;
  cholesterolMg: number | null;
  potassiumMg: number | null;
  ingredients: string;
};

type ServingOption = {
  id: string;
  label: string;
  grams?: number | null;
  kind: "serving" | "weight" | "custom";
};

const servingCache = new Map<string, ServingOption[]>();
const servingCacheKey = "aurafit-serving-cache-v1";
const isBrowser = typeof window !== "undefined";

const loadServingCache = () => {
  if (!isBrowser) return;
  try {
    const raw = window.localStorage.getItem(servingCacheKey);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Record<string, ServingOption[]>;
    Object.entries(parsed).forEach(([foodId, options]) => {
      if (Array.isArray(options)) {
        servingCache.set(foodId, options);
      }
    });
  } catch {
    // ignore cache errors
  }
};

const persistServingCache = () => {
  if (!isBrowser) return;
  try {
    const payload = Object.fromEntries(servingCache.entries());
    window.localStorage.setItem(servingCacheKey, JSON.stringify(payload));
  } catch {
    // ignore cache errors
  }
};

loadServingCache();

export const preloadFoodDetail = async (foodId: string) => {
  if (!foodId) return;
  if (servingCache.has(foodId)) return;
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
      servingCache.set(foodId, extra);
      persistServingCache();
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
  const [editing, setEditing] = useState(false);
  const [adminEditing, setAdminEditing] = useState(false);
  const [draft, setDraft] = useState<NutritionDraft | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [quantityInput, setQuantityInput] = useState("1");
  const [servingOptions, setServingOptions] = useState<ServingOption[]>([]);
  const [selectedServingId, setSelectedServingId] = useState<string>("grams");
  const [baseServingAmount, setBaseServingAmount] = useState("1");
  const [baseServingUnit, setBaseServingUnit] = useState("serving");
  const [newServingAmount, setNewServingAmount] = useState("");
  const [newServingUnit, setNewServingUnit] = useState("serving");
  const [newServingGrams, setNewServingGrams] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [amountPulse, setAmountPulse] = useState(false);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [brandQuery, setBrandQuery] = useState("");
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandCreateOpen, setBrandCreateOpen] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandWebsite, setBrandWebsite] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandUploading, setBrandUploading] = useState(false);
  const [brandUploadProgress, setBrandUploadProgress] = useState(0);
  const [brandNotice, setBrandNotice] = useState<string | null>(null);
  const [savingMaster, setSavingMaster] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const editSectionRef = useRef<HTMLDivElement | null>(null);
  const { email } = useAuth();
  const { foodCatalog } = useAppStore();
  const { showFoodImages } = useUserSettings();
  const { updateFoodImage } = foodCatalog;
  const isAdmin = email?.toLowerCase() === "ahoin001@gmail.com";

  useEffect(() => {
    if (!sparkle) return;
    const timer = window.setTimeout(() => setSparkle(false), 480);
    return () => window.clearTimeout(timer);
  }, [sparkle]);

  useEffect(() => {
    if (!food || !open) {
      setEditing(false);
      setAdminEditing(false);
      setDraft(null);
      setQuantity(1);
      setQuantityInput("1");
      setServingOptions([]);
      setSelectedServingId("grams");
      setBaseServingAmount("1");
      setBaseServingUnit("serving");
      setNewServingAmount("");
      setNewServingUnit("serving");
      setNewServingGrams("");
      setImageUrl(null);
      setUploadNotice(null);
      setBrandLogoUrl(null);
      setBrandCreateOpen(false);
      setBrandName("");
      setBrandWebsite("");
      setBrandNotice(null);
      return;
    }
    const micros = food.micronutrients ?? {};
    // Debug: Log micronutrients data
    console.log("[FoodDetailSheet] Food micronutrients:", {
      foodId: food.id,
      foodName: food.name,
      rawMicronutrients: food.micronutrients,
      parsedMicros: micros,
    });
    const readMicro = (key: string) => {
      const value = micros[key];
      if (typeof value === "number") return value;
      if (typeof value === "string" && value.trim().length > 0) {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
      }
      return null;
    };
    const readText = (key: string) => {
      const value = micros[key];
      return typeof value === "string" ? value : "";
    };
    setDraft({
      name: food.name,
      brand: food.brand ?? "",
      brandId: food.brandId ?? null,
      portion: food.portionLabel ?? food.portion,
      portionGrams: food.portionGrams ?? null,
      kcal: food.kcal,
      carbs: food.macros.carbs,
      protein: food.macros.protein,
      fat: food.macros.fat,
      sodiumMg: readMicro("sodium_mg"),
      fiberG: readMicro("fiber_g"),
      sugarG: readMicro("sugar_g"),
      saturatedFatG: readMicro("saturated_fat_g"),
      transFatG: readMicro("trans_fat_g"),
      cholesterolMg: readMicro("cholesterol_mg"),
      potassiumMg: readMicro("potassium_mg"),
      ingredients: readText("ingredients"),
    });
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
    setServingOptions(options);
    setSelectedServingId(options[0]?.id ?? "grams");
    setImageUrl(food.imageUrl ?? null);
    setBrandLogoUrl(food.brandLogoUrl ?? null);
    setBrandCreateOpen(false);
    setBrandName("");
    setBrandWebsite("");
    setBrandNotice(null);
    if (food.portionLabel ?? food.portion) {
      const portionText = (food.portionLabel ?? food.portion).trim();
      const match = portionText.match(/^\s*([\d./]+)\s*(.+)$/);
      if (match) {
        setBaseServingAmount(match[1]);
        setBaseServingUnit(normalizeUnit(match[2]));
      } else {
        setBaseServingAmount("1");
        setBaseServingUnit("serving");
      }
    }
    setUploadNotice(null);
    const cachedServings = servingCache.get(food.id);
    if (cachedServings?.length) {
      setServingOptions((prev) => {
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
          servingCache.set(food.id, extra);
          persistServingCache();
          setServingOptions((prev) => {
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
    if (!adminEditing) return;
    const query = brandQuery.trim();
    setBrandLoading(true);
    const timer = window.setTimeout(() => {
      fetchBrands(query, true, 100)
        .then((response) => setBrands(response.items))
        .catch(() => setBrands([]))
        .finally(() => setBrandLoading(false));
    }, query ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [adminEditing, brandQuery]);

  useEffect(() => {
    if (!editing && !adminEditing) return;
    const timer = window.setTimeout(() => {
      editSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [editing, adminEditing]);

  useEffect(() => {
    setAmountPulse(true);
    const timer = window.setTimeout(() => setAmountPulse(false), 220);
    return () => window.clearTimeout(timer);
  }, [quantity, selectedServingId]);

  const canSave = useMemo(() => {
    if (!draft) return false;
    return (
      [draft.kcal, draft.carbs, draft.protein, draft.fat].every(
        (value) => typeof value === "number" && Number.isFinite(value) && value >= 0,
      )
    );
  }, [draft]);

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
    add("sugar_g", "Sugar", "g");
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

  const handleDraftChange = (key: keyof NutritionDraft, value: string) => {
    if (!draft) return;
    if (key === "portion") {
      setDraft({ ...draft, portion: value });
      return;
    }
    if (key === "name") {
      setDraft({ ...draft, name: value });
      return;
    }
    if (key === "brand") {
      setDraft({ ...draft, brand: value });
      return;
    }
    if (key === "ingredients") {
      setDraft({ ...draft, ingredients: value });
      return;
    }
    const numeric = value.trim() === "" ? null : Number(value);
    if (key === "kcal" || key === "carbs" || key === "protein" || key === "fat") {
      setDraft({
        ...draft,
        [key]: Number.isFinite(numeric as number) ? (numeric as number) : "",
      });
      return;
    }
    setDraft({
      ...draft,
      [key]: Number.isFinite(numeric as number) ? (numeric as number) : null,
    });
  };

  const selectedServing = useMemo(
    () => servingOptions.find((option) => option.id === selectedServingId),
    [servingOptions, selectedServingId],
  );

  const customServings = useMemo(
    () => servingOptions.filter((option) => option.kind === "custom"),
    [servingOptions],
  );

  const normalizeUnit = (raw: string) => {
    const unit = raw.trim().toLowerCase();
    if (!unit) return "serving";
    if (unit.startsWith("g") || unit.includes("gram")) return "g";
    if (unit.includes("kg") || unit.includes("kilogram")) return "kg";
    if (unit.includes("ml") || unit.includes("milliliter")) return "ml";
    if (unit === "l" || unit.includes("liter")) return "l";
    if (unit.includes("fl oz") || unit.includes("fluid ounce")) return "fl oz";
    if (unit.includes("cup")) return "cup";
    if (unit.includes("pint")) return "pint";
    if (unit.includes("quart")) return "quart";
    if (unit.includes("gallon")) return "gallon";
    if (unit.includes("tbsp") || unit.includes("tablespoon")) return "tbsp";
    if (unit.includes("tsp") || unit.includes("teaspoon")) return "tsp";
    if (unit.includes("oz") || unit.includes("ounce")) return "oz";
    if (unit.includes("lb") || unit.includes("pound")) return "lb";
    if (unit.includes("slice")) return "slice";
    if (unit.includes("piece") || unit.includes("pc")) return "piece";
    if (unit.includes("packet") || unit.includes("pack")) return "packet";
    if (unit.includes("can")) return "can";
    if (unit.includes("bottle")) return "bottle";
    if (unit.includes("bar")) return "bar";
    if (unit.includes("serving")) return "serving";
    return "serving";
  };

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
      return `${quantityValue} × ${label}`;
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
    if (!nextOpen) {
      setEditing(false);
      setAdminEditing(false);
    }
    onOpenChange(nextOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="relative rounded-t-[36px] border-none bg-aura-surface pb-6 overflow-hidden">
        {tracking && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 text-sm font-semibold text-emerald-700 backdrop-blur">
            Logging food...
          </div>
        )}
        <DrawerHeader className="sr-only">
          <DrawerTitle>Food details</DrawerTitle>
        </DrawerHeader>
        {food && (
          <div
            ref={scrollRef}
            className="aura-sheet-scroll"
          >
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs uppercase tracking-[0.3em] text-emerald-400">
                Food details
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full bg-white/80 text-slate-600 shadow-[0_8px_20px_rgba(15,23,42,0.08)]"
                onClick={() => handleOpenChange(false)}
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="flex items-center justify-center pt-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white text-3xl shadow-[0_14px_30px_rgba(15,23,42,0.1)]">
                {showFoodImages && imageUrl ? (
                  <img
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
                <h3 className="text-xl font-display font-semibold text-slate-900">
                  {food.name}
                </h3>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  onClick={() => onToggleFavorite?.(!isFavorite)}
                  aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
                >
                  <Heart className={isFavorite ? "fill-emerald-500" : ""} />
                </Button>
                {isAdmin && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 rounded-full ${
                      adminEditing
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                    onClick={() => {
                      setAdminEditing((prev) => !prev);
                      setEditing(false);
                    }}
                    aria-label="Edit master nutrition"
                  >
                    <PencilLine className="h-4 w-4" />
                  </Button>
                )}
              </div>
              <p className="text-sm text-slate-500">
                {food.brand ? `${food.brand} • ` : ""}
                {formatServingLabel(
                  quantity,
                  selectedServing?.label ?? food.portion,
                )}{" "}
                • {scaled.kcal} cal
              </p>
            </div>

            {isAdmin && adminEditing && (
              <div className="mt-4 rounded-[20px] border border-emerald-100 bg-white px-4 py-3 text-left shadow-[0_12px_28px_rgba(16,185,129,0.12)]">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
                  Food image
                </p>
                <div className="mt-3 flex items-center gap-4">
                  {/* Image preview */}
                  <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-[12px] border border-emerald-100 bg-emerald-50/40">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={food?.name ?? "Food image"}
                        className="h-full w-full object-contain"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center border-dashed">
                        <span className="text-2xl">🍽️</span>
                      </div>
                    )}
                  </div>
                  {/* Upload button */}
                  <div className="flex-1">
                    <label className="flex cursor-pointer items-center justify-between rounded-full border border-emerald-100 bg-emerald-50/60 px-4 py-2 text-xs font-semibold text-emerald-700">
                      <span>{uploading ? "Uploading..." : imageUrl ? "Change image" : "Upload image"}</span>
                      <span className="text-emerald-500">Browse</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file || !food) return;
                          setUploading(true);
                          setUploadNotice(null);
                          fetchFoodImageSignature()
                            .then(async (signature) => {
                              const formData = new FormData();
                              formData.append("file", file);
                              formData.append("api_key", signature.apiKey);
                              formData.append("timestamp", String(signature.timestamp));
                              formData.append("signature", signature.signature);
                              if (signature.uploadPreset) {
                                formData.append("upload_preset", signature.uploadPreset);
                              }
                              const response = await fetch(
                                `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
                                {
                                  method: "POST",
                                  body: formData,
                                },
                              );
                              if (!response.ok) {
                                throw new Error("Upload failed");
                              }
                              const data = await response.json();
                              if (!data.secure_url) {
                                throw new Error("Upload failed");
                              }
                              await updateFoodImage(food.id, data.secure_url);
                              setImageUrl(data.secure_url);
                              setUploadNotice("Image updated.");
                            })
                            .catch(() => {
                              setUploadNotice("Upload failed.");
                            })
                            .finally(() => setUploading(false));
                        }}
                      />
                    </label>
                    {uploadNotice && (
                      <p className="mt-1 text-[11px] text-emerald-600">{uploadNotice}</p>
                    )}
                    {!imageUrl && (
                      <p className="mt-1 text-[10px] text-slate-400">No image set</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <Card className="mt-6 rounded-[28px] border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-emerald-100/60 px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                <span>Meal impact</span>
                <span>{scaled.kcal} cal</span>
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
                    Choose a serving size
                  </p>
                </div>
                <div className="relative">
                  {amountPulse && (
                    <span className="absolute inset-0 rounded-full bg-emerald-200/60 blur-sm animate-ping" />
                  )}
                  <div className="relative rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
                    {scaled.grams ? `${scaled.grams} g` : "—"}
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

            <Card className="mt-4 rounded-[28px] border border-black/5 bg-white px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                <span>Nutrition information</span>
                <span>{scaled.kcal} cal</span>
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
                  <p>{scaled.carbs} g</p>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Protein</p>
                  <p>{scaled.protein} g</p>
                </div>
                <div>
                  <p className="font-medium text-slate-700">Fat</p>
                  <p>{scaled.fat} g</p>
                </div>
              </div>
              {microEntries.length > 0 && (
                <div className="mt-4 rounded-[18px] border border-emerald-100 bg-white/90 px-3 py-3 text-xs text-emerald-700/80">
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
                <div className="mt-3 rounded-[18px] border border-emerald-100 bg-white/90 px-3 py-3 text-xs text-emerald-700/80">
                  <span className="font-semibold text-emerald-500">Ingredients</span>
                  <p className="mt-1 text-xs text-emerald-700/70">{ingredientText}</p>
                </div>
              )}
            </Card>

            <Card className="mt-4 rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
                    Editor
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    Open full editor
                  </p>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  className="h-9 rounded-full px-4 text-xs font-semibold"
                  onClick={() => {
                    handleOpenChange(false);
                    navigate("/nutrition/food/edit", {
                      state: { food, returnTo: "/nutrition" },
                    });
                  }}
                >
                  Open
                </Button>
              </div>
            </Card>

            <div
              ref={editSectionRef}
              className="mt-4 rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-slate-700">
                  {adminEditing ? "Edit master nutrition" : "Adjust nutrition facts"}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8 rounded-full px-3 text-xs font-semibold"
                  onClick={() => {
                    if (adminEditing) {
                      setAdminEditing(false);
                      setEditing(false);
                      return;
                    }
                    setEditing((prev) => !prev);
                  }}
                >
                  {adminEditing || editing ? "Cancel" : "Edit"}
                </Button>
              </div>
              {adminEditing && (
                <div className="mt-4">
                  <p className="text-xs text-slate-500">
                    Use the full editor to update master nutrition data.
                  </p>
                  <Button
                    type="button"
                    variant="secondary"
                    className="mt-3 h-9 rounded-full px-4 text-xs font-semibold"
                    onClick={() => {
                      handleOpenChange(false);
                      navigate("/nutrition/food/edit", {
                        state: { food, returnTo: "/nutrition" },
                      });
                    }}
                  >
                    Edit in full page
                  </Button>
                </div>
              )}
              {!adminEditing && editing && draft && (
                <div className="mt-4 space-y-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                      Base serving size
                    </p>
                    <div className="mt-1 grid grid-cols-[1fr_130px] gap-2">
                      <Input
                        type="number"
                        min={0}
                        inputMode="decimal"
                        value={baseServingAmount}
                        onChange={(event) => {
                          const next = event.target.value;
                          setBaseServingAmount(next);
                          const unit = baseServingUnit.trim();
                          const amount = next.trim();
                          handleDraftChange(
                            "portion",
                            amount ? `${amount} ${unit}` : unit,
                          );
                        }}
                        className="h-10 rounded-full"
                      />
                      <Select
                        value={baseServingUnit}
                        onValueChange={(value) => {
                          setBaseServingUnit(value);
                          const amount = baseServingAmount.trim();
                          handleDraftChange(
                            "portion",
                            amount ? `${amount} ${value}` : value,
                          );
                        }}
                      >
                        <SelectTrigger className="h-10 rounded-full">
                          <SelectValue placeholder="Unit" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectGroup>
                            <SelectLabel>
                              <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
                                Weight
                              </span>
                            </SelectLabel>
                            {servingUnits.weight.map((unit) => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel>
                              <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-600">
                                Volume
                              </span>
                            </SelectLabel>
                            {servingUnits.volume.map((unit) => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                          <SelectSeparator />
                          <SelectGroup>
                            <SelectLabel>
                              <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600">
                                Count
                              </span>
                            </SelectLabel>
                            {servingUnits.count.map((unit) => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {adminEditing && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Base serving size
                      </p>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={draft.portionGrams ?? ""}
                          onChange={(event) =>
                            handleDraftChange("portionGrams", event.target.value)
                          }
                          className="h-10 rounded-full pr-8"
                        />
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                          g
                        </span>
                      </div>
                    </div>
                  )}
                  {adminEditing && (
                    <div className="rounded-[18px] border border-emerald-100 bg-emerald-50/60 px-3 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
                        Additional serving sizes
                      </p>
                      {customServings.length > 0 ? (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs text-emerald-700">
                          {customServings.map((serving) => (
                            <span
                              key={serving.id}
                              className="rounded-full bg-white px-3 py-1 shadow-sm"
                            >
                              {serving.label} ({serving.grams} g)
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-xs text-emerald-700/70">
                          Add a cup/handful/serving option to mirror labels.
                        </p>
                      )}
                      <div className="mt-3 grid grid-cols-[1fr_130px_110px_88px] gap-2">
                        <Input
                          type="number"
                          min={0}
                          inputMode="decimal"
                          value={newServingAmount}
                          onChange={(event) => setNewServingAmount(event.target.value)}
                          placeholder="Amount"
                          className="h-9 rounded-full"
                        />
                        <Select
                          value={newServingUnit}
                          onValueChange={setNewServingUnit}
                        >
                          <SelectTrigger className="h-9 rounded-full">
                            <SelectValue placeholder="Unit" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectGroup>
                              <SelectLabel>
                                <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
                                  Weight
                                </span>
                              </SelectLabel>
                              {servingUnits.weight.map((unit) => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                            <SelectSeparator />
                            <SelectGroup>
                              <SelectLabel>
                                <span className="inline-flex items-center rounded-full bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-sky-600">
                                  Volume
                                </span>
                              </SelectLabel>
                              {servingUnits.volume.map((unit) => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                            <SelectSeparator />
                            <SelectGroup>
                              <SelectLabel>
                                <span className="inline-flex items-center rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-violet-600">
                                  Count
                                </span>
                              </SelectLabel>
                              {servingUnits.count.map((unit) => (
                                <SelectItem key={unit.value} value={unit.value}>
                                  {unit.label}
                                </SelectItem>
                              ))}
                            </SelectGroup>
                          </SelectContent>
                        </Select>
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={newServingGrams}
                          onChange={(event) => setNewServingGrams(event.target.value)}
                          placeholder="Grams"
                          className="h-9 rounded-full"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="h-9 rounded-full"
                          onClick={async () => {
                            if (!food) return;
                            const grams = Number(newServingGrams);
                            const amount = newServingAmount.trim();
                            const label = `${amount} ${newServingUnit}`.trim();
                            if (!amount || !Number.isFinite(grams) || grams <= 0) return;
                            const response = await createFoodServing(food.id, {
                              label,
                              grams,
                            });
                            setServingOptions((prev) => [
                              ...prev,
                              {
                                id: response.serving.id,
                                label: response.serving.label,
                                grams: response.serving.grams,
                                kind: "custom",
                              },
                            ]);
                            setNewServingAmount("");
                            setNewServingGrams("");
                          }}
                        >
                          Add
                        </Button>
                      </div>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Calories
                      </p>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={draft.kcal}
                          onChange={(event) =>
                            handleDraftChange("kcal", event.target.value)
                          }
                          className="h-10 rounded-full pr-12"
                        />
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                          cal
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Carbs
                      </p>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={draft.carbs}
                          onChange={(event) =>
                            handleDraftChange("carbs", event.target.value)
                          }
                          className="h-10 rounded-full pr-8"
                        />
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                          g
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Protein
                      </p>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={draft.protein}
                          onChange={(event) =>
                            handleDraftChange("protein", event.target.value)
                          }
                          className="h-10 rounded-full pr-8"
                        />
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                          g
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Fat
                      </p>
                      <div className="relative mt-1">
                        <Input
                          type="number"
                          min={0}
                          inputMode="numeric"
                          value={draft.fat}
                          onChange={(event) =>
                            handleDraftChange("fat", event.target.value)
                          }
                          className="h-10 rounded-full pr-8"
                        />
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                          g
                        </span>
                      </div>
                    </div>
                  </div>
                  {adminEditing && (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                        Advanced nutrition
                      </p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Sodium
                          </p>
                          <div className="relative mt-1">
                            <Input
                              type="number"
                              min={0}
                              value={draft.sodiumMg ?? ""}
                              onChange={(event) =>
                                handleDraftChange("sodiumMg", event.target.value)
                              }
                              className="h-10 rounded-full pr-10"
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                              mg
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Fiber
                          </p>
                          <div className="relative mt-1">
                            <Input
                              type="number"
                              min={0}
                              value={draft.fiberG ?? ""}
                              onChange={(event) =>
                                handleDraftChange("fiberG", event.target.value)
                              }
                              className="h-10 rounded-full pr-8"
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                              g
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Sugar
                          </p>
                          <div className="relative mt-1">
                            <Input
                              type="number"
                              min={0}
                              value={draft.sugarG ?? ""}
                              onChange={(event) =>
                                handleDraftChange("sugarG", event.target.value)
                              }
                              className="h-10 rounded-full pr-8"
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                              g
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Saturated fat
                          </p>
                          <div className="relative mt-1">
                            <Input
                              type="number"
                              min={0}
                              value={draft.saturatedFatG ?? ""}
                              onChange={(event) =>
                                handleDraftChange("saturatedFatG", event.target.value)
                              }
                              className="h-10 rounded-full pr-8"
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                              g
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Trans fat
                          </p>
                          <div className="relative mt-1">
                            <Input
                              type="number"
                              min={0}
                              value={draft.transFatG ?? ""}
                              onChange={(event) =>
                                handleDraftChange("transFatG", event.target.value)
                              }
                              className="h-10 rounded-full pr-8"
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                              g
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Cholesterol
                          </p>
                          <div className="relative mt-1">
                            <Input
                              type="number"
                              min={0}
                              value={draft.cholesterolMg ?? ""}
                              onChange={(event) =>
                                handleDraftChange("cholesterolMg", event.target.value)
                              }
                              className="h-10 rounded-full pr-10"
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                              mg
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            Potassium
                          </p>
                          <div className="relative mt-1">
                            <Input
                              type="number"
                              min={0}
                              value={draft.potassiumMg ?? ""}
                              onChange={(event) =>
                                handleDraftChange("potassiumMg", event.target.value)
                              }
                              className="h-10 rounded-full pr-10"
                            />
                            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-slate-400">
                              mg
                            </span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                          Ingredients
                        </p>
                        <Textarea
                          value={draft.ingredients}
                          onChange={(event) =>
                            handleDraftChange("ingredients", event.target.value)
                          }
                          className="mt-1 min-h-[90px] rounded-[18px]"
                        />
                      </div>
                    </div>
                  )}
                  <Button
                    type="button"
                    className="w-full rounded-full bg-aura-primary py-5 text-sm font-semibold text-white"
                    onClick={async () => {
                      if (!draft || !canSave) return;
                      const safeDraft = {
                        ...draft,
                        kcal: typeof draft.kcal === "number" ? draft.kcal : 0,
                        carbs: typeof draft.carbs === "number" ? draft.carbs : 0,
                        protein: typeof draft.protein === "number" ? draft.protein : 0,
                        fat: typeof draft.fat === "number" ? draft.fat : 0,
                      };
                      if (adminEditing && isAdmin && onUpdateMaster) {
                        setSavingMaster(true);
                        const nextMicros = { ...(food.micronutrients ?? {}) } as Record<
                          string,
                          number | string
                        >;
                        const setOrDelete = (
                          key: string,
                          value: number | string | null,
                        ) => {
                          if (value === null || value === "") {
                            delete nextMicros[key];
                          } else {
                            nextMicros[key] = value;
                          }
                        };
                        setOrDelete("sodium_mg", draft.sodiumMg);
                        setOrDelete("fiber_g", draft.fiberG);
                        setOrDelete("sugar_g", draft.sugarG);
                        setOrDelete("saturated_fat_g", draft.saturatedFatG);
                        setOrDelete("trans_fat_g", draft.transFatG);
                        setOrDelete("cholesterol_mg", draft.cholesterolMg);
                        setOrDelete("potassium_mg", draft.potassiumMg);
                        setOrDelete("ingredients", draft.ingredients.trim() || null);
                        try {
                          await onUpdateMaster(
                            food,
                            {
                              ...safeDraft,
                              brandId: safeDraft.brandId,
                            },
                            nextMicros,
                          );
                          toast("Saved to database", {
                            description: "Food details updated successfully.",
                          });
                          setAdminEditing(false);
                          setEditing(false);
                          onOpenChange(false);
                        } catch (error) {
                          const detail =
                            error instanceof Error
                              ? error.message
                              : "Unable to save changes.";
                          toast("Save failed", { description: detail });
                        } finally {
                          setSavingMaster(false);
                        }
                      } else {
                        onUpdateFood(food, safeDraft);
                        setEditing(false);
                      }
                    }}
                    disabled={!canSave}
                  >
                    {adminEditing
                      ? savingMaster
                        ? "Saving..."
                        : "Save Changes"
                      : "Save nutrition"}
                  </Button>
                </div>
              )}
            </div>

            <Button
              className="relative mt-6 w-full overflow-hidden rounded-full bg-aura-primary py-6 text-base font-semibold text-white shadow-[0_16px_30px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90"
              onClick={async () => {
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
              }}
              disabled={tracking}
            >
              {sparkle && (
                <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                  <span className="h-16 w-16 rounded-full bg-white/50 blur-sm animate-ping" />
                </span>
              )}
              {tracking ? "Tracking..." : "Track"}
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};
