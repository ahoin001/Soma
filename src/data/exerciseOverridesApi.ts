import {
  fetchExerciseOverrideSupabase,
  saveExerciseOverrideSupabase,
} from "@/lib/supabase-api";

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
): Promise<ExerciseOverride | null> =>
  fetchExerciseOverrideSupabase(exerciseName);

export const saveExerciseOverride = async (payload: {
  exerciseName: string;
  steps?: string[] | null;
  guideUrl?: string | null;
}) =>
  saveExerciseOverrideSupabase({
    exerciseName: payload.exerciseName,
    steps: payload.steps,
    guideUrl: payload.guideUrl,
  });
