import { useEffect, useMemo, useState } from "react";
import { useNavigate, useNavigationType, useParams } from "react-router-dom";
import {
  AppShell,
  WorkoutSessionEditor,
  SessionSummaryScreen,
  type SessionSummaryStats,
} from "@/components/aura";
import { useAppStore } from "@/state/AppStore";
import { appToast } from "@/lib/toast";
import { fetchExerciseByName } from "@/lib/api";

const WorkoutDetails = () => {
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const { planId, workoutId, mode } = useParams();
  const {
    workoutPlans,
    workoutPlansLoaded,
    updateWorkoutTemplate,
    fitnessPlanner,
    recordWorkoutCompleted,
  } = useAppStore();

  const activePlan = useMemo(
    () => workoutPlans.find((plan) => plan.id === planId) ?? null,
    [workoutPlans, planId],
  );

  const activeWorkout = useMemo(
    () =>
      activePlan?.workouts.find((workout) => workout.id === workoutId) ?? null,
    [activePlan, workoutId],
  );

  const plansLoaded = workoutPlansLoaded || !planId;

  // Wait for plans to load before resolving plan/workout. Avoids rendering the editor on
  // stale or partial data (e.g. cache then refetch) which can cause App Error.
  if (!plansLoaded) {
    return (
      <AppShell experience="fitness" showNav={false} safeAreaTop="extra">
        <div className="mx-auto w-full max-w-[420px] px-4 pb-10 text-foreground">
          <div className="rounded-[28px] border border-border/70 bg-card/55 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">Loading workout...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!activePlan || !activeWorkout) {
    return (
      <AppShell experience="fitness" showNav={false} safeAreaTop="extra">
        <div className="mx-auto w-full max-w-[420px] px-4 pb-10 text-foreground">
          <div className="rounded-[28px] border border-border/70 bg-card/55 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              We could not find that workout. Try selecting a different plan.
            </p>
            <button
              type="button"
              className="mt-4 rounded-full border border-border/70 px-4 py-2 text-sm text-foreground hover:bg-secondary/70"
              onClick={() => navigate("/fitness")}
            >
              Back to Fitness
            </button>
          </div>
        </div>
      </AppShell>
    );
  }

  const editorMode = mode === "session" ? "session" : "edit";
  const [showSummary, setShowSummary] = useState(false);
  const [summaryStats, setSummaryStats] = useState<SessionSummaryStats | null>(null);

  useEffect(() => {
    if (navigationType === "POP") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [workoutId, mode, navigationType]);

  // Warn when closing tab/window during an active session (session persists on server; refetch on return).
  useEffect(() => {
    if (editorMode !== "session" || !fitnessPlanner.activeSession) return;
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [editorMode, fitnessPlanner.activeSession]);

  const handleFinishWithStats = (stats: SessionSummaryStats) => {
    setSummaryStats(stats);
    setShowSummary(true);
  };

  const handleSummaryBack = async () => {
    try {
      await recordWorkoutCompleted(activePlan!.id, activeWorkout!.id);
      fitnessPlanner.finishSession();
    } catch {
      // handled in hook
    }
    setShowSummary(false);
    setSummaryStats(null);
    navigate("/fitness");
  };

  if (showSummary && summaryStats && activePlan && activeWorkout) {
    return (
      <AppShell experience="fitness" showNav={false} safeAreaTop="extra">
        <SessionSummaryScreen
          workoutName={activeWorkout.name}
          planName={activePlan.name}
          stats={summaryStats}
          onBack={handleSummaryBack}
          onCopySummary={() => {
            const text = [
              `${activeWorkout.name} · ${activePlan.name}`,
              `${summaryStats.totalSets} sets · ${Math.round(summaryStats.totalVolume)} ${summaryStats.unitUsed} volume`,
              `Duration: ${Math.round(summaryStats.durationMs / 1000 / 60)}m`,
            ].join("\n");
            navigator.clipboard?.writeText(text).then(() => appToast.info("Summary copied"));
          }}
        />
      </AppShell>
    );
  }

  return (
    <AppShell experience="fitness" showNav={false} safeAreaTop="extra">
      <WorkoutSessionEditor
        mode={editorMode}
        workout={activeWorkout}
        plan={activePlan}
        onBack={() => navigate("/fitness")}
        onOpenGuide={(exercise) => {
          if (!activePlan || !activeWorkout) return;
          navigate(
            `/fitness/workouts/${activePlan.id}/${activeWorkout.id}/exercises/${exercise.id}/guide?name=${encodeURIComponent(
              exercise.name,
            )}`,
          );
        }}
        onEditExercise={async (exercise) => {
          if (!exercise.name) return;
          try {
            const response = await fetchExerciseByName(exercise.name);
            const record = response.exercise as { id?: number } | null;
            const id = record?.id ? Number(record.id) : null;
            if (!id) {
              appToast.info("Exercise not found", {
                description: "Create it first to edit the full details.",
              });
              return;
            }
            navigate(`/fitness/exercises/${id}/edit`);
          } catch {
            appToast.info("Unable to open editor", {
              description: "Please try again.",
            });
          }
        }}
        onAddExercise={() => {
          if (!activePlan || !activeWorkout) return;
          navigate(
            `/fitness/exercises/add?planId=${encodeURIComponent(
              activePlan.id,
            )}&workoutId=${encodeURIComponent(activeWorkout.id)}`,
          );
        }}
        onSave={async (nextExercises) => {
          const previousExercises = activeWorkout.exercises ?? [];
          try {
            await updateWorkoutTemplate(activePlan.id, activeWorkout.id, {
              exercises: nextExercises,
            });
            appToast.info("Workout updated", {
              action: {
                label: "Undo",
                onClick: () =>
                  void updateWorkoutTemplate(activePlan.id, activeWorkout.id, {
                    exercises: previousExercises,
                  }).then(() => {
                    appToast.info("Changes reverted");
                  }),
              },
            });
            navigate("/fitness");
          } catch {
            // handled in hook
          }
        }}
        onStartSession={async () => {
          try {
            await fitnessPlanner.startSessionFromTemplate(
              activeWorkout.name,
              (activeWorkout.exercises ?? []).map((e) => e.name),
              activeWorkout.id,
            );
            navigate(`/fitness/workouts/${activePlan.id}/${activeWorkout.id}/session`);
          } catch {
            // handled in hook
          }
        }}
        activeSessionId={
          editorMode === "session" ? fitnessPlanner.activeSession?.id ?? null : null
        }
        sessionExercises={
          editorMode === "session"
            ? fitnessPlanner.sessionExercises.map((se) => ({
                id: se.id,
                exercise_name: se.exercise_name,
              }))
            : undefined
        }
        onPersistSets={
          editorMode === "session" ? fitnessPlanner.persistTemplateSessionSets : undefined
        }
        onSwapExercise={
          editorMode === "session" ? fitnessPlanner.swapExerciseInSession : undefined
        }
        sessionStartedAt={
          editorMode === "session" ? fitnessPlanner.activeSession?.startedAt ?? undefined : undefined
        }
        onFinishWithStats={editorMode === "session" ? handleFinishWithStats : undefined}
        onFinish={async () => {
          if (editorMode === "session") return;
          try {
            await recordWorkoutCompleted(activePlan.id, activeWorkout.id);
            fitnessPlanner.finishSession();
            appToast.info("Workout complete");
          } catch {
            // handled in hook
          }
        }}
        onDiscardAndLeave={
          editorMode === "session"
            ? () => {
                fitnessPlanner.finishSession();
                navigate("/fitness");
              }
            : undefined
        }
      />
    </AppShell>
  );
};

export default WorkoutDetails;
