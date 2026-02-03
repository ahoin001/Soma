import { useMemo } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Exercise } from "@/types/fitness";

type ExerciseDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
  canAddToRoutine: boolean;
  onAddToRoutine: (exercise: Exercise) => void;
  onAddToWorkout?: (exercise: Exercise) => void;
  onEditExercise?: (exercise: Exercise) => void;
  onAddToSession?: (exercise: Exercise) => void;
};

export const ExerciseDetailSheet = ({
  open,
  onOpenChange,
  exercise,
  canAddToRoutine,
  onAddToRoutine,
  onAddToWorkout,
  onEditExercise,
  onAddToSession,
}: ExerciseDetailSheetProps) => {
  const description = useMemo(
    () => (exercise?.description || "No description available yet."),
    [exercise],
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[36px] border-none bg-slate-950 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-white">
        {exercise && (
          <div className="px-5 pb-6 pt-2">
            <div className="mt-2 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                Exercise detail
              </p>
              <h3 className="mt-2 text-2xl font-display font-semibold">
                {exercise.name}
              </h3>
              <p className="mt-1 text-sm text-white/60">{exercise.category}</p>
            </div>

            <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                Muscle map
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {exercise.muscles.length ? (
                  exercise.muscles.map((muscle) => (
                    <Badge
                      key={muscle}
                      variant="secondary"
                      className="border border-white/10 bg-white/10 text-white"
                    >
                      {muscle}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-white/60">
                    Primary muscles not listed.
                  </span>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-[28px] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                Equipment
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {exercise.equipment.length ? (
                  exercise.equipment.map((item) => (
                    <Badge
                      key={item}
                      variant="outline"
                      className="border-white/10 text-white"
                    >
                      {item}
                    </Badge>
                  ))
                ) : (
                  <span className="text-sm text-white/60">Bodyweight</span>
                )}
              </div>
            </div>

            <div className="mt-4 rounded-[28px] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                Form cues
              </p>
              <p className="mt-2 text-sm text-white/70">{description}</p>
            </div>

            <div className="mt-6 grid gap-3">
              <Button
                className="w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                onClick={() => onAddToRoutine(exercise)}
                disabled={!canAddToRoutine}
              >
                Add to routine
              </Button>
              {onAddToWorkout ? (
                <Button
                  variant="secondary"
                  className="w-full rounded-full bg-white/10 text-white hover:bg-white/20"
                  onClick={() => onAddToWorkout(exercise)}
                >
                  Add to workout
                </Button>
              ) : null}
              {onEditExercise ? (
                <Button
                  variant="outline"
                  className="w-full rounded-full border-white/20 text-white hover:bg-white/10"
                  onClick={() => onEditExercise(exercise)}
                >
                  Edit exercise
                </Button>
              ) : null}
              {onAddToSession ? (
                <Button
                  variant="outline"
                  className="w-full rounded-full border-white/20 text-white hover:bg-white/10"
                  onClick={() => onAddToSession(exercise)}
                >
                  Add to active session
                </Button>
              ) : null}
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};
