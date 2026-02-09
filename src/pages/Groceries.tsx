import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/aura";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useFoodCatalog } from "@/hooks/useFoodCatalog";
import { useGroceryBag } from "@/hooks/useGroceryBag";
import { toast } from "sonner";
import {
  Apple,
  Carrot,
  Drumstick,
  Milk,
  Nut,
  Package,
  ShoppingBag,
  Wheat,
} from "lucide-react";
import { ListEmptyState } from "@/components/ui/empty-state";

type MacroGroup = "protein" | "carbs" | "fats";
type Category =
  | "meats"
  | "poultry"
  | "seafood"
  | "dairy"
  | "fruits"
  | "veggies"
  | "grains"
  | "legumes"
  | "fats";

type GroceryItem = {
  id: string;
  name: string;
  macro: MacroGroup;
  category: Category;
};

type BagBucket = "staples" | "rotation" | "special";

type BagItem = {
  id: string;
  name: string;
  bucket: BagBucket;
};

const groceryItems: GroceryItem[] = [
  { id: "chicken-breast", name: "Chicken breast", macro: "protein", category: "poultry" },
  { id: "turkey-slices", name: "Turkey slices", macro: "protein", category: "meats" },
  { id: "salmon", name: "Salmon fillet", macro: "protein", category: "seafood" },
  { id: "tofu", name: "Tofu", macro: "protein", category: "legumes" },
  { id: "greek-yogurt", name: "Greek yogurt", macro: "protein", category: "dairy" },
  { id: "eggs", name: "Eggs", macro: "protein", category: "dairy" },
  { id: "brown-rice", name: "Brown rice", macro: "carbs", category: "grains" },
  { id: "oats", name: "Rolled oats", macro: "carbs", category: "grains" },
  { id: "sweet-potato", name: "Sweet potato", macro: "carbs", category: "veggies" },
  { id: "bananas", name: "Bananas", macro: "carbs", category: "fruits" },
  { id: "spinach", name: "Spinach", macro: "carbs", category: "veggies" },
  { id: "black-beans", name: "Black beans", macro: "carbs", category: "legumes" },
  { id: "avocado", name: "Avocado", macro: "fats", category: "fats" },
  { id: "olive-oil", name: "Olive oil", macro: "fats", category: "fats" },
  { id: "almonds", name: "Almonds", macro: "fats", category: "fats" },
  { id: "chia-seeds", name: "Chia seeds", macro: "fats", category: "fats" },
  { id: "peanut-butter", name: "Peanut butter", macro: "fats", category: "fats" },
];

const bucketConfig: Record<BagBucket, { label: string; tone: string }> = {
  staples: {
    label: "Must haves",
    tone: "bg-emerald-500/10 text-emerald-700 border-emerald-200",
  },
  rotation: {
    label: "Rotation",
    tone: "bg-sky-500/10 text-sky-700 border-sky-200",
  },
  special: {
    label: "Feeling special",
    tone: "bg-amber-500/10 text-amber-700 border-amber-200",
  },
};

const simplePanels: {
  id: MacroGroup;
  label: string;
  emoji: string;
  categories: { id: Category; label: string }[];
}[] = [
  {
    id: "protein",
    label: "Protein",
    emoji: "💪",
    categories: [
      { id: "meats", label: "Meats" },
      { id: "poultry", label: "Poultry" },
      { id: "seafood", label: "Seafood" },
      { id: "dairy", label: "Dairy" },
      { id: "legumes", label: "Plant protein" },
    ],
  },
  {
    id: "carbs",
    label: "Carbs",
    emoji: "🌾",
    categories: [
      { id: "grains", label: "Grains" },
      { id: "fruits", label: "Fruits" },
      { id: "veggies", label: "Veggies" },
      { id: "legumes", label: "Legumes" },
    ],
  },
  {
    id: "fats",
    label: "Fats",
    emoji: "✨",
    categories: [{ id: "fats", label: "Fats & oils" }],
  },
];

const advancedPanels: {
  id: Category;
  label: string;
  icon: typeof Apple;
}[] = [
  { id: "meats", label: "Meats", icon: Drumstick },
  { id: "poultry", label: "Poultry", icon: Drumstick },
  { id: "seafood", label: "Seafood", icon: Package },
  { id: "dairy", label: "Dairy", icon: Milk },
  { id: "fruits", label: "Fruits", icon: Apple },
  { id: "veggies", label: "Veggies", icon: Carrot },
  { id: "grains", label: "Grains", icon: Wheat },
  { id: "legumes", label: "Legumes", icon: Package },
  { id: "fats", label: "Fats & oils", icon: Nut },
];

const macroForCategory = (category: Category): MacroGroup => {
  if (["meats", "poultry", "seafood", "dairy"].includes(category)) {
    return "protein";
  }
  if (["fruits", "veggies", "grains", "legumes"].includes(category)) {
    return "carbs";
  }
  return "fats";
};

const GroceryPanel = ({
  title,
  subtitle,
  icon,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      "rounded-[28px] border border-black/5 bg-white px-4 py-5 shadow-[0_16px_36px_rgba(15,23,42,0.08)]",
      className,
    )}
  >
    <div className="flex items-center gap-3">
      {icon ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
          {icon}
        </div>
      ) : null}
      <div>
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        {subtitle ? <p className="text-xs text-slate-500">{subtitle}</p> : null}
      </div>
    </div>
    <div className="mt-4">{children}</div>
  </div>
);

const Groceries = () => {
  const [advanced, setAdvanced] = useState(false);
  const [query, setQuery] = useState("");
  const [useDatabase, setUseDatabase] = useState(false);
  const [bucket, setBucket] = useState<BagBucket>("staples");
  const [manualName, setManualName] = useState("");
  const [masterItems, setMasterItems] =
    useState<GroceryItem[]>(groceryItems);
  const [categoryDrafts, setCategoryDrafts] = useState<
    Record<Category, string>
  >({
    meats: "",
    poultry: "",
    seafood: "",
    dairy: "",
    fruits: "",
    veggies: "",
    grains: "",
    legumes: "",
    fats: "",
  });
  const { items: bagItems, status: bagStatus, error: bagError, addItem, removeItem } =
    useGroceryBag();
  const {
    results: apiResults,
    status: searchStatus,
    error: searchError,
    searchFoods,
  } = useFoodCatalog();

  const filteredItems = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return masterItems;
    return masterItems.filter((item) =>
      item.name.toLowerCase().includes(trimmed),
    );
  }, [masterItems, query]);

  const bagByBucket = useMemo(() => {
    return bagItems.reduce(
      (acc, item) => {
        acc[item.bucket].push(item);
        return acc;
      },
      {
        staples: [] as BagItem[],
        rotation: [] as BagItem[],
        special: [] as BagItem[],
      },
    );
  }, [bagItems]);

  useEffect(() => {
    if (bagError) {
      toast("Could not load groceries", { description: bagError });
    }
  }, [bagError]);

  useEffect(() => {
    if (searchError) {
      toast("Search failed", { description: searchError });
    }
  }, [searchError]);

  useEffect(() => {
    const trimmed = query.trim();
    const timer = window.setTimeout(() => {
      if (!useDatabase) return;
      searchFoods(trimmed);
    }, trimmed ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [query, searchFoods, useDatabase]);

  const inferMacroGroup = (item: { macros: { carbs: number; protein: number; fat: number } }) => {
    const { carbs, protein, fat } = item.macros;
    if (protein >= carbs && protein >= fat) return "protein";
    if (fat >= carbs) return "fats";
    return "carbs";
  };

  const defaultCategoryForMacro = (macro: MacroGroup) => {
    if (macro === "protein") return "meats";
    if (macro === "fats") return "fats";
    return "grains";
  };

  const addToBag = async (
    name: string,
    target: BagBucket,
    macroGroup?: MacroGroup,
    category?: Category,
  ) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    await addItem({
      name: trimmed,
      bucket: target,
      macroGroup: macroGroup ?? null,
      category: category ?? null,
    });
  };

  const handleManualAdd = async () => {
    await addToBag(manualName, bucket);
    setManualName("");
  };

  const updateCategoryDraft = (category: Category, value: string) => {
    setCategoryDrafts((prev) => ({ ...prev, [category]: value }));
  };

  const addMasterItem = (category: Category, macro: MacroGroup) => {
    const trimmed = categoryDrafts[category].trim();
    if (!trimmed) return;
    setMasterItems((prev) => {
      const exists = prev.some(
        (item) =>
          item.name.toLowerCase() === trimmed.toLowerCase() &&
          item.category === category,
      );
      if (exists) return prev;
      return [
        ...prev,
        {
          id: `${category}-${trimmed.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`,
          name: trimmed,
          macro,
          category,
        },
      ];
    });
    updateCategoryDraft(category, "");
  };

  return (
    <AppShell experience="nutrition">
      {/* pt includes safe-area for immersive edge-to-edge display */}
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10" style={{ paddingTop: "calc(1.5rem + var(--sat, env(safe-area-inset-top)))" }}>
        <div className="rounded-[28px] bg-gradient-to-br from-emerald-200 via-emerald-100 to-white px-5 py-6 shadow-[0_18px_40px_rgba(16,185,129,0.18)]">
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-500">
            Groceries
          </p>
          <h1 className="text-2xl font-display font-semibold text-emerald-950">
            Build your grocery bag
          </h1>
          <p className="mt-1 text-sm text-emerald-700/70">
            Stock your staples, rotations, and special treats in one easy view.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-between rounded-[24px] border border-emerald-100 bg-white px-4 py-3 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
          <div>
            <p className="text-sm font-semibold text-slate-800">Advanced</p>
            <p className="text-xs text-slate-500">
              Split categories into meats, dairy, fruits, veggies, and more.
            </p>
          </div>
          <Switch checked={advanced} onCheckedChange={setAdvanced} />
        </div>

        <GroceryPanel
          title="Grocery bag"
          subtitle="Tap items to add. Organize by intention."
          icon={<ShoppingBag className="h-5 w-5" />}
          className="mt-6"
        >
          {bagStatus === "loading" && (
            <p className="text-xs text-emerald-600">Loading your bag...</p>
          )}
          <div className="rounded-[22px] border border-emerald-100 bg-emerald-50/70 px-3 py-3">
            <div className="flex flex-wrap gap-2 text-xs">
              {(["staples", "rotation", "special"] as BagBucket[]).map(
                (value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setBucket(value)}
                    className={cn(
                      "rounded-full border px-3 py-1 font-semibold transition",
                      bucket === value
                        ? "border-emerald-400 bg-white text-emerald-700 shadow-sm"
                        : "border-transparent bg-white/70 text-slate-500",
                    )}
                  >
                    {bucketConfig[value].label}
                  </button>
                ),
              )}
            </div>
            <div className="mt-3 flex items-center gap-2">
              <Input
                value={manualName}
                onChange={(event) => setManualName(event.target.value)}
                placeholder="Add item manually"
                className="h-10 rounded-full bg-white"
              />
              <Button
                type="button"
                className="rounded-full bg-aura-primary px-4"
                onClick={handleManualAdd}
                disabled={!manualName.trim()}
              >
                Add
              </Button>
            </div>
          </div>

          <div className="mt-4 space-y-4">
            {(["staples", "rotation", "special"] as BagBucket[]).map((value) => (
              <div key={value}>
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-700">
                    {bucketConfig[value].label}
                  </p>
                  <Badge
                    variant="outline"
                    className={cn("border text-xs", bucketConfig[value].tone)}
                  >
                    {bagByBucket[value].length}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {bagByBucket[value].length === 0 ? (
                    <ListEmptyState
                      itemName="items"
                      className="w-full py-4 text-center"
                      size="sm"
                    />
                  ) : (
                    bagByBucket[value].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm"
                      >
                        {item.name}
                        <span className="text-emerald-500">×</span>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </GroceryPanel>

        <div className="mt-6 flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <Package className="h-4 w-4 text-emerald-400" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter your master list"
            className="h-7 border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>
        <div className="mt-3 flex items-center justify-between rounded-[20px] border border-emerald-100 bg-white px-4 py-3 text-xs text-slate-500 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
          <span>Need something new?</span>
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-full bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            onClick={() => setUseDatabase((prev) => !prev)}
          >
            {useDatabase ? "Hide catalog search" : "Search catalog"}
          </Button>
        </div>

        {useDatabase && query.trim().length > 0 ? (
          <GroceryPanel
            title="Search results"
            subtitle={
              searchStatus === "loading"
                ? "Searching the food database..."
                : "Tap to add to your bag."
            }
            icon={<Package className="h-5 w-5" />}
            className="mt-6"
          >
            {apiResults.length === 0 && searchStatus !== "loading" ? (
              <p className="text-xs text-slate-400">
                No results yet. Try another search.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {apiResults.map((item) => {
                  const macroGroup = inferMacroGroup(item);
                  const category = defaultCategoryForMacro(macroGroup);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() =>
                        addToBag(item.name, bucket, macroGroup, category)
                      }
                      className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                    >
                      {item.name}
                    </button>
                  );
                })}
              </div>
            )}
          </GroceryPanel>
        ) : advanced ? (
          <div className="mt-6 grid gap-4">
            {advancedPanels.map((panel) => {
              const panelItems = filteredItems.filter(
                (item) => item.category === panel.id,
              );
              const Icon = panel.icon;
              return (
                <GroceryPanel
                  key={panel.id}
                  title={panel.label}
                  subtitle="Pick from your master list."
                  icon={<Icon className="h-5 w-5" />}
                >
                  <div className="flex flex-wrap gap-2">
                    {panelItems.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() =>
                          addToBag(item.name, bucket, item.macro, item.category)
                        }
                        className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                  {panelItems.length === 0 ? (
                    <ListEmptyState
                      itemName="items"
                      className="mt-2 w-full py-3"
                      size="sm"
                    />
                  ) : null}
                  <div className="mt-3 flex items-center gap-2">
                    <Input
                      value={categoryDrafts[panel.id]}
                      onChange={(event) =>
                        updateCategoryDraft(panel.id, event.target.value)
                      }
                      placeholder={`Add ${panel.label.toLowerCase()} item`}
                      className="h-9 rounded-full bg-white"
                    />
                    <Button
                      type="button"
                      className="rounded-full bg-emerald-100 px-4 text-emerald-700 hover:bg-emerald-200"
                      onClick={() =>
                        addMasterItem(panel.id, macroForCategory(panel.id))
                      }
                    >
                      Add
                    </Button>
                  </div>
                </GroceryPanel>
              );
            })}
          </div>
        ) : (
          <div className="mt-6 grid gap-4">
            {simplePanels.map((panel) => {
              const macroItems = filteredItems.filter(
                (item) => item.macro === panel.id,
              );
              return (
                <GroceryPanel
                  key={panel.id}
                  title={`${panel.emoji} ${panel.label}`}
                  subtitle="Choose from your master list."
                >
                  <div className="space-y-4">
                    {panel.categories.map((category) => {
                      const categoryItems = macroItems.filter(
                        (item) => item.category === category.id,
                      );
                      return (
                        <div key={category.id}>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                            {category.label}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            {categoryItems.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                        onClick={() =>
                          addToBag(item.name, bucket, item.macro, item.category)
                        }
                                className="rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700"
                              >
                                {item.name}
                              </button>
                            ))}
                          </div>
                          {categoryItems.length === 0 ? (
                            <p className="mt-2 text-xs text-slate-400">
                              Add a favorite to start the list.
                            </p>
                          ) : null}
                          <div className="mt-3 flex items-center gap-2">
                            <Input
                              value={categoryDrafts[category.id]}
                              onChange={(event) =>
                                updateCategoryDraft(
                                  category.id,
                                  event.target.value,
                                )
                              }
                              placeholder={`Add ${category.label.toLowerCase()} item`}
                              className="h-9 rounded-full bg-white"
                            />
                            <Button
                              type="button"
                              className="rounded-full bg-emerald-100 px-4 text-emerald-700 hover:bg-emerald-200"
                              onClick={() =>
                                addMasterItem(category.id, panel.id)
                              }
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </GroceryPanel>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
};

export default Groceries;
