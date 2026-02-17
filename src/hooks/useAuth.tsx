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
  fetchCurrentUser,
  getSessionToken,
  getStoredUserId,
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
 * PWA session persistence: We keep the user logged in by storing session token
 * and userId in localStorage (survives app close, tab close, PWA restart). The
 * server session duration is configurable (SESSION_DAYS, default 90). On 401 we
 * clear token and userId so the app does not show stale "logged in" state. On
 * logout we clear both token and userId. The service worker must not cache /api
 * or clear storage; see vite.config workbox navigateFallbackDenylist.
 *
 * PWA auth flow (stale-while-revalidate): If we have a session token we show
 * the app immediately with stored userId so the shell renders without waiting
 * for GET /me. refresh() runs in the background; on 401 we clear and show auth.
 * If there is no token we show the auth screen immediately (no network call).
 *
 * Partial state (post-login): After login/register we set userId + email from
 * the API result and form, then navigate immediately. A background refresh()
 * syncs email/emailVerified from GET /me.
 */
const getInitialAuthState = (): AuthState => {
  if (typeof window === "undefined") {
    return { userId: null, email: null, status: "loading" };
  }
  const token = getSessionToken();
  const storedUserId = getStoredUserId();
  if (token && storedUserId) {
    return { userId: storedUserId, email: null, status: "ready" };
  }
  if (!token) {
    return { userId: null, email: null, status: "ready" };
  }
  return { userId: null, email: null, status: "loading" };
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<AuthState>(getInitialAuthState);

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
    // No session token → not logged in; show auth screen immediately (no network round-trip).
    if (!getSessionToken()) {
      setState({ userId: null, email: null, status: "ready" });
      return;
    }
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
        // Set state from result + form so we can navigate immediately; no second round-trip.
        setState({
          userId: result.user.id,
          email: payload.email,
          status: "ready",
        });
        void refresh(); // Background: sync email/emailVerified from server when ready
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
        // Set state from result + form so we can navigate immediately; skip redundant GET /me.
        setState({
          userId: result.user.id,
          email: payload.email,
          status: "ready",
        });
        void refresh(); // Background: sync email/emailVerified from server when ready
      }
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    await logoutUser();
    setSessionToken(null);
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
