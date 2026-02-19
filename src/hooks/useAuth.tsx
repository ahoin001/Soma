import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  clearStoredUserId,
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

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    userId: null,
    email: null,
    status: "loading",
  });

  const refresh = useCallback(async () => {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) {
      setState({ userId: null, email: null, status: "ready" });
      return;
    }
    const user = session?.user;
    const userId = user?.id ?? null;
    const email = user?.email ?? null;
    if (userId) setUserId(userId);
    setState({ userId, email, status: "ready" });
  }, []);

  useEffect(() => {
    setSessionExpiredCallback(() => {
      setState({ userId: null, email: null, status: "ready" });
    });
    return () => setSessionExpiredCallback(null);
  }, []);

  useEffect(() => {
    void finalizeSupabaseAuthRedirect();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      const userId = user?.id ?? null;
      const email = user?.email ?? null;
      if (userId) setUserId(userId);
      else clearStoredUserId();
      setState({ userId, email, status: "ready" });
    });
    void refresh();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void finalizeSupabaseAuthRedirect();
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      subscription.unsubscribe();
    };
  }, [refresh]);

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
