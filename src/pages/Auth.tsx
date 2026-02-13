import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthForm } from "@/hooks/useAuthForm";
import { AlertCircle, Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [redirecting, setRedirecting] = useState(false);

  const handleSuccess = (isNewUser: boolean) => {
    const from = (location.state as { from?: string } | undefined)?.from;
    const destination = from && from !== "/auth" ? from : "/nutrition";
    setRedirecting(true);
    requestAnimationFrame(() => {
      navigate(destination, { replace: true, state: { justLoggedIn: true, isNewUser } });
    });
  };

  const {
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
    status,
    error,
    clearError,
    canSubmit,
    handleSubmit,
  } = useAuthForm({ onSuccess: handleSuccess });

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-card to-secondary/55">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-48 w-48 rounded-full bg-primary/25 blur-3xl" />
        <div className="absolute right-[-60px] top-32 h-56 w-56 rounded-full bg-accent/40 blur-3xl" />
        <div className="absolute left-10 bottom-[-60px] h-56 w-56 rounded-full bg-secondary/65 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
        <div className="rounded-[28px] border border-border/60 bg-card/90 px-5 py-6 shadow-[0_18px_40px_rgba(15,23,42,0.15)]">
          <p className="text-xs uppercase tracking-[0.3em] text-primary/75">AuraFit</p>
          <h1 className="mt-2 text-2xl font-display font-semibold text-foreground">
            {mode === "register"
              ? "Create your account"
              : mode === "reset"
                ? "Reset your password"
                : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track meals, training, and habits with a personalized plan.
          </p>
          <div className="mt-6 space-y-4">
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
                className={`rounded-full ${error ? "border-destructive/60 focus-visible:ring-destructive/25" : ""}`}
              />
            </div>
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
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-destructive/10 px-3 py-3 text-sm text-destructive animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-destructive" />
                <p>{error}</p>
              </div>
            )}
            {notice && (
              <div className="rounded-xl bg-primary/12 px-3 py-3 text-sm text-primary">
                <p>{notice}</p>
              </div>
            )}
            <Button
              type="button"
              className="w-full rounded-full bg-primary py-5 text-sm font-semibold text-primary-foreground disabled:opacity-70"
              onClick={handleSubmit}
              disabled={!canSubmit || status === "loading" || redirecting}
            >
              {redirecting ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Taking you home…
                </span>
              ) : status === "loading" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : mode === "register" ? (
                "Create account"
              ) : mode === "login" ? (
                "Sign in"
              ) : mode === "reset" ? (
                token.trim() ? "Reset password" : "Send reset link"
              ) : (
                "Send"
              )}
            </Button>
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
        </div>
      </div>
    </div>
  );
};

export default Auth;
