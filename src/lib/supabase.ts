/**
 * Supabase browser client — single instance, best practices for PWA.
 *
 * - autoRefreshToken: true — keeps session valid
 * - persistSession: true — survives app close / PWA restart
 * - detectSessionInUrl: true — handles OAuth / magic link redirects
 * - storageKey: custom — avoids clashes with other apps
 *
 * @see https://supabase.com/docs/reference/javascript/initializing
 */
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storageKey: "aurafit-supabase-auth",
  },
  db: {
    schema: "public",
  },
});

