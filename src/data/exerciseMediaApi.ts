import { ensureUser, getUserId } from "@/lib/api";

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
  userId?: string,
): Promise<ExerciseMedia[]> => {
  const resolvedUserId = userId ?? getUserId() ?? undefined;
  const params = new URLSearchParams({ exerciseName });
  if (resolvedUserId) params.set("userId", resolvedUserId);
  const response = await fetch(`/api/workouts/exercise-media?${params.toString()}`);
  if (!response.ok) {
    throw new Error("Failed to load exercise media.");
  }
  const data = (await response.json()) as { media: ExerciseMedia[] };
  return data.media ?? [];
};

export const createExerciseMedia = async (payload: {
  exerciseName: string;
  userId?: string;
  sourceType: "cloudinary" | "youtube" | "external";
  mediaUrl: string;
  thumbUrl?: string | null;
  isPrimary?: boolean;
}) => {
  await ensureUser();
  const resolvedUserId = payload.userId ?? getUserId() ?? undefined;
  const response = await fetch("/api/workouts/exercise-media", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(resolvedUserId ? { "x-user-id": resolvedUserId } : {}),
    },
    body: JSON.stringify({
      ...payload,
      userId: resolvedUserId,
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to save exercise media.");
  }
  return response.json() as Promise<{ media: ExerciseMedia }>;
};

export const setExerciseMediaPrimary = async (payload: {
  mediaId: string;
  userId: string;
}) => {
  const resolvedUserId = payload.userId ?? getUserId() ?? "";
  const response = await fetch(
    `/api/workouts/exercise-media/${payload.mediaId}/primary`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...(resolvedUserId ? { "x-user-id": resolvedUserId } : {}),
      },
      body: JSON.stringify({ userId: resolvedUserId }),
    },
  );
  if (!response.ok) {
    throw new Error("Failed to update primary media.");
  }
  return response.json() as Promise<{ media: ExerciseMedia }>;
};

export const deleteExerciseMedia = async (payload: {
  mediaId: string;
  userId: string;
}) => {
  const resolvedUserId = payload.userId ?? getUserId() ?? "";
  const response = await fetch(`/api/workouts/exercise-media/${payload.mediaId}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      ...(resolvedUserId ? { "x-user-id": resolvedUserId } : {}),
    },
    body: JSON.stringify({ userId: resolvedUserId }),
  });
  if (!response.ok) {
    throw new Error("Failed to delete media.");
  }
  return response.json() as Promise<{ ok: boolean }>;
};
