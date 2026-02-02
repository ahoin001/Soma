import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { WorkoutPlan, WorkoutTemplate } from "@/types/fitness";
import { Clock, Folder, MoreHorizontal } from "lucide-react";

type WorkoutPlanSectionProps = {
  plans: WorkoutPlan[];
  expandedPlans: string[];
  activePlanId: string | null;
  onExpandedChange: (planIds: string[]) => void;
  onOpenPlanMenu: (plan: WorkoutPlan) => void;
  onOpenWorkoutMenu: (workout: WorkoutTemplate, plan: WorkoutPlan) => void;
};

export const WorkoutPlanSection = ({
  plans,
  expandedPlans,
  activePlanId,
  onExpandedChange,
  onOpenPlanMenu,
  onOpenWorkoutMenu,
}: WorkoutPlanSectionProps) => {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-white/40">
            Workout templates
          </p>
          <h2 className="mt-2 text-xl font-display font-semibold text-white">
            Your plans
          </h2>
        </div>
        <Button
          variant="outline"
          className="rounded-full border-white/20 text-white hover:bg-white/10"
        >
          New plan
        </Button>
      </div>

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
            className="overflow-hidden rounded-[28px] border border-white/10 bg-white/5 shadow-[0_20px_40px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-center gap-3 px-5 py-5">
              <AccordionTrigger className="flex-1 text-left hover:no-underline">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
                    <Folder className="h-5 w-5 text-white/70" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-white">
                        {plan.name}
                      </p>
                      {activePlanId === plan.id ? (
                        <span className="rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-emerald-200">
                          Active
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-white/50">
                      {plan.workouts.length} workouts
                    </p>
                  </div>
                </div>
              </AccordionTrigger>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={() => onOpenPlanMenu(plan)}
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
            </div>
            <AccordionContent className="px-5 pb-5 pt-0">
              <div className="grid gap-4 sm:grid-cols-2">
                {plan.workouts.map((workout) => (
                  <div
                    key={workout.id}
                    className={cn(
                      "group relative rounded-[24px] border border-white/10 bg-slate-950/40 px-4 py-4 text-left transition-all",
                      "hover:-translate-y-0.5 hover:border-white/30 hover:bg-slate-950/60",
                      "active:translate-y-0 active:border-emerald-400/60",
                    )}
                    role="button"
                    tabIndex={0}
                    onClick={() => onOpenWorkoutMenu(workout, plan)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        onOpenWorkoutMenu(workout, plan);
                      }
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold text-white">
                          {workout.name}
                        </p>
                        <p className="mt-1 text-xs text-white/50">
                          {workout.exercises
                            .slice(0, 3)
                            .map((exercise) => exercise.name)
                            .join(", ")}
                          {workout.exercises.length > 3 ? "…" : ""}
                        </p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full bg-white/10 text-white/70 transition hover:bg-white/20"
                        onClick={(event) => {
                          event.stopPropagation();
                          onOpenWorkoutMenu(workout, plan);
                        }}
                        aria-label={`Edit ${workout.name}`}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="mt-3 flex items-center gap-2 text-xs text-white/50">
                      <Clock className="h-3 w-3" />
                      <span>{workout.lastPerformed ?? "Not started yet"}</span>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
};
