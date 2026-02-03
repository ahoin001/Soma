import { Drawer, DrawerContent } from "@/components/ui/drawer";
import type { FoodItem, Meal } from "@/data/mock";
import { useRef, useState } from "react";
import { BarcodeScanSheet } from "./BarcodeScanSheet";
import { CreateFoodSheet } from "./CreateFoodSheet";
import { FoodSearchContent } from "./FoodSearchContent";

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
  onQuickAddFood?: (food: FoodItem) => void;
  onBarcodeDetected: (value: string) => void;
  externalSearchEnabled: boolean;
  onExternalSearchChange: (enabled: boolean) => void;
  onCreateFood?: (payload: {
    name: string;
    kcal: number;
    carbs: number;
    protein: number;
    fat: number;
    micronutrients?: Record<string, unknown>;
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
  onQuickAddFood,
  onBarcodeDetected,
  externalSearchEnabled,
  onExternalSearchChange,
  onCreateFood,
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
    externalSearchEnabled={externalSearchEnabled}
    onExternalSearchChange={onExternalSearchChange}
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
  onQuickAddFood,
  onBarcodeDetected,
  externalSearchEnabled,
  onExternalSearchChange,
  onCreateFood,
}: FoodSearchSheetProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [barcodeOpen, setBarcodeOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-[calc(1.5rem+env(safe-area-inset-bottom))] overflow-hidden">
          <div className="max-h-[85vh] overflow-y-auto px-5 pb-6 pt-2" data-vaul-no-drag>
            <FoodSearchContent
              activeTab={activeTab}
              onTabChange={onTabChange}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              searchStatus={searchStatus}
              searchError={searchError}
              foods={foods}
              meal={meal}
              onSelectFood={onSelectFood}
              onQuickAddFood={onQuickAddFood ?? onSelectFood}
              externalSearchEnabled={externalSearchEnabled}
              onExternalSearchChange={onExternalSearchChange}
              onOpenBarcode={() => {
                onOpenChange(false);
                setBarcodeOpen(true);
              }}
              onOpenCreate={() => {
                onOpenChange(false);
                setCreateOpen(true);
              }}
              inputRef={inputRef}
            />
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

