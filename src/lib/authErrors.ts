/**
 * Parse auth API errors into user-facing messages.
 * Handles JSON error payloads and common string patterns.
 */
export function parseAuthError(err: unknown): string {
  const fallback = "Something went wrong. Please try again.";
  if (!(err instanceof Error)) return fallback;
  const raw = err.message;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error && typeof parsed.error === "string") return parsed.error;
  } catch {
    // Not JSON; use string matching
  }
  if (raw.includes("No account found"))
    return "No account found with this email. Would you like to create one?";
  if (raw.includes("Incorrect password"))
    return "Incorrect password. Please try again.";
  if (raw.includes("already exists") || raw.includes("duplicate"))
    return "An account with this email already exists. Try signing in instead.";
  if (raw.includes("network") || raw.includes("fetch"))
    return "Unable to connect. Please check your internet connection.";
  if (raw.trim()) return raw;
  return fallback;
}
