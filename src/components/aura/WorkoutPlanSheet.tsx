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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useEffect, useState } from "react";
import type { WorkoutPlan } from "@/types/fitness";
import { Folder, Pencil, Settings, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";

type WorkoutPlanSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  plan: WorkoutPlan | null;
  loading?: boolean;
  isActive: boolean;
  onEditPlan: (name: string) => void;
  onManageWorkouts: () => void;
  onSetActive: () => void;
  onDeletePlan: () => void;
};

export const WorkoutPlanSheet = ({
  open,
  onOpenChange,
  plan,
  loading,
  isActive,
  onEditPlan,
  onManageWorkouts,
  onSetActive,
  onDeletePlan,
}: WorkoutPlanSheetProps) => {
  const showLoading = loading || !plan;
  const [name, setName] = useState("");

  useEffect(() => {
    setName(plan?.name ?? "");
  }, [plan]);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[36px] border-none bg-background pb-6 text-foreground">
        <div className="aura-sheet-body-fit">
          {showLoading ? (
            <>
              <div className="mt-2 text-center">
                <Skeleton className="mx-auto h-12 w-12 rounded-2xl bg-secondary/35" />
                <Skeleton className="mx-auto mt-3 h-7 w-40 rounded-full bg-secondary/35" />
                <Skeleton className="mx-auto mt-2 h-4 w-28 rounded-full bg-secondary/35" />
              </div>
              <div className="mt-6 space-y-4">
                <Skeleton className="h-24 w-full rounded-[28px] bg-secondary/35" />
                <Skeleton className="h-24 w-full rounded-[28px] bg-secondary/35" />
                <div className="grid gap-3">
                  <Skeleton className="h-11 w-full rounded-full bg-secondary/35" />
                  <Skeleton className="h-11 w-full rounded-full bg-secondary/35" />
                  <Skeleton className="h-11 w-full rounded-full bg-secondary/35" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mt-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-border/70 bg-card/55">
                  <Folder className="h-6 w-6 text-foreground/80" />
                </div>
                <h3 className="mt-3 text-2xl font-display font-semibold">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {plan.workouts.length} workouts
                </p>
              </div>

              <div className="mt-6 rounded-[28px] border border-border/70 bg-card/55 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Rename plan
                </p>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Plan name"
                  className="mt-2 border-border/70 bg-card/55 text-foreground placeholder:text-muted-foreground"
                />
                <Button
                  className="mt-3 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => {
                    if (!name.trim()) return;
                    onEditPlan(name.trim());
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Save plan name
                </Button>
              </div>

              <div className="mt-4 rounded-[28px] border border-border/70 bg-card/55 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Workouts
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {plan.workouts.map((workout) => (
                    <Badge
                      key={workout.id}
                      variant="secondary"
                      className="border border-border/70 bg-secondary/70 text-foreground"
                    >
                      {workout.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <Button
                  className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={onSetActive}
                  disabled={isActive}
                >
                  {isActive ? "Active plan" : "Set as active plan"}
                </Button>
                <Button
                  className="w-full rounded-full bg-secondary/35 text-foreground hover:bg-secondary/65"
                  onClick={onManageWorkouts}
                >
                  <Settings className="h-4 w-4" />
                  Manage workouts
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90">
                      <Trash2 className="h-4 w-4" />
                      Delete plan
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-border/70 bg-card text-foreground">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
                      <AlertDialogDescription className="text-muted-foreground">
                        This removes the plan and its workouts from your device.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full border-border/70 text-foreground hover:bg-secondary/35">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        onClick={onDeletePlan}
                      >
                        Delete plan
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
