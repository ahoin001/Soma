import type { FoodItem } from "@/data/mock";
import type { FC } from "react";
import { Check, Plus, X } from "lucide-react";
import { Pressable } from "./Pressable";
import { useUserSettings } from "@/state";
import { preloadFoodDetail } from "./FoodDetailSheet";
import { AnimatePresence, motion } from "framer-motion";

export type FoodListProps = {
  foods: FoodItem[];
  onSelect: (food: FoodItem) => void;
  onQuickAdd?: (food: FoodItem) => void;
  onQuickRemove?: (food: FoodItem) => void;
  loggedFoodIds?: Set<string>;
  loggedFoodNames?: Set<string>;
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
            className="flex w-full items-center justify-between rounded-[24px] border border-black/5 bg-white px-4 py-3 text-left shadow-[0_12px_28px_rgba(15,23,42,0.08)]"
          >
            <Pressable className="flex-1">
              <button
                type="button"
                onClick={() => onSelect(food)}
                onPointerDown={() => preloadFoodDetail(food.id)}
                onMouseEnter={() => preloadFoodDetail(food.id)}
                className="flex w-full items-center gap-3 text-left"
              >
                <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-emerald-50 text-xl">
                  {showFoodImages && food.imageUrl ? (
                    <img
                      src={food.imageUrl}
                      alt={food.name}
                      className="h-full w-full object-cover object-center"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    food.emoji
                  )}
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800">{food.name}</p>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      {food.brandLogoUrl && (
                        <img
                          src={food.brandLogoUrl}
                          alt={food.brand ?? ""}
                          className="h-4 w-4 rounded-full object-cover"
                          loading="lazy"
                          decoding="async"
                        />
                      )}
                      {food.brand ? `${food.brand} • ` : ""}
                      {food.portion} • {food.kcal} cal
                    </span>
                    {isLogged ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-600">
                        <Check className="h-3 w-3" />
                        In {mealLabel}
                      </span>
                    ) : null}
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
                    ? "bg-rose-50 text-rose-500"
                    : isLogged
                    ? "bg-emerald-100 text-emerald-400"
                    : "bg-emerald-50 text-emerald-500"
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
