import { buildApiUrl, getUserId } from "@/lib/api";

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
  userId?: string,
): Promise<ExerciseOverride | null> => {
  const resolvedUserId = userId ?? getUserId();
  if (!resolvedUserId) return null;
  const params = new URLSearchParams({ exerciseName, userId: resolvedUserId });
  const response = await fetch(
    buildApiUrl(`/api/workouts/exercise-overrides?${params.toString()}`),
  );
  if (!response.ok) {
    throw new Error("Failed to load exercise overrides.");
  }
  const data = (await response.json()) as { override: ExerciseOverride | null };
  return data.override ?? null;
};

export const saveExerciseOverride = async (payload: {
  exerciseName: string;
  userId?: string;
  steps?: string[] | null;
  guideUrl?: string | null;
}) => {
  const resolvedUserId = payload.userId ?? getUserId();
  if (!resolvedUserId) {
    throw new Error("User ID is required to save overrides.");
  }
  const response = await fetch(buildApiUrl("/api/workouts/exercise-overrides"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      userId: resolvedUserId,
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to save exercise override.");
  }
  return response.json() as Promise<{ override: ExerciseOverride }>;
};
