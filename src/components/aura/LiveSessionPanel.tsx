import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { ActiveSession, Routine } from "@/types/fitness";

type LiveSessionPanelProps = {
  activeSession: ActiveSession | null;
  activeRoutine: Routine | null;
  onLogSet: (exerciseId: number, weight: number, reps: number) => void;
  onAdvanceExercise: () => void;
  onFinishSession: () => void;
  unitUsed?: "lb" | "kg";
};

export const LiveSessionPanel = ({
  activeSession,
  activeRoutine,
  onLogSet,
  onAdvanceExercise,
  onFinishSession,
  unitUsed = "lb",
}: LiveSessionPanelProps) => {
  const [weight, setWeight] = useState("");
  const [reps, setReps] = useState("");

  const currentExercise = useMemo(() => {
    if (!activeSession || !activeRoutine) return null;
    return activeRoutine.exercises[activeSession.currentExerciseIndex] ?? null;
  }, [activeRoutine, activeSession]);

  const canLog = Number(weight) > 0 && Number(reps) > 0 && currentExercise;

  return (
    <Card className="border-white/10 bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-lg text-white">Flow</CardTitle>
        <CardDescription className="text-white/60">
          Log sets fast with lightweight controls.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeSession && activeRoutine && currentExercise ? (
          <>
            <div className="rounded-[22px] border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                Current exercise
              </p>
              <p className="mt-2 text-lg font-semibold text-white">
                {currentExercise.name}
              </p>
              <p className="text-sm text-white/50">
                Target {currentExercise.targetSets} sets
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                  Weight
                </p>
                <Input
                  type="number"
                  min={0}
                  value={weight}
                  onChange={(event) => setWeight(event.target.value)}
                  placeholder={unitUsed}
                  className="mt-1 border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                  Reps
                </p>
                <Input
                  type="number"
                  min={0}
                  value={reps}
                  onChange={(event) => setReps(event.target.value)}
                  placeholder="reps"
                  className="mt-1 border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
              </div>
            </div>

            <Button
              className="w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              onClick={() => {
                if (!currentExercise || !canLog) return;
                if (navigator.vibrate) {
                  navigator.vibrate(10);
                }
                onLogSet(currentExercise.exerciseId, Number(weight), Number(reps));
                setWeight("");
                setReps("");
              }}
              disabled={!canLog}
            >
              Log set
            </Button>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="w-full rounded-full border-white/20 text-white hover:bg-white/10"
                onClick={onAdvanceExercise}
              >
                Next exercise
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-full border-white/20 text-white hover:bg-white/10"
                onClick={onFinishSession}
              >
                Finish
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-white/50">
            Start a session from the Architect to begin logging.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
