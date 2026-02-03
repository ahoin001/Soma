export type ExerciseOverride = {
  id: string;
  exercise_name: string;
  user_id: string;
  steps: string[] | null;
  guide_url: string | null;
  updated_at: string;
};

export const fetchExerciseOverride = async (
  exerciseName: string,
  userId: string,
): Promise<ExerciseOverride | null> => {
  const params = new URLSearchParams({ exerciseName, userId });
  const response = await fetch(
    `/api/workouts/exercise-overrides?${params.toString()}`,
  );
  if (!response.ok) {
    throw new Error("Failed to load exercise overrides.");
  }
  const data = (await response.json()) as { override: ExerciseOverride | null };
  return data.override ?? null;
};

export const saveExerciseOverride = async (payload: {
  exerciseName: string;
  userId: string;
  steps?: string[] | null;
  guideUrl?: string | null;
}) => {
  const response = await fetch("/api/workouts/exercise-overrides", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error("Failed to save exercise override.");
  }
  return response.json() as Promise<{ override: ExerciseOverride }>;
};
