import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FoodItem, Meal } from "@/data/mock";
import { Barcode, CheckCircle2, Copy, Heart, PlusCircle, Search, X } from "lucide-react";
import { FoodList } from "./FoodList.tsx";
import { MealIcon } from "./MealIcon";
import { Pressable } from "./Pressable";
import type { RefObject } from "react";
import { cn } from "@/lib/utils";
import {
  FOOD_GOAL_PRESETS,
  FOOD_TAG_DEFINITIONS,
  getFoodTagLabel,
  type FoodGoalPresetId,
  type FoodSortOption,
  type FoodTagId,
} from "@/lib/foodClassification";

type FoodSearchContentProps = {
  activeTab: "search" | "recent" | "liked" | "history";
  libraryTab: "recent" | "liked" | "history";
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
  meal: Meal | null;
  meals: Meal[];
  loggedFoodIds?: Set<string>;
  loggedFoodNames?: Set<string>;
  onMealChange: (mealId: string) => void;
  onSelectFood: (food: FoodItem) => void;
  onQuickAddFood: (food: FoodItem) => void;
  onQuickRemoveFood?: (food: FoodItem) => void;
  sameAsYesterdayItems?: FoodItem[];
  onSameAsYesterday?: () => void;
  isLoadingSameAsYesterday?: boolean;
  isAddingSameAsYesterday?: boolean;
  onOpenBarcode: () => void;
  onOpenCreate: () => void;
  inputRef?: RefObject<HTMLInputElement>;
};

export const FoodSearchContent = ({
  activeTab,
  libraryTab,
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
  meal,
  meals,
  loggedFoodIds,
  loggedFoodNames,
  onMealChange,
  onSelectFood,
  onQuickAddFood,
  onQuickRemoveFood,
  sameAsYesterdayItems = [],
  onSameAsYesterday,
  isLoadingSameAsYesterday = false,
  isAddingSameAsYesterday = false,
  onOpenBarcode,
  onOpenCreate,
  inputRef,
}: FoodSearchContentProps) => {
  const hasQuery = searchQuery.trim().length > 0;
  const isSearching = searchStatus === "loading" && hasQuery;
  const showEmpty =
    hasQuery &&
    searchStatus !== "loading" &&
    foods.length === 0;
  const hasActiveFilters = sortBy !== "relevance" || selectedTags.length > 0;
  const mode = activeTab === "search" ? "search" : "library";
  const tabsValue = mode === "search" ? libraryTab : activeTab;
  const sortLabel =
    sortBy === "relevance"
      ? "Relevance"
      : sortBy === "calories_asc"
      ? "Calories low->high"
      : sortBy === "calories_desc"
      ? "Calories high->low"
      : sortBy === "protein_desc"
      ? "Protein high->low"
      : sortBy === "protein_asc"
      ? "Protein low->high"
      : sortBy === "carbs_asc"
      ? "Carbs low->high"
      : "Carbs high->low";
  const activePresetLabel = goalPreset
    ? FOOD_GOAL_PRESETS.find((preset) => preset.id === goalPreset)?.label ?? null
    : null;

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-primary">
          {meal?.label ?? "Meal"}
        </p>
        {meal ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[11px] font-semibold text-primary">
            <CheckCircle2 className="h-3 w-3" />
            Selected
          </span>
        ) : null}
      </div>
      <h2 className="text-xl font-display font-semibold text-foreground">
        Add food
      </h2>

      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Log to
        </p>
        <SegmentedControl
          value={meal?.id ?? ""}
          onValueChange={onMealChange}
          options={meals.map((entry) => ({
            value: entry.id,
            label: (
              <>
                <MealIcon mealId={entry.id} size={18} className="shrink-0" />
                {entry.label}
              </>
            ),
          }))}
          className="mt-2 rounded-[18px] border border-border/70 bg-card p-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
          inactiveClassName="bg-secondary hover:bg-secondary/80"
        />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <ActionTile
          icon={<Search className="h-4 w-4" />}
          label="Search foods"
          description="Type to find items"
          onClick={() => inputRef?.current?.focus()}
        />
        <ActionTile
          icon={<Barcode className="h-4 w-4" />}
          label="Scan barcode"
          description="Instant add"
          onClick={onOpenBarcode}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <Button
          type="button"
          variant="secondary"
          className="h-10 flex-1 rounded-full bg-card text-xs font-semibold text-secondary-foreground shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
          onClick={() => {
            onTabChange("recent");
            onSearchChange("");
          }}
        >
          <Heart className="h-4 w-4 text-destructive" />
          Favorites
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="h-10 flex-1 rounded-full bg-card text-xs font-semibold text-secondary-foreground shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
          onClick={onOpenCreate}
        >
          <PlusCircle className="h-4 w-4 text-primary" />
          Create
        </Button>
      </div>

      <div className="mt-4 flex rounded-full bg-card/80 p-1 shadow-[0_10px_24px_rgba(15,23,42,0.06)] backdrop-blur">
        <button
          type="button"
          onClick={() => {
            onTabChange("search");
            inputRef?.current?.focus();
          }}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition",
            mode === "search"
              ? "bg-primary text-primary-foreground shadow-[0_10px_20px_rgba(15,23,42,0.35)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Search className="h-3.5 w-3.5" />
          Search
        </button>
        <button
          type="button"
          onClick={() => onTabChange(libraryTab)}
          className={cn(
            "flex flex-1 items-center justify-center gap-2 rounded-full px-3 py-2 text-xs font-semibold transition",
            mode === "library"
              ? "bg-primary text-primary-foreground shadow-[0_10px_20px_rgba(15,23,42,0.35)]"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Heart className="h-3.5 w-3.5" />
          Library
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 rounded-full border border-border/70 bg-card px-4 py-2 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
        <Search className="h-4 w-4 text-primary" />
        <Input
          ref={inputRef}
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Food, meal, or brand"
          className="h-7 border-none bg-transparent p-0 text-sm shadow-none focus-visible:ring-0"
        />
        {hasQuery ? (
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-primary transition hover:bg-primary/15"
            onClick={() => onSearchChange("")}
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
      {isSearching ? (
        <div className="mt-3 text-xs font-semibold text-primary">
          Searching foods...
        </div>
      ) : null}
      
      {searchStatus === "error" && searchError && (
        <p className="mt-3 text-xs font-semibold text-destructive">
          {searchError}
        </p>
      )}

      {mode === "search" ? (
        <div className="mt-3 space-y-3 rounded-2xl border border-border/60 bg-card/60 p-3">
          {hasActiveFilters ? (
            <div className="rounded-xl border border-primary/20 bg-primary/10 px-3 py-2 text-xs text-primary">
              <span className="font-semibold">
                {activePresetLabel ? `${activePresetLabel} mode` : "Custom filters"}
              </span>
              <span className="mx-1 text-primary/70">•</span>
              <span>{selectedTags.length} tag{selectedTags.length === 1 ? "" : "s"}</span>
              <span className="mx-1 text-primary/70">•</span>
              <span>{sortLabel}</span>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <Label className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Goal mode
            </Label>
            {hasActiveFilters ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 rounded-full px-3 text-[11px] font-semibold"
                onClick={onClearFilters}
              >
                Clear filters
              </Button>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {FOOD_GOAL_PRESETS.map((preset) => {
              const isActive = goalPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => onGoalPresetChange(isActive ? null : preset.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    isActive
                      ? "border-primary/30 bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
          <div className="grid grid-cols-[auto_1fr] items-center gap-2">
            <Label className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              Sort
            </Label>
            <Select value={sortBy} onValueChange={(value) => onSortByChange(value as FoodSortOption)}>
              <SelectTrigger className="h-9 rounded-full border-border/70 bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">Relevance</SelectItem>
                <SelectItem value="calories_asc">Calories (low to high)</SelectItem>
                <SelectItem value="calories_desc">Calories (high to low)</SelectItem>
                <SelectItem value="protein_desc">Protein (high to low)</SelectItem>
                <SelectItem value="protein_asc">Protein (low to high)</SelectItem>
                <SelectItem value="carbs_asc">Carbs (low to high)</SelectItem>
                <SelectItem value="carbs_desc">Carbs (high to low)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            {FOOD_TAG_DEFINITIONS.map((definition) => {
              const isSelected = selectedTags.includes(definition.id);
              return (
                <button
                  key={definition.id}
                  type="button"
                  onClick={() => onToggleTag(definition.id)}
                  aria-pressed={isSelected}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                    isSelected
                      ? "border-primary/30 bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:text-foreground",
                  )}
                >
                  {getFoodTagLabel(definition.id)}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {mode === "search" ? (
        <div className="mt-4">
          <FoodList
            foods={foods}
            onSelect={onSelectFood}
            onQuickAdd={onQuickAddFood}
            onQuickRemove={onQuickRemoveFood}
            loggedFoodIds={loggedFoodIds}
            loggedFoodNames={loggedFoodNames}
            mealLabel={meal?.label ?? "meal"}
          />
          {showEmpty && (
            <EmptyState>No matches yet. Try a different search.</EmptyState>
          )}
        </div>
      ) : null}

      <Tabs
        value={tabsValue}
        onValueChange={(value) => onTabChange(value as "recent" | "liked" | "history")}
        className="mt-4"
      >
        <TabsList
          className={cn(
            "h-10 w-full rounded-full bg-card p-1 shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition-all duration-300",
            mode === "search" && "pointer-events-none opacity-50 blur-[1px]",
          )}
        >
          <TabsTrigger
            value="recent"
            className="w-full rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Recently
          </TabsTrigger>
          <TabsTrigger
            value="liked"
            className="w-full rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Liked
          </TabsTrigger>
          <TabsTrigger
            value="history"
            className="w-full rounded-full data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
          >
            Added
          </TabsTrigger>
        </TabsList>
        {mode === "library" ? (
          <>
            <TabsContent value="recent" className="mt-4">
              {sameAsYesterdayItems.length > 0 && onSameAsYesterday ? (
                <button
                  type="button"
                  onClick={onSameAsYesterday}
                  disabled={isAddingSameAsYesterday}
                  className="mb-3 flex w-full items-center gap-3 rounded-2xl border border-border/60 bg-card/80 px-4 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)] transition hover:bg-secondary/60 disabled:opacity-60"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                    <Copy className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      Same as yesterday
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {isAddingSameAsYesterday
                        ? "Adding…"
                        : isLoadingSameAsYesterday
                          ? "Loading…"
                          : `Quick-add ${sameAsYesterdayItems.length} item${sameAsYesterdayItems.length === 1 ? "" : "s"} from yesterday's ${meal?.label ?? "meal"}`}
                    </p>
                  </div>
                </button>
              ) : isLoadingSameAsYesterday ? (
                <div className="mb-3 rounded-2xl border border-border/60 bg-card/80 px-4 py-3 text-xs text-muted-foreground">
                  Checking yesterday's {meal?.label ?? "meal"}…
                </div>
              ) : null}
              <FoodList
                foods={foods}
                onSelect={onSelectFood}
                onQuickAdd={onQuickAddFood}
                onQuickRemove={onQuickRemoveFood}
                loggedFoodIds={loggedFoodIds}
                loggedFoodNames={loggedFoodNames}
                mealLabel={meal?.label ?? "meal"}
              />
            </TabsContent>
            <TabsContent value="liked" className="mt-4">
              <FoodList
                foods={foods}
                onSelect={onSelectFood}
                onQuickAdd={onQuickAddFood}
                onQuickRemove={onQuickRemoveFood}
                loggedFoodIds={loggedFoodIds}
                loggedFoodNames={loggedFoodNames}
                mealLabel={meal?.label ?? "meal"}
              />
            </TabsContent>
            <TabsContent value="history" className="mt-4">
              <FoodList
                foods={foods}
                onSelect={onSelectFood}
                onQuickAdd={onQuickAddFood}
                onQuickRemove={onQuickRemoveFood}
                loggedFoodIds={loggedFoodIds}
                loggedFoodNames={loggedFoodNames}
                mealLabel={meal?.label ?? "meal"}
              />
            </TabsContent>
          </>
        ) : null}
      </Tabs>
    </div>
  );
};

const EmptyState = ({
  children,
  onAction,
  actionLabel,
}: {
  children: React.ReactNode;
  onAction?: () => void;
  actionLabel?: string;
}) => (
  <div className="mt-4 rounded-[24px] border border-dashed border-border bg-card px-4 py-6 text-center text-sm text-muted-foreground">
    {children}
    {onAction && actionLabel ? (
      <Button
        variant="secondary"
        className="mt-3 w-full rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    ) : null}
  </div>
);

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
      className="flex flex-col gap-2 rounded-[22px] border border-border/60 bg-card px-4 py-3 text-left shadow-[0_10px_24px_rgba(15,23,42,0.06)]"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-primary">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </button>
  </Pressable>
);
