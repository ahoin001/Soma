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
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
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
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
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
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
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
                className={`rounded-full ${error ? "border-destructive/60 focus-visible:ring-destructive/25" : ""}`}
              />
            </div>
          )}
          {mode === "reset" && (
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
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
          {error && <p className="text-xs text-destructive">{error}</p>}
          {notice && <p className="text-xs text-primary">{notice}</p>}
          <Button
            type="button"
            className="w-full rounded-full bg-primary py-5 text-sm font-semibold text-primary-foreground disabled:opacity-70"
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
              className="w-full rounded-full border border-border bg-card py-3 text-xs font-semibold text-muted-foreground"
              onClick={onClose}
            >
              Continue without account
            </button>
          ) : null}
          <button
            type="button"
            className="w-full text-xs text-primary"
            onClick={() => setModeAndClear(mode === "register" ? "login" : "register")}
          >
            {mode === "register"
              ? "Already have an account? Sign in"
              : "New here? Create an account"}
          </button>
          {mode === "login" && (
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <button type="button" onClick={() => setModeAndClear("reset")}>
                Forgot password?
              </button>
            </div>
          )}
          {mode === "reset" && (
            <button
              type="button"
              className="w-full text-xs text-muted-foreground"
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
