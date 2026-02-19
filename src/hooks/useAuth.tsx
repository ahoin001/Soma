import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  clearStoredUserId,
  getStoredUserId,
  setUserId,
} from "@/lib/api";
import { setSessionExpiredCallback } from "@/lib/sessionExpired";
import { supabase } from "@/lib/supabase";
import { finalizeSupabaseAuthRedirect } from "@/lib/supabaseAuthRedirect";

type AuthState = {
  userId: string | null;
  email: string | null;
  status: "loading" | "ready";
};

type AuthContextValue = AuthState & {
  register: (payload: {
    email: string;
    password: string;
    displayName?: string;
  }) => Promise<void>;
  login: (payload: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);
const SESSION_REFRESH_TIMEOUT_MS = 2500;

const hasPendingAuthRedirect = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.has("code")) return true;
    const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
    if (!hash) return false;
    const hashParams = new URLSearchParams(hash);
    return hashParams.has("access_token") || hashParams.has("refresh_token");
  } catch {
    return false;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    userId: getStoredUserId(),
    email: null,
    status: "loading",
  });

  const applySession = useCallback((session: Session | null) => {
    const user = session?.user;
    const userId = user?.id ?? null;
    const email = user?.email ?? null;
    if (userId) setUserId(userId);
    else clearStoredUserId();
    setState({ userId, email, status: "ready" });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const result = await Promise.race([
        supabase.auth.getSession(),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => {
            reject(new Error("Supabase session check timed out"));
          }, SESSION_REFRESH_TIMEOUT_MS);
        }),
      ]);
      const {
        data: { session },
        error,
      } = result;
      if (error) {
        setState((prev) => ({ ...prev, status: "ready" }));
        return;
      }
      applySession(session);
    } catch {
      // Transient init/focus failures should not force logout.
      setState((prev) => ({ ...prev, status: "ready" }));
    }
  }, [applySession]);

  useEffect(() => {
    setSessionExpiredCallback(() => {
      clearStoredUserId();
      setState({ userId: null, email: null, status: "ready" });
    });
    return () => setSessionExpiredCallback(null);
  }, []);

  useEffect(() => {
    let mounted = true;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      applySession(session);
    });
    const bootstrap = async () => {
      // Fast path: read cached session first to avoid startup delays.
      await refresh();
      if (!mounted) return;
      // Redirect finalization only blocks boot when auth params are present.
      if (hasPendingAuthRedirect()) {
        await finalizeSupabaseAuthRedirect();
        if (!mounted) return;
        await refresh();
      } else {
        void finalizeSupabaseAuthRedirect();
      }
    };
    void bootstrap();
    const onVisibilityChange = async () => {
      if (document.visibilityState === "visible") {
        if (hasPendingAuthRedirect()) {
          await finalizeSupabaseAuthRedirect();
          if (!mounted) return;
        } else {
          void finalizeSupabaseAuthRedirect();
        }
        await refresh();
      }
    };
    const visibilityHandler = () => {
      void onVisibilityChange();
    };
    document.addEventListener("visibilitychange", visibilityHandler);
    return () => {
      mounted = false;
      document.removeEventListener("visibilitychange", visibilityHandler);
      subscription.unsubscribe();
    };
  }, [applySession, refresh]);

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      displayName?: string;
    }) => {
      const { data, error } = await supabase.auth.signUp({
        email: payload.email,
        password: payload.password,
        options: {
          data: payload.displayName
            ? { display_name: payload.displayName }
            : undefined,
        },
      });
      if (error) throw new Error(error.message);
      const user = data.user;
      if (user) {
        setUserId(user.id);
        setState({ userId: user.id, email: payload.email, status: "ready" });
      }
    },
    [],
  );

  const login = useCallback(
    async (payload: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: payload.email,
        password: payload.password,
      });
      if (error) throw new Error(error.message);
      const user = data.user;
      if (user) {
        setUserId(user.id);
        setState({ userId: user.id, email: payload.email, status: "ready" });
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    clearStoredUserId();
    setState({ userId: null, email: null, status: "ready" });
  }, []);

  const value: AuthContextValue = {
    ...state,
    register,
    login,
    logout,
    refresh,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
