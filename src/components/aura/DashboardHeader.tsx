import { useCallback, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Bell, ListOrdered, Target, User } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { triggerActionHaptic, triggerSoftHaptic, triggerToggleHaptic } from "@/lib/haptics";
import type { TopSource } from "@/lib/nutritionData";
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
  onGoalsClick?: () => void;
  onLongPressMacros?: () => void;
  animateTrigger?: number;
  variant?: DashboardHeaderVariant;
  /** Top contributing foods per macro (carbs, protein, fat). Enables "sources" popover on cards. */
  topSourcesMacro?: Record<string, TopSource[]>;
  /** Top contributing foods per micro key (e.g. fiber_g, sodium_mg). Enables "sources" popover on micro cards. */
  topSourcesMicro?: Record<string, TopSource[]>;
};

const LONG_PRESS_MS = 400;
const MICRO_GRID_VARIANTS = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.045,
      delayChildren: 0.03,
    },
  },
  exit: {
    transition: {
      staggerChildren: 0.02,
      staggerDirection: -1 as const,
    },
  },
};

const MICRO_CARD_VARIANTS = {
  hidden: { opacity: 0, y: 10, scale: 0.985 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 360,
      damping: 30,
      mass: 0.7,
    },
  },
  exit: {
    opacity: 0,
    y: 4,
    scale: 0.99,
    transition: { duration: 0.16, ease: "easeInOut" as const },
  },
};

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
  onGoalsClick,
  onLongPressMacros,
  animateTrigger,
  variant = "immersive",
  topSourcesMacro,
  topSourcesMicro,
}: DashboardHeaderProps) => {
  const [showMicros, setShowMicros] = useState(false);
  const [sourcesPopoverKey, setSourcesPopoverKey] = useState<string | null>(null);
  const [microSourcesPopoverKey, setMicroSourcesPopoverKey] = useState<string | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const touchStartRef = useRef<number | null>(null);
  const toggledInPointerUpRef = useRef(false);
  const sourcesTouchedRef = useRef(false);
  const navigate = useNavigate();
  const handleGoalsClick = useCallback(() => {
    if (onGoalsClick) onGoalsClick();
    else navigate("/nutrition/goals");
  }, [onGoalsClick, navigate]);

  const handlePointerDown = useCallback(() => {
    touchStartRef.current = Date.now();
    longPressTriggeredRef.current = false;
    longPressTimerRef.current = setTimeout(() => {
      longPressTimerRef.current = null;
      longPressTriggeredRef.current = true;
      triggerActionHaptic();
      onLongPressMacros?.();
    }, LONG_PRESS_MS);
  }, [onLongPressMacros]);

  const handlePointerUp = useCallback(() => {
    const elapsed = touchStartRef.current ? Date.now() - touchStartRef.current : 0;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    const wasShortPress = elapsed > 0 && elapsed < LONG_PRESS_MS;
    if (!longPressTriggeredRef.current && wasShortPress) {
      toggledInPointerUpRef.current = true;
      triggerToggleHaptic();
      setShowMicros((prev) => !prev);
    }
    touchStartRef.current = null;
  }, []);

  const handleMacroCardsClick = useCallback((e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return;
    }
    if (toggledInPointerUpRef.current) {
      toggledInPointerUpRef.current = false;
      return;
    }
    triggerToggleHaptic();
    setShowMicros((prev) => !prev);
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
            className="h-10 w-10 rounded-full bg-card/90 text-foreground shadow-[0_10px_25px_rgba(15,23,42,0.12)] transition duration-150 hover:bg-card active:scale-95 motion-reduce:transform-none"
            onClick={() => {
              triggerSoftHaptic();
              onProfileClick?.();
            }}
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
          <div className="flex flex-col items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-full bg-card/90 text-foreground shadow-[0_10px_25px_rgba(15,23,42,0.12)] transition duration-150 hover:bg-card active:scale-95 motion-reduce:transform-none"
              onClick={() => {
                triggerSoftHaptic();
                onBellClick?.();
              }}
              aria-label="Admin food import"
            >
              <Bell className="h-5 w-5" />
            </Button>
            {macros.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-card/90 text-foreground shadow-[0_10px_25px_rgba(15,23,42,0.12)] transition duration-150 hover:bg-card active:scale-95 motion-reduce:transform-none"
                onClick={() => {
                  triggerActionHaptic();
                  handleGoalsClick();
                }}
                aria-label="Open nutrition goals"
              >
                <Target className="h-5 w-5" />
              </Button>
            )}
          </div>
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
            aria-live="polite"
            aria-atomic="true"
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
              aria-live="polite"
              aria-atomic="true"
              aria-label={`${remaining} calories remaining of ${goal} goal`}
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
      {/* Macro cards: center aligns with the bottom edge of the HUD. Stay in place when micros expand. */}
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
          onClick={handleMacroCardsClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleMacroCardsClick(e);
            }
          }}
          onContextMenu={(e) => e.preventDefault()}
          role="button"
          tabIndex={0}
          aria-label="Tap to show micronutrients. Long-press to set goals."
        >
          {macros.map((macro) => {
            const progress =
              macro.goal > 0 ? Math.min((macro.current / macro.goal) * 100, 100) : 0;
            const sources = topSourcesMacro?.[macro.key];
            const hasSources = Array.isArray(sources) && sources.length > 0;
            const sourcesOpen = sourcesPopoverKey === macro.key;
            const card = (
              <div
                key={macro.key}
                className="relative rounded-[20px] border border-border/70 bg-transparent px-3 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur"
              >
                <div className="flex items-start justify-between gap-1">
                  <p className="text-xs font-semibold text-foreground/85">
                    {macro.label}
                  </p>
                  {hasSources && (
                    <Popover open={sourcesOpen} onOpenChange={(open) => setSourcesPopoverKey(open ? macro.key : null)}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className={cn(
                            "touch-manipulation inline-flex min-h-[44px] min-w-[44px] -m-2 items-center justify-center rounded-md p-2 text-muted-foreground hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                            sourcesOpen && "text-primary"
                          )}
                          aria-label={`Top sources for ${macro.label}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (sourcesTouchedRef.current) {
                              sourcesTouchedRef.current = false;
                              return;
                            }
                            triggerSoftHaptic();
                            setSourcesPopoverKey((k) => (k === macro.key ? null : macro.key));
                          }}
                          onPointerDown={(e) => e.stopPropagation()}
                          onPointerUp={(e) => e.stopPropagation()}
                          onTouchEnd={(e) => {
                            e.preventDefault();
                            sourcesTouchedRef.current = true;
                            triggerSoftHaptic();
                            setSourcesPopoverKey((k) => (k === macro.key ? null : macro.key));
                          }}
                        >
                          <ListOrdered className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[min(16rem,85vw)] max-w-[16rem] overflow-hidden rounded-xl border border-primary/25 bg-card p-0 shadow-lg data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
                        align="center"
                        side="bottom"
                        sideOffset={6}
                        collisionPadding={12}
                      >
                        <div className="border-b border-border/60 px-3 py-2">
                          <p className="text-sm font-semibold text-foreground">
                            Top sources — {macro.label}
                          </p>
                        </div>
                        <ul className="max-h-56 overflow-y-auto py-1">
                          {sources.map((s, i) => (
                            <li
                              key={`${s.name}-${i}`}
                              className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                            >
                              <div className="min-w-0 flex-1">
                                <span className="truncate block text-foreground">{s.name}</span>
                                {s.quantity > 1 ? (
                                  <span className="mt-0.5 inline-block text-[10px] text-muted-foreground">
                                    ×{s.quantity}
                                  </span>
                                ) : null}
                              </div>
                              <span className="shrink-0 tabular-nums text-muted-foreground">
                                {Math.round(s.contribution * 10) / 10} {macro.unit}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </PopoverContent>
                    </Popover>
                  )}
                </div>
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
            return card;
          })}
        </div>
      </div>

      {/* Micro cards: continuation of macro row, same grid and spacing. */}
      <div className="relative z-20 mt-1 px-5 overflow-hidden">
        <AnimatePresence initial={false}>
          {showMicros ? (
            <motion.div
              key="hud-micros"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="overflow-hidden pb-2"
            >
              <motion.div
                className="grid grid-cols-3 gap-3"
                variants={MICRO_GRID_VARIANTS}
                initial="hidden"
                animate="show"
                exit="exit"
              >
                {(() => {
                  const { slotKeys, goals } = getMicroState();
                  const microValues = (micros ?? {}) as Record<string, number | undefined>;
                  return slotKeys.map((key) => {
                    const opt = MICRO_OPTIONS.find((o) => o.key === key);
                    const current = microValues?.[key] ?? 0;
                    if (!opt) return null;
                    const entry = goals[key];
                    const rounded = Math.round(current * 10) / 10;
                    const cardClass =
                      "rounded-[20px] border border-border/70 bg-transparent px-3 py-3 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur";
                    const microSources = topSourcesMicro?.[key] ?? [];
                    const hasMicroSources = Array.isArray(microSources) && microSources.length > 0;
                    const microSourcesOpen = microSourcesPopoverKey === key;
                    const sourcesPopover = (
                      <Popover
                        open={microSourcesOpen}
                        onOpenChange={(open) => setMicroSourcesPopoverKey(open ? key : null)}
                      >
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                            "touch-manipulation inline-flex min-h-[44px] min-w-[44px] -m-2 items-center justify-center rounded-md p-2 text-muted-foreground hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/30",
                            microSourcesOpen && "text-primary"
                          )}
                            aria-label={`Top sources for ${opt.label}`}
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              triggerSoftHaptic();
                              setMicroSourcesPopoverKey((k) => (k === key ? null : key));
                            }}
                            onPointerDown={(e) => e.stopPropagation()}
                            onPointerUp={(e) => e.stopPropagation()}
                            onTouchEnd={(e) => {
                              e.preventDefault();
                              triggerSoftHaptic();
                              setMicroSourcesPopoverKey((k) => (k === key ? null : key));
                            }}
                          >
                            <ListOrdered className="h-3.5 w-3.5" />
                          </button>
                        </PopoverTrigger>
                        <PopoverContent
                          className="w-[min(16rem,85vw)] max-w-[16rem] overflow-hidden rounded-xl border border-primary/25 bg-card p-0 shadow-lg data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95"
                          align="center"
                          side="bottom"
                          sideOffset={6}
                          collisionPadding={12}
                        >
                          <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
                            <p className="text-sm font-semibold text-foreground">
                              Top sources — {opt.label}
                            </p>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-7 rounded-full px-2.5 text-[11px] font-semibold text-primary hover:bg-primary/15"
                              onClick={() => {
                                navigate("/nutrition/goals#micros");
                              }}
                            >
                              Manage
                            </Button>
                          </div>
                          {hasMicroSources ? (
                            <ul className="max-h-56 overflow-y-auto py-1">
                              {microSources.map((s, i) => (
                                <li
                                  key={`${s.name}-${i}`}
                                  className="flex items-center justify-between gap-2 px-3 py-2 text-xs"
                                >
                                  <div className="min-w-0 flex-1">
                                    <span className="truncate block text-foreground">{s.name}</span>
                                    {s.quantity > 1 ? (
                                      <span className="mt-0.5 inline-block text-[10px] text-muted-foreground">
                                        ×{s.quantity}
                                      </span>
                                    ) : null}
                                  </div>
                                  <span className="shrink-0 tabular-nums text-muted-foreground">
                                    {Math.round(s.contribution * 10) / 10} {opt.unit}
                                  </span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className="px-3 py-4 text-xs text-muted-foreground">
                              No source data yet. Log foods with micronutrients to see top contributors.
                            </p>
                          )}
                          {key === "sodium_mg" && (() => {
                            const k = typeof microValues?.potassium_mg === "number" ? microValues.potassium_mg : 0;
                            const na = typeof microValues?.sodium_mg === "number" ? microValues.sodium_mg : 0;
                            if (na <= 0 || !Number.isFinite(k)) return null;
                            const ratio = k / na;
                            const target = 2;
                            const met = ratio >= target;
                            return (
                              <div className="border-t border-border/60 px-3 py-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                                    K∶Na ratio
                                  </span>
                                  <span className={cn(
                                    "text-xs font-semibold tabular-nums",
                                    met ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                                  )}>
                                    {ratio.toFixed(1)}∶1
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[10px] text-muted-foreground">
                                  {met ? "✓ Aim 2:1 or higher" : `Aim 2:1 (e.g. more potassium)`}
                                </p>
                              </div>
                            );
                          })()}
                        </PopoverContent>
                      </Popover>
                    );
                    if (entry?.mode === "goal") {
                      const goalNum = typeof entry.value === "number" && entry.value > 0 ? entry.value : null;
                      const safeGoal = goalNum ?? 1;
                      const percent = Math.min(100, (rounded / safeGoal) * 100);
                      const met = goalNum != null && rounded >= goalNum;
                      return (
                        <motion.div
                          key={key}
                          variants={MICRO_CARD_VARIANTS}
                          className={cn(
                            cardClass,
                            "relative",
                            met && "border-primary/30 bg-primary/5",
                          )}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-[11px] font-semibold leading-tight text-foreground/90">
                              {opt.label}
                            </p>
                            {sourcesPopover}
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className="h-full rounded-full bg-primary transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-[10px] tabular-nums text-muted-foreground">
                            <AnimatedNumber value={rounded} animateTrigger={animateTrigger} />
                            {goalNum != null ? (
                              <> / <AnimatedNumber value={goalNum} animateTrigger={animateTrigger} /> {opt.unit}{met && " ✓"}</>
                            ) : (
                              <> {opt.unit}</>
                            )}
                          </p>
                        </motion.div>
                      );
                    }
                    if (entry?.mode === "limit") {
                      const limitNum = typeof entry.value === "number" && entry.value > 0 ? entry.value : null;
                      const safeLimit = limitNum ?? 1;
                      const percent = Math.min(150, (rounded / safeLimit) * 100);
                      const isOver = limitNum != null && rounded > limitNum;
                      const isWarning = !isOver && percent >= 70;
                      const isGood = !isOver && percent < 70;
                      const barColor = isOver
                        ? "bg-destructive"
                        : isWarning
                          ? "bg-amber-500"
                          : "bg-primary";
                      return (
                        <motion.div
                          key={key}
                          variants={MICRO_CARD_VARIANTS}
                          className={cn(
                            cardClass,
                            "relative",
                            isGood && "border-primary/30 bg-primary/5",
                            isWarning && "border-amber-500/40 bg-amber-500/10",
                            isOver && "border-destructive/40 bg-destructive/10",
                          )}
                        >
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-[11px] font-semibold leading-tight text-foreground/90">
                              {opt.label}
                            </p>
                            {sourcesPopover}
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                            <div
                              className={cn("h-full rounded-full transition-all", barColor)}
                              style={{ width: `${Math.min(100, percent)}%` }}
                            />
                          </div>
                          <p className="mt-1.5 text-[10px] tabular-nums text-muted-foreground">
                            <AnimatedNumber value={rounded} animateTrigger={animateTrigger} />
                            {limitNum != null ? (
                              <> / <AnimatedNumber value={limitNum} animateTrigger={animateTrigger} /> {opt.unit}</>
                            ) : (
                              <> {opt.unit}</>
                            )}
                          </p>
                        </motion.div>
                      );
                    }
                    return (
                      <motion.div
                        key={key}
                        variants={MICRO_CARD_VARIANTS}
                        className={cn(cardClass, "relative")}
                      >
                        <div className="flex items-start justify-between gap-1">
                          <p className="text-[11px] font-semibold leading-tight text-foreground/90">
                            {opt.label}
                          </p>
                          {sourcesPopover}
                        </div>
                        <p className="mt-1.5 text-[10px] tabular-nums text-muted-foreground">
                          <AnimatedNumber value={rounded} animateTrigger={animateTrigger} /> {opt.unit}
                        </p>
                      </motion.div>
                    );
                  });
                })()}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </header>
  );
};
