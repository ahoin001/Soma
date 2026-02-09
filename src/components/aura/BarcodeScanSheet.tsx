import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, ScanLine } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

type BarcodeScanSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDetected?: (value: string) => void;
};

export const BarcodeScanSheet = ({
  open,
  onOpenChange,
  onDetected,
}: BarcodeScanSheetProps) => {
  const { start, stop, state, message, supported, videoRef } =
    useBarcodeScanner({
      onDetected: (result) => {
        if (onDetected) {
          onDetected(result.rawValue);
        } else {
          toast("Barcode detected", {
            description: result.rawValue,
          });
        }
        onOpenChange(false);
      },
      onError: (detail) => {
        toast("Scan unavailable", { description: detail });
      },
    });

  useEffect(() => {
    if (!open) {
      stop();
    }
  }, [open, stop]);

  const handleStart = () => {
    if (navigator.vibrate) {
      navigator.vibrate(15);
    }
    start();
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[36px] border-none bg-aura-surface pb-6">
        <div className="aura-sheet-body">
          <div className="text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-500">
              <Camera className="h-6 w-6" />
            </div>
            <h3 className="mt-3 text-xl font-display font-semibold text-slate-900">
              Barcode scan
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Point your camera at a barcode to log quickly.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-black/5 bg-white p-4 shadow-[0_14px_30px_rgba(15,23,42,0.08)]">
            <div className="relative flex h-44 items-center justify-center overflow-hidden rounded-[18px] bg-emerald-50/70">
              <video
                ref={videoRef}
                className="h-full w-full object-contain"
                playsInline
                muted
              />
              {!supported && (
                <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-emerald-700">
                  Barcode scanning not supported
                </div>
              )}
              {supported && state === "idle" && (
                <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-emerald-700">
                  Camera preview
                </div>
              )}
              <AnimatePresence>
                {state === "scanning" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-x-6"
                  >
                    <motion.div
                      className="h-1 w-full rounded-full bg-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.6)]"
                      animate={{ y: [10, 120, 10] }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
              {state === "error" && message && (
                <div className="absolute inset-0 flex items-center justify-center text-center text-sm text-rose-500">
                  {message}
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <Button
              className="w-full rounded-full bg-aura-primary py-6 text-base font-semibold text-white shadow-[0_16px_30px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90"
              onClick={handleStart}
              disabled={!supported || state === "scanning"}
            >
              {state === "scanning" ? "Scanning..." : "Start scanning"}
            </Button>
            <Button
              variant="secondary"
              className="w-full rounded-full py-6 text-base font-semibold"
              onClick={stop}
              disabled={state !== "scanning"}
            >
              Stop
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
