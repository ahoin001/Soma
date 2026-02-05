import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import type { LogItem } from "@/types/log";
import type { FoodItem } from "@/data/mock";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/state/AppStore";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { calculateMacroPercent } from "@/data/foodApi";

type EditLogSheetProps = {
  open: boolean;
  item: LogItem | null;
  onOpenChange: (open: boolean) => void;
  onSave: (item: LogItem, multiplier: number) => void | Promise<void>;
  onDelete?: (item: LogItem) => void | Promise<void>;
};

export const EditLogSheet = ({
  open,
  item,
  onOpenChange,
  onSave,
  onDelete,
}: EditLogSheetProps) => {
  const [multiplier, setMultiplier] = useState(1);
  const [pulse, setPulse] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);
  const draftTimerRef = useRef<number | null>(null);
  const { showFoodImages } = useAppStore();
  const [saving, setSaving] = useState(false);
  const { email } = useAuth();
  const navigate = useNavigate();
  const isAdmin = email?.toLowerCase() === "ahoin001@gmail.com";
  const safeMultiplier = Number.isFinite(multiplier) ? multiplier : 1;

  useEffect(() => {
    if (!open) return;
    const key = item ? `aurafit-log-draft:${item.id}` : null;
    if (key && typeof window !== "undefined") {
      const stored = window.localStorage.getItem(key);
      if (stored) {
        const next = Number(stored);
        if (Number.isFinite(next) && next > 0) {
          setMultiplier(next);
          return;
        }
      }
    }
    if (item?.quantity !== undefined) {
      const next = Number(item.quantity);
      if (Number.isFinite(next) && next > 0) {
        setMultiplier(next);
        return;
      }
    }
    setMultiplier(1);
  }, [open, item]);

  useEffect(() => {
    if (!open || !item) return;
    if (typeof window === "undefined") return;
    if (draftTimerRef.current) {
      window.clearTimeout(draftTimerRef.current);
    }
    const key = `aurafit-log-draft:${item.id}`;
    draftTimerRef.current = window.setTimeout(() => {
      window.localStorage.setItem(key, String(multiplier));
    }, 200);
    return () => {
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }
    };
  }, [multiplier, open, item?.id]);

  useEffect(() => {
    setPulse(true);
    const timer = window.setTimeout(() => setPulse(false), 180);
    return () => window.clearTimeout(timer);
  }, [multiplier]);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    scrollRef.current.scrollTop = 0;
  }, [open]);

  useEffect(() => {
    if (!open || typeof window === "undefined") return;
    if (!import.meta.env.DEV) return;
    const log = (label: string) => {
      const contentRect = contentRef.current?.getBoundingClientRect();
      const scrollRect = scrollRef.current?.getBoundingClientRect();
      console.info("[AuraFit][Sheet][EditLog]", {
        label,
        scrollY: window.scrollY,
        innerHeight: window.innerHeight,
        visualViewport: window.visualViewport?.height,
        contentTop: contentRect?.top ?? null,
        contentBottom: contentRect?.bottom ?? null,
        contentHeight: contentRect?.height ?? null,
        scrollTop: scrollRect?.top ?? null,
        scrollBottom: scrollRect?.bottom ?? null,
        scrollHeight: scrollRect?.height ?? null,
      });
    };
    log("opening sheet");
    const onScroll = () => log("scroll");
    const onResize = () => log("resize");
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      log("closing sheet");
    };
  }, [open]);

  const scaled = useMemo(() => {
    if (!item) {
      return { kcal: 0, carbs: 0, protein: 0, fat: 0 };
    }
    return {
      kcal: Math.round(item.kcal * safeMultiplier),
      carbs: Math.round(item.macros.carbs * safeMultiplier),
      protein: Math.round(item.macros.protein * safeMultiplier),
      fat: Math.round(item.macros.fat * safeMultiplier),
    };
  }, [item, safeMultiplier]);

  const adminFood = useMemo<FoodItem | null>(() => {
    if (!item?.foodId) return null;
    const portion =
      item.portionLabel?.trim() ||
      (item.portionGrams ? `${item.portionGrams} g` : "1 serving");
    return {
      id: item.foodId,
      name: item.name,
      portion,
      portionLabel: item.portionLabel ?? undefined,
      portionGrams: item.portionGrams ?? undefined,
      kcal: item.kcal,
      emoji: item.emoji,
      imageUrl: item.imageUrl ?? undefined,
      macros: { ...item.macros },
      macroPercent: calculateMacroPercent(item.macros),
    };
  }, [item]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && saving) return;
    onOpenChange(nextOpen);
  };

  return (
    <Drawer open={open} onOpenChange={handleOpenChange}>
      <DrawerContent className="relative rounded-t-[36px] border-none bg-aura-surface pb-[env(safe-area-inset-bottom)] overflow-hidden">
        {saving && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 text-sm font-semibold text-emerald-700 backdrop-blur">
            Saving changes...
          </div>
        )}
        <DrawerHeader className="sr-only">
          <DrawerTitle>Edit meal item</DrawerTitle>
        </DrawerHeader>
        {item && (
          <div
            ref={contentRef}
            className="aura-sheet-scroll max-h-[calc(100svh-160px)]"
            data-vaul-no-drag
          >
            <div className="flex items-center justify-center pt-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 border-white bg-white text-3xl shadow-[0_14px_30px_rgba(15,23,42,0.1)]">
                {showFoodImages && item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="h-full w-full object-cover object-center"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  item.emoji
                )}
              </div>
            </div>

            <div className="mt-4 text-center">
              {item.mealEmoji || item.mealLabel ? (
                <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-600">
                  <span>{item.mealEmoji ?? "🍽️"}</span>
                  <span>{item.mealLabel ?? "Meal"}</span>
                </div>
              ) : null}
              <h3 className="text-xl font-display font-semibold text-slate-900">
                {item.name}
              </h3>
              <p className="text-sm text-slate-500">
                Adjust serving size
              </p>
            </div>

            <div className="mt-6 rounded-[24px] border border-black/5 bg-white px-4 py-5 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
              <div className="flex items-center justify-between text-sm font-semibold text-slate-800">
                <span>Serving</span>
                <span
                  className={`text-emerald-600 transition-transform duration-150 ${
                    pulse ? "scale-110" : "scale-100"
                  }`}
                >
                  {safeMultiplier.toFixed(1)}x
                </span>
              </div>
              <div className="mt-4 grid grid-cols-[44px_1fr_44px] items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 w-11 rounded-full text-lg font-semibold active:scale-95"
                  onClick={() =>
                    setMultiplier((prev) => Math.max(1, Math.round(prev - 1)))
                  }
                >
                  −
                </Button>
                <Input
                  type="number"
                  min={1}
                  max={10}
                  step={1}
                  inputMode="decimal"
                  value={safeMultiplier}
                  onChange={(event) => {
                    const next = Number(event.target.value);
                    if (!Number.isFinite(next)) return;
                    setMultiplier(Math.min(10, Math.max(1, Math.round(next))));
                  }}
                  className="h-11 rounded-full text-center text-sm font-semibold"
                />
                <Button
                  type="button"
                  variant="secondary"
                  className="h-11 w-11 rounded-full text-lg font-semibold active:scale-95"
                  onClick={() =>
                    setMultiplier((prev) => Math.min(10, Math.round(prev + 1)))
                  }
                >
                  +
                </Button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5].map((value) => (
                  <Button
                    key={value}
                    type="button"
                    variant={safeMultiplier === value ? "default" : "secondary"}
                    className="h-9 rounded-full px-4 text-xs font-semibold transition-transform active:scale-95"
                    onClick={() => setMultiplier(value)}
                  >
                    {value.toFixed(1)}x
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
              <span className="text-sm font-semibold text-slate-700">
                Calories
              </span>
              <span className="text-lg font-display font-semibold text-slate-900">
                {scaled.kcal} cal
              </span>
            </div>

            <div className="mt-6 grid gap-3">
              {isAdmin ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="w-full rounded-full py-5 text-sm font-semibold"
                  onClick={() => {
                    if (!adminFood) return;
                    onOpenChange(false);
                    navigate("/nutrition/food/edit", {
                      state: { food: adminFood, returnTo: "/nutrition" },
                    });
                  }}
                  disabled={!adminFood}
                >
                  Admin edit food
                </Button>
              ) : null}
              <Button
                className="w-full rounded-full bg-aura-primary py-6 text-base font-semibold text-white shadow-[0_16px_30px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90"
                onClick={async () => {
                  setSaving(true);
                  onOpenChange(false);
                  try {
                    await onSave(item, safeMultiplier);
                  } finally {
                    setSaving(false);
                  }
                }}
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full rounded-full py-5 text-sm font-semibold"
                onClick={() => {
                  if (!onDelete) return;
                  onOpenChange(false);
                  void onDelete(item);
                }}
                disabled={saving}
              >
                Remove from meal
              </Button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};
