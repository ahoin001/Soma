import { useEffect, useMemo } from "react";
import { useNavigate, useNavigationType, useParams } from "react-router-dom";
import { AppShell, WorkoutSessionEditor } from "@/components/aura";
import { useAppStore } from "@/state/AppStore";
import { toast } from "sonner";

const WorkoutDetails = () => {
  const navigate = useNavigate();
  const navigationType = useNavigationType();
  const { planId, workoutId, mode } = useParams();
  const {
    workoutPlans,
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
        onEditExercise={(exercise) => {
          if (!exercise.name) return;
          navigate(`/fitness/exercises/add?name=${encodeURIComponent(exercise.name)}&adminEdit=true`);
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
          try {
            await updateWorkoutTemplate(activePlan.id, activeWorkout.id, {
              exercises: nextExercises,
            });
            toast("Workout updated");
            navigate("/fitness");
          } catch {
            // handled in hook
          }
        }}
        onStartSession={async () => {
          try {
            await fitnessPlanner.startSessionFromTemplate(
              activeWorkout.name,
              activeWorkout.exercises.map((exercise) => exercise.name),
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
