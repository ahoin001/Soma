import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAuthForm } from "@/hooks/useAuthForm";

type AuthDialogProps = {
  open: boolean;
  onClose?: () => void;
};

export const AuthDialog = ({ open, onClose }: AuthDialogProps) => {
  const {
    mode,
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
    status,
    error,
    clearError,
    canSubmit,
    handleSubmit,
  } = useAuthForm({
    onSuccess: () => onClose?.(),
  });

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
                onChange={(e) => {
                  setDisplayName(e.target.value);
                  clearError();
                }}
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
                onChange={(e) => {
                  setEmail(e.target.value);
                  clearError();
                }}
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
                onChange={(e) => {
                  setPassword(e.target.value);
                  clearError();
                }}
                placeholder="Minimum 8 characters"
                type="password"
                className={`rounded-full ${error ? "border-rose-300 focus-visible:ring-rose-200" : ""}`}
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
                onChange={(e) => {
                  setToken(e.target.value);
                  clearError();
                }}
                placeholder="Paste token from email"
                className="rounded-full"
              />
            </div>
          )}
          {error && <p className="text-xs text-rose-500">{error}</p>}
          {notice && <p className="text-xs text-emerald-600">{notice}</p>}
          <Button
            type="button"
            className="w-full rounded-full bg-aura-primary py-5 text-sm font-semibold text-white disabled:opacity-70"
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
            onClick={() => setModeAndClear(mode === "register" ? "login" : "register")}
          >
            {mode === "register"
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </button>
          {mode === "login" && (
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <button type="button" onClick={() => setModeAndClear("reset")}>
                Forgot password?
              </button>
            </div>
          )}
          {mode === "reset" && (
            <button
              type="button"
              className="w-full text-xs text-slate-500"
              onClick={() => setModeAndClear("login")}
            >
              Back to sign in
            </button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
