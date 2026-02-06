import { useCallback, useEffect, useState } from "react";
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

export const useAuth = () => {
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

  const register = useCallback(async (payload: { email: string; password: string; displayName?: string }) => {
    const result = await registerUser(payload);
    if (result.user?.id) {
      setUserId(result.user.id);
      if (result.sessionToken) setSessionToken(result.sessionToken);
      await refresh();
    }
  }, [refresh]);

  const login = useCallback(async (payload: { email: string; password: string }) => {
    const result = await loginUser(payload);
    if (result.user?.id) {
      setUserId(result.user.id);
      if (result.sessionToken) setSessionToken(result.sessionToken);
      await refresh();
    }
  }, [refresh]);

  const logout = useCallback(async () => {
    await logoutUser();
    setSessionToken(null);
    setState({ userId: null, email: null, status: "ready" });
  }, []);

  return { ...state, register, login, logout, refresh };
};
