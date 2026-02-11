import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import type { WorkoutPlan, WorkoutTemplate } from "@/types/fitness";
import { Copy, Dumbbell, Pencil, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

type WorkoutTemplateSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: WorkoutTemplate | null;
  plan: WorkoutPlan | null;
  loading?: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  onDuplicate?: () => void;
};

export const WorkoutTemplateSheet = ({
  open,
  onOpenChange,
  workout,
  plan,
  loading,
  onEdit,
  onDelete,
  onRename,
  onDuplicate,
}: WorkoutTemplateSheetProps) => {
  const showLoading = loading || !workout;
  const [name, setName] = useState("");
  const trimmedName = name.trim();
  const isDirty = Boolean(workout && trimmedName && trimmedName !== workout.name);

  useEffect(() => {
    setName(workout?.name ?? "");
  }, [workout]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[36px] border-none bg-background pb-6 text-foreground">
        <div className="aura-sheet-body-fit">
          {showLoading ? (
            <>
              <div className="mt-2 text-center">
                <Skeleton className="mx-auto h-12 w-12 rounded-2xl bg-secondary/60" />
                <Skeleton className="mx-auto mt-3 h-7 w-48 rounded-full bg-secondary/60" />
                <Skeleton className="mx-auto mt-2 h-4 w-40 rounded-full bg-secondary/60" />
              </div>
              <div className="mt-5 space-y-3">
                <Skeleton className="h-12 w-full rounded-2xl bg-secondary/60" />
                <div className="grid gap-3">
                  <Skeleton className="h-11 w-full rounded-full bg-secondary/60" />
                  <Skeleton className="h-11 w-full rounded-full bg-secondary/60" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mt-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-card/60">
                  <Dumbbell className="h-6 w-6 text-foreground/80" />
                </div>
                <h3 className="mt-3 text-2xl font-display font-semibold">
                  {workout.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan?.name ?? "Workout"} · {(workout.exercises ?? []).length} exercises
                </p>
              </div>

              <div className="mt-5">
                <p className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
                  Rename
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="Workout name"
                    className="border-border/70 bg-card/55 text-foreground placeholder:text-muted-foreground"
                  />
                  {isDirty ? (
                    <Button
                      variant="ghost"
                      className="h-11 rounded-full bg-secondary px-4 text-sm text-secondary-foreground hover:bg-secondary/80"
                      onClick={() => {
                        if (!trimmedName) return;
                        onRename(trimmedName);
                        setName(trimmedName);
                      }}
                      aria-label="Save workout name"
                    >
                      <Pencil className="h-4 w-4" />
                      Save
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <Button
                  className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={onEdit}
                >
                  Edit workout
                </Button>
                {onDuplicate ? (
                  <Button
                    variant="outline"
                    className="w-full rounded-full border-border/70 text-foreground hover:bg-secondary/70"
                    onClick={onDuplicate}
                  >
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate workout
                  </Button>
                ) : null}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      <Trash2 className="h-4 w-4" />
                      Delete workout
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-border/70 bg-card text-card-foreground">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this workout?</AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground">
                        This removes the workout from the plan.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full border-border/70 text-foreground hover:bg-secondary/70">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={onDelete}
                      >
                        Delete workout
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
};
