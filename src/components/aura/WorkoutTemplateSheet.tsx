import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { WorkoutPlan, WorkoutTemplate } from "@/types/fitness";
import { Pencil, Play, Settings } from "lucide-react";

type WorkoutTemplateSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: WorkoutTemplate | null;
  plan: WorkoutPlan | null;
  onEditWorkout: () => void;
  onEditExercises: () => void;
  onStartWorkout: () => void;
};

export const WorkoutTemplateSheet = ({
  open,
  onOpenChange,
  workout,
  plan,
  onEditWorkout,
  onEditExercises,
  onStartWorkout,
}: WorkoutTemplateSheetProps) => (
  <Drawer open={open} onOpenChange={onOpenChange}>
    <DrawerContent className="rounded-t-[36px] border-none bg-slate-950 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-white">
      {workout && (
        <div className="px-5 pb-6 pt-2">
          <div className="mt-2 text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              {plan?.name ?? "Workout plan"}
            </p>
            <h3 className="mt-2 text-2xl font-display font-semibold">
              {workout.name}
            </h3>
            <p className="mt-1 text-sm text-white/60">
              {workout.lastPerformed ?? "Not started yet"}
            </p>
          </div>

          <div className="mt-6 rounded-[28px] border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Exercises
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {workout.exercises.map((exercise) => (
                <Badge
                  key={exercise.id}
                  variant="secondary"
                  className="border border-white/10 bg-white/10 text-white"
                >
                  {exercise.name}
                </Badge>
              ))}
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            <Button
              className="w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              onClick={onStartWorkout}
            >
              <Play className="h-4 w-4" />
              Start workout
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-full border-white/20 text-white hover:bg-white/10"
              onClick={onEditWorkout}
            >
              <Pencil className="h-4 w-4" />
              Edit workout details
            </Button>
            <Button
              variant="outline"
              className="w-full rounded-full border-white/20 text-white hover:bg-white/10"
              onClick={onEditExercises}
            >
              <Settings className="h-4 w-4" />
              Edit exercises
            </Button>
          </div>
        </div>
      )}
    </DrawerContent>
  </Drawer>
);
