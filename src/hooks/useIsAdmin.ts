/**
 * Single source of truth for admin access.
 * Set in .env (e.g. .env.local):
 *   VITE_ADMIN_EMAILS=ahoin001@gmail.com,other@example.com   (comma-separated, multiple admins)
 *   or VITE_ADMIN_EMAIL=single@example.com                  (single admin, legacy)
 * No admin if both are unset.
 */
import { useAuth } from "@/hooks/useAuth";
import { useMemo } from "react";

function parseAdminEmails(): Set<string> {
  const list = (import.meta.env.VITE_ADMIN_EMAILS as string)?.trim();
  if (list) {
    return new Set(
      list
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    );
  }
  const single = (import.meta.env.VITE_ADMIN_EMAIL as string)?.trim().toLowerCase();
  return single ? new Set([single]) : new Set();
}

const ADMIN_EMAILS = parseAdminEmails();

export function useIsAdmin(): boolean {
  const { email } = useAuth();
  return useMemo(() => {
    if (ADMIN_EMAILS.size === 0) return false;
    return ADMIN_EMAILS.has(email?.trim().toLowerCase() ?? "");
  }, [email]);
}
