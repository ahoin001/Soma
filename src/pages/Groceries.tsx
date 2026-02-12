import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/aura";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useFoodCatalog } from "@/hooks/useFoodCatalog";
import { useGroceryBag } from "@/hooks/useGroceryBag";
import { toast } from "sonner";
import { Package, Search, ShoppingBag } from "lucide-react";
import { ListEmptyState } from "@/components/ui/empty-state";
import type { FoodItem } from "@/data/mock";

type MacroGroup = "protein" | "carbs" | "fats";
type BagBucket = "staples" | "rotation" | "special";

type BagItem = {
  id: string;
  name: string;
  bucket: BagBucket;
};

const bucketConfig: Record<BagBucket, { label: string; tone: string }> = {
  staples: {
    label: "Must haves",
    tone: "bg-primary/15 text-primary border-primary/30",
  },
  rotation: {
    label: "Rotation",
    tone: "bg-secondary text-secondary-foreground border-border",
  },
  special: {
    label: "Feeling special",
    tone: "bg-accent text-accent-foreground border-border",
  },
};

const inferMacroGroup = (item: { macros: { carbs: number; protein: number; fat: number } }): MacroGroup => {
  const { carbs, protein, fat } = item.macros;
  if (protein >= carbs && protein >= fat) return "protein";
  if (fat >= carbs) return "fats";
  return "carbs";
};

const defaultCategoryForMacro = (macro: MacroGroup): string => {
  if (macro === "protein") return "meats";
  if (macro === "fats") return "fats";
  return "grains";
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
      "rounded-[28px] border border-border/60 bg-card px-4 py-5 shadow-[0_16px_36px_rgba(15,23,42,0.08)]",
      className,
    )}
  >
    <div className="flex items-center gap-3">
      {icon ? (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary text-primary">
          {icon}
        </div>
      ) : null}
      <div>
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
    </div>
    <div className="mt-4">{children}</div>
  </div>
);

const GROCERIES_PADDING = { paddingTop: "calc(1.5rem + var(--sat, env(safe-area-inset-top)))" };

type GroceriesContentProps = { showHeader?: boolean };

/**
 * Groceries tab content. Only foods from the user's food database can be added.
 * A future API could allow expanding the database (e.g. create food then add to bag).
 */
export const GroceriesContent = ({ showHeader = true }: GroceriesContentProps) => {
  const [query, setQuery] = useState("");
  const [bucket, setBucket] = useState<BagBucket>("staples");

  const { items: bagItems, status: bagStatus, error: bagError, addItem, removeItem } = useGroceryBag();
  const {
    results,
    history,
    status: searchStatus,
    error: searchError,
    searchFoods,
  } = useFoodCatalog();

  const trimmedQuery = query.trim();
  const displayFoods: FoodItem[] = useMemo(() => {
    if (trimmedQuery.length > 0) return results;
    return history;
  }, [trimmedQuery, results, history]);

  const bagByBucket = useMemo(
    () =>
      bagItems.reduce<Record<BagBucket, BagItem[]>>(
        (acc, item) => {
          acc[item.bucket].push(item);
          return acc;
        },
        { staples: [], rotation: [], special: [] },
      ),
    [bagItems],
  );

  useEffect(() => {
    if (bagError) toast("Could not load groceries", { description: bagError });
  }, [bagError]);

  useEffect(() => {
    if (searchError) toast("Search failed", { description: searchError });
  }, [searchError]);

  useEffect(() => {
    const timer = window.setTimeout(() => searchFoods(query), trimmedQuery ? 350 : 0);
    return () => window.clearTimeout(timer);
  }, [query, searchFoods, trimmedQuery]);

  const addToBag = async (food: FoodItem) => {
    const macroGroup = inferMacroGroup(food);
    const category = defaultCategoryForMacro(macroGroup);
    await addItem({
      name: food.name.trim(),
      bucket,
      macroGroup,
      category,
    });
  };

  return (
    <div className="mx-auto w-full max-w-[420px] px-4 pb-10" style={GROCERIES_PADDING}>
      {showHeader && (
        <div className="rounded-[28px] bg-gradient-to-br from-primary/30 via-primary/15 to-card px-5 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.12)]">
          <p className="text-xs uppercase tracking-[0.2em] text-primary">Groceries</p>
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Build your grocery bag
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Add foods from your database. Search or pick from recent items.
          </p>
        </div>
      )}

      <GroceryPanel
        title="Grocery bag"
        subtitle="Tap items to remove. Choose a bucket below before adding."
        icon={<ShoppingBag className="h-5 w-5" />}
        className={showHeader ? "mt-6" : "mt-4"}
      >
        {bagStatus === "loading" && (
          <p className="text-xs text-primary">Loading your bag...</p>
        )}
        <div className="rounded-[22px] border border-border/60 bg-secondary/70 px-3 py-3">
          <div className="flex flex-wrap gap-2 text-xs">
            {(["staples", "rotation", "special"] as BagBucket[]).map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setBucket(value)}
                className={cn(
                  "rounded-full border px-3 py-1 font-semibold transition",
                  bucket === value
                    ? "border-primary/40 bg-card text-primary shadow-sm"
                    : "border-transparent bg-card/70 text-muted-foreground",
                )}
              >
                {bucketConfig[value].label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 space-y-4">
          {(["staples", "rotation", "special"] as BagBucket[]).map((value) => (
            <div key={value}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-foreground">
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
                      className="flex items-center gap-2 rounded-full border border-border/60 bg-card px-3 py-1 text-xs font-semibold text-foreground shadow-sm"
                    >
                      {item.name}
                      <span className="text-primary">×</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </GroceryPanel>

      <GroceryPanel
        title="Add from your food database"
        subtitle={
          trimmedQuery
            ? searchStatus === "loading"
              ? "Searching..."
              : "Tap a food to add it to your bag."
            : "Recent foods from your database. Type to search."
        }
        icon={<Package className="h-5 w-5" />}
        className="mt-6"
      >
        <div className="flex items-center gap-2 rounded-full border border-border/60 bg-secondary/50 px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your foods..."
            className="h-8 border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
          />
        </div>

        {displayFoods.length === 0 && searchStatus !== "loading" ? (
          <p className="mt-4 text-xs text-muted-foreground">
            {trimmedQuery
              ? "No matching foods in your database. Try a different search."
              : "No recent foods. Search above to find foods to add."}
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {displayFoods.map((food) => (
              <button
                key={food.id}
                type="button"
                onClick={() => addToBag(food)}
                className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary/20"
              >
                {food.name}
              </button>
            ))}
          </div>
        )}

        <p className="mt-4 text-[11px] text-muted-foreground">
          Only foods in your database are shown. Support for adding new foods to the database may be added later.
        </p>
      </GroceryPanel>
    </div>
  );
};

const Groceries = () => (
  <AppShell experience="nutrition">
    <GroceriesContent />
  </AppShell>
);

export default Groceries;
