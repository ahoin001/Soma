import { supabase } from "@/lib/supabase";

const QUERY_KEYS_TO_STRIP = [
  "code",
  "state",
  "error",
  "error_code",
  "error_description",
  "type",
] as const;

const HASH_KEYS_TO_STRIP = [
  "access_token",
  "refresh_token",
  "expires_at",
  "expires_in",
  "provider_token",
  "provider_refresh_token",
  "token_type",
  "type",
  "error",
  "error_code",
  "error_description",
] as const;

const cleanupAuthUrl = () => {
  if (typeof window === "undefined") return;
  const url = new URL(window.location.href);
  let changed = false;

  for (const key of QUERY_KEYS_TO_STRIP) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key);
      changed = true;
    }
  }

  const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
  if (hash) {
    const hashParams = new URLSearchParams(hash);
    for (const key of HASH_KEYS_TO_STRIP) {
      if (hashParams.has(key)) {
        hashParams.delete(key);
        changed = true;
      }
    }
    const nextHash = hashParams.toString();
    url.hash = nextHash ? `#${nextHash}` : "";
  }

  if (changed) {
    window.history.replaceState({}, document.title, url.pathname + url.search + url.hash);
  }
};

/**
 * Finalizes Supabase auth redirects for web + Capacitor deep links.
 * Handles PKCE code exchange explicitly, then sanitizes auth params from URL.
 */
export const finalizeSupabaseAuthRedirect = async (): Promise<void> => {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    const code = url.searchParams.get("code");
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error && import.meta.env.DEV) {
        console.warn("[AuthRedirect] code exchange failed", error.message);
      }
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn("[AuthRedirect] unable to finalize redirect", message);
    }
  } finally {
    cleanupAuthUrl();
  }
};
