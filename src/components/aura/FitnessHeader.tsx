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

/**
 * IronFlow header — mirrors the DashboardHeader layout and spacing so
 * switching between experiences feels seamless while keeping the dark,
 * strength-focused identity.
 *
 * Structure (matches DashboardHeader):
 *  - Gradient container extends to the very top of the screen (under status bar)
 *  - Content is padded down by safe-area-inset-top
 *  - Rounded bottom corners create a smooth transition to the content area
 *  - Overlapping stat cards sit at the bottom edge
 */
export const FitnessHeader = ({
  lastWorkout,
  nextSession,
  readiness,
  planName,
  onStartWorkout,
  starting = false,
}: FitnessHeaderProps) => (
  <header className="relative overflow-visible">
    {/* Gradient container — extends to top edge of screen (under status bar) */}
    <div
      className="relative overflow-hidden rounded-b-[40px] bg-gradient-to-br from-background via-card to-secondary pb-20 shadow-[0_22px_55px_rgba(15,23,42,0.5)]"
      style={{
        paddingTop: "calc(3rem + var(--sat, env(safe-area-inset-top)))",
      }}
    >
      {/* Ambient glow decorations */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -right-16 top-2 h-40 w-40 rounded-full bg-primary/20 blur-2xl" />
        <div className="absolute -left-16 bottom-6 h-36 w-36 rounded-full bg-accent/25 blur-2xl" />
        <div className="absolute left-1/2 top-0 h-36 w-64 -translate-x-1/2 rounded-[100%] bg-foreground/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--primary)/0.14),_rgba(255,255,255,0)_50%)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-background/40 to-background" />
      </div>

      {/* Top row: profile — brand — notifications (matches DashboardHeader) */}
      <div className="relative z-10 flex items-center justify-between gap-3 px-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-card/50 text-foreground shadow-[0_10px_25px_rgba(0,0,0,0.25)] hover:bg-card/70"
        >
          <User className="h-5 w-5" />
        </Button>
        <div className="text-center">
          <p className="text-sm font-medium tracking-[0.18em] text-muted-foreground">
            IronFlow
          </p>
          <h1 className="text-2xl font-display font-semibold text-foreground">
            Strength
          </h1>
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">
            {planName ? `${planName} · ` : ""}
            {readiness}
          </p>
          <div className="mt-3 flex justify-center">
            <ExperienceSwitch variant="dark" />
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full bg-card/50 text-foreground shadow-[0_10px_25px_rgba(0,0,0,0.25)] hover:bg-card/70"
        >
          <Bell className="h-5 w-5" />
        </Button>
      </div>

      {/* CTA button (centered like the calorie gauge occupies the middle in AuraFit) */}
      <div className="relative z-10 mt-8 flex justify-center px-5">
        <Button
          className="rounded-full bg-primary px-8 py-5 text-sm font-semibold text-primary-foreground shadow-[0_16px_30px_rgba(15,23,42,0.35)] hover:bg-primary/90"
          onClick={onStartWorkout}
          disabled={starting}
        >
          {starting ? "Starting..." : "Start workout"}
          <ChevronRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </div>

    {/* Stat cards — overlapping bottom edge (mirrors AuraFit macro cards) */}
    <div
      className="relative z-20 -mb-10 px-5"
      style={{ transform: "translateY(-50%)" }}
    >
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-[20px] border border-border/70 bg-card/90 px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.3)] backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Last session
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{lastWorkout}</p>
        </div>
        <div className="rounded-[20px] border border-border/70 bg-card/90 px-4 py-3 shadow-[0_12px_30px_rgba(0,0,0,0.3)] backdrop-blur">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            Next up
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">{nextSession}</p>
        </div>
      </div>
    </div>
  </header>
);
