import { useMemo, useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import type { Exercise } from "@/types/fitness";

type ExerciseDetailSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exercise: Exercise | null;
  loading?: boolean;
  canAddToRoutine: boolean;
  onAddToRoutine: (exercise: Exercise) => void;
  onAddToWorkout?: (exercise: Exercise) => void;
  onEditExercise?: (exercise: Exercise) => void;
  onAddToSession?: (exercise: Exercise) => void;
  /** When true (e.g. user email ahoin001@gmail.com), show delete exercise action. */
  isAdmin?: boolean;
  onDeleteExercise?: (exercise: Exercise) => void | Promise<void>;
};

export const ExerciseDetailSheet = ({
  open,
  onOpenChange,
  exercise,
  loading,
  canAddToRoutine,
  onAddToRoutine,
  onAddToWorkout,
  onEditExercise,
  onAddToSession,
  isAdmin,
  onDeleteExercise,
}: ExerciseDetailSheetProps) => {
  const showLoading = loading || !exercise;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const description = useMemo(
    () => (exercise?.description || "No description available yet."),
    [exercise],
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[36px] border-none bg-background pb-6 text-foreground">
        <div className="aura-sheet-body-fit">
          {showLoading ? (
            <>
              <div className="mt-2 text-center">
                <Skeleton className="mx-auto h-4 w-28 rounded-full bg-secondary/35" />
                <Skeleton className="mx-auto mt-2 h-7 w-48 rounded-full bg-secondary/35" />
                <Skeleton className="mx-auto mt-2 h-4 w-32 rounded-full bg-secondary/35" />
              </div>
              <div className="mt-6 space-y-4">
                <Skeleton className="h-20 w-full rounded-[28px] bg-secondary/35" />
                <Skeleton className="h-20 w-full rounded-[28px] bg-secondary/35" />
                <Skeleton className="h-24 w-full rounded-[28px] bg-secondary/35" />
              </div>
              <div className="mt-6 grid gap-3">
                <Skeleton className="h-11 w-full rounded-full bg-secondary/35" />
                <Skeleton className="h-11 w-full rounded-full bg-secondary/35" />
              </div>
            </>
          ) : (
            <>
              <div className="mt-2 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Exercise detail
                </p>
                <h3 className="mt-2 text-2xl font-display font-semibold">
                  {exercise.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {exercise.category}
                </p>
              </div>

              <div className="mt-6 rounded-[28px] border border-border/70 bg-card/55 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Muscle map
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {exercise.muscles.length ? (
                    exercise.muscles.map((muscle) => (
                      <Badge
                        key={muscle}
                        variant="secondary"
                        className="border border-border/70 bg-secondary/70 text-foreground"
                      >
                        {muscle}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      Primary muscles not listed.
                    </span>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-[28px] border border-border/70 bg-card/55 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Equipment
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {exercise.equipment.length ? (
                    exercise.equipment.map((item) => (
                      <Badge
                        key={item}
                        variant="outline"
                        className="border-border/70 text-foreground"
                      >
                        {item}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-sm text-muted-foreground">Bodyweight</span>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-[28px] border border-border/70 bg-card/55 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Form cues
                </p>
                <p className="mt-2 text-sm text-foreground/80">{description}</p>
              </div>

              <div className="mt-6 grid gap-3">
                <Button
                  className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => onAddToRoutine(exercise)}
                  disabled={!canAddToRoutine}
                >
                  Add to routine
                </Button>
                {onAddToWorkout ? (
                  <Button
                    variant="secondary"
                    className="w-full rounded-full bg-secondary/35 text-foreground hover:bg-secondary/65"
                    onClick={() => onAddToWorkout(exercise)}
                  >
                    Add to workout
                  </Button>
                ) : null}
                {onEditExercise ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-full border-border/70 text-foreground hover:bg-secondary/35"
                    onClick={() => onEditExercise(exercise)}
                  >
                    Edit exercise
                  </Button>
                ) : null}
                {onAddToSession ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-full border-border/70 text-foreground hover:bg-secondary/35"
                    onClick={() => onAddToSession(exercise)}
                  >
                    Add to active session
                  </Button>
                ) : null}
                {isAdmin && onDeleteExercise ? (
                  <>
                    <Button
                      variant="outline"
                      className="w-full rounded-full border-destructive/50 text-destructive hover:bg-destructive/15"
                      onClick={() => setDeleteConfirmOpen(true)}
                      disabled={deleting}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete exercise
                    </Button>
                    <AlertDialog
                      open={deleteConfirmOpen}
                      onOpenChange={setDeleteConfirmOpen}
                    >
                      <AlertDialogContent className="border-border/70 bg-card text-foreground">
                        <AlertDialogTitle>Delete this exercise?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will remove &quot;{exercise.name}&quot; from the
                          exercise library. This action cannot be undone.
                        </AlertDialogDescription>
                        <AlertDialogFooter>
                          <AlertDialogCancel className="border-border/70 text-foreground hover:bg-secondary/35">
                            Cancel
                          </AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async (e) => {
                              e.preventDefault();
                              setDeleting(true);
                              try {
                                await onDeleteExercise(exercise);
                                setDeleteConfirmOpen(false);
                                onOpenChange(false);
                              } catch {
                                // Caller can toast; keep dialog open so user can retry
                              } finally {
                                setDeleting(false);
                              }
                            }}
                          >
                            {deleting ? "Deleting…" : "Delete"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </>
                ) : null}
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
