import { Button } from "@/components/ui/button";
import { Bell, ChevronRight, User } from "lucide-react";
import { CalorieGauge } from "./CalorieGauge";
import { ExperienceSwitch } from "./ExperienceSwitch";
import { Stat } from "./Stat";
import { SyncStatus } from "./SyncStatus";

type DashboardHeaderProps = {
  eaten: number;
  burned: number;
  kcalLeft: number;
  goal: number;
  syncState: "idle" | "syncing";
};

export const DashboardHeader = ({
  eaten,
  burned,
  kcalLeft,
  goal,
  syncState,
}: DashboardHeaderProps) => (
  <header className="relative overflow-hidden rounded-[36px] bg-gradient-to-b from-aura-mint via-aura-leaf/80 to-emerald-100 px-5 pb-12 pt-[calc(2.5rem+env(safe-area-inset-top))] shadow-[0_20px_45px_rgba(99,219,99,0.25)]">
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute -right-12 top-6 h-36 w-36 rounded-full bg-white/35 blur-2xl" />
      <div className="absolute -left-10 bottom-4 h-28 w-28 rounded-full bg-emerald-200/50 blur-2xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.55),_rgba(255,255,255,0)_55%)]" />
      <div className="absolute left-1/2 top-0 h-32 w-56 -translate-x-1/2 rounded-[100%] bg-white/40 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(16,185,129,0.25),_rgba(255,255,255,0)_45%)]" />
    </div>
    <div className="relative z-10 flex items-center justify-between gap-3">
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full bg-white/85 text-slate-700 shadow-[0_10px_25px_rgba(15,23,42,0.12)] hover:bg-white"
      >
        <User className="h-5 w-5" />
      </Button>
      <div className="text-center">
        <p className="text-sm font-medium tracking-[0.18em] text-emerald-900/60">
          AuraFit
        </p>
        <h1 className="text-2xl font-display font-semibold text-emerald-950">
          Healthy
        </h1>
        <SyncStatus state={syncState} />
        <div className="mt-3 flex justify-center">
          <ExperienceSwitch />
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-10 w-10 rounded-full bg-white/85 text-slate-700 shadow-[0_10px_25px_rgba(15,23,42,0.12)] hover:bg-white"
      >
        <Bell className="h-5 w-5" />
      </Button>
    </div>

    <div className="relative z-10 mt-8 grid grid-cols-[1fr_auto_1fr] items-center gap-4 text-emerald-900/70">
      <div className="flex min-w-[88px] justify-start">
        <Stat label="Calories eaten" value={eaten} />
      </div>
      <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
        <CalorieGauge value={goal - kcalLeft} goal={goal} />
        <div className="absolute text-center">
          <p className="text-xs font-medium text-emerald-900/70">
            Calories left
          </p>
          <p className="text-3xl font-display font-semibold text-emerald-950">
            {kcalLeft}
          </p>
        </div>
      </div>
      <div className="flex min-w-[88px] justify-end">
        <Stat label="Burned" value={burned} />
      </div>
    </div>

    <Button className="relative z-10 mx-auto mt-6 rounded-full bg-aura-primary px-6 text-white shadow-[0_12px_24px_rgba(74,222,128,0.35)] hover:bg-aura-primary/90">
      See stats
      <ChevronRight className="h-4 w-4" />
    </Button>
  </header>
);
