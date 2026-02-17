import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { createFood, fetchExternalSvgUrl } from "@/lib/api";
import { uploadImageFile } from "@/lib/uploadImage";
import {
  parseBjsFoodHtml,
  type ParsedBjsFood,
} from "@/lib/parsers/bjsFoodParser";

const STORES = [{ id: "bjs", label: "BJS" }] as const;

/** Editable form state derived from ParsedBjsFood (all strings for inputs) */
type FormState = {
  brand: string;
  productName: string;
  imageUrl: string;
  servingSize: string;
  servingGrams: string;
  calories: string;
  carbs: string;
  protein: string;
  fat: string;
  fiber: string;
  sugar: string;
  addedSugar: string;
  sodium: string;
  saturatedFat: string;
  transFat: string;
  cholesterol: string;
  potassium: string;
  ingredients: string;
};

function parsedToFormState(p: ParsedBjsFood): FormState {
  return {
    brand: p.brand ?? "",
    productName: p.productName ?? "",
    imageUrl: p.imageUrl ?? "",
    servingSize: p.servingSize ?? "",
    servingGrams: p.servingGrams != null ? String(p.servingGrams) : "",
    calories: p.calories != null ? String(p.calories) : "",
    carbs: p.carbs != null ? String(p.carbs) : "",
    protein: p.protein != null ? String(p.protein) : "",
    fat: p.fat != null ? String(p.fat) : "",
    fiber: p.fiber != null ? String(p.fiber) : "",
    sugar: p.sugar != null ? String(p.sugar) : "",
    addedSugar: p.addedSugar != null ? String(p.addedSugar) : "",
    sodium: p.sodium != null ? String(p.sodium) : "",
    saturatedFat: p.saturatedFat != null ? String(p.saturatedFat) : "",
    transFat: p.transFat != null ? String(p.transFat) : "",
    cholesterol: p.cholesterol != null ? String(p.cholesterol) : "",
    potassium: p.potassium != null ? String(p.potassium) : "",
    ingredients: p.ingredients ?? "",
  };
}

export default function FoodImportAdmin() {
  const { email } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = email?.toLowerCase() === "ahoin001@gmail.com";

  const [store, setStore] = useState<string>("bjs");
  const [htmlSnippet, setHtmlSnippet] = useState("");
  const [parsed, setParsed] = useState<ParsedBjsFood | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadProgress, setImageUploadProgress] = useState(0);

  useEffect(() => {
    if (email !== undefined && !isAdmin) {
      navigate("/nutrition", { replace: true });
    }
  }, [email, isAdmin, navigate]);

  const handleParse = async () => {
    if (!htmlSnippet.trim()) {
      toast.error("Paste an HTML snippet first");
      return;
    }
    setParsing(true);
    try {
      const result = await parseBjsFoodHtml(htmlSnippet, fetchExternalSvgUrl);
      setParsed(result);
      setForm(parsedToFormState(result));
      toast.success("Parsed successfully. Review and edit below.");
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Parse failed. For external labels, ensure the server is running.",
      );
    } finally {
      setParsing(false);
    }
  };

  const updateForm = (updates: Partial<FormState>) => {
    setForm((prev) => (prev ? { ...prev, ...updates } : null));
  };

  const handleImageUpload = async (file: File) => {
    if (!form) return;
    setImageUploading(true);
    setImageUploadProgress(0);
    try {
      const url = await uploadImageFile(file, (pct) => setImageUploadProgress(pct));
      updateForm({ imageUrl: url });
      toast.success("Image uploaded. Using your URL.");
    } catch {
      toast.error("Image upload failed");
    } finally {
      setImageUploading(false);
      setImageUploadProgress(0);
    }
  };

  const handleSave = async () => {
    if (!form) return;
    const name = form.productName.trim();
    if (!name) {
      toast.error("Product name is required");
      return;
    }
    const kcal = Number(form.calories);
    const carbs = Number(form.carbs);
    const protein = Number(form.protein);
    const fat = Number(form.fat);
    if (!Number.isFinite(kcal) || kcal < 0) {
      toast.error("Enter valid calories");
      return;
    }
    if (!Number.isFinite(carbs) || !Number.isFinite(protein) || !Number.isFinite(fat)) {
      toast.error("Enter valid macros (carbs, protein, fat)");
      return;
    }

    const micronutrients: Record<string, unknown> = {};
    if (form.fiber.trim()) micronutrients.fiber_g = Number(form.fiber);
    if (form.sugar.trim()) micronutrients.sugar_g = Number(form.sugar);
    if (form.addedSugar.trim()) micronutrients.added_sugar_g = Number(form.addedSugar);
    if (form.sodium.trim()) micronutrients.sodium_mg = Number(form.sodium);
    if (form.saturatedFat.trim()) micronutrients.saturated_fat_g = Number(form.saturatedFat);
    if (form.transFat.trim()) micronutrients.trans_fat_g = Number(form.transFat);
    if (form.cholesterol.trim()) micronutrients.cholesterol_mg = Number(form.cholesterol);
    if (form.potassium.trim()) micronutrients.potassium_mg = Number(form.potassium);
    if (form.ingredients.trim()) micronutrients.ingredients = form.ingredients.trim();

    setSaving(true);
    try {
      await createFood({
        name,
        brand: form.brand.trim() || undefined,
        portionLabel: form.servingSize.trim() || undefined,
        portionGrams: form.servingGrams.trim() ? Number(form.servingGrams) : undefined,
        kcal,
        carbsG: carbs,
        proteinG: protein,
        fatG: fat,
        micronutrients: Object.keys(micronutrients).length ? micronutrients : undefined,
        imageUrl: form.imageUrl.trim() || undefined,
        source: "admin-import",
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.foodFavorites });
      queryClient.invalidateQueries({ queryKey: queryKeys.foodHistory });
      queryClient.invalidateQueries({ queryKey: ["foodSearch"] });
      toast.success("Food saved to database.");
      setForm(null);
      setParsed(null);
      setHtmlSnippet("");
    } catch {
      toast.error("Failed to save food");
    } finally {
      setSaving(false);
    }
  };

  if (email === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl space-y-6 p-4 pb-20">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Back to Nutrition"
            onClick={() => navigate("/nutrition")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">Import food (admin)</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">1. Store & HTML</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Store</Label>
              <Select value={store} onValueChange={setStore}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STORES.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Paste HTML snippet</Label>
              <Textarea
                placeholder="Paste product page HTML (e.g. from BJS)..."
                value={htmlSnippet}
                onChange={(e) => setHtmlSnippet(e.target.value)}
                className="min-h-[140px] font-mono text-xs"
                rows={6}
              />
            </div>
            <Button type="button" onClick={handleParse} disabled={parsing}>
              {parsing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Parsing…
                </>
              ) : (
                "Parse"
              )}
            </Button>
          </CardContent>
        </Card>

        {form && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">2. Edit & save</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Brand</Label>
                    <Input
                      value={form.brand}
                      onChange={(e) => updateForm({ brand: e.target.value })}
                      placeholder="Brand name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Product name</Label>
                    <Input
                      value={form.productName}
                      onChange={(e) => updateForm({ productName: e.target.value })}
                      placeholder="Product name"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Image</Label>
                    <p className="text-xs text-muted-foreground">
                      The parsed URL is from the store. Upload your own image or paste a URL below to use your own asset.
                    </p>
                    <div className="flex flex-wrap items-center gap-3">
                      {form.imageUrl ? (
                        <a
                          href={form.imageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg border border-border bg-muted"
                          aria-label="Open image in new tab"
                        >
                          <img
                            src={form.imageUrl}
                            alt=""
                            className="h-full w-full object-contain"
                          />
                        </a>
                      ) : (
                        <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/50 text-2xl text-muted-foreground">
                          🖼️
                        </div>
                      )}
                      <label className="flex cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
                        <span>{imageUploading ? `Uploading ${imageUploadProgress}%` : "Upload image"}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="sr-only"
                          disabled={imageUploading}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) void handleImageUpload(file);
                          }}
                        />
                      </label>
                    </div>
                    {imageUploading && (
                      <div className="h-2 w-full overflow-hidden rounded-full bg-primary/15">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${imageUploadProgress}%` }}
                        />
                      </div>
                    )}
                    <Input
                      value={form.imageUrl}
                      onChange={(e) => updateForm({ imageUrl: e.target.value })}
                      placeholder="Or paste image URL (e.g. after uploading elsewhere)"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Serving size (label)</Label>
                    <Input
                      value={form.servingSize}
                      onChange={(e) => updateForm({ servingSize: e.target.value })}
                      placeholder="e.g. 1/2 cup (40g)"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Serving size (grams)</Label>
                    <Input
                      type="number"
                      value={form.servingGrams}
                      onChange={(e) => updateForm({ servingGrams: e.target.value })}
                      placeholder="40"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Calories</Label>
                      <Input
                        type="number"
                        value={form.calories}
                        onChange={(e) => updateForm({ calories: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Carbs (g)</Label>
                      <Input
                        type="number"
                        value={form.carbs}
                        onChange={(e) => updateForm({ carbs: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Protein (g)</Label>
                      <Input
                        type="number"
                        value={form.protein}
                        onChange={(e) => updateForm({ protein: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Fat (g)</Label>
                      <Input
                        type="number"
                        value={form.fat}
                        onChange={(e) => updateForm({ fat: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Fiber (g)</Label>
                      <Input
                        type="number"
                        value={form.fiber}
                        onChange={(e) => updateForm({ fiber: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Sugar (g)</Label>
                      <Input
                        type="number"
                        value={form.sugar}
                        onChange={(e) => updateForm({ sugar: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Added sugar (g)</Label>
                      <Input
                        type="number"
                        value={form.addedSugar}
                        onChange={(e) => updateForm({ addedSugar: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Sodium (mg)</Label>
                      <Input
                        type="number"
                        value={form.sodium}
                        onChange={(e) => updateForm({ sodium: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Saturated fat (g)</Label>
                      <Input
                        type="number"
                        value={form.saturatedFat}
                        onChange={(e) => updateForm({ saturatedFat: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Cholesterol (mg)</Label>
                      <Input
                        type="number"
                        value={form.cholesterol}
                        onChange={(e) => updateForm({ cholesterol: e.target.value })}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Potassium (mg)</Label>
                      <Input
                        type="number"
                        value={form.potassium}
                        onChange={(e) => updateForm({ potassium: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Ingredients</Label>
                    <Textarea
                      value={form.ingredients}
                      onChange={(e) => updateForm({ ingredients: e.target.value })}
                      placeholder="Ingredients list..."
                      rows={3}
                    />
                  </div>
                  <Button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Saving…
                      </>
                    ) : (
                      "Save to database"
                    )}
                  </Button>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
