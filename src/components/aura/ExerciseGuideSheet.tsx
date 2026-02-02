import { useEffect, useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { WorkoutExerciseEntry } from "@/types/fitness";
import { fetchWgerExerciseImages, searchWgerExercises } from "@/data/exerciseApi";

type ExerciseGuideSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: WorkoutExerciseEntry | null;
  onUpdate: (patch: Partial<WorkoutExerciseEntry>) => void;
};

export const ExerciseGuideSheet = ({
  open,
  onOpenChange,
  exercise,
  onUpdate,
}: ExerciseGuideSheetProps) => {
  if (!exercise) return null;
  const stepsValue = (exercise.steps ?? []).join("\n");
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaLabel, setMediaLabel] = useState<string>("Media preview");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const loadMedia = async () => {
      try {
        const results = await searchWgerExercises(exercise.name);
        const first = results[0];
        if (!first) return;
        const images = await fetchWgerExerciseImages(first.id);
        if (!cancelled) {
          setMediaUrl(images[0] ?? null);
          setMediaLabel("wger image");
        }
      } catch {
        if (!cancelled) {
          setMediaUrl(null);
          setMediaLabel("Media preview");
        }
      }
    };
    loadMedia();
    return () => {
      cancelled = true;
    };
  }, [exercise.name, open]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[36px] border-none bg-slate-950 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-white">
        <div className="px-5 pb-6 pt-2">
          <div className="mt-2 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Exercise guide
            </p>
            <h3 className="mt-2 text-2xl font-display font-semibold">
              {exercise.name}
            </h3>
          </div>

          <div className="mt-6 overflow-hidden rounded-[24px] border border-white/10 bg-gradient-to-br from-emerald-500/20 via-slate-950 to-slate-950">
            <div className="flex h-44 items-center justify-center">
              {mediaUrl ? (
                <img
                  src={mediaUrl}
                  alt={`${exercise.name} demo`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-sm text-white/60">
                  {mediaLabel}
                </span>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Steps & cues
            </p>
            <Textarea
              value={stepsValue}
              onChange={(event) => {
                const lines = event.target.value
                  .split("\n")
                  .map((line) => line.trim())
                  .filter(Boolean);
                onUpdate({ steps: lines });
              }}
              placeholder="1. Set your stance...\n2. Brace core...\n3. Control the eccentric..."
              className="min-h-[120px] border-white/10 bg-white/5 text-white placeholder:text-white/40"
            />
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              YouTube link
            </p>
            <Input
              value={exercise.guideUrl ?? ""}
              onChange={(event) => onUpdate({ guideUrl: event.target.value })}
              placeholder="https://youtube.com/..."
              className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
            />
            {exercise.guideUrl ? (
              <Button
                variant="outline"
                className="w-full rounded-full border-white/20 text-white hover:bg-white/10"
                onClick={() => window.open(exercise.guideUrl, "_blank")}
              >
                Open guide
              </Button>
            ) : null}
          </div>

          <div className="mt-5 space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Upload your own video
            </p>
            <label className="flex cursor-pointer items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
              <span>
                {exercise.customVideoName
                  ? exercise.customVideoName
                  : "Choose a file"}
              </span>
              <span className="text-emerald-300">Upload</span>
              <input
                type="file"
                accept="video/*"
                className="sr-only"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  onUpdate({ customVideoName: file.name });
                }}
              />
            </label>
          </div>

          <div className="mt-6">
            <Button
              className="w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              onClick={() => onOpenChange(false)}
            >
              Done
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
};
