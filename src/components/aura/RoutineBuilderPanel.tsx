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

  useEffect(() => {
    setRenameValue(activeRoutine?.name ?? "");
  }, [activeRoutine?.name]);

  const routineOptions = useMemo(
    () =>
      routines.map((routine) => ({
        value: routine.id,
        label: routine.name,
      })),
    [routines],
  );

  return (
    <Card className="border-white/10 bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-lg text-white">Architect</CardTitle>
        <CardDescription className="text-white/60">
          Build reusable routines and drop into Flow when ready.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            New routine
          </p>
          <div className="flex gap-2">
            <Input
              value={routineName}
              onChange={(event) => setRoutineName(event.target.value)}
              placeholder="Routine name"
              className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
            />
            <Button
              className="rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
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
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              Active routine
            </p>
            <Select
              value={activeRoutineId ?? ""}
              onValueChange={(value) => onSelectRoutine(value)}
            >
              <SelectTrigger className="border-white/10 bg-white/5 text-white">
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
          <div className="space-y-3 rounded-[20px] border border-white/10 bg-white/5 px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <Input
                value={renameValue}
                onChange={(event) => setRenameValue(event.target.value)}
                className="border-white/10 bg-white/5 text-white"
              />
              <Button
                variant="outline"
                className="rounded-full border-white/20 text-white hover:bg-white/10"
                onClick={() => onRenameRoutine(activeRoutine.id, renameValue)}
              >
                Save
              </Button>
              <Button
                variant="ghost"
                className="text-white/60 hover:text-white"
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
                    className="flex items-center justify-between gap-2 rounded-2xl border border-white/10 bg-slate-950/40 px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-white">
                        {exercise.name}
                      </p>
                      <p className="text-xs text-white/50">
                        Target sets
                      </p>
                    </div>
                    <Input
                      type="number"
                      min={1}
                      value={exercise.targetSets}
                      onChange={(event) =>
                        onUpdateExercise(activeRoutine.id, exercise.id, {
                          targetSets: Number(event.target.value) || 1,
                        })
                      }
                      className="h-9 w-16 border-white/10 bg-white/5 text-center text-white"
                    />
                    <Button
                      variant="ghost"
                      className="text-white/60 hover:text-white"
                      onClick={() =>
                        onRemoveExercise(activeRoutine.id, exercise.id)
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-white/50">
                  Add exercises from the Atlas to build this routine.
                </p>
              )}
            </div>

            <div className="grid gap-2">
              <Button
                className="w-full rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={() => {
                  if (!activeRoutine || !selectedExercise) return;
                  onAddExercise(activeRoutine.id, selectedExercise);
                }}
                disabled={!selectedExercise}
              >
                Add selected exercise
              </Button>
              <Button
                className="w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
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
