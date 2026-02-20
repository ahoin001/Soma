import { memo } from "react";
import { motion } from "framer-motion";

type WorkoutRestHudProps = {
  restSecondsRemaining: number;
  exerciseName: string | null;
  restProgressPct: number;
};

export const WorkoutRestHud = memo(
  ({ restSecondsRemaining, exerciseName, restProgressPct }: WorkoutRestHudProps) => {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="fixed inset-x-0 bottom-[calc(6.25rem+var(--sab,0px))] z-30 px-4"
      >
        <div className="mx-auto w-full max-w-[420px] rounded-2xl border border-emerald-400/30 bg-slate-900/90 px-4 py-3 shadow-[0_16px_28px_rgba(0,0,0,0.35)] backdrop-blur">
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-emerald-200/90">
            <span>Rest</span>
            <span>{exerciseName ?? "Current set"}</span>
            <span>
              {Math.floor(restSecondsRemaining / 60)}:
              {String(restSecondsRemaining % 60).padStart(2, "0")}
            </span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
            <motion.div
              className="h-full rounded-full bg-emerald-400"
              animate={{ width: `${restProgressPct}%` }}
              transition={{ duration: 0.2, ease: "linear" }}
            />
          </div>
        </div>
      </motion.div>
    );
  },
);

WorkoutRestHud.displayName = "WorkoutRestHud";
