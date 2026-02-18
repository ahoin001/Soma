import { Drawer, DrawerContent } from "@/components/ui/drawer";
import type { FoodItem, Meal } from "@/data/mock";
import { useEffect, useRef, useState } from "react";
import { BarcodeScanSheet } from "./BarcodeScanSheet";
import { CreateFoodSheet } from "./CreateFoodSheet";
import { FoodSearchContent } from "./FoodSearchContent";
import { SHEET_FOOD_SEARCH_KEY } from "@/lib/storageKeys";
import { useSheetManager } from "@/hooks/useSheetManager";
import type { FoodGoalPresetId, FoodSortOption, FoodTagId } from "@/lib/foodClassification";

type FoodSearchSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activeTab: "search" | "recent" | "liked" | "history";
  onTabChange: (value: "search" | "recent" | "liked" | "history") => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchStatus: "idle" | "loading" | "error";
  searchError?: string | null;
  foods: FoodItem[];
  selectedTags: FoodTagId[];
  onToggleTag: (tag: FoodTagId) => void;
  onClearFilters: () => void;
  goalPreset: FoodGoalPresetId | null;
  onGoalPresetChange: (preset: FoodGoalPresetId | null) => void;
  sortBy: FoodSortOption;
  onSortByChange: (sortBy: FoodSortOption) => void;
  onCycleSort: () => void;
  meal: Meal | null;
  meals: Meal[];
  loggedFoodIds?: Set<string>;
  loggedFoodNames?: Set<string>;
  onMealChange: (mealId: string) => void;
  onSelectFood: (food: FoodItem) => void;
  onQuickAddFood?: (food: FoodItem) => void;
  onBarcodeDetected: (value: string) => void;
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
  selectedTags,
  onToggleTag,
  onClearFilters,
  goalPreset,
  onGoalPresetChange,
  sortBy,
  onSortByChange,
  onCycleSort,
  meal,
  meals,
  loggedFoodIds,
  loggedFoodNames,
  onMealChange,
  onSelectFood,
  onQuickAddFood,
  onBarcodeDetected,
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
    selectedTags={selectedTags}
    onToggleTag={onToggleTag}
    onClearFilters={onClearFilters}
    goalPreset={goalPreset}
    onGoalPresetChange={onGoalPresetChange}
    sortBy={sortBy}
    onSortByChange={onSortByChange}
    onCycleSort={onCycleSort}
    meal={meal}
    meals={meals}
    loggedFoodIds={loggedFoodIds}
    loggedFoodNames={loggedFoodNames}
    onMealChange={onMealChange}
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
  selectedTags,
  onToggleTag,
  onClearFilters,
  goalPreset,
  onGoalPresetChange,
  sortBy,
  onSortByChange,
  onCycleSort,
  meal,
  meals,
  loggedFoodIds,
  loggedFoodNames,
  onMealChange,
  onSelectFood,
  onQuickAddFood,
  onBarcodeDetected,
  onCreateFood,
}: FoodSearchSheetProps) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const { activeSheet, openSheet, closeSheets } = useSheetManager<
    "barcode" | "create"
  >(null, { storageKey: SHEET_FOOD_SEARCH_KEY, persist: true });
  const [lastBrowseTab, setLastBrowseTab] = useState<"recent" | "liked" | "history">(
    activeTab === "search" ? "recent" : activeTab,
  );

  useEffect(() => {
    if (activeTab !== "search") {
      setLastBrowseTab(activeTab);
    }
  }, [activeTab]);

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-6 overflow-hidden">
          <div className="aura-sheet-scroll">
            <FoodSearchContent
              activeTab={activeTab}
              libraryTab={lastBrowseTab}
              onTabChange={onTabChange}
              searchQuery={searchQuery}
              onSearchChange={onSearchChange}
              searchStatus={searchStatus}
              searchError={searchError}
              foods={foods}
              selectedTags={selectedTags}
              onToggleTag={onToggleTag}
              onClearFilters={onClearFilters}
              goalPreset={goalPreset}
              onGoalPresetChange={onGoalPresetChange}
              sortBy={sortBy}
              onSortByChange={onSortByChange}
              onCycleSort={onCycleSort}
              meal={meal}
              meals={meals}
              loggedFoodIds={loggedFoodIds}
              loggedFoodNames={loggedFoodNames}
              onMealChange={onMealChange}
              onSelectFood={onSelectFood}
              onQuickAddFood={onQuickAddFood ?? onSelectFood}
              onOpenBarcode={() => {
                onOpenChange(false);
                openSheet("barcode");
              }}
              onOpenCreate={() => {
                onOpenChange(false);
                openSheet("create");
              }}
              inputRef={inputRef}
            />
          </div>
        </DrawerContent>
      </Drawer>

      <BarcodeScanSheet
        open={activeSheet === "barcode"}
        onOpenChange={(open) => (open ? openSheet("barcode") : closeSheets())}
        onDetected={onBarcodeDetected}
      />
      <CreateFoodSheet
        open={activeSheet === "create"}
        onOpenChange={(open) => (open ? openSheet("create") : closeSheets())}
        onCreate={onCreateFood}
      />
    </>
  );
};

