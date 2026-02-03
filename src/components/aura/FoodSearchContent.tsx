import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FoodItem, Meal } from "@/data/mock";
import { Barcode, CheckCircle2, Heart, PlusCircle, Search } from "lucide-react";
import { FoodList } from "./FoodList";
import { Pressable } from "./Pressable";
import type { RefObject } from "react";

type FoodSearchContentProps = {
  activeTab: "recent" | "liked" | "history";
  onTabChange: (value: "recent" | "liked" | "history") => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  searchStatus: "idle" | "loading" | "error";
  searchError?: string | null;
  foods: FoodItem[];
  meal: Meal | null;
  meals: Meal[];
  onMealChange: (mealId: string) => void;
  onSelectFood: (food: FoodItem) => void;
  onQuickAddFood: (food: FoodItem) => void;
  onOpenBarcode: () => void;
  onOpenCreate: () => void;
  externalSearchEnabled: boolean;
  onExternalSearchChange: (enabled: boolean) => void;
  inputRef?: RefObject<HTMLInputElement>;
};

export const FoodSearchContent = ({
  activeTab,
  onTabChange,
  searchQuery,
  onSearchChange,
  searchStatus,
  searchError,
  foods,
  meal,
  meals,
  onMealChange,
  onSelectFood,
  onQuickAddFood,
  onOpenBarcode,
  onOpenCreate,
  externalSearchEnabled,
  onExternalSearchChange,
  inputRef,
}: FoodSearchContentProps) => {
  const isSearching = searchStatus === "loading" && searchQuery.trim().length > 0;
  const showEmpty =
    searchQuery.trim().length > 0 &&
    searchStatus !== "loading" &&
    foods.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-[0.2em] text-emerald-400">
          {meal?.label ?? "Meal"}
        </p>
        {meal ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-600">
            <CheckCircle2 className="h-3 w-3" />
            Selected
          </span>
        ) : null}
      </div>
      <h2 className="text-xl font-display font-semibold text-slate-900">
        Add food
      </h2>

      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
          Log to
        </p>
        <Select
          value={meal?.id ?? ""}
          onValueChange={(value) => {
            if (value) onMealChange(value);
          }}
        >
          <SelectTrigger className="mt-2 h-10 rounded-full border border-emerald-100 bg-white text-sm shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
            <SelectValue placeholder="Select a meal" />
          </SelectTrigger>
          <SelectContent>
            {meals.map((entry) => (
              <SelectItem key={entry.id} value={entry.id}>
                <span className="mr-2">{entry.emoji}</span>
                {entry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
          onClick={onOpenCreate}
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
      {isSearching ? (
        <div className="mt-3 text-xs font-semibold text-emerald-500">
          Searching foods...
        </div>
      ) : null}
      <div className="mt-3 flex items-center justify-between rounded-[18px] border border-emerald-100 bg-white px-4 py-3 shadow-[0_10px_24px_rgba(15,23,42,0.06)]">
        <div>
          <Label className="text-sm text-slate-800">Use food databases</Label>
          <p className="text-xs text-slate-500">
            Toggle off to skip external databases.
          </p>
        </div>
        <Switch
          checked={externalSearchEnabled}
          onCheckedChange={onExternalSearchChange}
        />
      </div>
      {!externalSearchEnabled ? (
        <div className="mt-3 rounded-[18px] border border-emerald-100 bg-emerald-50/70 px-4 py-3 text-xs text-emerald-700">
          External search is off. Create foods to build your personal catalog.
        </div>
      ) : null}
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
          <FoodList foods={foods} onSelect={onSelectFood} onQuickAdd={onQuickAddFood} />
          {showEmpty && (
            <EmptyState onAction={onOpenCreate} actionLabel="Create food">
              No results yet. Create a custom food to build your list.
            </EmptyState>
          )}
        </TabsContent>
        <TabsContent value="liked" className="mt-4">
          <FoodList foods={foods} onSelect={onSelectFood} onQuickAdd={onQuickAddFood} />
          {showEmpty && (
            <EmptyState>No results yet. Try a different search.</EmptyState>
          )}
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <FoodList foods={foods} onSelect={onSelectFood} onQuickAdd={onQuickAddFood} />
          {showEmpty && (
            <EmptyState>No results yet. Try a different search.</EmptyState>
          )}
        </TabsContent>
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
  <div className="mt-4 rounded-[24px] border border-dashed border-emerald-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
    {children}
    {onAction && actionLabel ? (
      <Button
        variant="secondary"
        className="mt-3 w-full rounded-full bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
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
