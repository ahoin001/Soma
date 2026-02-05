import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { requestPasswordReset, resetPassword } from "@/lib/api";
import { AlertCircle, Loader2 } from "lucide-react";

const Auth = () => {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
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

  const handleSuccess = (isNewUser = false) => {
    const from = (location.state as { from?: string } | undefined)?.from;
    const destination = from && from !== "/auth" ? from : "/nutrition";
    navigate(destination, { replace: true, state: { justLoggedIn: true, isNewUser } });
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus("loading");
    setError(null);
    try {
      setNotice(null);
      if (mode === "register") {
        await register({ email, password, displayName: displayName.trim() || undefined });
        handleSuccess(true);
      } else if (mode === "login") {
        await login({ email, password });
        handleSuccess(false);
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
      let message = "Something went wrong. Please try again.";
      if (err instanceof Error) {
        const raw = err.message;
        // Parse JSON error responses from API
        try {
          const parsed = JSON.parse(raw);
          if (parsed.error) {
            message = parsed.error;
          }
        } catch {
          // Not JSON, try to extract meaningful messages
          if (raw.includes("No account found")) {
            message = "No account found with this email. Would you like to create one?";
          } else if (raw.includes("Incorrect password")) {
            message = "Incorrect password. Please try again.";
          } else if (raw.includes("already exists") || raw.includes("duplicate")) {
            message = "An account with this email already exists. Try signing in instead.";
          } else if (raw.includes("network") || raw.includes("fetch")) {
            message = "Unable to connect. Please check your internet connection.";
          } else if (raw) {
            message = raw;
          }
        }
      }
      setError(message);
    } finally {
      setStatus("idle");
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-emerald-100 via-emerald-50 to-white">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-20 top-10 h-48 w-48 rounded-full bg-emerald-200/70 blur-3xl" />
        <div className="absolute right-[-60px] top-32 h-56 w-56 rounded-full bg-emerald-300/60 blur-3xl" />
        <div className="absolute left-10 bottom-[-60px] h-56 w-56 rounded-full bg-emerald-100/80 blur-3xl" />
      </div>
      <div className="relative mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6">
        <div className="rounded-[28px] border border-emerald-100 bg-white/90 px-5 py-6 shadow-[0_18px_40px_rgba(16,185,129,0.15)]">
          <p className="text-xs uppercase tracking-[0.3em] text-emerald-400">AuraFit</p>
          <h1 className="mt-2 text-2xl font-display font-semibold text-emerald-950">
            {mode === "register"
              ? "Create your account"
              : mode === "reset"
                ? "Reset your password"
                : "Welcome back"}
          </h1>
          <p className="mt-1 text-sm text-emerald-700/70">
            Track meals, training, and habits with a personalized plan.
          </p>
          <div className="mt-6 space-y-4">
            {mode === "register" && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  Display name
                </label>
                <Input
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Your name"
                  className="rounded-full"
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                Email
              </label>
              <Input
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  if (error) setError(null);
                }}
                placeholder="name@email.com"
                type="email"
                className={`rounded-full ${error ? "border-rose-300 focus-visible:ring-rose-200" : ""}`}
              />
            </div>
            {(mode === "login" || mode === "register" || (mode === "reset" && token.trim())) && (
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
                  {mode === "reset" ? "New password" : "Password"}
                </label>
                <Input
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (error) setError(null);
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
                  onChange={(event) => {
                    setToken(event.target.value);
                    if (error) setError(null);
                  }}
                  placeholder="Paste token from email"
                  className="rounded-full"
                />
              </div>
            )}
            {error && (
              <div className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-3 text-sm text-rose-700 animate-in fade-in slide-in-from-top-1 duration-200">
                <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-rose-500" />
                <p>{error}</p>
              </div>
            )}
            {notice && (
              <div className="rounded-xl bg-emerald-50 px-3 py-3 text-sm text-emerald-700">
                <p>{notice}</p>
              </div>
            )}
            <Button
              type="button"
              className="w-full rounded-full bg-aura-primary py-5 text-sm font-semibold text-white disabled:opacity-70"
              onClick={handleSubmit}
              disabled={!canSubmit || status === "loading"}
            >
              {status === "loading" ? (
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
              className="w-full text-xs text-emerald-600"
              onClick={() => {
                setMode(mode === "register" ? "login" : "register");
                setError(null);
                setNotice(null);
              }}
            >
              {mode === "register"
                ? "Already have an account? Sign in"
                : "New here? Create an account"}
            </button>
            {mode === "login" && (
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <button
                  type="button"
                  onClick={() => {
                    setMode("reset");
                    setError(null);
                    setNotice(null);
                  }}
                >
                  Forgot password?
                </button>
              </div>
            )}
            {mode === "reset" && (
              <button
                type="button"
                className="w-full text-xs text-slate-500"
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setNotice(null);
                }}
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
