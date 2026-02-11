import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Exercise, Routine } from "@/types/fitness";
import { X } from "lucide-react";

type RoutineBuilderPanelProps = {
  routines: Routine[];
  activeRoutineId: string | null;
  activeRoutine: Routine | null;
  selectedExercise: Exercise | null;
  hasActiveSession: boolean;
  onSelectRoutine: (routineId: string) => void;
  onCreateRoutine: (name: string) => void;
  onRenameRoutine: (routineId: string, name: string) => void;
  onRemoveRoutine: (routineId: string) => void;
  onAddExercise: (routineId: string, exercise: Exercise) => void;
  onRemoveExercise: (routineId: string, routineExerciseId: string) => void;
  onUpdateExercise: (
    routineId: string,
    routineExerciseId: string,
    patch: { targetSets?: number; notes?: string },
  ) => void;
  onStartSession: (routineId: string) => void;
};

export const RoutineBuilderPanel = ({
  routines,
  activeRoutineId,
  activeRoutine,
  selectedExercise,
  hasActiveSession,
  onSelectRoutine,
  onCreateRoutine,
  onRenameRoutine,
  onRemoveRoutine,
  onAddExercise,
  onRemoveExercise,
  onUpdateExercise,
  onStartSession,
}: RoutineBuilderPanelProps) => {
  const [routineName, setRoutineName] = useState("");
  const [renameValue, setRenameValue] = useState(activeRoutine?.name ?? "");
  const [targetSetInputs, setTargetSetInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setRenameValue(activeRoutine?.name ?? "");
    setTargetSetInputs({});
  }, [activeRoutine?.id, activeRoutine?.name]);

  const routineOptions = useMemo(
    () =>
      routines.map((routine) => ({
        value: routine.id,
        label: routine.name,
      })),
    [routines],
  );

  return (
    <Card className="border-border/70 bg-card/55 text-card-foreground">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Architect</CardTitle>
        <CardDescription className="text-muted-foreground">
          Build reusable routines and drop into Flow when ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            New routine
          </p>
          <div className="flex gap-2">
            <Input
              value={routineName}
              onChange={(event) => setRoutineName(event.target.value)}
              placeholder="Routine name"
              className="border-border/70 bg-secondary/35 text-foreground placeholder:text-muted-foreground"
            />
            <Button
              className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => {
                if (!routineName.trim()) return;
                onCreateRoutine(routineName);
                setRoutineName("");
              }}
            >
              Create
            </Button>
          </div>
        </div>

        {routineOptions.length ? (
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Active routine
            </p>
            <Select
              value={activeRoutineId ?? ""}
              onValueChange={(value) => onSelectRoutine(value)}
            >
              <SelectTrigger className="border-border/70 bg-secondary/35 text-foreground">
                <SelectValue placeholder="Select routine" />
              </SelectTrigger>
              <SelectContent>
                {routineOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}

        {activeRoutine ? (
          <div className="space-y-3 rounded-[20px] border border-border/70 bg-card/50 px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <Input
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                className="border-border/70 bg-secondary/35 text-foreground"
              />
              <Button
                variant="outline"
                className="rounded-full border-border/70 text-foreground hover:bg-secondary/70"
                onClick={() => onRenameRoutine(activeRoutine.id, renameValue)}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => onRemoveRoutine(activeRoutine.id)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              {activeRoutine.exercises.length ? (
                activeRoutine.exercises.map((exercise) => (
                  <div
                    key={exercise.id}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card/55 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {exercise.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Target sets
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={targetSetInputs[exercise.id] ?? String(exercise.targetSets ?? "")}
                      onChange={(event) => {
                        const value = event.target.value;
                        setTargetSetInputs((prev) => ({ ...prev, [exercise.id]: value }));
                        if (!value.trim()) return;
                        const next = Number(value);
                        if (!Number.isFinite(next) || next <= 0) return;
                        onUpdateExercise(activeRoutine.id, exercise.id, {
                          targetSets: next,
                        });
                      }}
                      onBlur={() => {
                        const current = targetSetInputs[exercise.id];
                        if (current && current.trim().length > 0) return;
                        setTargetSetInputs((prev) => ({
                          ...prev,
                          [exercise.id]: String(exercise.targetSets ?? 1),
                        }));
                      }}
                      className="h-9 w-16 border-border/70 bg-secondary/35 text-center text-foreground"
                    />
                    <Button
                      variant="ghost"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        onRemoveExercise(activeRoutine.id, exercise.id)
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  Add exercises from the Atlas to build this routine.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Button
                className="w-full rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
                onClick={() => {
                  if (!activeRoutine || !selectedExercise) return;
                  onAddExercise(activeRoutine.id, selectedExercise);
                }}
                disabled={!selectedExercise}
              >
                Add selected exercise
              </Button>
              <Button
                className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => onStartSession(activeRoutine.id)}
                disabled={
                  hasActiveSession || activeRoutine.exercises.length === 0
                }
              >
                {hasActiveSession ? "Session active" : "Start Flow session"}
              </Button>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
