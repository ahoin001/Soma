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
  const { workoutPlans, workoutPlansLoaded, updateWorkoutTemplate } = useAppStore();

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

  const isLoading = !workoutPlansLoaded;

  if (isLoading) {
    return (
      <AppShell experience="fitness" showNav={false} safeAreaTop="extra">
        <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6 text-foreground">
          <p className="text-sm text-muted-foreground">Loading exercise...</p>
        </div>
      </AppShell>
    );
  }

  if (!activePlan || !activeWorkout || !draft) {
    return (
      <AppShell experience="fitness" showNav={false} safeAreaTop="extra">
        <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6 text-foreground">
          <div className="rounded-[28px] border border-border/70 bg-card/55 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              We could not find that exercise.
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-full border-border/70 text-foreground hover:bg-secondary/70"
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const handleClose = async () => {
    if (exercise) {
      const nextExercises = (activeWorkout.exercises ?? []).map((item) =>
        item.id === draft.id ? { ...item, ...draft } : item,
      );
      try {
        await updateWorkoutTemplate(activePlan.id, activeWorkout.id, {
          exercises: nextExercises,
        });
      } catch {
        // handled in hook
      }
    }
    if (activePlan && activeWorkout) {
      navigate(`/fitness/workouts/${activePlan.id}/${activeWorkout.id}`);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/fitness");
  };

  return (
    <AppShell experience="fitness" showNav={false} safeAreaTop="extra">
      <ExerciseGuideSheet
        open
        variant="page"
        exercise={draft}
        onOpenChange={(open) => {
          if (!open) {
            void handleClose();
          }
        }}
        onUpdate={(patch) => {
          setDraft((prev) => (prev ? { ...prev, ...patch } : prev));
        }}
      />
    </AppShell>
  );
};

export default ExerciseGuide;
