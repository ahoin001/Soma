import { useEffect, useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkoutPlan, WorkoutTemplate } from "@/types/fitness";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";

type WorkoutExerciseEditorSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: WorkoutTemplate | null;
  plan: WorkoutPlan | null;
  onSave: (exercises: string[]) => void;
};

export const WorkoutExerciseEditorSheet = ({
  open,
  onOpenChange,
  workout,
  plan,
  onSave,
}: WorkoutExerciseEditorSheetProps) => {
  const [exercises, setExercises] = useState<string[]>([]);
  const [newExercise, setNewExercise] = useState("");

  useEffect(() => {
    setExercises(workout?.exercises ?? []);
    setNewExercise("");
  }, [workout]);

  const moveExercise = (index: number, direction: "up" | "down") => {
    setExercises((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const updateExercise = (index: number, value: string) => {
    setExercises((prev) => prev.map((item, idx) => (idx === index ? value : item)));
  };

  const removeExercise = (index: number) => {
    setExercises((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleAddExercise = () => {
    if (!newExercise.trim()) return;
    setExercises((prev) => [...prev, newExercise.trim()]);
    setNewExercise("");
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[36px] border-none bg-background pb-6 text-foreground">
        {workout && (
        <div className="aura-sheet-body-fit">
            <div className="mt-2 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                {plan?.name ?? "Workout plan"}
              </p>
              <h3 className="mt-2 text-2xl font-display font-semibold">
                Edit exercises
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">{workout.name}</p>
            </div>

            <div className="mt-6 space-y-3">
              {exercises.map((exercise, index) => (
                <div
                  key={`${exercise}-${index}`}
                  className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card/55 px-3 py-2"
                >
                  <Input
                    value={exercise}
                    onChange={(event) => updateExercise(index, event.target.value)}
                    className="border-border/70 bg-card/55 text-foreground"
                  />
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-foreground/70 hover:text-foreground"
                      onClick={() => moveExercise(index, "up")}
                      disabled={index === 0}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-foreground/70 hover:text-foreground"
                      onClick={() => moveExercise(index, "down")}
                      disabled={index === exercises.length - 1}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive/80"
                    onClick={() => removeExercise(index)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="mt-4 flex gap-2">
              <Input
                value={newExercise}
                onChange={(event) => setNewExercise(event.target.value)}
                placeholder="Add new exercise"
                className="border-border/70 bg-card/55 text-foreground placeholder:text-muted-foreground"
              />
              <Button
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleAddExercise}
              >
                Add
              </Button>
            </div>

            <div className="mt-6 grid gap-3">
              <Button
                className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  const cleaned = exercises.map((item) => item.trim()).filter(Boolean);
                  onSave(cleaned);
                  onOpenChange(false);
                }}
              >
                Save exercises
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-full border-border/70 text-foreground hover:bg-secondary/35"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DrawerContent>
    </Drawer>
  );
};
