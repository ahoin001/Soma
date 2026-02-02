import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell, WorkoutSessionEditor } from "@/components/aura";
import { useAppStore } from "@/state/AppStore";
import { toast } from "sonner";

const WorkoutDetails = () => {
  const navigate = useNavigate();
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
      <AppShell experience="fitness">
        <div className="mx-auto w-full max-w-sm px-5 pb-10 pt-6 text-white">
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

  return (
    <AppShell experience="fitness" showNav={false}>
      <WorkoutSessionEditor
        mode={editorMode}
        workout={activeWorkout}
        plan={activePlan}
        onBack={() => navigate("/fitness")}
        onSave={(exercises) => {
          updateWorkoutTemplate(activePlan.id, activeWorkout.id, { exercises });
          toast("Workout updated");
        }}
        onStartSession={() => {
          fitnessPlanner.startSessionFromTemplate(
            activeWorkout.name,
            activeWorkout.exercises.map((exercise) => exercise.name),
          );
          navigate(`/fitness/workouts/${activePlan.id}/${activeWorkout.id}/session`);
        }}
        onFinish={() => {
          recordWorkoutCompleted(activePlan.id, activeWorkout.id);
          fitnessPlanner.finishSession();
          toast("Workout complete");
        }}
      />
    </AppShell>
  );
};

export default WorkoutDetails;
