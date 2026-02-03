import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import type { LogItem } from "@/types/log";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/state/AppStore";

type EditLogSheetProps = {
  open: boolean;
  item: LogItem | null;
  onOpenChange: (open: boolean) => void;
  onSave: (item: LogItem, multiplier: number) => void;
  onDelete?: (item: LogItem) => void;
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
  const draftTimerRef = useRef<number | null>(null);
  const { showFoodImages } = useAppStore();
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

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-[calc(1.5rem+env(safe-area-inset-bottom))] overflow-hidden">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Edit meal item</DrawerTitle>
        </DrawerHeader>
        {item && (
          <div
            ref={scrollRef}
            className="max-h-[85vh] overflow-y-auto px-5 pb-6 pt-2"
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
              <Button
                className="w-full rounded-full bg-aura-primary py-6 text-base font-semibold text-white shadow-[0_16px_30px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90"
                onClick={() => {
                  onSave(item, safeMultiplier);
                  onOpenChange(false);
                }}
              >
                Save changes
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="w-full rounded-full py-5 text-sm font-semibold"
                onClick={() => {
                  onDelete?.(item);
                  onOpenChange(false);
                }}
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
