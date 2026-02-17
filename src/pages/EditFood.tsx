import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { FoodItem } from "@/data/mock";
import { AppShell, PageContainer } from "@/components/aura";
import { BrandLogoUpload } from "@/components/aura/BrandLogoUpload";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAppStore } from "@/state/AppStore";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { toast } from "sonner";
import { ChevronLeft, Trash2 } from "lucide-react";
import { calculateMacroPercent } from "@/data/foodApi";
import {
  createBrand,
  createFoodServing,
  deleteFood,
  fetchBrands,
  fetchFoodImageSignature,
  fetchFoodServings,
  updateBrand,
  updateFoodImage,
} from "@/lib/api";
import type { BrandRecord } from "@/types/api";
import { getServingOptions, normalizeUnit, setServingOptions, type ServingOption } from "@/lib/servingCache";
import { servingUnits } from "@/lib/schemas/food";
import type { EditFoodLocationState } from "@/types/navigation";
import type { NutritionDraftForm } from "@/types/nutrition";

// ─── Presentational components (keep page as orchestrator) ─────────────────

function EditFoodHeader({
  foodName,
  onBack,
}: {
  foodName: string;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full bg-card/80 text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.1)]"
        onClick={onBack}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <div>
        <p className="text-xs uppercase tracking-[0.2em] text-primary/75">
          Food editor
        </p>
        <h2 className="text-lg font-display font-semibold text-foreground">
          {foodName}
        </h2>
      </div>
    </div>
  );
}

function EditFoodAdminBanner({
  adminEditing,
  onToggle,
}: {
  adminEditing: boolean;
  onToggle: (checked: boolean) => void;
}) {
  return (
    <Card className="mt-4 rounded-[24px] border border-primary/25 bg-primary/10 px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">
            Admin mode
          </p>
          <p className="text-sm font-semibold text-foreground">
            Edit master nutrition
          </p>
        </div>
        <Switch checked={adminEditing} onCheckedChange={onToggle} />
      </div>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

const EditFood = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { foodCatalog } = useAppStore();
  useAuth();
  const isAdmin = useIsAdmin();
  const { upsertOverride, updateFoodMaster, getFoodById, refreshLists } = foodCatalog;
  const state = (location.state ?? {}) as EditFoodLocationState;
  const returnTo = state.returnTo ?? "/nutrition";
  const [currentFood, setCurrentFood] = useState<FoodItem | null>(
    state.food ?? null,
  );
  const [draft, setDraft] = useState<NutritionDraftForm | null>(null);
  const [baseServingAmount, setBaseServingAmount] = useState("1");
  const [baseServingUnit, setBaseServingUnit] = useState("serving");
  const [newServingAmount, setNewServingAmount] = useState("");
  const [newServingUnit, setNewServingUnit] = useState("serving");
  const [newServingGrams, setNewServingGrams] = useState("");
  const [customServings, setCustomServings] = useState<ServingOption[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [uploadNotice, setUploadNotice] = useState<string | null>(null);
  const [brands, setBrands] = useState<BrandRecord[]>([]);
  const [brandQuery, setBrandQuery] = useState("");
  const [brandLoading, setBrandLoading] = useState(false);
  const [brandCreateOpen, setBrandCreateOpen] = useState(false);
  const [brandName, setBrandName] = useState("");
  const [brandWebsite, setBrandWebsite] = useState("");
  const [brandLogoUrl, setBrandLogoUrl] = useState<string | null>(null);
  const [brandNotice, setBrandNotice] = useState<string | null>(null);
  const [adminEditing, setAdminEditing] = useState(isAdmin);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [originalBrandLogoUrl, setOriginalBrandLogoUrl] = useState<string | null>(null);

  // Refetch food by ID when editor opens so we always show fresh brand/data (avoids stale location.state)
  useEffect(() => {
    if (!currentFood?.id || !getFoodById) return;
    let cancelled = false;
    getFoodById(currentFood.id).then((fresh) => {
      if (!cancelled && fresh) setCurrentFood(fresh);
    });
    return () => {
      cancelled = true;
    };
  }, [currentFood?.id, getFoodById]);

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
    const macros = currentFood.macros ?? {};
    const m = macros as Record<string, number | undefined>;
    setDraft({
      name: currentFood.name,
      brand: currentFood.brand ?? "",
      brandId: currentFood.brandId ?? null,
      portion: currentFood.portionLabel ?? currentFood.portion,
      portionGrams:
        currentFood.portionGrams != null && currentFood.portionGrams !== ""
          ? Number(currentFood.portionGrams)
          : null,
      kcal: Number(currentFood.kcal) || 0,
      carbs: Number(m.carbs) || 0,
      protein: Number(m.protein) || 0,
      fat: Number(m.fat) || 0,
      sodiumMg: readMicro("sodium_mg"),
      fiberG: readMicro("fiber_g"),
      sugarG: readMicro("sugar_g"),
      addedSugarG: readMicro("added_sugar_g"),
      saturatedFatG: readMicro("saturated_fat_g"),
      transFatG: readMicro("trans_fat_g"),
      cholesterolMg: readMicro("cholesterol_mg"),
      potassiumMg: readMicro("potassium_mg"),
      ingredients: readText("ingredients"),
    });
    // Initialize brand logo URL from the food's existing brand logo
    setBrandLogoUrl(currentFood.brandLogoUrl ?? null);
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
      fetchBrands(query, false, 100)
        .then((response) =>
          setBrands((prev) => {
            const next = response.items;
            if (!currentFood?.brandId || !currentFood.brand) return next;
            if (next.some((brand) => brand.id === currentFood.brandId)) return next;
            return [
              {
                id: currentFood.brandId,
                name: currentFood.brand,
                website_url: null,
                logo_url: currentFood.brandLogoUrl ?? null,
                is_verified: false,
              },
              ...next,
            ];
          }),
        )
        .finally(() => setBrandLoading(false));
    }, query ? 300 : 0);
    return () => window.clearTimeout(timer);
  }, [adminEditing, brandQuery, currentFood?.brand, currentFood?.brandId, currentFood?.brandLogoUrl]);

  useEffect(() => {
    if (!adminEditing || !draft?.brandId) return;
    const match = brands.find((brand) => brand.id === draft.brandId);
    if (!match) return;
    setBrandName(match.name ?? "");
    setBrandWebsite(match.website_url ?? "");
    const logo = match.logo_url ?? null;
    setBrandLogoUrl(logo);
    setOriginalBrandLogoUrl(logo);
  }, [adminEditing, brands, draft?.brandId]);

  useEffect(() => {
    if (!currentFood) return;
    const cached = getServingOptions(currentFood.id);
    if (cached.length) {
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
          setServingOptions(currentFood.id, extra);
        }
      })
      .catch(() => {});
  }, [currentFood?.id]);

  const canSave = useMemo(() => {
    if (!draft) return false;
    return (
      [draft.kcal, draft.carbs, draft.protein, draft.fat].every(
        (value) => typeof value === "number" && Number.isFinite(value) && value >= 0,
      )
    );
  }, [draft]);

  const handleDraftChange = (key: keyof NutritionDraftForm, value: string) => {
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

  if (!currentFood || !draft) {
    return (
      <AppShell experience="nutrition" showNav={false}>
        <PageContainer>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-card/80 text-foreground shadow-[0_10px_24px_rgba(15,23,42,0.1)]"
            onClick={() => navigate(returnTo)}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <Card className="mt-6 rounded-[24px] border border-border/60 bg-card px-4 py-4 text-sm text-muted-foreground">
            Food details are unavailable. Go back and select a food again.
          </Card>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell experience="nutrition" showNav={false}>
      <PageContainer>
        <EditFoodHeader foodName={currentFood.name} onBack={() => navigate(returnTo)} />

        {isAdmin && (
          <EditFoodAdminBanner adminEditing={adminEditing} onToggle={setAdminEditing} />
        )}

        {adminEditing && (
          <Card className="mt-4 rounded-[24px] border border-border/60 bg-card px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
            <p className="text-xs uppercase tracking-[0.2em] text-primary/75">
              Food image
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {currentFood.imageUrl && (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-[10px] font-medium text-muted-foreground">Current</p>
                  <img
                    src={currentFood.imageUrl}
                    alt={currentFood.name}
                    className="h-16 w-16 shrink-0 rounded-xl object-contain shadow-sm"
                  />
                </div>
              )}
              {newImagePreview && (
                <div className="flex flex-col items-center gap-1">
                  <p className="text-[10px] font-medium text-primary">New</p>
                  <img
                    src={newImagePreview}
                    alt="New upload"
                    className="h-16 w-16 shrink-0 rounded-xl object-contain shadow-sm ring-2 ring-primary"
                  />
                </div>
              )}
              <label className="flex cursor-pointer items-center justify-between rounded-full border border-border/70 bg-secondary/55 px-4 py-2 text-xs font-semibold text-secondary-foreground">
                <span>{uploading ? "Uploading..." : "Upload new image"}</span>
                <span className="text-primary">Browse</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file || !currentFood) return;
                    const preview = URL.createObjectURL(file);
                    setNewImagePreview(preview);
                    setUploading(true);
                    setUploadNotice(null);
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
                      const response = await fetch(
                        `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
                        { method: "POST", body: formData },
                      );
                      if (!response.ok) throw new Error("Upload failed");
                      const data = (await response.json()) as { secure_url?: string };
                      if (!data.secure_url) throw new Error("Upload failed");
                      await updateFoodImage(currentFood.id, data.secure_url);
                      setCurrentFood((prev) =>
                        prev ? { ...prev, imageUrl: data.secure_url } : prev,
                      );
                      setUploadNotice("Image updated.");
                    } catch {
                      setUploadNotice("Upload failed.");
                    } finally {
                      setNewImagePreview(null);
                      URL.revokeObjectURL(preview);
                      setUploading(false);
                    }
                  }}
                />
              </label>
            </div>
            {uploadNotice && (
              <p className="mt-2 text-[11px] text-primary">{uploadNotice}</p>
            )}
          </Card>
        )}

        {adminEditing && draft && (
          <Card className="mt-4 rounded-[24px] border border-border/60 bg-card px-4 py-4 shadow-[0_12px_28px_rgba(15,23,42,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/75">
              Brand
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Select a brand or create one and add a logo.
            </p>
            <div className="mt-4 space-y-4">
              <Select
                value={brandCreateOpen ? "__create__" : (draft.brandId ?? "none")}
                onValueChange={(value) => {
                  if (value === "none") {
                    setDraft({ ...draft, brandId: null, brand: "" });
                    setBrandLogoUrl(null);
                    setBrandCreateOpen(false);
                    return;
                  }
                  if (value === "__create__") {
                    setBrandCreateOpen(true);
                    setBrandName("");
                    setBrandWebsite("");
                    setBrandLogoUrl(null);
                    setBrandNotice(null);
                    return;
                  }
                  const match = brands.find((b) => b.id === value);
                  setDraft({ ...draft, brandId: value, brand: match?.name ?? "" });
                  setBrandLogoUrl(match?.logo_url ?? null);
                  setOriginalBrandLogoUrl(match?.logo_url ?? null);
                  setBrandName(match?.name ?? "");
                  setBrandWebsite(match?.website_url ?? "");
                  setBrandCreateOpen(false);
                }}
              >
                <SelectTrigger className="h-11 rounded-full">
                  <div className="flex items-center gap-2">
                    {brandLogoUrl && (
                      <img
                        src={brandLogoUrl}
                        alt=""
                        className="h-6 w-6 rounded-full object-contain"
                      />
                    )}
                    <SelectValue placeholder="Select or create brand" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <div className="px-3 py-2">
                    <Input
                      value={brandQuery}
                      onChange={(e) => setBrandQuery(e.target.value)}
                      placeholder="Search brands..."
                      className="h-9 rounded-full"
                    />
                  </div>
                  <SelectItem value="none">No brand</SelectItem>
                  <SelectItem value="__create__">
                    <span className="font-semibold text-primary">+ Create new brand</span>
                  </SelectItem>
                  {brandLoading && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">Loading…</div>
                  )}
                  {brands
                    .filter((b) =>
                      b.name.toLowerCase().includes(brandQuery.trim().toLowerCase()),
                    )
                    .reduce<BrandRecord[]>((acc, b) => {
                      const n = b.name.trim().toLowerCase();
                      if (!n || acc.some((x) => x.name.trim().toLowerCase() === n)) return acc;
                      acc.push(b);
                      return acc;
                    }, [])
                    .map((brand) => (
                      <SelectItem key={brand.id} value={brand.id}>
                        <div className="flex items-center gap-2">
                          {brand.logo_url ? (
                            <img
                              src={brand.logo_url}
                              alt=""
                              className="h-5 w-5 rounded-full object-contain"
                            />
                          ) : (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[10px]">🏷️</span>
                          )}
                          <span>{brand.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  {!brandLoading && brands.length === 0 && (
                    <div className="px-3 py-2 text-xs text-muted-foreground">No brands found</div>
                  )}
                </SelectContent>
              </Select>

              {(brandCreateOpen || draft.brandId) && (
                <div className="rounded-[20px] border border-border/70 bg-muted/40 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                    {brandCreateOpen ? "New brand" : "Brand details"}
                  </p>
                  <div className="mt-4 space-y-4">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Name</label>
                      <Input
                        value={brandName}
                        onChange={(e) => setBrandName(e.target.value)}
                        placeholder="Brand name"
                        className="mt-1 h-10 rounded-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Website (optional)</label>
                      <Input
                        value={brandWebsite}
                        onChange={(e) => setBrandWebsite(e.target.value)}
                        placeholder="https://…"
                        className="mt-1 h-10 rounded-full"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground">Logo</label>
                      <BrandLogoUpload
                        logoUrl={brandLogoUrl}
                        onLogoChange={setBrandLogoUrl}
                        size="md"
                        className="mt-2"
                      />
                    </div>
                    {brandNotice && brandNotice !== "Logo saved." && (
                      <p className="text-xs text-destructive">{brandNotice}</p>
                    )}
                    <div className="flex gap-2">
                      {brandCreateOpen && (
                        <Button
                          type="button"
                          variant="ghost"
                          className="rounded-full"
                          onClick={() => {
                            setBrandCreateOpen(false);
                            setBrandName("");
                            setBrandWebsite("");
                            setBrandLogoUrl(null);
                            setBrandNotice(null);
                          }}
                        >
                          Cancel
                        </Button>
                      )}
                      <Button
                        type="button"
                        className="flex-1 rounded-full"
                        onClick={async () => {
                          if (!brandName.trim()) {
                            setBrandNotice("Enter a brand name.");
                            return;
                          }
                          setBrandNotice(null);
                          if (brandCreateOpen) {
                            try {
                              const response = await createBrand({
                                name: brandName.trim(),
                                websiteUrl: brandWebsite.trim() || undefined,
                                logoUrl: brandLogoUrl ?? undefined,
                              });
                              setBrands((prev) => [response.brand, ...prev]);
                              setDraft({ ...draft, brandId: response.brand.id, brand: response.brand.name });
                              setBrandLogoUrl(response.brand.logo_url ?? null);
                              setOriginalBrandLogoUrl(response.brand.logo_url ?? null);
                              setBrandCreateOpen(false);
                              setBrandName(response.brand.name);
                              setBrandWebsite(response.brand.website_url ?? "");
                              toast.success("Brand created");
                            } catch {
                              setBrandNotice("Unable to create brand. Check your connection and try again.");
                            }
                            return;
                          }
                          if (!draft.brandId) return;
                          const prevFood = currentFood;
                          const prevLogo = brandLogoUrl;
                          const prevOriginal = originalBrandLogoUrl;
                          setCurrentFood((f) =>
                            f
                              ? { ...f, brand: brandName.trim(), brandLogoUrl: brandLogoUrl ?? undefined }
                              : f,
                          );
                          setDraft((d) => ({ ...d, brand: brandName.trim() }));
                          try {
                            const response = await updateBrand(draft.brandId, {
                              name: brandName.trim(),
                              websiteUrl: brandWebsite.trim() || null,
                              logoUrl: brandLogoUrl ?? null,
                            });
                            const updated = response.brand ?? brands.find((b) => b.id === draft.brandId);
                            if (updated) {
                              setBrands((prev) =>
                                prev.map((b) => (b.id === updated.id ? updated : b)),
                              );
                              setCurrentFood((f) =>
                                f
                                  ? { ...f, brand: updated.name, brandLogoUrl: updated.logo_url ?? undefined }
                                  : f,
                              );
                              setDraft((d) => ({ ...d, brand: updated.name }));
                              setOriginalBrandLogoUrl(updated.logo_url ?? null);
                              toast.success("Brand updated");
                            }
                          } catch {
                            setCurrentFood(prevFood);
                            setBrandLogoUrl(prevLogo);
                            setOriginalBrandLogoUrl(prevOriginal);
                            setBrandNotice("Unable to update brand.");
                            toast.error("Brand update failed. Please try again.");
                          }
                        }}
                      >
                        {brandCreateOpen ? "Create brand" : "Save changes"}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}

        <Card className="mt-4 rounded-[24px] border border-border/60 bg-card px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
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
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
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
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
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
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
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
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
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
          <Card className="mt-4 rounded-[24px] border border-border/70 bg-secondary/55 px-4 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.12)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
              Additional serving sizes
            </p>
            {customServings.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-secondary-foreground">
                {customServings.map((serving) => (
                  <span
                    key={serving.id}
                    className="rounded-full bg-card px-3 py-1 shadow-sm"
                  >
                    {serving.label} ({serving.grams} g)
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">
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
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
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
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
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
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-secondary-foreground">
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

        <Card className="mt-4 rounded-[24px] border border-border/60 bg-card px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Nutrition facts
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Calories
              </p>
              <div className="relative mt-1">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={draft.kcal}
                  onChange={(event) => handleDraftChange("kcal", event.target.value)}
                  className="h-10 rounded-full pr-12"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  kcal
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Carbs
              </p>
              <div className="relative mt-1">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={draft.carbs}
                  onChange={(event) => handleDraftChange("carbs", event.target.value)}
                  className="h-10 rounded-full pr-8"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  g
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Protein
              </p>
              <div className="relative mt-1">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={draft.protein}
                  onChange={(event) => handleDraftChange("protein", event.target.value)}
                  className="h-10 rounded-full pr-8"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  g
                </span>
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Fat
              </p>
              <div className="relative mt-1">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  inputMode="decimal"
                  value={draft.fat}
                  onChange={(event) => handleDraftChange("fat", event.target.value)}
                  className="h-10 rounded-full pr-8"
                />
                <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                  g
                </span>
              </div>
            </div>
          </div>
        </Card>

        {adminEditing && (
          <Card className="mt-4 rounded-[24px] border border-border/60 bg-card px-4 py-4 shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Micronutrients
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Sodium
                </p>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={draft.sodiumMg ?? ""}
                    onChange={(event) => handleDraftChange("sodiumMg", event.target.value)}
                    className="h-10 rounded-full pr-10"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    mg
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Fiber
                </p>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={draft.fiberG ?? ""}
                    onChange={(event) => handleDraftChange("fiberG", event.target.value)}
                    className="h-10 rounded-full pr-8"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    g
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Total sugar
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  From label: &quot;Total Sugars&quot;
                </p>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={draft.sugarG ?? ""}
                    onChange={(event) => handleDraftChange("sugarG", event.target.value)}
                    className="h-10 rounded-full pr-8"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    g
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Added sugar
                </p>
                <p className="mt-0.5 text-[10px] text-muted-foreground">
                  From label: &quot;Includes Xg Added Sugars&quot;
                </p>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={draft.addedSugarG ?? ""}
                    onChange={(event) => handleDraftChange("addedSugarG", event.target.value)}
                    className="h-10 rounded-full pr-8"
                    placeholder="—"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    g
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Saturated fat
                </p>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={draft.saturatedFatG ?? ""}
                    onChange={(event) =>
                      handleDraftChange("saturatedFatG", event.target.value)
                    }
                    className="h-10 rounded-full pr-8"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    g
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Trans fat
                </p>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={draft.transFatG ?? ""}
                    onChange={(event) => handleDraftChange("transFatG", event.target.value)}
                    className="h-10 rounded-full pr-8"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    g
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Cholesterol
                </p>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={draft.cholesterolMg ?? ""}
                    onChange={(event) =>
                      handleDraftChange("cholesterolMg", event.target.value)
                    }
                    className="h-10 rounded-full pr-10"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    mg
                  </span>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                  Potassium
                </p>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    min={0}
                    step="any"
                    inputMode="decimal"
                    value={draft.potassiumMg ?? ""}
                    onChange={(event) =>
                      handleDraftChange("potassiumMg", event.target.value)
                    }
                    className="h-10 rounded-full pr-10"
                  />
                  <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground">
                    mg
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
                Ingredients
              </p>
              <Textarea
                value={draft.ingredients}
                onChange={(event) => handleDraftChange("ingredients", event.target.value)}
                placeholder="List ingredients..."
                className="mt-1 min-h-[90px] rounded-[18px]"
              />
            </div>
          </Card>
        )}

        <Button
          type="button"
          className="mt-6 w-full rounded-full bg-primary py-5 text-sm font-semibold text-primary-foreground"
          onClick={async () => {
            if (!draft || !canSave) return;
            if (saving) return;
            setSaving(true);
            const previousFood = currentFood;
            try {
              if (adminEditing && isAdmin) {
                const nextMicros = { ...(currentFood.micronutrients ?? {}) } as Record<
                  string,
                  number | string
                >;
                const setMicro = (
                  key: string,
                  value: number | string | null,
                ) => {
                  if (typeof value === "number" && Number.isFinite(value)) {
                    nextMicros[key] = value;
                    return;
                  }
                  if (typeof value === "string" && value.trim().length > 0) {
                    nextMicros[key] = value.trim();
                    return;
                  }
                  delete nextMicros[key];
                };
                setMicro("sodium_mg", draft.sodiumMg);
                setMicro("fiber_g", draft.fiberG);
                setMicro("sugar_g", draft.sugarG);
                setMicro("added_sugar_g", draft.addedSugarG);
                setMicro("saturated_fat_g", draft.saturatedFatG);
                setMicro("trans_fat_g", draft.transFatG);
                setMicro("cholesterol_mg", draft.cholesterolMg);
                setMicro("potassium_mg", draft.potassiumMg);
                setMicro("ingredients", draft.ingredients.trim() || null);
                const kcal = typeof draft.kcal === "number" ? draft.kcal : 0;
                const carbs = typeof draft.carbs === "number" ? draft.carbs : 0;
                const protein = typeof draft.protein === "number" ? draft.protein : 0;
                const fat = typeof draft.fat === "number" ? draft.fat : 0;
                const macros = { carbs, protein, fat };
                const optimistic: FoodItem = {
                  ...currentFood,
                  name: draft.name.trim() || currentFood.name,
                  brand: draft.brand.trim() || undefined,
                  brandId: draft.brandId ?? undefined,
                  portionLabel: draft.portion,
                  portionGrams: draft.portionGrams ?? undefined,
                  portion: draft.portion,
                  kcal,
                  macros,
                  macroPercent: calculateMacroPercent(macros),
                  micronutrients: nextMicros,
                };
                setCurrentFood(optimistic);
                try {
                  const portionGrams =
                    draft.portionGrams != null && draft.portionGrams !== ""
                      ? Number(draft.portionGrams)
                      : null;
                  const updated = await updateFoodMaster(currentFood.id, {
                    name: draft.name.trim() || currentFood.name,
                    brand: draft.brand.trim() || null,
                    brandId: draft.brandId ?? null,
                    portionLabel: draft.portion,
                    portionGrams,
                    kcal,
                    carbsG: carbs,
                    proteinG: protein,
                    fatG: fat,
                    micronutrients: nextMicros,
                  });
                  if (updated) {
                    setCurrentFood(updated);
                    toast.success("Food saved", {
                      description: "Details updated successfully.",
                    });
                  }
                } catch {
                  setCurrentFood(previousFood);
                  toast.error("Save failed. Check your connection and try again.");
                }
              } else {
                const updated = upsertOverride(currentFood, {
                  kcal: typeof draft.kcal === "number" ? draft.kcal : 0,
                  portion: draft.portion,
                  macros: {
                    carbs: typeof draft.carbs === "number" ? draft.carbs : 0,
                    protein: typeof draft.protein === "number" ? draft.protein : 0,
                    fat: typeof draft.fat === "number" ? draft.fat : 0,
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

        {isAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="mt-4 w-full rounded-full border-destructive/50 py-5 text-sm font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete food
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this food?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently remove &quot;{currentFood.name}&quot; from the database. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async (e) => {
                    e.preventDefault();
                    if (!currentFood || deleting) return;
                    setDeleting(true);
                    try {
                      await deleteFood(currentFood.id);
                      refreshLists();
                      toast.success("Food deleted.");
                      navigate(returnTo);
                    } catch {
                      toast.error("Could not delete food.", { description: "Check your connection and try again." });
                    } finally {
                      setDeleting(false);
                    }
                  }}
                  disabled={deleting}
                >
                  {deleting ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </PageContainer>
    </AppShell>
  );
};

export default EditFood;
