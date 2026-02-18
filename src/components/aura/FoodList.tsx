import type { FoodItem } from "@/data/mock";
import type { FC } from "react";
import { Check, Plus, X } from "lucide-react";
import { Pressable } from "./Pressable";
import { useUserSettings } from "@/state";
import { preloadFoodDetail } from "./FoodDetailSheet";
import { FoodImage } from "./FoodImage";
import { AnimatePresence, motion } from "framer-motion";
import { deriveFoodTags, getFoodTagLabel } from "@/lib/foodClassification";

export type FoodListProps = {
  foods: FoodItem[];
  onSelect: (food: FoodItem) => void;
  onQuickAdd?: (food: FoodItem) => void;
  onQuickRemove?: (food: FoodItem) => void;
  loggedFoodIds?: Set<string>;
  loggedFoodNames?: Set<string>;
  pendingFoodKeys?: Set<string>;
  successFoodKeys?: Set<string>;
  mealLabel?: string;
};

export const FoodList: FC<FoodListProps> = ({
  foods,
  onSelect,
  onQuickAdd,
  onQuickRemove,
  loggedFoodIds,
  loggedFoodNames,
  mealLabel = "meal",
}) => {
  const { showFoodImages } = useUserSettings();

  return (
    <motion.div
      className="space-y-3"
      variants={{ show: { transition: { staggerChildren: 0.04 } } }}
      initial="hidden"
      animate="show"
    >
      <AnimatePresence initial={false}>
        {foods.map((food) => {
          const isLogged =
            (food.id && loggedFoodIds?.has(food.id)) ||
            loggedFoodNames?.has(food.name.trim().toLowerCase());
          const canQuickRemove = isLogged && Boolean(onQuickRemove);
          const tags = deriveFoodTags(food).slice(0, 3);
          return (
          <motion.div
            key={food.id}
            layout
            variants={{
              hidden: { opacity: 0, y: 8 },
              show: { opacity: 1, y: 0 },
              exit: { opacity: 0, y: -6 },
            }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="flex w-full items-center justify-between rounded-[24px] border border-border/60 bg-card px-4 py-3 text-left shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
          >
            <Pressable className="flex-1">
              <button
                type="button"
                onClick={() => onSelect(food)}
                onPointerDown={() => preloadFoodDetail(food.id)}
                onMouseEnter={() => preloadFoodDetail(food.id)}
                className="flex w-full items-center gap-3 text-left"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-secondary text-xl">
                  {showFoodImages && food.imageUrl ? (
                    <FoodImage
                      src={food.imageUrl}
                      alt={food.name}
                      className="h-full w-full object-contain object-center"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    food.emoji
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{food.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      {food.brandLogoUrl && (
                        <img
                          src={food.brandLogoUrl}
                          alt={food.brand ?? ""}
                          className="h-4 w-4 rounded-full object-contain"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      {food.brand ? `${food.brand} • ` : ""}
                      {food.portion} • {food.kcal} cal
                    </span>
                    {isLogged ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                        <Check className="h-3 w-3" />
                        In {mealLabel}
                      </span>
                    ) : null}
                    {tags.map((tag) => (
                      <span
                        key={`${food.id}:${tag}`}
                        className="inline-flex items-center rounded-full border border-border/70 bg-secondary/70 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground"
                      >
                        {getFoodTagLabel(tag)}
                      </span>
                    ))}
                  </div>
                </div>
              </button>
            </Pressable>
            <Pressable>
              <button
                type="button"
                onClick={() => {
                  if (canQuickRemove) {
                    onQuickRemove?.(food);
                    return;
                  }
                  if (!isLogged) {
                    onQuickAdd?.(food);
                  }
                }}
                onPointerDown={() => preloadFoodDetail(food.id)}
                onMouseEnter={() => preloadFoodDetail(food.id)}
                className={`flex h-8 w-8 items-center justify-center rounded-full ${
                  canQuickRemove
                    ? "bg-destructive/12 text-destructive"
                    : isLogged
                    ? "bg-primary/15 text-primary/80"
                    : "bg-secondary text-primary"
                }`}
                aria-label={
                  canQuickRemove
                    ? `Remove ${food.name} from ${mealLabel}`
                    : isLogged
                      ? `${food.name} already in ${mealLabel}`
                      : `Add ${food.name}`
                }
              >
                {canQuickRemove ? (
                  <X className="h-4 w-4" />
                ) : isLogged ? (
                  <Check className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
              </button>
            </Pressable>
          </motion.div>
        );
        })}
      </AnimatePresence>
    </motion.div>
  );
};
