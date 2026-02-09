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
import { useCallback, useEffect, useRef, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { FoodItem } from "@/data/mock";
import type { BrandRecord } from "@/types/api";
import {
  createBrand,
  fetchBrandLogoSignature,
  fetchBrands,
  fetchFoodImageSignature,
} from "@/lib/api";
import { useAppStore } from "@/state/AppStore";
import {
  createFoodSchema,
  createFoodDefaults,
  transformFoodFormToPayload,
  servingUnits,
  type CreateFoodFormValues,
} from "@/lib/schemas/food";

type CreateFoodSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreate?: (payload: {
    name: string;
    brand?: string;
    brandId?: string;
    portionLabel?: string;
    portionGrams?: number;
    kcal: number;
    carbs: number;
    protein: number;
    fat: number;
    micronutrients?: Record<string, unknown>;
    imageUrl?: string;
  }) => Promise<void>;
};

type CreateFoodFormProps = {
  onCreate?: (payload: {
    name: string;
    brand?: string;
    brandId?: string;
    portionLabel?: string;
    portionGrams?: number;
    kcal: number;
    carbs: number;
    protein: number;
    fat: number;
    micronutrients?: Record<string, unknown>;
    imageUrl?: string;
  }) => Promise<FoodItem | void>;
  onComplete?: (created?: FoodItem) => void;
};

// Draft storage key
const DRAFT_STORAGE_KEY = "aurafit-create-food-draft-v1";

// Load draft from localStorage
const loadDraft = (): Partial<CreateFoodFormValues> => {
  if (typeof window === "undefined") return {};
  const raw = window.localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as Partial<CreateFoodFormValues>;
  } catch {
    return {};
  }
};

export const CreateFoodForm = ({ onCreate, onComplete }: CreateFoodFormProps) => {
  // Track draft state
  const lastSavedDraft = useRef<string>("");
  
  // Check if there's an existing draft on mount
  const existingDraft = loadDraft();
  const hasMeaningfulDraft = Boolean(
    existingDraft.name || 
    existingDraft.kcal || 
    existingDraft.imageUrl ||
    existingDraft.brandId
  );
  const [showDraftLoaded, setShowDraftLoaded] = useState(hasMeaningfulDraft);
  
  // React Hook Form with Zod validation
  const form = useForm<CreateFoodFormValues>({
    resolver: zodResolver(createFoodSchema),
    defaultValues: { ...createFoodDefaults, ...existingDraft },
    mode: "onBlur", // Validate on blur for better UX
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = form;

  // Brand-related state (not part of form schema)
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [brandQuery, setBrandQuery] = useState("");
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandCreateOpen, setBrandCreateOpen] = useState(false);
  const [newBrandName, setNewBrandName] = useState("");
  const [newBrandWebsite, setNewBrandWebsite] = useState("");
  const [newBrandLogoUrl, setNewBrandLogoUrl] = useState<string | null>(null);
  const [brandUploading, setBrandUploading] = useState(false);
  const [brandUploadProgress, setBrandUploadProgress] = useState(0);
  const [brandNotice, setBrandNotice] = useState<string | null>(null);
  // Selected brand logo (shown in trigger when a brand is selected)
  const [selectedBrandLogoUrl, setSelectedBrandLogoUrl] = useState<string | null>(null);

  // UI state
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const { showFoodImages } = useAppStore();
  const draftTimerRef = useRef<number | null>(null);
  const draftSavedTimerRef = useRef<number | null>(null);

  // Watch specific fields for the image display (not all fields to avoid re-render loops)
  const imageUrl = watch("imageUrl");
  const foodName = watch("name");
  const currentBrandId = watch("brandId");

  // Load brands on mount if there's a draft with a brandId (to restore selected brand logo)
  useEffect(() => {
    if (!existingDraft.brandId) return;
    setBrandLoading(true);
    fetchBrands("", true, 100)
      .then((response) => {
        setBrands(response.items);
        // Find and set the logo for the saved brand
        const savedBrand = response.items.find((b) => b.id === existingDraft.brandId);
        if (savedBrand) {
          setSelectedBrandLogoUrl(savedBrand.logo_url ?? null);
        }
      })
      .finally(() => setBrandLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-save draft on form changes - use subscription to avoid re-render loops
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    // Subscribe to form changes instead of using watch() in render
    const subscription = form.watch((formValues) => {
      // Don't save if form is pristine (no user changes yet)
      if (!isDirty) return;
      
      // Serialize and compare to avoid unnecessary saves
      const serialized = JSON.stringify(formValues);
      if (serialized === lastSavedDraft.current) return;
      
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
      }
      
      draftTimerRef.current = window.setTimeout(() => {
        lastSavedDraft.current = serialized;
        window.localStorage.setItem(DRAFT_STORAGE_KEY, serialized);
        setDraftSaved(true);
        
        if (draftSavedTimerRef.current) {
          window.clearTimeout(draftSavedTimerRef.current);
        }
        draftSavedTimerRef.current = window.setTimeout(() => {
          setDraftSaved(false);
        }, 1400);
      }, 600); // Increased debounce to 600ms
    });
    
    return () => {
      subscription.unsubscribe();
      if (draftTimerRef.current) window.clearTimeout(draftTimerRef.current);
      if (draftSavedTimerRef.current) window.clearTimeout(draftSavedTimerRef.current);
    };
  }, [form, isDirty]);

  // Handle image upload
  const handleImageUpload = useCallback(async (file: File) => {
    setUploading(true);
    setUploadNotice(null);
    setUploadProgress(0);
    try {
      const signature = await fetchFoodImageSignature();
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
        xhr.open("POST", `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`);
        xhr.upload.onprogress = (event) => {
          if (!event.lengthComputable) return;
          setUploadProgress(Math.round((event.loaded / event.total) * 100));
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
      setValue("imageUrl", data.secure_url);
      setUploadNotice("Image added.");
    } catch {
      setUploadNotice("Upload failed.");
    } finally {
      setUploading(false);
    }
  }, [setValue]);

  // Handle form submission
  const onSubmit = async (values: CreateFoodFormValues) => {
    const payload = transformFoodFormToPayload(values);
    try {
      const created = onCreate ? await onCreate(payload) : undefined;
      toast("Custom food saved", {
        description: `${payload.name} is ready to log.`,
      });

      // Reset form
      reset(createFoodDefaults);
      setBrandQuery("");
      setBrandCreateOpen(false);
      setNewBrandName("");
      setNewBrandWebsite("");
      setNewBrandLogoUrl(null);
      setSelectedBrandLogoUrl(null);
      setBrandNotice(null);
      setUploadNotice(null);
      setUploadProgress(0);

      // Clear draft
      if (typeof window !== "undefined") {
        window.localStorage.removeItem(DRAFT_STORAGE_KEY);
      }

      onComplete?.(created);
    } catch {
      toast("Failed to save food", {
        action: {
          label: "Retry",
          onClick: () => void handleSubmit(onSubmit)(),
        },
      });
    }
  };

  // Show validation error toast
  const onError = () => {
    const firstError = Object.values(errors)[0];
    if (firstError?.message) {
      toast(String(firstError.message));
    } else {
      toast("Enter calories, carbs, protein, and fat");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onError)} className="aura-sheet-body">
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
        {/* Show "Draft loaded" on initial load if there was a meaningful draft */}
        {showDraftLoaded && !draftSaved ? (
          <div className="flex items-center justify-between">
            <div className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-600">
              Draft loaded
            </div>
            <button
              type="button"
              onClick={() => {
                reset(createFoodDefaults);
                if (typeof window !== "undefined") {
                  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
                }
                lastSavedDraft.current = "";
                setShowDraftLoaded(false);
                setDraftSaved(false);
                setSelectedBrandLogoUrl(null);
              }}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
            >
              Start fresh
            </button>
          </div>
        ) : null}
        {/* Show "Draft saved" after user makes changes */}
        {draftSaved ? (
          <div className="flex items-center justify-between">
            <div className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600">
              Draft saved
            </div>
            <button
              type="button"
              onClick={() => {
                reset(createFoodDefaults);
                if (typeof window !== "undefined") {
                  window.localStorage.removeItem(DRAFT_STORAGE_KEY);
                }
                lastSavedDraft.current = "";
                setShowDraftLoaded(false);
                setDraftSaved(false);
                setSelectedBrandLogoUrl(null);
              }}
              className="text-[11px] font-semibold text-slate-400 hover:text-slate-600"
            >
              Clear draft
            </button>
          </div>
        ) : null}
        <div className="grid grid-cols-[1fr_130px] gap-2">
          <Input
            type="number"
            min={0}
            inputMode="decimal"
            {...register("baseServingAmount")}
            placeholder="Serving size"
            className="h-11 rounded-full"
          />
          <Controller
            name="baseServingUnit"
            control={control}
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger className="h-11 rounded-full">
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
            )}
          />
        </div>
        <div className="relative">
          <Input
            type="number"
            min={0}
            inputMode="numeric"
            {...register("baseServingGrams")}
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
                alt={foodName || "Food"}
                className="h-full w-full object-contain object-center"
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
                if (file) void handleImageUpload(file);
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
          {...register("name")}
          placeholder="Food name (optional)"
          className="rounded-full"
        />
        <div>
          <div className="flex items-center gap-3">
            {/* Brand logo preview */}
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-100 text-xl">
              {selectedBrandLogoUrl ? (
                <img
                  src={selectedBrandLogoUrl}
                  alt="Brand"
                  className="h-full w-full object-contain"
                />
              ) : (
                <span className="text-slate-400">🏷️</span>
              )}
            </div>
            {/* Brand select */}
            <Controller
              name="brandId"
              control={control}
              render={({ field }) => (
                <Select
                  value={field.value ?? "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      field.onChange(null);
                      setValue("brandName", "");
                      setSelectedBrandLogoUrl(null);
                      return;
                    }
                    if (value === "__create__") {
                      setBrandCreateOpen(true);
                      return;
                    }
                    const match = brands.find((item) => item.id === value);
                    field.onChange(value);
                    setValue("brandName", match?.name ?? "");
                    setSelectedBrandLogoUrl(match?.logo_url ?? null);
                    setBrandCreateOpen(false);
                  }}
                >
                  <SelectTrigger className="h-10 flex-1 rounded-full">
                    <SelectValue placeholder="Select brand (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-3 py-2">
                      <Input
                        value={brandQuery}
                        onChange={(event) => setBrandQuery(event.target.value)}
                        placeholder="Search brand"
                        className="h-9 rounded-full"
                        onFocus={() => {
                          setBrandLoading(true);
                          fetchBrands("", true, 100)
                            .then((response) => setBrands(response.items))
                            .finally(() => setBrandLoading(false));
                        }}
                      />
                    </div>
                    <SelectItem value="none">No brand</SelectItem>
                    <SelectItem value="__create__">
                      <span className="font-semibold text-emerald-600">+ Create new brand</span>
                    </SelectItem>
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
                        if (unique.some((item) => item.name.trim().toLowerCase() === normalized)) {
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
                                className="h-5 w-5 rounded-full object-contain"
                              />
                            ) : (
                              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[10px]">🏷️</span>
                            )}
                            <span>{brand.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    {!brandLoading && brands.length === 0 && (
                      <div className="px-3 py-2 text-xs text-slate-500">No brands found</div>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>
        <Input
          {...register("kcal")}
          placeholder="Calories (cal)"
          className={`rounded-full ${errors.kcal ? "border-red-300" : ""}`}
          inputMode="numeric"
        />
        <div className="grid grid-cols-3 gap-2">
          <Input
            {...register("carbs")}
            placeholder="Carbs (g)"
            className={`rounded-full ${errors.carbs ? "border-red-300" : ""}`}
            inputMode="numeric"
          />
          <Input
            {...register("protein")}
            placeholder="Protein (g)"
            className={`rounded-full ${errors.protein ? "border-red-300" : ""}`}
            inputMode="numeric"
          />
          <Input
            {...register("fat")}
            placeholder="Fat (g)"
            className={`rounded-full ${errors.fat ? "border-red-300" : ""}`}
            inputMode="numeric"
          />
        </div>
      </div>

      {brandCreateOpen && (
        <div className="mt-4 rounded-[24px] border border-emerald-100 bg-emerald-50/60 p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-500">
              New brand
            </p>
            <button
              type="button"
              onClick={() => {
                setBrandCreateOpen(false);
                setNewBrandName("");
                setNewBrandWebsite("");
                setNewBrandLogoUrl(null);
                setBrandNotice(null);
              }}
              className="text-xs font-semibold text-slate-400 hover:text-slate-600"
            >
              Cancel
            </button>
          </div>
          <div className="mt-3 space-y-3">
            <Input
              value={newBrandName}
              onChange={(event) => setNewBrandName(event.target.value)}
              placeholder="Brand name"
              className="h-10 rounded-full"
            />
            <Input
              value={newBrandWebsite}
              onChange={(event) => setNewBrandWebsite(event.target.value)}
              placeholder="Website (optional)"
              className="h-10 rounded-full"
            />
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-white text-xl shadow-[0_8px_20px_rgba(16,185,129,0.12)]">
                {newBrandLogoUrl ? (
                  <img
                    src={newBrandLogoUrl}
                    alt="Brand logo"
                    className="h-full w-full object-contain"
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
                        const data = await new Promise<{ secure_url?: string }>((resolve, reject) => {
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
                        });
                        if (!data.secure_url) throw new Error("Upload failed");
                        setNewBrandLogoUrl(data.secure_url);
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
                if (!newBrandName.trim()) {
                  setBrandNotice("Enter a brand name.");
                  return;
                }
                try {
                  const response = await createBrand({
                    name: newBrandName.trim(),
                    websiteUrl: newBrandWebsite.trim() || undefined,
                    logoUrl: newBrandLogoUrl ?? undefined,
                  });
                  setBrands((prev) => [response.brand, ...prev]);
                  setValue("brandId", response.brand.id);
                  setValue("brandName", response.brand.name);
                  setSelectedBrandLogoUrl(response.brand.logo_url);
                  setBrandCreateOpen(false);
                  setNewBrandName("");
                  setNewBrandWebsite("");
                  setNewBrandLogoUrl(null);
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
                {...register("sodium")}
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
                {...register("potassium")}
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
                {...register("fiber")}
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
                {...register("satFat")}
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
                {...register("sugar")}
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
                {...register("transFat")}
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
                {...register("cholesterol")}
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
            {...register("ingredients")}
            placeholder="Ingredients (optional)"
            className="min-h-[96px] rounded-[18px]"
          />
        </CollapsibleContent>
      </Collapsible>

      <Button
        type="submit"
        className="mt-6 w-full rounded-full bg-aura-primary py-6 text-base font-semibold text-white shadow-[0_16px_30px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving..." : "Save food"}
      </Button>
    </form>
  );
};

export const CreateFoodSheet = ({
  open,
  onOpenChange,
  onCreate,
}: CreateFoodSheetProps) => (
  <Drawer open={open} onOpenChange={onOpenChange}>
    <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-6">
      <CreateFoodForm onCreate={onCreate} onComplete={() => onOpenChange(false)} />
    </DrawerContent>
  </Drawer>
);
