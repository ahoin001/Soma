import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Slider } from "@/components/ui/slider";
import type { LogItem } from "@/types/log";
import { useEffect, useMemo, useRef, useState } from "react";

type EditLogSheetProps = {
  open: boolean;
  item: LogItem | null;
  onOpenChange: (open: boolean) => void;
  onSave: (item: LogItem, multiplier: number) => void;
};

export const EditLogSheet = ({
  open,
  item,
  onOpenChange,
  onSave,
}: EditLogSheetProps) => {
  const [multiplier, setMultiplier] = useState(1);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    setMultiplier(1);
  }, [open, item]);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    scrollRef.current.scrollTop = 0;
  }, [open]);

  const scaledKcal = useMemo(() => {
    if (!item) return 0;
    return Math.round(item.kcal * multiplier);
  }, [item, multiplier]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-[calc(1.5rem+env(safe-area-inset-bottom))] overflow-hidden">
        {item && (
          <div
            ref={scrollRef}
            className="max-h-[85vh] overflow-y-auto px-5 pb-6 pt-2"
            data-vaul-no-drag
          >
            <div className="flex items-center justify-center">
              <div className="-mt-12 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-white text-3xl shadow-[0_14px_30px_rgba(15,23,42,0.1)]">
                {item.emoji}
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
                <span className="text-emerald-600">
                  {multiplier.toFixed(1)}x
                </span>
              </div>
              <Slider
                value={[multiplier]}
                min={0.5}
                max={2}
                step={0.1}
                onValueChange={(value) => setMultiplier(value[0])}
                className="mt-4"
              />
              <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                <span>0.5x</span>
                <span>2.0x</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between rounded-[24px] border border-black/5 bg-white px-4 py-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
              <span className="text-sm font-semibold text-slate-700">
                Calories
              </span>
              <span className="text-lg font-display font-semibold text-slate-900">
                {scaledKcal} kcal
              </span>
            </div>

            <Button
              className="mt-6 w-full rounded-full bg-aura-primary py-6 text-base font-semibold text-white shadow-[0_16px_30px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90"
              onClick={() => {
                onSave(item, multiplier);
                onOpenChange(false);
              }}
            >
              Save changes
            </Button>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};
