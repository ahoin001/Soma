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
      <DrawerContent className="rounded-t-[36px] border-none bg-slate-950 pb-6 text-white">
        <div className="aura-sheet-body-fit">
          {showLoading ? (
            <>
              <div className="mt-2 text-center">
                <Skeleton className="mx-auto h-12 w-12 rounded-2xl bg-white/10" />
                <Skeleton className="mx-auto mt-3 h-7 w-40 rounded-full bg-white/10" />
                <Skeleton className="mx-auto mt-2 h-4 w-28 rounded-full bg-white/10" />
              </div>
              <div className="mt-6 space-y-4">
                <Skeleton className="h-24 w-full rounded-[28px] bg-white/10" />
                <Skeleton className="h-24 w-full rounded-[28px] bg-white/10" />
                <div className="grid gap-3">
                  <Skeleton className="h-11 w-full rounded-full bg-white/10" />
                  <Skeleton className="h-11 w-full rounded-full bg-white/10" />
                  <Skeleton className="h-11 w-full rounded-full bg-white/10" />
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="mt-2 text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                  <Folder className="h-6 w-6 text-white/70" />
                </div>
                <h3 className="mt-3 text-2xl font-display font-semibold">
                  {plan.name}
                </h3>
                <p className="mt-1 text-sm text-white/60">
                  {plan.workouts.length} workouts
                </p>
              </div>

              <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Rename plan
                </p>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Plan name"
                  className="mt-2 border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
                <Button
                  className="mt-3 w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  onClick={() => {
                    if (!name.trim()) return;
                    onEditPlan(name.trim());
                  }}
                >
                  <Pencil className="h-4 w-4" />
                  Save plan name
                </Button>
              </div>

              <div className="mt-4 rounded-[28px] border border-white/10 bg-white/5 px-4 py-4">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Workouts
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {plan.workouts.map((workout) => (
                    <Badge
                      key={workout.id}
                      variant="secondary"
                      className="border border-white/10 bg-white/10 text-white"
                    >
                      {workout.name}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="mt-6 grid gap-3">
                <Button
                  className="w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  onClick={onSetActive}
                  disabled={isActive}
                >
                  {isActive ? "Active plan" : "Set as active plan"}
                </Button>
                <Button
                  className="w-full rounded-full bg-white/10 text-white hover:bg-white/20"
                  onClick={onManageWorkouts}
                >
                  <Settings className="h-4 w-4" />
                  Manage workouts
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button className="w-full rounded-full bg-rose-500 text-white hover:bg-rose-400">
                      <Trash2 className="h-4 w-4" />
                      Delete plan
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="border-white/10 bg-slate-950 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this plan?</AlertDialogTitle>
                      <AlertDialogDescription className="text-white/60">
                        This removes the plan and its workouts from your device.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-full border-white/20 text-white hover:bg-white/10">
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="rounded-full bg-rose-500 text-white hover:bg-rose-400"
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
