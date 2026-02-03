import { useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppShell } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/state/AppStore";
import { toast } from "sonner";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `exercise_${Math.random().toString(36).slice(2, 9)}`;

const AddExerciseToWorkout = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const exerciseName = params.get("name") ?? "";
  const { workoutPlans, updateWorkoutTemplate, createWorkoutTemplate } = useAppStore();

  const plans = useMemo(() => workoutPlans, [workoutPlans]);

  if (!exerciseName.trim()) {
    return (
      <AppShell experience="fitness" showNav={false}>
        <div className="mx-auto w-full max-w-sm px-5 pb-10 pt-6 text-white">
          <div className="rounded-[28px] border border-white/10 bg-white/5 px-4 py-6 text-center">
            <p className="text-sm text-white/70">
              We could not find that exercise.
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-full border-white/20 text-white hover:bg-white/10"
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const handleAdd = (planId: string, workoutId: string) => {
    const plan = plans.find((item) => item.id === planId);
    const workout = plan?.workouts.find((item) => item.id === workoutId);
    if (!plan || !workout) return;
    const nextExercises = [
      ...workout.exercises,
      { id: createId(), name: exerciseName },
    ];
    updateWorkoutTemplate(plan.id, workout.id, { exercises: nextExercises });
    toast("Added to workout", {
      description: `${exerciseName} added to ${workout.name}.`,
    });
    navigate(`/fitness/workouts/${plan.id}/${workout.id}`);
  };

  return (
    <AppShell experience="fitness" showNav={false}>
      <div className="mx-auto w-full max-w-sm px-5 pb-10 pt-4 text-white">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => navigate(-1)}
          >
            ✕
          </Button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Add to workout
            </p>
            <p className="text-sm text-white/80">{exerciseName}</p>
          </div>
          <div className="h-10 w-10" />
        </div>

        <div className="mt-6 space-y-4">
          {plans.length === 0 ? (
            <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-6 text-center">
              <p className="text-sm text-white/70">
                Create a workout first, then add exercises.
              </p>
              <Button
                className="mt-4 w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                onClick={() => navigate("/fitness")}
              >
                Go to workouts
              </Button>
            </div>
          ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4"
              >
                <p className="text-sm font-semibold text-white">{plan.name}</p>
                <div className="mt-3 space-y-2">
                  {plan.workouts.map((workout) => (
                    <button
                      key={workout.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm text-white/80 hover:border-white/30"
                      onClick={() => handleAdd(plan.id, workout.id)}
                    >
                      <span>{workout.name}</span>
                      <span className="text-xs text-white/50">
                        {workout.exercises.length} exercises
                      </span>
                    </button>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full rounded-full border-white/20 text-white hover:bg-white/10"
                    onClick={async () => {
                      const workout = await createWorkoutTemplate(
                        plan.id,
                        "New workout",
                      );
                      handleAdd(plan.id, workout.id);
                    }}
                  >
                    Create workout in {plan.name}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
};

export default AddExerciseToWorkout;
