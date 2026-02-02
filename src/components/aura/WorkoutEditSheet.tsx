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
      <DrawerContent className="rounded-t-[36px] border-none bg-slate-950 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-white">
        {workout && (
          <div className="px-5 pb-6 pt-2">
            <div className="mt-2 text-center">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                {plan?.name ?? "Workout plan"}
              </p>
              <h3 className="mt-2 text-2xl font-display font-semibold">
                Edit workout
              </h3>
            </div>

            <div className="mt-6 space-y-4">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Workout name
                </p>
                <Input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Workout name"
                  className="mt-2 border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  Last performed
                </p>
                <Input
                  value={lastPerformed}
                  onChange={(event) => setLastPerformed(event.target.value)}
                  placeholder="e.g., 3 days ago"
                  className="mt-2 border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
              </div>
            </div>

            <div className="mt-6 grid gap-3">
              <Button
                className="w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
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
                className="w-full rounded-full border-white/20 text-white hover:bg-white/10"
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
