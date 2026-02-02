import {
  AppShell,
  ExerciseDetailSheet,
  FitnessHeader,
  LiveSessionPanel,
  RoutineBuilderPanel,
  WorkoutPlanSheet,
  WorkoutPlanSection,
  VirtualizedExerciseList,
} from "@/components/aura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Dumbbell, Layers, LineChart, Timer } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/state/AppStore";
import type { Exercise } from "@/types/fitness";
import type { WorkoutPlan, WorkoutTemplate } from "@/types/fitness";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const fitnessBlocks = [
  {
    title: "Atlas",
    description: "Explore exercises by muscle group and equipment.",
    action: "Browse library",
    icon: Dumbbell,
  },
  {
    title: "Architect",
    description: "Build reusable routines and supersets.",
    action: "Create routine",
    icon: Layers,
  },
  {
    title: "Flow",
    description: "Log sets quickly with auto-rest timers.",
    action: "Start session",
    icon: Timer,
  },
  {
    title: "Pulse",
    description: "Track volume, PRs, and training streaks.",
    action: "View progress",
    icon: LineChart,
  },
];

const Fitness = () => {
  const {
    fitnessLibrary: { query, results, status, error, searchExercises, setQuery },
    fitnessPlanner,
    workoutPlans,
    activePlanId,
    setActivePlanId,
    lastWorkoutByPlan,
    updateWorkoutPlan,
    deleteWorkoutPlan,
  } = useAppStore();
  const navigate = useNavigate();
  const abortRef = useRef<AbortController | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<string[]>([
    workoutPlans[0]?.id ?? "",
  ]);
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);

  useEffect(() => {
    if (!query.trim()) return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const timer = window.setTimeout(() => {
      searchExercises(query, controller.signal);
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchExercises]);

  const previewItems = useMemo(() => results.slice(0, 120), [results]);
  const activePlanForHud =
    workoutPlans.find((plan) => plan.id === activePlanId) ?? workoutPlans[0];
  const lastWorkoutId = activePlanForHud
    ? lastWorkoutByPlan[activePlanForHud.id] ?? null
    : null;
  const lastWorkout = activePlanForHud
    ? activePlanForHud.workouts.find((workout) => workout.id === lastWorkoutId) ??
      null
    : null;
  const nextWorkout = useMemo(() => {
    if (!activePlanForHud || activePlanForHud.workouts.length === 0) {
      return null;
    }
    if (!lastWorkoutId) return activePlanForHud.workouts[0];
    const index = activePlanForHud.workouts.findIndex(
      (workout) => workout.id === lastWorkoutId,
    );
    const nextIndex =
      index >= 0 ? (index + 1) % activePlanForHud.workouts.length : 0;
    return activePlanForHud.workouts[nextIndex] ?? activePlanForHud.workouts[0];
  }, [activePlanForHud, lastWorkoutId]);
  const hasActiveSession = Boolean(fitnessPlanner.activeSession);
  const canAddToRoutine = Boolean(fitnessPlanner.activeRoutineId);

  const handleSelectExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
    setDetailOpen(true);
  };

  const handleAddToRoutine = (exercise: Exercise) => {
    if (!fitnessPlanner.activeRoutineId) return;
    fitnessPlanner.addExerciseToRoutine(fitnessPlanner.activeRoutineId, exercise);
  };

  const handleAdvanceExercise = () => {
    if (!fitnessPlanner.activeSession || !fitnessPlanner.activeRoutine) return;
    const isLast =
      fitnessPlanner.activeSession.currentExerciseIndex >=
      fitnessPlanner.activeRoutine.exercises.length - 1;
    if (isLast) {
      fitnessPlanner.finishSession();
      return;
    }
    fitnessPlanner.advanceExercise();
  };

  const handleOpenPlanMenu = (plan: WorkoutPlan) => {
    setSelectedPlan(plan);
    setPlanSheetOpen(true);
  };

  const handleOpenWorkoutMenu = (workout: WorkoutTemplate, plan: WorkoutPlan) => {
    navigate(`/fitness/workouts/${plan.id}/${workout.id}`);
  };

  return (
    <AppShell experience="fitness">
      <div className="mx-auto w-full max-w-sm px-5 pb-10 pt-6 text-foreground">
        <FitnessHeader
          planName={activePlanForHud?.name}
          lastWorkout={
            lastWorkout
              ? `${lastWorkout.name} · ${lastWorkout.lastPerformed ?? "Done"}`
              : "No sessions yet"
          }
          nextSession={nextWorkout ? nextWorkout.name : "Add a workout"}
          readiness="Readiness 82%"
        />

        <section className="mt-8 space-y-6">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              Today in focus
            </p>
            <h2 className="mt-2 text-xl font-display font-semibold text-white">
              Design your strength
            </h2>
            <p className="mt-1 text-sm text-white/60">
              Plan the routine, then drop into Flow mode when you are ready.
            </p>
          </div>

          <Card className="border-white/10 bg-card text-card-foreground">
            <CardHeader>
              <CardTitle className="text-lg text-white">Atlas</CardTitle>
              <CardDescription className="text-white/60">
                Search the exercise library by name or muscle group.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search exercises (e.g., bench press)"
                className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
              />
              {status === "error" ? (
                <p className="text-sm text-rose-300">{error}</p>
              ) : null}
              {status === "loading" ? (
                <p className="text-sm text-white/60">Loading exercises...</p>
              ) : null}
              {previewItems.length ? (
                <VirtualizedExerciseList
                  items={previewItems}
                  selectedId={selectedExercise?.id ?? null}
                  onSelect={handleSelectExercise}
                />
              ) : (
                <p className="text-sm text-white/50">
                  Start typing to explore the Atlas.
                </p>
              )}
            </CardContent>
          </Card>

          <WorkoutPlanSection
            plans={workoutPlans}
            expandedPlans={expandedPlans}
            activePlanId={activePlanForHud?.id ?? null}
            onExpandedChange={setExpandedPlans}
            onOpenPlanMenu={handleOpenPlanMenu}
            onOpenWorkoutMenu={handleOpenWorkoutMenu}
          />

          <RoutineBuilderPanel
            routines={fitnessPlanner.routines}
            activeRoutineId={fitnessPlanner.activeRoutineId}
            activeRoutine={fitnessPlanner.activeRoutine}
            selectedExercise={selectedExercise}
            hasActiveSession={hasActiveSession}
            onSelectRoutine={fitnessPlanner.setActiveRoutineId}
            onCreateRoutine={fitnessPlanner.createRoutine}
            onRenameRoutine={fitnessPlanner.renameRoutine}
            onRemoveRoutine={fitnessPlanner.removeRoutine}
            onAddExercise={fitnessPlanner.addExerciseToRoutine}
            onRemoveExercise={fitnessPlanner.removeExerciseFromRoutine}
            onUpdateExercise={fitnessPlanner.updateRoutineExercise}
            onStartSession={fitnessPlanner.startSession}
          />

          <LiveSessionPanel
            activeSession={fitnessPlanner.activeSession}
            activeRoutine={fitnessPlanner.activeRoutine}
            onLogSet={fitnessPlanner.logSet}
            onAdvanceExercise={handleAdvanceExercise}
            onFinishSession={fitnessPlanner.finishSession}
          />

          <div className="grid gap-4">
            {fitnessBlocks.map((block) => {
              const Icon = block.icon;
              return (
                <Card
                  key={block.title}
                  className="border-white/10 bg-card text-card-foreground"
                >
                  <CardHeader className="flex-row items-center gap-3 pb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-white">
                        {block.title}
                      </CardTitle>
                      <CardDescription className="text-white/60">
                        {block.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <Button className="w-full rounded-full bg-white/10 text-white hover:bg-white/20">
                      {block.action}
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>
      </div>

      <ExerciseDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        exercise={selectedExercise}
        canAddToRoutine={canAddToRoutine}
        onAddToRoutine={handleAddToRoutine}
      />

      <WorkoutPlanSheet
        open={planSheetOpen}
        onOpenChange={setPlanSheetOpen}
        plan={selectedPlan}
        isActive={selectedPlan?.id === activePlanId}
        onEditPlan={(name) => {
          if (!selectedPlan) return;
          updateWorkoutPlan(selectedPlan.id, { name });
          toast("Plan updated");
        }}
        onManageWorkouts={() => setPlanSheetOpen(false)}
        onSetActive={() => {
          if (!selectedPlan) return;
          setActivePlanId(selectedPlan.id);
          setPlanSheetOpen(false);
          toast("Active plan set");
        }}
        onDeletePlan={() => {
          if (!selectedPlan) return;
          deleteWorkoutPlan(selectedPlan.id);
          setPlanSheetOpen(false);
          toast("Plan deleted");
        }}
      />
    </AppShell>
  );
};

export default Fitness;
