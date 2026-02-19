import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WorkoutPlan, WorkoutTemplate } from "@/types/fitness";
import { Clock, Folder, MoreHorizontal, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const WORKOUT_COLORS = [
  "from-primary/35 to-accent/35",
  "from-primary/30 to-secondary/45",
  "from-accent/35 to-secondary/45",
  "from-primary/25 to-primary/45",
  "from-secondary/50 to-primary/30",
  "from-accent/30 to-primary/30",
];

const pickWorkoutColor = (name: string) => {
  const seed = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return WORKOUT_COLORS[seed % WORKOUT_COLORS.length];
};

type WorkoutPlanSectionProps = {
  plans: WorkoutPlan[];
  expandedPlans: string[];
  activePlanId: string | null;
  onExpandedChange: (planIds: string[]) => void;
  onOpenPlanMenu: (plan: WorkoutPlan) => void;
  onOpenWorkoutMenu: (workout: WorkoutTemplate, plan: WorkoutPlan) => void;
  onOpenWorkoutActions: (workout: WorkoutTemplate, plan: WorkoutPlan) => void;
  onCreatePlan: () => void;
  onCreateWorkout: (planId: string | null) => void;
};

export const WorkoutPlanSection = ({
  plans,
  expandedPlans,
  activePlanId,
  onExpandedChange,
  onOpenPlanMenu,
  onOpenWorkoutMenu,
  onOpenWorkoutActions,
  onCreatePlan,
  onCreateWorkout,
}: WorkoutPlanSectionProps) => {
  const listVariants = {
    hidden: { opacity: 0, y: -4 },
    show: {
      opacity: 1,
      y: 0,
      transition: { staggerChildren: 0.04, delayChildren: 0.03 },
    },
    exit: {
      opacity: 0,
      y: -4,
      transition: { duration: 0.16, ease: "easeInOut" },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0 },
  };
  const hasExpandedPlans = expandedPlans.length > 0;

  return (
    <section className="space-y-4 pb-[calc(7.5rem+var(--sab,0px))]">
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="flex items-center justify-between"
      >
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
            Workout templates
          </p>
          <h2 className="mt-2 text-xl font-display font-semibold text-foreground">
            Your plans
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="rounded-full border-border/70 text-foreground hover:bg-secondary/70"
            onClick={onCreatePlan}
          >
            New plan
          </Button>
          <Button
            className="rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
            onClick={() => onCreateWorkout(activePlanId)}
          >
            New workout
          </Button>
        </div>
      </motion.div>

      <Accordion
        type="multiple"
        value={expandedPlans}
        className="space-y-4"
        onValueChange={onExpandedChange}
      >
        {plans.map((plan) => (
          <AccordionItem
            key={plan.id}
            value={plan.id}
            className="overflow-hidden rounded-[28px] border border-border/70 bg-card/55 shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-center gap-3 px-5 py-5">
              <AccordionTrigger
                className="flex-1 text-left hover:no-underline"
                showChevron={false}
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-border/60 bg-secondary/50">
                    <Folder className="h-5 w-5 text-foreground/80" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-foreground">
                        {plan.name}
                      </p>
                      {activePlanId === plan.id ? (
                        <span className="rounded-full border border-primary/40 bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">
                          Active
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {plan.workouts.length} workouts
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-secondary/60 text-foreground hover:bg-secondary/80"
                onClick={() => onOpenPlanMenu(plan)}
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </div>
            <AccordionContent forceMount className="px-5 pb-5 pt-0">
              <AnimatePresence initial={false}>
                {expandedPlans.includes(plan.id) ? (
                  <motion.div
                    key={`${plan.id}-content`}
                    variants={listVariants}
                    initial="hidden"
                    animate="show"
                    exit="exit"
                    className="grid gap-4 sm:grid-cols-2"
                  >
                    {plan.workouts.map((workout) => (
                      <motion.div
                        key={workout.id}
                        className={cn(
                          "group relative rounded-[24px] border border-border/70 bg-card/45 px-4 py-4 text-left transition-all",
                          "hover:-translate-y-0.5 hover:border-border hover:bg-card/70",
                          "active:translate-y-0 active:border-primary/70",
                        )}
                        role="button"
                        tabIndex={0}
                        variants={itemVariants}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onOpenWorkoutMenu(workout, plan)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            onOpenWorkoutMenu(workout, plan);
                          }
                        }}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2">
                            <div
                              className={cn(
                                "mt-1 h-3 w-3 rounded-full bg-gradient-to-br",
                                pickWorkoutColor(workout.name),
                              )}
                            />
                            <div>
                              <p className="text-base font-semibold text-foreground">
                                {workout.name}
                              </p>
                              <p className="mt-1 text-xs text-muted-foreground">
                                {workout.exercises
                                  .slice(0, 3)
                                  .map((exercise) => exercise.name)
                                  .join(", ")}
                                {workout.exercises.length > 3 ? "…" : ""}
                              </p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full bg-secondary/60 text-foreground/80 transition hover:bg-secondary/80"
                            onClick={(event) => {
                              event.stopPropagation();
                              onOpenWorkoutActions(workout, plan);
                            }}
                            aria-label={`Edit ${workout.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          <span>{workout.lastPerformed ?? "Not started yet"}</span>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <AnimatePresence>
        {hasExpandedPlans ? (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="pointer-events-none fixed inset-x-0 bottom-[calc(7rem+var(--sab,0px))] z-30 px-4"
          >
            <div className="mx-auto flex w-full max-w-[420px] justify-end">
              <motion.button
                type="button"
                className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/90 px-4 py-2 text-sm font-medium text-foreground shadow-[0_10px_24px_rgba(2,6,23,0.28)] backdrop-blur-sm"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onExpandedChange([])}
                aria-label="Close expanded folders"
              >
                <X className="h-4 w-4" />
                Close
              </motion.button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
};
