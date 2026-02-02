import { useEffect, useMemo, useRef } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/state/AppStore";
import { VirtualizedExerciseList } from "./VirtualizedExerciseList";

type ReplaceExerciseSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (name: string) => void;
};

export const ReplaceExerciseSheet = ({
  open,
  onOpenChange,
  onSelect,
}: ReplaceExerciseSheetProps) => {
  const {
    fitnessLibrary: { query, results, status, error, searchExercises, setQuery },
  } = useAppStore();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!query.trim()) return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const timer = window.setTimeout(() => {
      searchExercises(query, controller.signal);
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, searchExercises]);

  const previewItems = useMemo(() => results.slice(0, 120), [results]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[36px] border-none bg-slate-950 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-white">
        <div className="px-5 pb-6 pt-2">
          <div className="mt-2 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Replace exercise
            </p>
            <h3 className="mt-2 text-2xl font-display font-semibold">
              Find a replacement
            </h3>
          </div>

          <div className="mt-6 space-y-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search exercises"
              className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
            />
            {status === "error" ? (
              <p className="text-sm text-rose-300">{error}</p>
            ) : null}
            {status === "loading" ? (
              <p className="text-sm text-white/60">Loading exercises...</p>
            ) : null}
            {previewItems.length ? (
              <VirtualizedExerciseList
                items={previewItems}
                onSelect={(exercise) => {
                  onSelect(exercise.name);
                  onOpenChange(false);
                }}
              />
            ) : (
              <p className="text-sm text-white/50">
                Start typing to search the Atlas.
              </p>
            )}
          </div>

          <Button
            variant="outline"
            className="mt-6 w-full rounded-full border-white/20 text-white hover:bg-white/10"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
