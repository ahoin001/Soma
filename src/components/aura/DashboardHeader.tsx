import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Bell, User } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "./AnimatedNumber";
import { CalorieGauge } from "./CalorieGauge";
import { ExperienceSwitch } from "./ExperienceSwitch";
import { SyncStatus } from "./SyncStatus";
import type { MacroTarget } from "@/data/mock";
import type { NutritionSummaryMicros } from "@/lib/api";
import { getMicroState, MICRO_OPTIONS } from "./MacroMicroGoalSheet";

type DashboardHeaderVariant = "immersive" | "card" | "media";

type DashboardHeaderProps = {
  eaten: number;
  steps: number;
  kcalLeft: number;
  goal: number;
  syncState: "idle" | "syncing";
  macros: MacroTarget[];
  micros?: NutritionSummaryMicros | null;
  onProfileClick?: () => void;
  onBellClick?: () => void;
  onLongPressMacros?: () => void;
  animateTrigger?: number;
  variant?: DashboardHeaderVariant;
};

const LONG_PRESS_MS = 400;

export const DashboardHeader = ({
  eaten,
  steps,
  kcalLeft,
  goal,
  syncState,
  macros,
  micros,
  onProfileClick,
  onBellClick,
  onLongPressMacros,
  animateTrigger,
  variant = "immersive",
}: DashboardHeaderProps) => {
  const [showMicros, setShowMicros] = useState(false);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartRef = useRef<number | null>(null);

  const handlePointerDown = useCallback(() => {
    touchStartRef.current = Date.now();
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      onLongPressMacros?.();
    }, LONG_PRESS_MS);
  }, [onLongPressMacros]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
      const elapsed = touchStartRef.current ? Date.now() - touchStartRef.current : 0;
      if (elapsed < LONG_PRESS_MS) setShowMicros((prev) => !prev);
    }
    touchStartRef.current = null;
  }, []);

  const handlePointerLeave = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    touchStartRef.current = null;
  }, []);

  const consumed = Math.max(eaten, 0);
  const remaining = goal > 0 ? Math.max(goal - consumed, 0) : 0;
  const isCard = variant === "card";
  const isMedia = variant === "media";
  const headerTopPadding = isCard
    ? "calc(0.75rem + var(--sat, env(safe-area-inset-top)))"
    : undefined;
  const containerTopPadding = isCard
    ? "1.25rem"
    : "calc(3rem + var(--sat, env(safe-area-inset-top)))";

  return (
    <header
      className={cn("relative overflow-visible", isCard && "pt-2")}
      style={isCard ? { paddingTop: headerTopPadding } : undefined}
    >
      {/* 
        Header card extends visually from the TOP of the screen (under status bar)
        but content is padded down by safe-area-inset-top for the notch.
        This creates the "invisible header" effect where gradient flows under status bar.
      */}
      <div
        className={cn(
          "relative overflow-hidden shadow-[0_22px_55px_rgba(15,23,42,0.22)]",
          isCard
            ? "mx-4 rounded-[32px] bg-gradient-to-br from-background via-card to-secondary/65"
            : "rounded-b-[40px] bg-[radial-gradient(circle_at_15%_10%,_hsl(var(--accent)/0.5),_transparent_50%),radial-gradient(circle_at_85%_0%,_hsl(var(--primary)/0.46),_transparent_50%),radial-gradient(circle_at_70%_80%,_hsl(var(--secondary)/0.35),_transparent_60%),linear-gradient(180deg,_hsl(var(--background)/0.96)_0%,_hsl(var(--card)/0.92)_50%,_hsl(var(--secondary)/0.86)_100%)]",
          isMedia && "rounded-b-none pb-10",
          !isMedia && "pb-8",
        )}
        style={{ paddingTop: containerTopPadding }}
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-16 top-2 h-40 w-40 rounded-full bg-card/55 blur-2xl" />
          <div className="absolute -left-16 bottom-6 h-36 w-36 rounded-full bg-accent/45 blur-2xl" />
          <div className="absolute left-1/2 top-0 h-36 w-64 -translate-x-1/2 rounded-[100%] bg-background/55 blur-3xl" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--primary)/0.22),_hsl(var(--background)/0)_50%)]" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-b from-transparent via-background/30 to-background" />
        </div>
        <div className="relative z-10 flex items-center justify-between gap-3 px-5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-card/90 text-foreground shadow-[0_10px_25px_rgba(15,23,42,0.12)] hover:bg-card"
            onClick={onProfileClick}
            aria-label="Open profile actions"
          >
            <User className="h-5 w-5" />
          </Button>
          <div className="text-center">
            <p className="text-sm font-medium tracking-[0.18em] text-primary/70">
              AuraFit
            </p>
            <h1 className="text-2xl font-display font-semibold text-foreground">
              Healthy
            </h1>
            <SyncStatus state={syncState} />
            <div className="mt-3 flex justify-center">
              <ExperienceSwitch />
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full bg-card/90 text-foreground shadow-[0_10px_25px_rgba(15,23,42,0.12)] hover:bg-card"
            onClick={onBellClick}
            aria-label="Admin food import"
          >
            <Bell className="h-5 w-5" />
          </Button>
        </div>

        <motion.div
          className="relative z-10 mt-6 flex items-center justify-center px-5 text-foreground/75"
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
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/75">
              Eaten
            </p>
            <p className="text-3xl font-display font-semibold text-foreground">
              <AnimatedNumber value={consumed} animateTrigger={animateTrigger} />
            </p>
          </motion.div>
          <motion.div
            className="relative flex h-60 w-60 items-center justify-center"
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
          >
            <CalorieGauge value={consumed} goal={goal} celebrateTrigger={animateTrigger} />
            <motion.div
              className="absolute flex flex-col items-center text-center"
              variants={{ hidden: { opacity: 0, y: 6 }, show: { opacity: 1, y: 0 } }}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.3em] text-primary/80">
                Remaining
              </span>
              <div className="mt-1 flex items-baseline gap-1 text-foreground">
                <span className="text-6xl font-display font-semibold leading-none">
                  <AnimatedNumber value={remaining} animateTrigger={animateTrigger} />
                </span>
                {/* <span className="text-xs font-semibold uppercase tracking-[0.2em] text-primary/80">
                  cal
                </span> */}
              </div>
              <div className="mt-1 text-[11px] font-semibold text-primary/75">
                Goal <AnimatedNumber value={goal} animateTrigger={animateTrigger} /> cal
              </div>
            </motion.div>
          </motion.div>
          <motion.div
            className="absolute right-5 top-1/2 -translate-y-1/2 text-right"
            variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0 } }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary/75">
              Steps
            </p>
            <p className="text-3xl font-display font-semibold text-foreground">
              <AnimatedNumber value={steps} animateTrigger={animateTrigger} />
            </p>
          </motion.div>
        </motion.div>
      </div>
      {/* Macro cards: center of cards aligns with the bottom edge of the HUD.
         Tap toggles your 3 chosen micros; long-press opens goal sheet. */}
      <div
        className="relative z-20 -mb-10 px-5"
        style={{ transform: "translateY(-50%)" }}
      >
        <div
          className="grid grid-cols-3 gap-3 select-none"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onPointerCancel={handlePointerLeave}
          onContextMenu={(e) => e.preventDefault()}
          role="button"
          tabIndex={0}
          aria-label="Tap to show micros. Long-press to set goals."
        >
          {macros.map((macro) => {
            const progress =
              macro.goal > 0 ? Math.min((macro.current / macro.goal) * 100, 100) : 0;
            return (
              <div
                key={macro.key}
                className="rounded-[20px] border border-border/70 bg-card/90 px-3 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur"
              >
                <p className="text-xs font-semibold text-foreground/85">
                  {macro.label}
                </p>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  <AnimatedNumber value={macro.current} animateTrigger={animateTrigger} />/
                  <AnimatedNumber value={macro.goal} animateTrigger={animateTrigger} /> {macro.unit}
                </p>
              </div>
            );
          })}
        </div>

        <AnimatePresence initial={false}>
          {showMicros && micros && (() => {
            const { slotKeys, goals } = getMicroState();
            const microValues = micros as Record<string, number | undefined>;
            return (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="mt-3 overflow-hidden"
              >
                <div className="grid grid-cols-3 gap-3">
                  {slotKeys.map((key) => {
                    const opt = MICRO_OPTIONS.find((o) => o.key === key);
                    const current = microValues?.[key] ?? 0;
                    if (!opt) return null;
                    const entry = goals[key];
                    const rounded = Math.round(current * 10) / 10;
                    const cardClass =
                      "rounded-[20px] border border-border/70 bg-card/90 px-3 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur";
                    if (entry?.mode === "goal") {
                      const safeGoal = entry.value > 0 ? entry.value : 1;
                      const percent = Math.min(100, (rounded / safeGoal) * 100);
                      const met = rounded >= entry.value;
                      return (
                        <div
                          key={key}
                          className={cn(
                            cardClass,
                            met && "border-primary/30 bg-primary/5",
                          )}
                        >
                          <p className="text-xs font-semibold text-foreground/85">
                            {opt.label}
                          </p>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            <AnimatedNumber value={rounded} animateTrigger={animateTrigger} />/
                            <AnimatedNumber value={entry.value} animateTrigger={animateTrigger} /> {opt.unit}
                            {met && " ✓"}
                          </p>
                        </div>
                      );
                    }
                    if (entry?.mode === "limit") {
                      const safeLimit = entry.value > 0 ? entry.value : 1;
                      const percent = Math.min(100, (rounded / safeLimit) * 100);
                      const isOver = rounded > entry.value;
                      const isWarning = !isOver && percent >= 80;
                      const barColor = isOver
                        ? "bg-destructive"
                        : isWarning
                          ? "bg-amber-500"
                          : "bg-primary";
                      return (
                        <div
                          key={key}
                          className={cn(
                            cardClass,
                            isWarning && "border-amber-500/40 bg-amber-500/5",
                            isOver && "border-destructive/40 bg-destructive/5",
                          )}
                        >
                          <p className="text-xs font-semibold text-foreground/85">
                            {opt.label}
                          </p>
                          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className={cn("h-full rounded-full transition-all", barColor)}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            <AnimatedNumber value={rounded} animateTrigger={animateTrigger} />/
                            <AnimatedNumber value={entry.value} animateTrigger={animateTrigger} /> {opt.unit}
                            {isOver && " over"}
                          </p>
                        </div>
                      );
                    }
                    return (
                      <div key={key} className={cardClass}>
                        <p className="text-xs font-semibold text-foreground/85">
                          {opt.label}
                        </p>
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          <AnimatedNumber value={rounded} animateTrigger={animateTrigger} /> {opt.unit}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </header>
  );
};
