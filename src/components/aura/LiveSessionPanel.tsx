import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { playRestCompleteSound, playSetLoggedSound } from "@/lib/restCompleteSound";
import type { ActiveSession, Routine } from "@/types/fitness";

const REST_PRESETS = [60, 90, 120] as const;
const REST_RING_SIZE = 88;
const REST_RING_STROKE = 6;
const REST_RING_R = (REST_RING_SIZE - REST_RING_STROKE) / 2;
const REST_RING_CIRCUMFERENCE = 2 * Math.PI * REST_RING_R;

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
  const [justLogged, setJustLogged] = useState(false);
  const restEndedRef = useRef(false);

  const currentExercise = useMemo(() => {
    if (!activeSession || !activeRoutine) return null;
    return activeRoutine.exercises[activeSession.currentExerciseIndex] ?? null;
  }, [activeRoutine, activeSession]);

  const setsLoggedForExercise = useMemo(() => {
    if (!activeSession || !currentExercise) return 0;
    return activeSession.sets.filter((s) => s.exerciseId === currentExercise.exerciseId).length;
  }, [activeSession, currentExercise]);

  const canLog = Number(weight) > 0 && Number(reps) > 0 && currentExercise;

  useEffect(() => {
    if (restSecondsRemaining === null || restSecondsRemaining <= 0) return;
    const id = window.setInterval(() => {
      setRestSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          if (prev === 1 && !restEndedRef.current) {
            restEndedRef.current = true;
            playRestCompleteSound();
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
    playSetLoggedSound();
    if (navigator.vibrate) navigator.vibrate(10);
    restEndedRef.current = false;
    onLogSet(currentExercise.exerciseId, Number(weight), Number(reps));
    setWeight("");
    setReps("");
    setRestSecondsRemaining(restDuration);
    setJustLogged(true);
  };

  useEffect(() => {
    if (!justLogged) return;
    const t = window.setTimeout(() => setJustLogged(false), 900);
    return () => window.clearTimeout(t);
  }, [justLogged]);

  const skipRest = () => setRestSecondsRemaining(null);

  return (
    <Card className="border-border/70 bg-card/55 text-card-foreground">
      <CardHeader>
        <CardTitle className="text-lg text-foreground">Flow</CardTitle>
        <CardDescription className="text-muted-foreground">
          Log sets fast with auto-rest timers.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeSession && activeRoutine && currentExercise ? (
          <>
            {restSecondsRemaining !== null ? (
              <div className="rounded-[22px] border border-primary/30 bg-primary/12 px-4 py-4 text-center">
                <p className="text-xs uppercase tracking-[0.2em] text-primary/90">
                  Rest
                </p>
                <div className="mt-3 flex justify-center">
                  <div
                    className="relative flex items-center justify-center"
                    style={{ width: REST_RING_SIZE, height: REST_RING_SIZE }}
                  >
                    <svg
                      className="-rotate-90"
                      width={REST_RING_SIZE}
                      height={REST_RING_SIZE}
                      aria-hidden
                    >
                      <circle
                        cx={REST_RING_SIZE / 2}
                        cy={REST_RING_SIZE / 2}
                        r={REST_RING_R}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={REST_RING_STROKE}
                        className="text-primary/20"
                      />
                      <circle
                        cx={REST_RING_SIZE / 2}
                        cy={REST_RING_SIZE / 2}
                        r={REST_RING_R}
                        fill="none"
                        stroke="currentColor"
                        strokeWidth={REST_RING_STROKE}
                        strokeLinecap="round"
                        className="text-primary transition-[stroke-dashoffset] duration-1000 ease-linear"
                        strokeDasharray={REST_RING_CIRCUMFERENCE}
                        strokeDashoffset={
                          REST_RING_CIRCUMFERENCE -
                          ((restDuration - restSecondsRemaining) / restDuration) *
                            REST_RING_CIRCUMFERENCE
                        }
                      />
                    </svg>
                    <span className="absolute font-mono text-xl font-semibold tabular-nums text-primary">
                      {Math.floor(restSecondsRemaining / 60)}:
                      {(restSecondsRemaining % 60).toString().padStart(2, "0")}
                    </span>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2 text-primary hover:text-primary/80"
                  onClick={skipRest}
                >
                  Skip rest
                </Button>
              </div>
            ) : (
              <>
                <div className="rounded-[22px] border border-border/70 bg-card/55 px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Current exercise
                  </p>
                  <p className="mt-2 text-lg font-semibold text-foreground">
                    {currentExercise.name}
                  </p>
                  <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      {setsLoggedForExercise} of {currentExercise.targetSets} sets
                    </span>
                    {currentExercise.targetSets > 0 && (
                      <span
                        className="inline-block h-1.5 flex-1 max-w-[80px] rounded-full bg-muted"
                        aria-hidden
                      >
                        <span
                          className="block h-full rounded-full bg-primary/70 transition-[width] duration-300"
                          style={{
                            width: `${Math.min(
                              100,
                              (setsLoggedForExercise / currentExercise.targetSets) * 100
                            )}%`,
                          }}
                        />
                      </span>
                    )}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Weight
                    </p>
                    <Input
                      type="number"
                      min={0}
                      value={weight}
                      onChange={(event) => setWeight(event.target.value)}
                      placeholder={unitUsed}
                      className="mt-1 border-border/70 bg-secondary/35 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                      Reps
                    </p>
                    <Input
                      type="number"
                      min={0}
                      value={reps}
                      onChange={(event) => setReps(event.target.value)}
                      placeholder="reps"
                      className="mt-1 border-border/70 bg-secondary/35 text-foreground placeholder:text-muted-foreground"
                    />
                  </div>
                </div>

                <Button
                  className={cn(
                    "w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90",
                    justLogged && "bg-emerald-600 hover:bg-emerald-600"
                  )}
                  onClick={handleLogSet}
                  disabled={!canLog && !justLogged}
                >
                  <motion.span
                    key={justLogged ? "logged" : "idle"}
                    className="inline-flex items-center justify-center gap-2"
                    initial={justLogged ? { scale: 0.95 } : false}
                    animate={justLogged ? { scale: 1 } : undefined}
                    transition={{ type: "spring", stiffness: 400, damping: 25 }}
                  >
                    {justLogged ? (
                      <>
                        <Check className="h-4 w-4" strokeWidth={2.5} />
                        Logged!
                      </>
                    ) : (
                      "Log set"
                    )}
                  </motion.span>
                </Button>

                <div className="flex items-center justify-between rounded-full border border-border/70 bg-card/55 px-3 py-2">
                  <span className="text-xs text-muted-foreground">Rest after set</span>
                  <div className="flex gap-1">
                    {REST_PRESETS.map((sec) => (
                      <button
                        key={sec}
                        type="button"
                        className={cn(
                          "rounded-full px-3 py-1 text-xs font-medium",
                          restDuration === sec
                            ? "bg-primary/20 text-primary"
                            : "text-foreground/80 hover:text-foreground",
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
                className="w-full rounded-full border-border/70 text-foreground hover:bg-secondary/70"
                onClick={onAdvanceExercise}
              >
                Next exercise
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-full border-border/70 text-foreground hover:bg-secondary/70"
                onClick={onFinishSession}
              >
                Finish
              </Button>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            Start a session from the Architect to begin logging.
          </p>
        )}
      </CardContent>
    </Card>
  );
};
