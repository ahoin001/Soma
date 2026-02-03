import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
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
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import type { FoodItem } from "@/data/mock";
import { fetchFoodImageSignature } from "@/lib/api";
import { useAppStore } from "@/state/AppStore";

type CreateFoodSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (payload: {
    name: string;
    brand?: string;
    portionLabel?: string;
    portionGrams?: number;
    kcal: number;
    carbs: number;
    protein: number;
    fat: number;
    micronutrients?: Record<string, unknown>;
  }) => Promise<void>;
};

type CreateFoodFormProps = {
  onCreate?: (payload: {
    name: string;
    brand?: string;
    portionLabel?: string;
    portionGrams?: number;
    kcal: number;
    carbs: number;
    protein: number;
    fat: number;
    micronutrients?: Record<string, unknown>;
  }) => Promise<FoodItem | void>;
  onComplete?: (created?: FoodItem) => void;
};

export const CreateFoodForm = ({ onCreate, onComplete }: CreateFoodFormProps) => {
  const [name, setName] = useState("");
  const [brand, setBrand] = useState("");
  const [baseServingAmount, setBaseServingAmount] = useState("1");
  const [baseServingUnit, setBaseServingUnit] = useState("serving");
  const [baseServingGrams, setBaseServingGrams] = useState("");
  const [kcal, setKcal] = useState("");
  const [carbs, setCarbs] = useState("");
  const [protein, setProtein] = useState("");
  const [fat, setFat] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [sodium, setSodium] = useState("");
  const [sugar, setSugar] = useState("");
  const [transFat, setTransFat] = useState("");
  const [fiber, setFiber] = useState("");
  const [cholesterol, setCholesterol] = useState("");
  const [satFat, setSatFat] = useState("");
  const [potassium, setPotassium] = useState("");
  const [ingredients, setIngredients] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { showFoodImages } = useAppStore();
  const draftTimerRef = useRef<number | null>(null);

  const servingUnits = {
    weight: [
      { value: "g", label: "g" },
      { value: "kg", label: "kg" },
      { value: "oz", label: "oz" },
      { value: "lb", label: "lb" },
    ],
    volume: [
      { value: "ml", label: "ml" },
      { value: "l", label: "l" },
      { value: "tsp", label: "tsp" },
      { value: "tbsp", label: "tbsp" },
      { value: "fl oz", label: "fl oz" },
      { value: "cup", label: "cup" },
      { value: "pint", label: "pint" },
      { value: "quart", label: "quart" },
      { value: "gallon", label: "gallon" },
    ],
    count: [
      { value: "bar", label: "bar" },
      { value: "bottle", label: "bottle" },
      { value: "can", label: "can" },
      { value: "packet", label: "packet" },
      { value: "piece", label: "piece" },
      { value: "scoop", label: "scoop" },
      { value: "serving", label: "serving" },
      { value: "slice", label: "slice" },
    ],
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const raw = window.localStorage.getItem("aurafit-create-food-draft-v1");
    if (!raw) return;
    try {
      const draft = JSON.parse(raw) as Partial<Record<string, string>>;
      if (draft.name) setName(draft.name);
      if (draft.brand) setBrand(draft.brand);
      if (draft.baseServingAmount) setBaseServingAmount(draft.baseServingAmount);
      if (draft.baseServingUnit) setBaseServingUnit(draft.baseServingUnit);
      if (draft.baseServingGrams) setBaseServingGrams(draft.baseServingGrams);
      if (draft.kcal) setKcal(draft.kcal);
      if (draft.carbs) setCarbs(draft.carbs);
      if (draft.protein) setProtein(draft.protein);
      if (draft.fat) setFat(draft.fat);
      if (draft.sodium) setSodium(draft.sodium);
      if (draft.sugar) setSugar(draft.sugar);
      if (draft.transFat) setTransFat(draft.transFat);
      if (draft.fiber) setFiber(draft.fiber);
      if (draft.cholesterol) setCholesterol(draft.cholesterol);
      if (draft.satFat) setSatFat(draft.satFat);
      if (draft.potassium) setPotassium(draft.potassium);
      if (draft.ingredients) setIngredients(draft.ingredients);
      if (draft.imageUrl) setImageUrl(draft.imageUrl);
    } catch {
      // ignore draft parse errors
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (draftTimerRef.current) {
      window.clearTimeout(draftTimerRef.current);
    }
    draftTimerRef.current = window.setTimeout(() => {
      const next = {
        name,
        brand,
        baseServingAmount,
        baseServingUnit,
        baseServingGrams,
        kcal,
        carbs,
        protein,
        fat,
        sodium,
        sugar,
        transFat,
        fiber,
        cholesterol,
        satFat,
        potassium,
        ingredients,
        imageUrl: imageUrl ?? "",
      };
      window.localStorage.setItem(
        "aurafit-create-food-draft-v1",
        JSON.stringify(next),
      );
    }, 300);
    return () => {
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }
    };
  }, [
    name,
    brand,
    baseServingAmount,
    baseServingUnit,
    baseServingGrams,
    kcal,
    carbs,
    protein,
    fat,
    sodium,
    sugar,
    transFat,
    fiber,
    cholesterol,
    satFat,
    potassium,
    ingredients,
    imageUrl,
  ]);

  const handleSave = async () => {
    if (!kcal.trim() || !carbs.trim() || !protein.trim() || !fat.trim()) {
      toast("Enter calories, carbs, protein, and fat");
      return;
    }
    const safeName = name.trim() || "Custom food";
    const micronutrients: Record<string, unknown> = {};
    if (sodium.trim()) micronutrients.sodium_mg = Number(sodium);
    if (sugar.trim()) micronutrients.sugar_g = Number(sugar);
    if (transFat.trim()) micronutrients.trans_fat_g = Number(transFat);
    if (fiber.trim()) micronutrients.fiber_g = Number(fiber);
    if (cholesterol.trim()) micronutrients.cholesterol_mg = Number(cholesterol);
    if (satFat.trim()) micronutrients.saturated_fat_g = Number(satFat);
    if (potassium.trim()) micronutrients.potassium_mg = Number(potassium);
    if (ingredients.trim()) micronutrients.ingredients = ingredients.trim();
    const safeAmount = baseServingAmount.trim() || "1";
    const safeUnit = baseServingUnit.trim() || "serving";
    const portionLabel = `${safeAmount} ${safeUnit}`.trim();
    const portionGrams = baseServingGrams.trim()
      ? Number(baseServingGrams)
      : undefined;
    const payload = {
      name: safeName,
      brand: brand.trim() || undefined,
      portionLabel,
      portionGrams: Number.isFinite(portionGrams ?? undefined)
        ? portionGrams
        : undefined,
      kcal: Number(kcal) || 0,
      carbs: Number(carbs) || 0,
      protein: Number(protein) || 0,
      fat: Number(fat) || 0,
      micronutrients: Object.keys(micronutrients).length
        ? micronutrients
        : undefined,
      imageUrl: imageUrl ?? undefined,
    };
    const created = onCreate ? await onCreate(payload) : undefined;
    toast("Custom food saved", {
      description: `${payload.name} is ready to log.`,
    });
    setName("");
    setBrand("");
    setBaseServingAmount("1");
    setBaseServingUnit("serving");
    setBaseServingGrams("");
    setKcal("");
    setCarbs("");
    setProtein("");
    setFat("");
    setSodium("");
    setSugar("");
    setTransFat("");
    setFiber("");
    setCholesterol("");
    setSatFat("");
    setPotassium("");
    setIngredients("");
    setImageUrl(null);
    setUploadNotice(null);
    setUploadProgress(0);
    onComplete?.(created);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("aurafit-create-food-draft-v1");
    }
  };

  return (
    <div className="px-5 pb-6 pt-2">
      <div className="text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
          <Plus className="h-6 w-6" />
        </div>
        <h3 className="mt-3 text-xl font-display font-semibold text-slate-900">
          Create custom food
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          Add a manual entry with macro details.
        </p>
      </div>

      <div className="mt-6 space-y-3 rounded-[24px] border border-black/5 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
        <Input
          value={brand}
          onChange={(event) => setBrand(event.target.value)}
          placeholder="Brand (optional)"
          className="h-11 rounded-full"
        />
        <div className="grid grid-cols-[1fr_130px] gap-2">
          <Input
            type="number"
            min={0}
            inputMode="decimal"
            value={baseServingAmount}
            onChange={(event) => setBaseServingAmount(event.target.value)}
            placeholder="Serving size"
            className="h-11 rounded-full"
          />
          <Select
            value={baseServingUnit}
            onValueChange={setBaseServingUnit}
          >
            <SelectTrigger className="h-11 rounded-full">
              <SelectValue placeholder="Unit" />
            </SelectTrigger>
            <SelectContent>
            <SelectGroup>
              <SelectLabel className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Weight
              </SelectLabel>
              {servingUnits.weight.map((unit) => (
                <SelectItem key={unit.value} value={unit.value}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Volume
              </SelectLabel>
              {servingUnits.volume.map((unit) => (
                <SelectItem key={unit.value} value={unit.value}>
                  {unit.label}
                </SelectItem>
              ))}
            </SelectGroup>
            <SelectSeparator />
            <SelectGroup>
              <SelectLabel className="text-[11px] uppercase tracking-[0.2em] text-slate-400">
                Count
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
        <div className="relative">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            value={baseServingGrams}
            onChange={(event) => setBaseServingGrams(event.target.value)}
            placeholder="Serving grams (optional)"
            className="h-11 rounded-full pr-10"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
            g
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-xl">
            {showFoodImages && imageUrl ? (
              <img
                src={imageUrl}
                alt={name || "Food"}
                className="h-full w-full object-cover object-center"
                loading="lazy"
                decoding="async"
              />
            ) : (
              "🍽️"
            )}
          </div>
          <label className="flex flex-1 cursor-pointer items-center justify-between rounded-full border border-emerald-100 bg-emerald-50/60 px-4 py-2 text-xs font-semibold text-emerald-700">
            <span>{uploading ? "Uploading..." : "Upload image"}</span>
            <span className="text-emerald-500">Browse</span>
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setUploading(true);
                setUploadNotice(null);
                setUploadProgress(0);
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
                      const data = await new Promise<{ secure_url?: string }>((resolve, reject) => {
                      const xhr = new XMLHttpRequest();
                      xhr.open(
                        "POST",
                        `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
                      );
                      xhr.upload.onprogress = (event) => {
                        if (!event.lengthComputable) return;
                        const pct = Math.round((event.loaded / event.total) * 100);
                        setUploadProgress(pct);
                      };
                      xhr.onload = () => {
                        try {
                            if (xhr.status < 200 || xhr.status >= 300) {
                              reject(new Error("Upload failed"));
                              return;
                            }
                            resolve(JSON.parse(xhr.responseText));
                        } catch {
                          reject(new Error("Upload failed"));
                        }
                      };
                      xhr.onerror = () => reject(new Error("Upload failed"));
                      xhr.send(formData);
                    });
                    if (!data.secure_url) throw new Error("Upload failed");
                    setImageUrl(data.secure_url);
                    setUploadNotice("Image added.");
                  })
                  .catch(() => {
                    setUploadNotice("Upload failed.");
                  })
                  .finally(() => setUploading(false));
              }}
            />
          </label>
        </div>
        {uploading && (
          <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100">
            <div
              className="h-full rounded-full bg-emerald-400 transition-all"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        )}
        {uploadNotice && <p className="text-xs text-emerald-600">{uploadNotice}</p>}
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Food name (optional)"
          className="rounded-full"
        />
        <Input
          value={kcal}
          onChange={(event) => setKcal(event.target.value)}
          placeholder="Calories (cal)"
          className="rounded-full"
          inputMode="numeric"
        />
        <div className="grid grid-cols-3 gap-2">
          <Input
            value={carbs}
            onChange={(event) => setCarbs(event.target.value)}
            placeholder="Carbs (g)"
            className="rounded-full"
            inputMode="numeric"
          />
          <Input
            value={protein}
            onChange={(event) => setProtein(event.target.value)}
            placeholder="Protein (g)"
            className="rounded-full"
            inputMode="numeric"
          />
          <Input
            value={fat}
            onChange={(event) => setFat(event.target.value)}
            placeholder="Fat (g)"
            className="rounded-full"
            inputMode="numeric"
          />
        </div>
      </div>

      <Collapsible
        open={advancedOpen}
        onOpenChange={setAdvancedOpen}
        className="mt-4"
      >
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full rounded-full border border-emerald-100 bg-white px-4 py-2 text-left text-sm font-semibold text-emerald-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
          >
            Advanced nutrition (optional)
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-3 space-y-3 rounded-[24px] border border-black/5 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
          <div className="grid grid-cols-2 gap-2">
            <div className="relative">
              <Input
                value={sodium}
                onChange={(event) => setSodium(event.target.value)}
                placeholder="Sodium"
                className="rounded-full pr-10"
                inputMode="numeric"
                type="number"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                mg
              </span>
            </div>
            <div className="relative">
              <Input
                value={potassium}
                onChange={(event) => setPotassium(event.target.value)}
                placeholder="Potassium"
                className="rounded-full pr-10"
                inputMode="numeric"
                type="number"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                mg
              </span>
            </div>
            <div className="relative">
              <Input
                value={fiber}
                onChange={(event) => setFiber(event.target.value)}
                placeholder="Fiber"
                className="rounded-full pr-8"
                inputMode="numeric"
                type="number"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                g
              </span>
            </div>
            <div className="relative">
              <Input
                value={satFat}
                onChange={(event) => setSatFat(event.target.value)}
                placeholder="Saturated fat"
                className="rounded-full pr-8"
                inputMode="numeric"
                type="number"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                g
              </span>
            </div>
            <div className="relative">
              <Input
                value={sugar}
                onChange={(event) => setSugar(event.target.value)}
                placeholder="Sugar"
                className="rounded-full pr-8"
                inputMode="numeric"
                type="number"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                g
              </span>
            </div>
            <div className="relative">
              <Input
                value={transFat}
                onChange={(event) => setTransFat(event.target.value)}
                placeholder="Trans fat"
                className="rounded-full pr-8"
                inputMode="numeric"
                type="number"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                g
              </span>
            </div>
            <div className="relative">
              <Input
                value={cholesterol}
                onChange={(event) => setCholesterol(event.target.value)}
                placeholder="Cholesterol"
                className="rounded-full pr-10"
                inputMode="numeric"
                type="number"
              />
              <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                mg
              </span>
            </div>
          </div>
          <Textarea
            value={ingredients}
            onChange={(event) => setIngredients(event.target.value)}
            placeholder="Ingredients (optional)"
            className="min-h-[96px] rounded-[18px]"
          />
        </CollapsibleContent>
      </Collapsible>

      <Button
        className="mt-6 w-full rounded-full bg-aura-primary py-6 text-base font-semibold text-white shadow-[0_16px_30px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90"
        onClick={handleSave}
      >
        Save food
      </Button>
    </div>
  );
};

export const CreateFoodSheet = ({
  open,
  onOpenChange,
  onCreate,
}: CreateFoodSheetProps) => (
  <Drawer open={open} onOpenChange={onOpenChange}>
    <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <CreateFoodForm onCreate={onCreate} onComplete={() => onOpenChange(false)} />
    </DrawerContent>
  </Drawer>
);
