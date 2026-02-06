import { Button } from "@/components/ui/button";
import { Bell, ChevronRight, User } from "lucide-react";
import { ExperienceSwitch } from "./ExperienceSwitch";

type FitnessHeaderProps = {
  lastWorkout: string;
  nextSession: string;
  readiness: string;
  planName?: string;
  onStartWorkout?: () => void;
  starting?: boolean;
};

export const FitnessHeader = ({
  lastWorkout,
  nextSession,
  readiness,
  planName,
  onStartWorkout,
  starting = false,
}: FitnessHeaderProps) => (
  // pt includes safe-area-inset-top for immersive edge-to-edge display under status bar
  <header className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 pb-10 text-white shadow-[0_20px_45px_rgba(15,23,42,0.5)]" style={{ paddingTop: "calc(1.5rem + var(--sat, env(safe-area-inset-top)))" }}>
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -right-10 top-6 h-32 w-32 rounded-full bg-emerald-400/20 blur-2xl" />
      <div className="absolute -left-8 bottom-4 h-24 w-24 rounded-full bg-teal-400/20 blur-2xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.12),_rgba(255,255,255,0)_55%)]" />
    </div>

    <div className="relative z-10 mx-auto w-full max-w-sm px-5">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <User className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium text-white/70">IronFlow</p>
          <h1 className="text-2xl font-display font-semibold">Strength</h1>
          <p className="text-xs text-white/60">
            {planName ? `${planName} · ` : ""}
            {readiness}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <Bell className="h-5 w-5" />
        </Button>
      </div>

      <div className="mt-4 flex justify-center">
        <ExperienceSwitch variant="dark" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 text-white/80">
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">
            Last session
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{lastWorkout}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 backdrop-blur">
          <p className="text-xs uppercase tracking-[0.2em] text-white/50">
            Next up
          </p>
          <p className="mt-1 text-sm font-semibold text-white">{nextSession}</p>
        </div>
      </div>

      <Button
        className="mx-auto mt-5 rounded-full bg-emerald-400 px-6 text-slate-950 shadow-[0_12px_24px_rgba(45,212,191,0.35)] hover:bg-emerald-300"
        onClick={onStartWorkout}
        disabled={starting}
      >
        {starting ? "Starting..." : "Start workout"}
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  </header>
);
