import { useEffect, useMemo, useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type {
  EditableExercise,
  EditableSet,
  WorkoutExerciseEntry,
  WorkoutPlan,
  WorkoutTemplate,
} from "@/types/fitness";
import { ArrowDown, ArrowUp, MoreHorizontal, Plus } from "lucide-react";
import { ReplaceExerciseSheet } from "./ReplaceExerciseSheet";

const createId = () => `set_${Math.random().toString(36).slice(2, 9)}`;

const createDefaultSets = () => [
  { id: createId(), weight: "35", reps: "14", previous: "35 lb × 14" },
  { id: createId(), weight: "45", reps: "12", previous: "45 lb × 12" },
  { id: createId(), weight: "55", reps: "10", previous: "55 lb × 10" },
];

type WorkoutSessionSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "edit" | "session";
  workout: WorkoutTemplate | null;
  plan: WorkoutPlan | null;
  onSave?: (exercises: WorkoutExerciseEntry[]) => void;
  onFinish?: () => void;
};

export const WorkoutSessionSheet = ({
  open,
  onOpenChange,
  mode,
  workout,
  plan,
  onSave,
  onFinish,
}: WorkoutSessionSheetProps) => {
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);

  useEffect(() => {
    if (!workout || !open) return;
    setExercises(
      workout.exercises.map((exercise) => ({
        id: createId(),
        name: exercise.name,
        sets: createDefaultSets(),
      })),
    );
  }, [workout, open]);

  const isEditMode = mode === "edit";

  const handleReplace = (name: string) => {
    if (replaceTargetId === "new") {
      setExercises((prev) => [
        ...prev,
        { id: createId(), name, sets: createDefaultSets() },
      ]);
      return;
    }
    setExercises((prev) =>
      prev.map((exercise) =>
        exercise.id === replaceTargetId ? { ...exercise, name } : exercise,
      ),
    );
  };

  const moveExercise = (index: number, direction: "up" | "down") => {
    setExercises((prev) => {
      const next = [...prev];
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= next.length) return prev;
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return next;
    });
  };

  const saveExercises = () => {
    if (!onSave) return;
    onSave(
      exercises.map((exercise) => ({
        id: createId(),
        name: exercise.name,
      })),
    );
  };

  const headerAction = isEditMode ? "Save" : "Finish";

  const totalSets = useMemo(
    () => exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
    [exercises],
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="rounded-t-[36px] border-none bg-slate-950 pb-6 text-white">
        {workout && (
        <div className="aura-sheet-body">
            <div className="mt-2 flex items-center justify-between">
              <Button
                variant="ghost"
                className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={() => onOpenChange(false)}
              >
                ✕
              </Button>
              <div className="text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                  {isEditMode ? "Edit template" : "In session"}
                </p>
                <h3 className="mt-1 text-lg font-display font-semibold">
                  {workout.name}
                </h3>
                <p className="text-xs text-white/60">
                  {plan?.name ?? "Workout plan"} · {totalSets} sets
                </p>
              </div>
              <Button
                className="h-10 rounded-full bg-emerald-400 px-4 text-slate-950 hover:bg-emerald-300"
                onClick={() => {
                  if (isEditMode) {
                    saveExercises();
                  } else {
                    onFinish?.();
                  }
                  onOpenChange(false);
                }}
              >
                {headerAction}
              </Button>
            </div>

            <div className="mt-6 space-y-6">
              {exercises.map((exercise, index) => (
                <div key={exercise.id} className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {exercise.name}
                      </p>
                      <p className="text-xs text-white/50">
                        Tap to adjust sets or replace quickly
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full bg-white/10 text-white hover:bg-white/20"
                        onClick={() => {
                          setReplaceTargetId(exercise.id);
                          setReplaceOpen(true);
                        }}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      <div className="flex flex-col gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/60 hover:text-white"
                          onClick={() => moveExercise(index, "up")}
                          disabled={index === 0}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/60 hover:text-white"
                          onClick={() => moveExercise(index, "down")}
                          disabled={index === exercises.length - 1}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-[48px_1fr_72px_72px] items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/40">
                    <span>Set</span>
                    <span>Previous</span>
                    <span>lbs</span>
                    <span>Reps</span>
                  </div>

                  {exercise.sets.map((set, setIndex) => (
                    <div
                      key={set.id}
                      className="grid grid-cols-[48px_1fr_72px_72px] items-center gap-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white">
                        {setIndex + 1}
                      </div>
                      <span className="text-sm text-white/50">
                        {set.previous}
                      </span>
                      <Input
                        value={set.weight}
                        onChange={(event) => {
                          const value = event.target.value;
                          setExercises((prev) =>
                            prev.map((item) =>
                              item.id === exercise.id
                                ? {
                                    ...item,
                                    sets: item.sets.map((row) =>
                                      row.id === set.id
                                        ? { ...row, weight: value }
                                        : row,
                                    ),
                                  }
                                : item,
                            ),
                          );
                        }}
                        className="h-10 rounded-2xl border-white/10 bg-white/5 text-center text-white"
                      />
                      <Input
                        value={set.reps}
                        onChange={(event) => {
                          const value = event.target.value;
                          setExercises((prev) =>
                            prev.map((item) =>
                              item.id === exercise.id
                                ? {
                                    ...item,
                                    sets: item.sets.map((row) =>
                                      row.id === set.id
                                        ? { ...row, reps: value }
                                        : row,
                                    ),
                                  }
                                : item,
                            ),
                          );
                        }}
                        className="h-10 rounded-2xl border-white/10 bg-white/5 text-center text-white"
                      />
                    </div>
                  ))}

                  <Button
                    variant="outline"
                    className="w-full rounded-full border-white/20 text-white hover:bg-white/10"
                    onClick={() =>
                      setExercises((prev) =>
                        prev.map((item) =>
                          item.id === exercise.id
                            ? {
                                ...item,
                                sets: [
                                  ...item.sets,
                                  {
                                    id: createId(),
                                    weight: "",
                                    reps: "",
                                    previous: "—",
                                  },
                                ],
                              }
                            : item,
                        ),
                      )
                    }
                  >
                    <Plus className="h-4 w-4" />
                    Add set
                  </Button>
                </div>
              ))}
            </div>

            {isEditMode ? (
              <Button
                variant="outline"
                className="mt-6 w-full rounded-full border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  setReplaceTargetId("new");
                  setReplaceOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add exercise
              </Button>
            ) : null}
          </div>
        )}
      </DrawerContent>

      <ReplaceExerciseSheet
        open={replaceOpen}
        onOpenChange={setReplaceOpen}
        onSelect={handleReplace}
      />
    </Drawer>
  );
};
