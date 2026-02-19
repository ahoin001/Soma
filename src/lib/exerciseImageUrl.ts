/**
 * Normalize exercise image URLs from DB/API payloads.
 * Keeps rendering consistent across search, workout editor, and detail sheets.
 */
export const normalizeExerciseImageUrl = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
};
