/**
 * Normalize food image URLs from DB/API payloads.
 * Keeps rendering logic consistent across search, logs, and detail sheets.
 */
export const normalizeFoodImageUrl = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (!/^https?:\/\//i.test(trimmed)) return null;
  return trimmed;
};

