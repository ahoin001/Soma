import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { FoodItem } from "@/data/mock";
import { AppShell } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Switch } from "@/components/ui/switch";
import { useAppStore } from "@/state/AppStore";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import {
  createBrand,
  createFoodServing,
  fetchBrandLogoSignature,
  fetchBrands,
  fetchFoodImageSignature,
  fetchFoodServings,
  updateBrand,
  updateFoodImage,
} from "@/lib/api";
import type { BrandRecord } from "@/types/api";

type NutritionDraft = {
  name: string;
  brand: string;
  brandId?: string | null;
  portion: string;
  portionGrams: number | null;
  kcal: number;
  carbs: number;
  protein: number;
  fat: number;
  sodiumMg: number | null;
  fiberG: number | null;
  sugarG: number | null;
  saturatedFatG: number | null;
  transFatG: number | null;
  cholesterolMg: number | null;
  potassiumMg: number | null;
  ingredients: string;
};

type LocationState = {
  food?: FoodItem;
  returnTo?: string;
};

type ServingOption = {
  id: string;
  label: string;
  grams: number;
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

const EditFood = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { foodCatalog } = useAppStore();
  const { email } = useAuth();
  const isAdmin = email?.toLowerCase() === "ahoin001@gmail.com";
  const { upsertOverride, updateFoodMaster } = foodCatalog;
  const state = (location.state ?? {}) as LocationState;
  const returnTo = state.returnTo ?? "/nutrition";
  const [currentFood, setCurrentFood] = useState<FoodItem | null>(
    state.food ?? null,
  );
  const [draft, setDraft] = useState<NutritionDraft | null>(null);
  const [baseServingAmount, setBaseServingAmount] = useState("1");
  const [baseServingUnit, setBaseServingUnit] = useState("serving");
  const [newServingAmount, setNewServingAmount] = useState("");
  const [newServingUnit, setNewServingUnit] = useState("serving");
  const [newServingGrams, setNewServingGrams] = useState("");
  const [customServings, setCustomServings] = useState<ServingOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
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
  const [brandEditNotice, setBrandEditNotice] = useState<string | null>(null);
  const [adminEditing, setAdminEditing] = useState(isAdmin);

  useEffect(() => {
    if (!currentFood) return;
    const micros = currentFood.micronutrients ?? {};
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
      name: currentFood.name,
      brand: currentFood.brand ?? "",
      brandId: currentFood.brandId ?? null,
      portion: currentFood.portionLabel ?? currentFood.portion,
      portionGrams: currentFood.portionGrams ?? null,
      kcal: currentFood.kcal,
      carbs: currentFood.macros.carbs,
      protein: currentFood.macros.protein,
      fat: currentFood.macros.fat,
      sodiumMg: readMicro("sodium_mg"),
      fiberG: readMicro("fiber_g"),
      sugarG: readMicro("sugar_g"),
      saturatedFatG: readMicro("saturated_fat_g"),
      transFatG: readMicro("trans_fat_g"),
      cholesterolMg: readMicro("cholesterol_mg"),
      potassiumMg: readMicro("potassium_mg"),
      ingredients: readText("ingredients"),
    });
    if (currentFood.portionLabel ?? currentFood.portion) {
      const portionText = (currentFood.portionLabel ?? currentFood.portion).trim();
      const match = portionText.match(/^\s*([\d./]+)\s*(.+)$/);
      if (match) {
        setBaseServingAmount(match[1]);
        setBaseServingUnit(normalizeUnit(match[2]));
      } else {
        setBaseServingAmount("1");
        setBaseServingUnit("serving");
      }
    }
  }, [currentFood]);

  useEffect(() => {
    if (!adminEditing) return;
    const query = brandQuery.trim();
    const timer = window.setTimeout(() => {
      setBrandLoading(true);
      fetchBrands(query, true, 100)
        .then((response) => setBrands(response.items))
        .finally(() => setBrandLoading(false));
    }, query ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [adminEditing, brandQuery]);

  useEffect(() => {
    if (!adminEditing || !draft?.brandId) return;
    const match = brands.find((brand) => brand.id === draft.brandId);
    if (!match) return;
    setBrandName(match.name ?? "");
    setBrandWebsite(match.website_url ?? "");
    setBrandLogoUrl(match.logo_url ?? null);
  }, [adminEditing, brands, draft?.brandId]);

  useEffect(() => {
    if (!currentFood) return;
    const cached = servingCache.get(currentFood.id);
    if (cached?.length) {
      setCustomServings(cached);
    }
    fetchFoodServings(currentFood.id)
      .then((response) => {
        const extra = response.servings
          .filter((serving) => serving.grams > 0)
          .map((serving) => ({
            id: serving.id,
            label: serving.label,
            grams: serving.grams,
          }));
        setCustomServings(extra);
        if (extra.length) {
          servingCache.set(currentFood.id, extra);
          persistServingCache();
        }
      })
      .catch(() => {});
  }, [currentFood?.id]);

  const canSave = useMemo(() => {
    if (!draft) return false;
    return (
      [draft.kcal, draft.carbs, draft.protein, draft.fat].every(
        (value) => Number.isFinite(value) && value >= 0,
      )
    );
  }, [draft]);

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
      setDraft({ ...draft, [key]: Number.isFinite(numeric) ? numeric : 0 });
      return;
    }
    setDraft({
      ...draft,
      [key]: Number.isFinite(numeric as number) ? (numeric as number) : null,
    });
  };

  if (!currentFood || !draft) {
    return (
      <AppShell experience="nutrition" showNav={false}>
        <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/80 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.1)]"
            onClick={() => navigate(returnTo)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Card className="mt-6 rounded-[24px] border border-black/5 bg-white px-4 py-4 text-sm text-slate-600">
            Food details are unavailable. Go back and select a food again.
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell experience="nutrition" showNav={false}>
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-4">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/80 text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.1)]"
            onClick={() => navigate(returnTo)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
              Food editor
            </p>
            <h2 className="text-lg font-display font-semibold text-slate-900">
              {currentFood.name}
            </h2>
          </div>
        </div>

        {isAdmin && (
          <Card className="mt-4 rounded-[24px] border border-emerald-100 bg-emerald-50/70 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                  Admin mode
                </p>
                <p className="text-sm font-semibold text-slate-800">
                  Edit master nutrition
                </p>
              </div>
              <Switch checked={adminEditing} onCheckedChange={setAdminEditing} />
            </div>
          </Card>
        )}

        {adminEditing && (
          <Card className="mt-4 rounded-[24px] border border-emerald-100 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(16,185,129,0.12)]">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
              Food image
            </p>
            <label className="mt-3 flex cursor-pointer items-center justify-between rounded-full border border-emerald-100 bg-emerald-50/60 px-4 py-2 text-xs font-semibold text-emerald-700">
              <span>{uploading ? "Uploading..." : "Upload new image"}</span>
              <span className="text-emerald-500">Browse</span>
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file || !currentFood) return;
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
                      await updateFoodImage(currentFood.id, data.secure_url);
                      setCurrentFood((prev) =>
                        prev ? { ...prev, imageUrl: data.secure_url } : prev,
                      );
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
              <p className="mt-2 text-[11px] text-emerald-600">{uploadNotice}</p>
            )}
          </Card>
        )}

        {adminEditing && draft && (
          <Card className="mt-4 rounded-[24px] border border-emerald-100 bg-white px-4 py-4 shadow-[0_12px_28px_rgba(16,185,129,0.12)]">
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
              Brand
            </p>
            <div className="mt-3 space-y-3">
              <Select
                value={draft.brandId ?? "none"}
                onValueChange={(value) => {
                  if (value === "none") {
                    setDraft({ ...draft, brandId: null, brand: "" });
                    setBrandLogoUrl(null);
                    return;
                  }
                  const match = brands.find((brand) => brand.id === value);
                  setDraft({
                    ...draft,
                    brandId: value,
                    brand: match?.name ?? "",
                  });
                  setBrandLogoUrl(match?.logo_url ?? null);
                }}
              >
                <SelectTrigger className="h-10 rounded-full">
                  <div className="flex items-center gap-2">
                    {brandLogoUrl && (
                      <img
                        src={brandLogoUrl}
                        alt="Brand"
                        className="h-5 w-5 rounded-full object-cover"
                      />
                    )}
                    <SelectValue placeholder="Select brand" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <div className="px-3 py-2">
                    <Input
                      value={brandQuery}
                      onChange={(event) => setBrandQuery(event.target.value)}
                      placeholder="Search brand"
                      className="h-9 rounded-full"
                    />
                  </div>
                  <SelectItem value="none">No brand</SelectItem>
                  {brandLoading && (
                    <div className="px-3 py-2 text-xs text-slate-500">Loading...</div>
                  )}
                  {brands
                    .filter((brand) =>
                      brand.name.toLowerCase().includes(brandQuery.trim().toLowerCase()),
                    )
                    .reduce<BrandRecord[]>((unique, brand) => {
                      const normalized = brand.name.trim().toLowerCase();
                      if (!normalized) return unique;
                      if (
                        unique.some(
                          (item) => item.name.trim().toLowerCase() === normalized,
                        )
                      ) {
                        return unique;
                      }
                      unique.push(brand);
                      return unique;
                    }, [])
                    .map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        <div className="flex items-center gap-2">
                          {brand.logo_url ? (
                            <img
                              src={brand.logo_url}
                              alt={brand.name}
                              className="h-5 w-5 rounded-full object-cover"
                            />
                          ) : null}
                          <span>{brand.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  {!brandLoading && brands.length === 0 && (
                    <div className="px-3 py-2 text-xs text-slate-500">
                      No brands found
                    </div>
                  )}
                </SelectContent>
              </Select>
              <button
                type="button"
                className="text-xs font-semibold text-emerald-600"
                onClick={() => setBrandCreateOpen((prev) => !prev)}
              >
                {brandCreateOpen ? "Cancel new brand" : "Create new brand"}
              </button>
            </div>

            {brandCreateOpen && (
              <div className="mt-4 rounded-[20px] border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
                  New brand
                </p>
                <div className="mt-3 space-y-3">
                  <Input
                    value={brandName}
                    onChange={(event) => setBrandName(event.target.value)}
                    placeholder="Brand name"
                    className="h-10 rounded-full"
                  />
                  <Input
                    value={brandWebsite}
                    onChange={(event) => setBrandWebsite(event.target.value)}
                    placeholder="Website (optional)"
                    className="h-10 rounded-full"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white text-xl shadow-[0_8px_20px_rgba(16,185,129,0.12)]">
                      {brandLogoUrl ? (
                        <img
                          src={brandLogoUrl}
                          alt="Brand logo"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        "🏷️"
                      )}
                    </div>
                    <label className="flex flex-1 cursor-pointer items-center justify-between rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-semibold text-emerald-700">
                      <span>{brandUploading ? "Uploading..." : "Upload logo"}</span>
                      <span className="text-emerald-500">Browse</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          setBrandUploading(true);
                          setBrandNotice(null);
                          setBrandUploadProgress(0);
                          fetchBrandLogoSignature()
                            .then(async (signature) => {
                              const formData = new FormData();
                              formData.append("file", file);
                              formData.append("api_key", signature.apiKey);
                              formData.append("timestamp", String(signature.timestamp));
                              formData.append("signature", signature.signature);
                              if (signature.uploadPreset) {
                                formData.append("upload_preset", signature.uploadPreset);
                              }
                              const data = await new Promise<{ secure_url?: string }>(
                                (resolve, reject) => {
                                  const xhr = new XMLHttpRequest();
                                  xhr.open(
                                    "POST",
                                    `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
                                  );
                                  xhr.upload.onprogress = (evt) => {
                                    if (!evt.lengthComputable) return;
                                    const pct = Math.round((evt.loaded / evt.total) * 100);
                                    setBrandUploadProgress(pct);
                                  };
                                  xhr.onload = () => {
                                    try {
                                      resolve(JSON.parse(xhr.responseText));
                                    } catch {
                                      reject(new Error("Upload failed"));
                                    }
                                  };
                                  xhr.onerror = () => reject(new Error("Upload failed"));
                                  xhr.send(formData);
                                },
                              );
                              if (!data.secure_url) throw new Error("Upload failed");
                              setBrandLogoUrl(data.secure_url);
                              setBrandNotice("Logo added.");
                            })
                            .catch(() => setBrandNotice("Upload failed."))
                            .finally(() => setBrandUploading(false));
                        }}
                      />
                    </label>
                  </div>
                  {brandUploading && (
                    <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all"
                        style={{ width: `${brandUploadProgress}%` }}
                      />
                    </div>
                  )}
                  {brandNotice && <p className="text-xs text-emerald-600">{brandNotice}</p>}
                  <Button
                    type="button"
                    className="w-full rounded-full bg-aura-primary py-4 text-sm font-semibold text-white"
                    onClick={async () => {
                      if (!brandName.trim()) {
                        setBrandNotice("Enter a brand name.");
                        return;
                      }
                      try {
                        const response = await createBrand({
                          name: brandName.trim(),
                          websiteUrl: brandWebsite.trim() || undefined,
                          logoUrl: brandLogoUrl ?? undefined,
                        });
                        setBrands((prev) => [response.brand, ...prev]);
                        setDraft({
                          ...draft,
                          brandId: response.brand.id,
                          brand: response.brand.name,
                        });
                        setBrandCreateOpen(false);
                        setBrandName("");
                        setBrandWebsite("");
                        setBrandLogoUrl(null);
                        setBrandNotice(null);
                      } catch {
                        setBrandNotice("Unable to create brand.");
                      }
                    }}
                  >
                    Save brand
                  </Button>
                </div>
              </div>
            )}

            {draft.brandId && !brandCreateOpen && (
              <div className="mt-4 rounded-[20px] border border-emerald-100 bg-emerald-50/60 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
                  Edit brand details
                </p>
                <div className="mt-3 space-y-3">
                  <Input
                    value={brandName}
                    onChange={(event) => setBrandName(event.target.value)}
                    placeholder="Brand name"
                    className="h-10 rounded-full"
                  />
                  <Input
                    value={brandWebsite}
                    onChange={(event) => setBrandWebsite(event.target.value)}
                    placeholder="Website (optional)"
                    className="h-10 rounded-full"
                  />
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white text-xl shadow-[0_8px_20px_rgba(16,185,129,0.12)]">
                      {brandLogoUrl ? (
                        <img
                          src={brandLogoUrl}
                          alt="Brand logo"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        "🏷️"
                      )}
                    </div>
                    <label className="flex flex-1 cursor-pointer items-center justify-between rounded-full border border-emerald-100 bg-white px-4 py-2 text-xs font-semibold text-emerald-700">
                      <span>{brandUploading ? "Uploading..." : "Upload logo"}</span>
                      <span className="text-emerald-500">Browse</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (!file) return;
                          setBrandUploading(true);
                          setBrandEditNotice(null);
                          setBrandUploadProgress(0);
                          fetchBrandLogoSignature()
                            .then(async (signature) => {
                              const formData = new FormData();
                              formData.append("file", file);
                              formData.append("api_key", signature.apiKey);
                              formData.append("timestamp", String(signature.timestamp));
                              formData.append("signature", signature.signature);
                              if (signature.uploadPreset) {
                                formData.append("upload_preset", signature.uploadPreset);
                              }
                              const data = await new Promise<{ secure_url?: string }>(
                                (resolve, reject) => {
                                  const xhr = new XMLHttpRequest();
                                  xhr.open(
                                    "POST",
                                    `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
                                  );
                                  xhr.upload.onprogress = (evt) => {
                                    if (!evt.lengthComputable) return;
                                    const pct = Math.round((evt.loaded / evt.total) * 100);
                                    setBrandUploadProgress(pct);
                                  };
                                  xhr.onload = () => {
                                    try {
                                      resolve(JSON.parse(xhr.responseText));
                                    } catch {
                                      reject(new Error("Upload failed"));
                                    }
                                  };
                                  xhr.onerror = () => reject(new Error("Upload failed"));
                                  xhr.send(formData);
                                },
                              );
                              if (!data.secure_url) throw new Error("Upload failed");
                              setBrandLogoUrl(data.secure_url);
                              setBrandEditNotice("Logo uploaded.");
                            })
                            .catch(() => setBrandEditNotice("Upload failed."))
                            .finally(() => setBrandUploading(false));
                        }}
                      />
                    </label>
                  </div>
                  {brandUploading && (
                    <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                      <div
                        className="h-full rounded-full bg-emerald-400 transition-all"
                        style={{ width: `${brandUploadProgress}%` }}
                      />
                    </div>
                  )}
                  {brandEditNotice && (
                    <p className="text-xs text-emerald-600">{brandEditNotice}</p>
                  )}
                  <Button
                    type="button"
                    className="w-full rounded-full bg-emerald-400 py-4 text-sm font-semibold text-slate-950 hover:bg-emerald-300"
                    onClick={async () => {
                      if (!draft.brandId) return;
                      if (!brandName.trim()) {
                        setBrandEditNotice("Enter a brand name.");
                        return;
                      }
                      try {
                        const response = await updateBrand(draft.brandId, {
                          name: brandName.trim(),
                          websiteUrl: brandWebsite.trim() || null,
                          logoUrl: brandLogoUrl ?? null,
                        });
                        if (response.brand) {
                          setBrands((prev) =>
                            prev.map((item) =>
                              item.id === response.brand.id ? response.brand : item,
                            ),
                          );
                          setDraft({
                            ...draft,
                            brand: response.brand.name,
                          });
                          setBrandEditNotice("Brand updated.");
                        }
                      } catch {
                        setBrandEditNotice("Unable to update brand.");
                      }
                    }}
                  >
                    Save brand details
                  </Button>
                </div>
              </div>
            )}
          </Card>
        )}

        <Card className="mt-4 rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Base serving size
          </p>
          <div className="mt-3 grid grid-cols-[1fr_130px] gap-2">
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
                handleDraftChange("portion", amount ? `${amount} ${unit}` : unit);
              }}
              className="h-10 rounded-full"
            />
            <Select
              value={baseServingUnit}
              onValueChange={(value) => {
                setBaseServingUnit(value);
                const amount = baseServingAmount.trim();
                handleDraftChange("portion", amount ? `${amount} ${value}` : value);
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
          {adminEditing && (
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Base serving grams
              </p>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={draft.portionGrams ?? ""}
                onChange={(event) => handleDraftChange("portionGrams", event.target.value)}
                className="mt-1 h-10 rounded-full"
              />
            </div>
          )}
        </Card>

        {adminEditing && (
          <Card className="mt-4 rounded-[24px] border border-emerald-100 bg-emerald-50/60 px-4 py-4 shadow-[0_14px_30px_rgba(16,185,129,0.12)]">
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
              <Select value={newServingUnit} onValueChange={setNewServingUnit}>
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
                placeholder="g"
                className="h-9 rounded-full"
              />
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="h-9 rounded-full"
                onClick={async () => {
                  if (!currentFood) return;
                  const grams = Number(newServingGrams);
                  const amount = newServingAmount.trim();
                  const label = `${amount} ${newServingUnit}`.trim();
                  if (!amount || !Number.isFinite(grams) || grams <= 0) return;
                  const response = await createFoodServing(currentFood.id, {
                    label,
                    grams,
                  });
                  setCustomServings((prev) => [
                    ...prev,
                    {
                      id: response.serving.id,
                      label: response.serving.label,
                      grams: response.serving.grams,
                    },
                  ]);
                  setNewServingAmount("");
                  setNewServingGrams("");
                }}
              >
                Add
              </Button>
            </div>
          </Card>
        )}

        <Card className="mt-4 rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
            Nutrition facts
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Calories
              </p>
              <Input
                type="number"
                min={0}
                inputMode="numeric"
                value={draft.kcal}
                onChange={(event) => handleDraftChange("kcal", event.target.value)}
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
                inputMode="numeric"
                value={draft.carbs}
                onChange={(event) => handleDraftChange("carbs", event.target.value)}
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
                inputMode="numeric"
                value={draft.protein}
                onChange={(event) => handleDraftChange("protein", event.target.value)}
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
                inputMode="numeric"
                value={draft.fat}
                onChange={(event) => handleDraftChange("fat", event.target.value)}
                className="mt-1 h-10 rounded-full"
              />
            </div>
          </div>
        </Card>

        {adminEditing && (
          <Card className="mt-4 rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Micronutrients
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Input
                type="number"
                min={0}
                value={draft.sodiumMg ?? ""}
                onChange={(event) => handleDraftChange("sodiumMg", event.target.value)}
                placeholder="Sodium (mg)"
                className="h-10 rounded-full"
              />
              <Input
                type="number"
                min={0}
                value={draft.fiberG ?? ""}
                onChange={(event) => handleDraftChange("fiberG", event.target.value)}
                placeholder="Fiber (g)"
                className="h-10 rounded-full"
              />
              <Input
                type="number"
                min={0}
                value={draft.sugarG ?? ""}
                onChange={(event) => handleDraftChange("sugarG", event.target.value)}
                placeholder="Sugar (g)"
                className="h-10 rounded-full"
              />
              <Input
                type="number"
                min={0}
                value={draft.saturatedFatG ?? ""}
                onChange={(event) =>
                  handleDraftChange("saturatedFatG", event.target.value)
                }
                placeholder="Sat fat (g)"
                className="h-10 rounded-full"
              />
              <Input
                type="number"
                min={0}
                value={draft.transFatG ?? ""}
                onChange={(event) => handleDraftChange("transFatG", event.target.value)}
                placeholder="Trans fat (g)"
                className="h-10 rounded-full"
              />
              <Input
                type="number"
                min={0}
                value={draft.cholesterolMg ?? ""}
                onChange={(event) =>
                  handleDraftChange("cholesterolMg", event.target.value)
                }
                placeholder="Cholesterol (mg)"
                className="h-10 rounded-full"
              />
              <Input
                type="number"
                min={0}
                value={draft.potassiumMg ?? ""}
                onChange={(event) =>
                  handleDraftChange("potassiumMg", event.target.value)
                }
                placeholder="Potassium (mg)"
                className="h-10 rounded-full"
              />
            </div>
            <Textarea
              value={draft.ingredients}
              onChange={(event) => handleDraftChange("ingredients", event.target.value)}
              placeholder="Ingredients"
              className="mt-3 min-h-[90px] rounded-[18px]"
            />
          </Card>
        )}

        <Button
          type="button"
          className="mt-6 w-full rounded-full bg-aura-primary py-5 text-sm font-semibold text-white"
          onClick={async () => {
            if (!draft || !canSave) return;
            if (saving) return;
            setSaving(true);
            try {
              if (adminEditing && isAdmin) {
              const nextMicros = { ...(currentFood.micronutrients ?? {}) } as Record<
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
              const updated = await updateFoodMaster(currentFood.id, {
                name: draft.name.trim() || currentFood.name,
                brand: draft.brand.trim() || null,
                brandId: draft.brandId ?? null,
                portionLabel: draft.portion,
                portionGrams: draft.portionGrams ?? null,
                kcal: draft.kcal,
                carbsG: draft.carbs,
                proteinG: draft.protein,
                fatG: draft.fat,
                micronutrients: nextMicros,
              });
              if (updated) {
                setCurrentFood(updated);
                toast("Saved to database", {
                  description: "Food details updated successfully.",
                });
              }
              } else {
                const updated = upsertOverride(currentFood, {
                  kcal: draft.kcal,
                  portion: draft.portion,
                  macros: {
                    carbs: draft.carbs,
                    protein: draft.protein,
                    fat: draft.fat,
                  },
                });
                setCurrentFood(updated);
                toast("Nutrition updated");
              }
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving}
        >
          {saving ? "Saving..." : adminEditing ? "Save changes" : "Save nutrition"}
        </Button>
      </div>
    </AppShell>
  );
};

export default EditFood;
