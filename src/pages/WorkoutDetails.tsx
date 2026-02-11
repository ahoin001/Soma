import { useEffect, useMemo } from "react";
import { useNavigate, useNavigationType, useParams } from "react-router-dom";
import { AppShell, WorkoutSessionEditor } from "@/components/aura";
import { useAppStore } from "@/state/AppStore";
import { toast } from "sonner";
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
        <div className="mx-auto w-full max-w-[420px] px-4 pb-10 text-white">
          <div className="rounded-[28px] border border-white/10 bg-white/5 px-4 py-6 text-center">
            <p className="text-sm text-white/60">Loading workout...</p>
          </div>
        </div>
      </AppShell>
    );
  }

  if (!activePlan || !activeWorkout) {
    return (
      <AppShell experience="fitness" showNav={false} safeAreaTop="extra">
        <div className="mx-auto w-full max-w-[420px] px-4 pb-10 text-white">
          <div className="rounded-[28px] border border-white/10 bg-white/5 px-4 py-6 text-center">
            <p className="text-sm text-white/70">
              We could not find that workout. Try selecting a different plan.
            </p>
            <button
              type="button"
              className="mt-4 rounded-full border border-white/20 px-4 py-2 text-sm text-white"
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

  useEffect(() => {
    if (navigationType === "POP") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [workoutId, mode, navigationType]);

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
              toast("Exercise not found", {
                description: "Create it first to edit the full details.",
              });
              return;
            }
            navigate(`/fitness/exercises/${id}/edit`);
          } catch {
            toast("Unable to open editor", {
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
            toast("Workout updated", {
              action: {
                label: "Undo",
                onClick: () =>
                  void updateWorkoutTemplate(activePlan.id, activeWorkout.id, {
                    exercises: previousExercises,
                  }).then(() => {
                    toast("Changes reverted");
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
              (activeWorkout.exercises ?? []).map((exercise) => exercise.name),
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
        onFinish={async () => {
          try {
            await recordWorkoutCompleted(activePlan.id, activeWorkout.id);
            fitnessPlanner.finishSession();
            toast("Workout complete");
          } catch {
            // handled in hook
          }
        }}
      />
    </AppShell>
  );
};

export default WorkoutDetails;
