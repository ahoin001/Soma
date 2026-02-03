import { useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { requestPasswordReset, resetPassword } from "@/lib/api";

type AuthDialogProps = {
  open: boolean;
  onClose?: () => void;
};

export const AuthDialog = ({ open, onClose }: AuthDialogProps) => {
  const { register, login } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [token, setToken] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading">("idle");
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

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus("loading");
    setError(null);
    try {
      setNotice(null);
      if (mode === "register") {
        await register({ email, password, displayName: displayName.trim() || undefined });
      } else if (mode === "login") {
        await login({ email, password });
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
      if (mode === "login" || mode === "register") {
        onClose?.();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to sign in.";
      setError(message);
    } finally {
      setStatus("idle");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) onClose?.();
      }}
    >
      <DialogContent className="max-w-sm rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="text-xl font-display">
            {mode === "register"
              ? "Create your account"
              : mode === "reset"
                ? "Reset your password"
                : "Welcome back"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {mode === "register" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Display name
              </label>
              <Input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Your name"
                className="rounded-full"
              />
            </div>
          )}
          {(mode === "login" || mode === "register" || mode === "reset") && (
            <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              Email
            </label>
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@email.com"
              type="email"
              className="rounded-full"
            />
          </div>
          )}
          {(mode === "login" || mode === "register" || (mode === "reset" && token.trim())) && (
            <div className="space-y-2">
            <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {mode === "reset" ? "New password" : "Password"}
            </label>
            <Input
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 8 characters"
              type="password"
              className="rounded-full"
            />
          </div>
          )}
          {mode === "reset" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Token
              </label>
              <Input
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="Paste token from email"
                className="rounded-full"
              />
            </div>
          )}
          {error && <p className="text-xs text-rose-500">{error}</p>}
          {notice && <p className="text-xs text-emerald-600">{notice}</p>}
          <Button
            type="button"
            className="w-full rounded-full bg-aura-primary py-5 text-sm font-semibold text-white"
            onClick={handleSubmit}
            disabled={!canSubmit || status === "loading"}
          >
            {mode === "register"
              ? "Create account"
              : mode === "login"
                ? "Sign in"
                : mode === "reset"
                  ? token.trim()
                    ? "Reset password"
                    : "Send reset link"
                  : "Send"}
          </Button>
          {onClose && mode !== "reset" ? (
            <button
              type="button"
              className="w-full rounded-full border border-slate-200 bg-white py-3 text-xs font-semibold text-slate-500"
              onClick={onClose}
            >
              Continue without account
            </button>
          ) : null}
          <button
            type="button"
            className="w-full text-xs text-emerald-600"
            onClick={() =>
              setMode(mode === "register" ? "login" : "register")
            }
          >
            {mode === "register"
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </button>
          {mode === "login" && (
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <button type="button" onClick={() => setMode("reset")}>
                Forgot password?
              </button>
            </div>
          )}
          {mode === "reset" && (
            <button
              type="button"
              className="w-full text-xs text-slate-500"
              onClick={() => setMode("login")}
            >
              Back to sign in
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
