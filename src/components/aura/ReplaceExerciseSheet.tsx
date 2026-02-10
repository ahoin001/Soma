import { useEffect, useMemo, useRef } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
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
      searchExercises(query, controller.signal, "mine");
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, searchExercises]);

  const previewItems = useMemo(() => results.slice(0, 120), [results]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[36px] border-none bg-slate-950 pb-6 text-white">
        <DrawerHeader className="sr-only">
          <DrawerTitle>Replace exercise</DrawerTitle>
        </DrawerHeader>
        <div className="aura-sheet-body-fit">
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
            {query.trim().length > 1 ? (
              <Button
                className="w-full rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={() => {
                  onSelect(query.trim());
                  onOpenChange(false);
                }}
              >
                Create "{query.trim()}"
              </Button>
            ) : null}
          </div>

          <Button
            variant="secondary"
            className="mt-6 w-full rounded-full bg-white/15 text-white hover:bg-white/25"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
