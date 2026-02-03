import { Button } from "@/components/ui/button";
import { Bell, User } from "lucide-react";
import { motion } from "framer-motion";
import { AnimatedNumber } from "./AnimatedNumber";
import { CalorieGauge } from "./CalorieGauge";
import { ExperienceSwitch } from "./ExperienceSwitch";
import { SyncStatus } from "./SyncStatus";
import type { MacroTarget } from "@/data/mock";

type DashboardHeaderProps = {
  eaten: number;
  steps: number;
  kcalLeft: number;
  goal: number;
  syncState: "idle" | "syncing";
  macros: MacroTarget[];
  onProfileClick?: () => void;
};

export const DashboardHeader = ({
  eaten,
  steps,
  kcalLeft,
  goal,
  syncState,
  macros,
  onProfileClick,
}: DashboardHeaderProps) => {
  const consumed = Math.max(eaten, 0);
  const remaining = goal > 0 ? Math.max(goal - consumed, 0) : 0;
  return (
    <header className="relative overflow-visible pb-10">
      <div className="relative overflow-hidden rounded-b-[40px] bg-[radial-gradient(circle_at_15%_10%,_rgba(191,219,254,0.85),_transparent_50%),radial-gradient(circle_at_85%_0%,_rgba(167,243,208,0.92),_transparent_50%),radial-gradient(circle_at_70%_80%,_rgba(253,224,71,0.28),_transparent_60%),linear-gradient(180deg,_rgba(255,255,255,0.96)_0%,_rgba(236,253,245,0.92)_50%,_rgba(209,250,229,0.86)_100%)] pb-20 pt-[calc(3rem+env(safe-area-inset-top))] shadow-[0_22px_55px_rgba(52,211,153,0.28)]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 top-2 h-40 w-40 rounded-full bg-white/45 blur-2xl" />
          <div className="absolute -left-16 bottom-6 h-36 w-36 rounded-full bg-sky-200/60 blur-2xl" />
          <div className="absolute left-1/2 top-0 h-36 w-64 -translate-x-1/2 rounded-[100%] bg-white/50 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_rgba(16,185,129,0.22),_rgba(255,255,255,0)_50%)]" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-white/40 to-aura-surface" />
        </div>
        <div className="relative z-10 flex items-center justify-between gap-3 px-5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-white/85 text-slate-700 shadow-[0_10px_25px_rgba(15,23,42,0.12)] hover:bg-white"
            onClick={onProfileClick}
            aria-label="Open profile actions"
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

        <motion.div
          className="relative z-10 mt-6 flex items-center justify-center px-5 text-emerald-900/70"
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: { opacity: 1, transition: { staggerChildren: 0.08 } },
          }}
        >
          <motion.div
            className="absolute left-5 top-1/2 -translate-y-1/2 text-left"
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700/70">
              Eaten
            </p>
            <p className="text-3xl font-display font-semibold text-emerald-950">
              <AnimatedNumber value={consumed} />
            </p>
          </motion.div>
          <motion.div
            className="relative flex h-60 w-60 items-center justify-center"
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
          >
            <CalorieGauge value={consumed} goal={goal} />
            <motion.div
              className="absolute flex flex-col items-center text-center"
              variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-emerald-700/80">
                Remaining
              </span>
              <div className="mt-1 flex items-baseline gap-1 text-emerald-950">
                <span className="text-6xl font-display font-semibold leading-none">
                  <AnimatedNumber value={remaining} />
                </span>
                {/* <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700/80">
                  cal
                </span> */}
              </div>
              <div className="mt-1 text-[11px] font-semibold text-emerald-700/70">
                Goal <AnimatedNumber value={goal} /> cal
              </div>
            </motion.div>
          </motion.div>
          <motion.div
            className="absolute right-5 top-1/2 -translate-y-1/2 text-right"
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-700/70">
              Steps
            </p>
            <p className="text-3xl font-display font-semibold text-emerald-950">
              <AnimatedNumber value={steps} />
            </p>
          </motion.div>
        </motion.div>
      </div>
      <div className="absolute inset-x-0 -bottom-6 z-20 px-5">
        <div className="grid grid-cols-3 gap-3">
          {macros.map((macro) => {
            const progress =
              macro.goal > 0 ? Math.min((macro.current / macro.goal) * 100, 100) : 0;
            return (
              <div
                key={macro.key}
                className="rounded-[20px] border border-white/70 bg-white/90 px-3 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur"
              >
                <p className="text-xs font-semibold text-slate-700">
                  {macro.label}
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-100">
                  <div
                    className="h-full rounded-full bg-emerald-400 transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-slate-500">
                  <AnimatedNumber value={macro.current} />/
                  <AnimatedNumber value={macro.goal} /> {macro.unit}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </header>
  );
};
