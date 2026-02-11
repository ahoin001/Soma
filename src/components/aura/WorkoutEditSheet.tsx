import { useEffect, useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkoutPlan, WorkoutTemplate } from "@/types/fitness";

type WorkoutEditSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workout: WorkoutTemplate | null;
  plan: WorkoutPlan | null;
  onSave: (payload: { name: string; lastPerformed?: string }) => void;
};

export const WorkoutEditSheet = ({
  open,
  onOpenChange,
  workout,
  plan,
  onSave,
}: WorkoutEditSheetProps) => {
  const [name, setName] = useState("");
  const [lastPerformed, setLastPerformed] = useState("");

  useEffect(() => {
    setName(workout?.name ?? "");
    setLastPerformed(workout?.lastPerformed ?? "");
  }, [workout]);

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
                Edit workout
              </h3>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Workout name
                </p>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Workout name"
                  className="mt-2 border-border/70 bg-card/55 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                  Last performed
                </p>
                <Input
                  value={lastPerformed}
                  onChange={(event) => setLastPerformed(event.target.value)}
                  placeholder="e.g., 3 days ago"
                  className="mt-2 border-border/70 bg-card/55 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <Button
                className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  if (!name.trim()) return;
                  onSave({ name: name.trim(), lastPerformed: lastPerformed.trim() || undefined });
                  onOpenChange(false);
                }}
              >
                Save changes
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
