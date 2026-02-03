import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { AppShell, ExerciseGuideSheet } from "@/components/aura";
import { useAppStore } from "@/state/AppStore";
import type { WorkoutExerciseEntry } from "@/types/fitness";
import { Button } from "@/components/ui/button";

const ExerciseGuide = () => {
  const navigate = useNavigate();
  const { planId, workoutId, exerciseId } = useParams();
  const [params] = useSearchParams();
  const exerciseName = params.get("name") ?? "";
  const { workoutPlans, updateWorkoutTemplate } = useAppStore();

  const activePlan = useMemo(
    () => workoutPlans.find((plan) => plan.id === planId) ?? null,
    [workoutPlans, planId],
  );

  const activeWorkout = useMemo(
    () =>
      activePlan?.workouts.find((workout) => workout.id === workoutId) ?? null,
    [activePlan, workoutId],
  );

  const exercise = useMemo(
    () => activeWorkout?.exercises.find((item) => item.id === exerciseId) ?? null,
    [activeWorkout, exerciseId],
  );
  const fallbackExercise = useMemo<WorkoutExerciseEntry | null>(
    () =>
      exercise
        ? null
        : exerciseName
          ? {
              id: exerciseId ?? `exercise-${exerciseName}`,
              name: exerciseName,
              note: "",
              steps: [],
              guideUrl: "",
              customVideoName: "",
            }
          : null,
    [exercise, exerciseId, exerciseName],
  );

  const [draft, setDraft] = useState<WorkoutExerciseEntry | null>(
    exercise ?? fallbackExercise,
  );

  useEffect(() => {
    setDraft(exercise ?? fallbackExercise);
  }, [exercise?.id, fallbackExercise]);

  const isLoading = workoutPlans.length === 0;

  if (isLoading) {
    return (
      <AppShell experience="fitness" showNav={false}>
        <div className="mx-auto w-full max-w-sm px-5 pb-10 pt-6 text-white">
          <p className="text-sm text-white/60">Loading exercise...</p>
        </div>
      </AppShell>
    );
  }

  if (!activePlan || !activeWorkout || !draft) {
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

  const handleClose = () => {
    if (exercise) {
      const nextExercises = activeWorkout.exercises.map((item) =>
        item.id === draft.id ? { ...item, ...draft } : item,
      );
      updateWorkoutTemplate(activePlan.id, activeWorkout.id, {
        exercises: nextExercises,
      });
    }
    navigate(-1);
  };

  return (
    <AppShell experience="fitness" showNav={false}>
      <ExerciseGuideSheet
        open
        variant="page"
        exercise={draft}
        onOpenChange={(open) => {
          if (!open) handleClose();
        }}
        onUpdate={(patch) => {
          setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
        }}
      />
    </AppShell>
  );
};

export default ExerciseGuide;
