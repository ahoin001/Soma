import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

export type SessionSummaryStats = {
  totalSets: number;
  totalVolume: number;
  unitUsed: "lb" | "kg";
  durationMs: number;
};

type SessionSummaryScreenProps = {
  workoutName: string;
  planName: string;
  stats: SessionSummaryStats;
  onBack: () => void;
  onCopySummary?: () => void;
  className?: string;
};

const formatDuration = (ms: number) => {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds}s`;
  if (seconds === 0) return `${minutes}m`;
  return `${minutes}m ${seconds}s`;
};

export const SessionSummaryScreen = ({
  workoutName,
  planName,
  stats,
  onBack,
  onCopySummary,
  className,
}: SessionSummaryScreenProps) => {
  const confettiFired = useRef(false);

  useEffect(() => {
    if (confettiFired.current) return;
    confettiFired.current = true;
    const count = 120;
    const defaults = { origin: { y: 0.75 }, zIndex: 9999 };
    const fire = (particleRatio: number, opts: confetti.Options) => {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    };
    fire(0.25, { spread: 26, startVelocity: 55, colors: ["#34d399", "#2dd4bf", "#22d3ee", "#fbbf24"] });
    fire(0.2, { spread: 60, colors: ["#34d399", "#fbbf24"] });
    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
    fire(0.1, { spread: 120, startVelocity: 45 });
  }, []);

  const volumeLabel = stats.unitUsed === "kg" ? "kg" : "lb";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={cn("flex min-h-screen flex-col bg-slate-950 text-white", className)}
    >
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col px-4 pb-10 pt-6">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.15, type: "spring", stiffness: 200 }}
            className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-400/20"
          >
            <Trophy className="h-10 w-10 text-emerald-400" />
          </motion.div>
          <h1 className="text-2xl font-display font-semibold text-white">
            Workout complete
          </h1>
          <p className="mt-2 text-lg font-medium text-emerald-300/90">
            {workoutName}
          </p>
          <p className="mt-1 text-sm text-white/50">{planName}</p>

          <motion.div
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.25 }}
            className="mt-8 grid w-full max-w-[280px] grid-cols-3 gap-3"
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-2xl font-bold tabular-nums text-white">
                {stats.totalSets}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-white/50">
                Sets
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-2xl font-bold tabular-nums text-white">
                {Math.round(stats.totalVolume)}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-white/50">
                {volumeLabel} volume
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-2xl font-bold tabular-nums text-white">
                {formatDuration(stats.durationMs)}
              </p>
              <p className="mt-1 text-xs uppercase tracking-wider text-white/50">
                Duration
              </p>
            </div>
          </motion.div>

          <div className="mt-8 flex w-full max-w-[280px] flex-col gap-3">
            {onCopySummary ? (
              <Button
                variant="outline"
                className="w-full rounded-full border-white/20 text-white hover:bg-white/10"
                onClick={onCopySummary}
              >
                Copy summary
              </Button>
            ) : null}
            <Button
              className="w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              onClick={onBack}
            >
              Back to plan
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
