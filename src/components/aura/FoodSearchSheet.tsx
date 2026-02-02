import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FoodItem, Meal } from "@/data/mock";
import { Barcode, Heart, PlusCircle, Search } from "lucide-react";
import { useRef, useState } from "react";
import { FoodList } from "./FoodList";
import { BarcodeScanSheet } from "./BarcodeScanSheet";
import { CreateFoodSheet } from "./CreateFoodSheet";
import { Pressable } from "./Pressable";

type FoodSearchSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: "recent" | "liked" | "history";
  onTabChange: (value: "recent" | "liked" | "history") => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchStatus: "idle" | "loading" | "error";
  searchError?: string | null;
  foods: FoodItem[];
  meal: Meal | null;
  onSelectFood: (food: FoodItem) => void;
  onBarcodeDetected: (value: string) => void;
  onCreateFood?: (payload: {
    name: string;
    kcal: number;
    carbs: number;
    protein: number;
    fat: number;
  }) => Promise<void>;
};

export const FoodSearchSheet = ({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  searchStatus,
  searchError,
  foods,
  meal,
  onSelectFood,
  onBarcodeDetected,
}: FoodSearchSheetProps) => (
  <FoodSearchSheetContent
    open={open}
    onOpenChange={onOpenChange}
    activeTab={activeTab}
    onTabChange={onTabChange}
    searchQuery={searchQuery}
    onSearchChange={onSearchChange}
    searchStatus={searchStatus}
    searchError={searchError}
    foods={foods}
    meal={meal}
    onSelectFood={onSelectFood}
    onBarcodeDetected={onBarcodeDetected}
  onCreateFood={onCreateFood}
  />
);

const FoodSearchSheetContent = ({
  open,
  onOpenChange,
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  searchStatus,
  searchError,
  foods,
  meal,
  onSelectFood,
  onBarcodeDetected,
  onCreateFood,
}: FoodSearchSheetProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const isSearching = searchStatus === "loading" && searchQuery.trim().length > 0;
  const showEmpty =
    searchQuery.trim().length > 0 &&
    searchStatus !== "loading" &&
    foods.length === 0;

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-[calc(1.5rem+env(safe-area-inset-bottom))] overflow-hidden">
          <div className="max-h-[85vh] overflow-y-auto px-5 pb-6 pt-2" data-vaul-no-drag>
            <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
            {meal?.label ?? "Meal"}
          </p>
          <h2 className="text-xl font-display font-semibold text-slate-900">
            Add food
          </h2>
        </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <ActionTile
                icon={<Search className="h-4 w-4" />}
                label="Search foods"
                description="Type to find items"
                onClick={() => inputRef.current?.focus()}
              />
              <ActionTile
                icon={<Barcode className="h-4 w-4" />}
                label="Scan barcode"
                description="Instant add"
                onClick={() => {
                  onOpenChange(false);
                  setBarcodeOpen(true);
                }}
              />
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                type="button"
                variant="secondary"
                className="h-10 flex-1 rounded-full bg-white text-xs font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                onClick={() => {
                  onTabChange("recent");
                  onSearchChange("");
                }}
              >
                <Heart className="h-4 w-4 text-rose-400" />
                Favorites
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="h-10 flex-1 rounded-full bg-white text-xs font-semibold text-slate-700 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
                onClick={() => {
                  onOpenChange(false);
                  setCreateOpen(true);
                }}
              >
                <PlusCircle className="h-4 w-4 text-emerald-500" />
                Create
              </Button>
            </div>

            <div className="mt-4 flex items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
              <Search className="h-4 w-4 text-emerald-400" />
              <Input
                ref={inputRef}
                value={searchQuery}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Food, meal, or brand"
                className="h-7 border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
              />
            </div>
            {isSearching && (
              <p className="mt-3 text-xs font-semibold text-emerald-500">
                Searching the food database...
              </p>
            )}
            {searchStatus === "error" && searchError && (
              <p className="mt-3 text-xs font-semibold text-rose-500">
                {searchError}
              </p>
            )}

            <Tabs
          value={activeTab}
          onValueChange={(value) =>
            onTabChange(value as "recent" | "liked" | "history")
          }
          className="mt-4"
        >
          <TabsList className="h-10 w-full rounded-full bg-white p-1 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <TabsTrigger
              value="recent"
              className="w-full rounded-full data-[state=active]:bg-aura-primary data-[state=active]:text-white"
            >
              Recently
            </TabsTrigger>
            <TabsTrigger
              value="liked"
              className="w-full rounded-full data-[state=active]:bg-aura-primary data-[state=active]:text-white"
            >
              Liked
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="w-full rounded-full data-[state=active]:bg-aura-primary data-[state=active]:text-white"
            >
              History
            </TabsTrigger>
          </TabsList>
          <TabsContent value="recent" className="mt-4">
            <FoodList foods={foods} onSelect={onSelectFood} />
            {showEmpty && (
              <div className="mt-4 rounded-[24px] border border-dashed border-emerald-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                No results yet. Try a different search.
              </div>
            )}
          </TabsContent>
          <TabsContent value="liked" className="mt-4">
            <FoodList foods={foods} onSelect={onSelectFood} />
            {showEmpty && (
              <div className="mt-4 rounded-[24px] border border-dashed border-emerald-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                No results yet. Try a different search.
              </div>
            )}
          </TabsContent>
          <TabsContent value="history" className="mt-4">
            <FoodList foods={foods} onSelect={onSelectFood} />
            {showEmpty && (
              <div className="mt-4 rounded-[24px] border border-dashed border-emerald-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                No results yet. Try a different search.
              </div>
            )}
          </TabsContent>
            </Tabs>
          </div>
        </DrawerContent>
      </Drawer>

      <BarcodeScanSheet
        open={barcodeOpen}
        onOpenChange={setBarcodeOpen}
        onDetected={onBarcodeDetected}
      />
      <CreateFoodSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreate={onCreateFood}
      />
    </>
  );
};

const ActionTile = ({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  description: string;
  onClick: () => void;
}) => (
  <Pressable>
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-2 rounded-[22px] border border-black/5 bg-white px-4 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{label}</p>
        <p className="text-xs text-slate-500">{description}</p>
      </div>
    </button>
  </Pressable>
);
