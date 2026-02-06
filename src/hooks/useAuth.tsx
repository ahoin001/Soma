import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import type { ReactNode } from "react";
import {
  fetchCurrentUser,
  loginUser,
  logoutUser,
  registerUser,
  setSessionToken,
  setUserId,
} from "@/lib/api";

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

/**
 * AuthProvider - wraps the app so auth state is resolved ONCE and
 * shared by every consumer via context.
 *
 * Before this was a plain hook with local useState, so every component
 * calling useAuth() got its own copy starting at status:"loading",
 * making a fresh fetchCurrentUser() call and flashing a skeleton.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>({
    userId: null,
    email: null,
    status: "loading",
  });

  const refresh = useCallback(async () => {
    try {
      const result = await fetchCurrentUser();
      const userId = result.user?.id ?? null;
      const email = result.user?.email ?? null;
      if (userId) {
        setUserId(userId);
      }
      setState({ userId, email, status: "ready" });
    } catch {
      setState({ userId: null, email: null, status: "ready" });
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      displayName?: string;
    }) => {
      const result = await registerUser(payload);
      if (result.user?.id) {
        setUserId(result.user.id);
        if (result.sessionToken) setSessionToken(result.sessionToken);
        await refresh();
      }
    },
    [refresh],
  );

  const login = useCallback(
    async (payload: { email: string; password: string }) => {
      const result = await loginUser(payload);
      if (result.user?.id) {
        setUserId(result.user.id);
        if (result.sessionToken) setSessionToken(result.sessionToken);
        await refresh();
      }
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await logoutUser();
    setSessionToken(null);
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

/**
 * Hook to access shared auth state. Auth resolves once at the provider
 * level; every consumer instantly sees the current status without
 * triggering new fetchCurrentUser() calls.
 */
export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
