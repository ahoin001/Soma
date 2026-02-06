import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { ActiveSession, Routine } from "@/types/fitness";

const REST_PRESETS = [60, 90, 120] as const;

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
  const [restDuration, setRestDuration] = useState(90);
  const [restSecondsRemaining, setRestSecondsRemaining] = useState<number | null>(null);
  const restEndedRef = useRef(false);

  const currentExercise = useMemo(() => {
    if (!activeSession || !activeRoutine) return null;
    return activeRoutine.exercises[activeSession.currentExerciseIndex] ?? null;
  }, [activeRoutine, activeSession]);

  const canLog = Number(weight) > 0 && Number(reps) > 0 && currentExercise;

  useEffect(() => {
    if (restSecondsRemaining === null || restSecondsRemaining <= 0) return;
    const id = window.setInterval(() => {
      setRestSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          if (prev === 1 && !restEndedRef.current) {
            restEndedRef.current = true;
            if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
          }
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [restSecondsRemaining]);

  const handleLogSet = () => {
    if (!currentExercise || !canLog) return;
    if (navigator.vibrate) {
      navigator.vibrate(10);
    }
    restEndedRef.current = false;
    onLogSet(currentExercise.exerciseId, Number(weight), Number(reps));
    setWeight("");
    setReps("");
    setRestSecondsRemaining(restDuration);
  };

  const skipRest = () => setRestSecondsRemaining(null);

  return (
    <Card className="border-white/10 bg-card text-card-foreground">
      <CardHeader>
        <CardTitle className="text-lg text-white">Flow</CardTitle>
        <CardDescription className="text-white/60">
          Log sets fast with auto-rest timers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeSession && activeRoutine && currentExercise ? (
          <>
            {restSecondsRemaining !== null ? (
              <div className="rounded-[22px] border border-emerald-400/30 bg-emerald-400/10 px-4 py-4 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300/90">
                  Rest
                </p>
                <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-emerald-300">
                  {Math.floor(restSecondsRemaining / 60)}:
                  {(restSecondsRemaining % 60).toString().padStart(2, "0")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-emerald-300 hover:text-emerald-200"
                  onClick={skipRest}
                >
                  Skip rest
                </Button>
              </div>
            ) : (
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
                  onClick={handleLogSet}
                  disabled={!canLog}
                >
                  Log set
                </Button>

                <div className="flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-3 py-2">
                  <span className="text-xs text-white/60">Rest after set</span>
                  <div className="flex gap-1">
                    {REST_PRESETS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium",
                          restDuration === sec
                            ? "bg-emerald-400/30 text-emerald-300"
                            : "text-white/70 hover:text-white",
                        )}
                        onClick={() => setRestDuration(sec)}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

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
