import { memo } from "react";
import type { WorkoutPlan, WorkoutTemplate } from "@/types/fitness";

type WorkoutSessionMetaProps = {
  mode: "edit" | "session";
  workout: WorkoutTemplate | null;
  plan: WorkoutPlan | null;
  totalSets: number;
  lastSavedAt: number | null;
  lastSessionAutosaveAt: number | null;
  formatRelativeTime: (timestamp: number) => string;
};

export const WorkoutSessionMeta = memo(
  ({
    mode,
    workout,
    plan,
    totalSets,
    lastSavedAt,
    lastSessionAutosaveAt,
    formatRelativeTime,
  }: WorkoutSessionMetaProps) => {
    const isEditMode = mode === "edit";
    return (
      <div className="text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">
          {isEditMode ? "Edit template" : "In session"}
        </p>
        <h3 className="mt-1 text-lg font-display font-semibold">
          {workout?.name ?? "Workout"}
        </h3>
        <p className="text-xs text-white/60">
          {plan?.name ?? "Workout plan"} · {totalSets} sets
        </p>
        {mode === "session" && lastSessionAutosaveAt ? (
          <p className="mt-1 text-[11px] text-emerald-200/80">
            Autosaved {formatRelativeTime(lastSessionAutosaveAt)}
          </p>
        ) : null}
        {isEditMode && lastSavedAt ? (
          <p className="mt-1 text-[11px] text-white/40">
            Last saved {formatRelativeTime(lastSavedAt)}
          </p>
        ) : null}
      </div>
    );
  },
);

WorkoutSessionMeta.displayName = "WorkoutSessionMeta";
