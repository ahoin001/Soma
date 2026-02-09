/**
 * Shared auth form state and submit logic for Auth page and AuthDialog.
 * Single source of truth for validation, submit flow, and error parsing.
 */
import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { requestPasswordReset, resetPassword } from "@/lib/api";
import { parseAuthError } from "@/lib/authErrors";

export type AuthMode = "login" | "register" | "reset";
export type AuthFormStatus = "idle" | "loading";

export type UseAuthFormOptions = {
  /** Called after successful login or register (e.g. navigate or close dialog). */
  onSuccess?: (isNewUser: boolean) => void;
};

export function useAuthForm(options: UseAuthFormOptions = {}) {
  const { onSuccess } = options;
  const { register, login } = useAuth();

  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [token, setToken] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState<AuthFormStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (mode === "register") return email.trim().length > 3 && password.length >= 8;
    if (mode === "login") return email.trim().length > 3 && password.length >= 8;
    if (mode === "reset") {
      if (token.trim()) return password.length >= 8;
      return email.trim().length > 3;
    }
    return false;
  }, [email, password, token, mode]);

  const clearError = () => setError(null);
  const clearNotice = () => setNotice(null);
  const setModeAndClear = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setNotice(null);
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus("loading");
    setError(null);
    try {
      setNotice(null);
      if (mode === "register") {
        await register({
          email,
          password,
          displayName: displayName.trim() || undefined,
        });
        onSuccess?.(true);
      } else if (mode === "login") {
        await login({ email, password });
        onSuccess?.(false);
      } else if (mode === "reset") {
        if (!token.trim()) {
          const result = await requestPasswordReset({ email });
          if (result.resetToken) setToken(result.resetToken);
          setNotice("If the account exists, a reset link was sent.");
        } else {
          await resetPassword({ token, newPassword: password });
          setNotice("Password reset. You can sign in now.");
          setMode("login");
        }
      }
    } catch (err) {
      setError(parseAuthError(err));
    } finally {
      setStatus("idle");
    }
  };

  return {
    mode,
    setMode,
    setModeAndClear,
    email,
    setEmail,
    password,
    setPassword,
    displayName,
    setDisplayName,
    token,
    setToken,
    notice,
    setNotice,
    clearNotice,
    status,
    error,
    setError,
    clearError,
    canSubmit,
    handleSubmit,
  };
}
