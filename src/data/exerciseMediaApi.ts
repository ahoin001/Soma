import {
  fetchExerciseMediaSupabase,
  createExerciseMediaSupabase,
  setExerciseMediaPrimarySupabase,
  deleteExerciseMediaSupabase,
} from "@/lib/supabase-api";

export type ExerciseMedia = {
  id: string;
  exercise_name: string;
  user_id: string | null;
  source_type: "cloudinary" | "youtube" | "external";
  media_url: string;
  thumb_url: string | null;
  is_primary: boolean;
  created_at: string;
};

export const fetchExerciseMedia = async (
  exerciseName: string,
): Promise<ExerciseMedia[]> =>
  fetchExerciseMediaSupabase(exerciseName);

export const createExerciseMedia = async (payload: {
  exerciseName: string;
  sourceType: "cloudinary" | "youtube" | "external";
  mediaUrl: string;
  thumbUrl?: string | null;
  isPrimary?: boolean;
}) =>
  createExerciseMediaSupabase({
    exerciseName: payload.exerciseName,
    sourceType: payload.sourceType,
    mediaUrl: payload.mediaUrl,
    thumbUrl: payload.thumbUrl,
    isPrimary: payload.isPrimary,
  });

export const setExerciseMediaPrimary = async (payload: {
  mediaId: string;
}) =>
  setExerciseMediaPrimarySupabase(payload.mediaId);

export const deleteExerciseMedia = async (payload: {
  mediaId: string;
}) =>
  deleteExerciseMediaSupabase(payload.mediaId);
