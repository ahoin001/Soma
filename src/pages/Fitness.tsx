import {
  AppShell,
  ExerciseDetailSheet,
  FitnessHeader,
  LiveSessionPanel,
  RoutineBuilderPanel,
  WorkoutPlanSheet,
  WorkoutPlanSection,
  WorkoutTemplateSheet,
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
import { Dumbbell, Layers, LineChart, Timer, Wrench } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/state/AppStore";
import type { Exercise } from "@/types/fitness";
import type { WorkoutPlan, WorkoutTemplate } from "@/types/fitness";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { fetchCurrentUser } from "@/lib/api";
import { motion } from "framer-motion";

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
    updateWorkoutTemplate,
    deleteWorkoutPlan,
    deleteWorkoutTemplate,
    createWorkoutPlan,
    createWorkoutTemplate,
  } = useAppStore();
  const navigate = useNavigate();
  const location = useLocation();
  const abortRef = useRef<AbortController | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<string[]>([
    workoutPlans[0]?.id ?? "",
  ]);
  const [planSheetOpen, setPlanSheetOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlan | null>(null);
  const [workoutSheetOpen, setWorkoutSheetOpen] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState<WorkoutTemplate | null>(
    null,
  );
  const [creating, setCreating] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!query.trim()) return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const timer = window.setTimeout(() => {
      searchExercises(query, controller.signal, "mine");
    }, 350);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchExercises]);

  useEffect(() => {
    const state = location.state as { exerciseQuery?: string } | null;
    if (!state?.exerciseQuery) return;
    setQuery(state.exerciseQuery);
    navigate(location.pathname, { replace: true });
  }, [location, navigate, setQuery]);

  useEffect(() => {
    let cancelled = false;
    const loadAdmin = async () => {
      try {
        const user = await fetchCurrentUser();
        if (!cancelled) {
          setIsAdmin(user.user?.email === "ahoin001@gmail.com");
        }
      } catch {
        if (!cancelled) setIsAdmin(false);
      }
    };
    void loadAdmin();
    return () => {
      cancelled = true;
    };
  }, []);

  const previewItems = useMemo(() => results.slice(0, 120), [results]);
  const activePlanForHud =
    workoutPlans.find((plan) => plan.id === activePlanId) ?? workoutPlans[0];
  const totalWorkouts = useMemo(
    () => workoutPlans.reduce((sum, plan) => sum + plan.workouts.length, 0),
    [workoutPlans],
  );
  const showEmptyState = workoutPlans.length === 0 || totalWorkouts === 0;
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

  const handleAddToWorkout = (exercise: Exercise) => {
    setDetailOpen(false);
    navigate(`/fitness/exercises/add?name=${encodeURIComponent(exercise.name)}`);
  };

  const handleEditExercise = (exercise: Exercise) => {
    setDetailOpen(false);
    navigate(`/fitness/exercises/${exercise.id}/edit`);
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

  const handleOpenWorkoutActions = (
    workout: WorkoutTemplate,
    plan: WorkoutPlan,
  ) => {
    setSelectedWorkout(workout);
    setSelectedPlan(plan);
    setWorkoutSheetOpen(true);
  };

  const handleCreatePlan = async () => {
    try {
      setCreating(true);
      const plan = await createWorkoutPlan("Starter plan");
      setActivePlanId(plan.id);
      setExpandedPlans((prev) =>
        prev.includes(plan.id) ? prev : [...prev, plan.id],
      );
      toast("Plan created", {
        description: "Your new folder is ready.",
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create plan";
      toast("Plan not created", { description: message });
    } finally {
      setCreating(false);
    }
  };

  const handleCreateWorkout = async (planId: string | null) => {
    try {
      setCreating(true);
      let targetPlanId = planId;
      if (!targetPlanId) {
        const plan = await createWorkoutPlan("Starter plan");
        targetPlanId = plan.id;
        setActivePlanId(plan.id);
        setExpandedPlans((prev) =>
          prev.includes(plan.id) ? prev : [...prev, plan.id],
        );
      }
      const workout = await createWorkoutTemplate(
        targetPlanId,
        "New workout",
      );
      setExpandedPlans((prev) =>
        prev.includes(targetPlanId) ? prev : [...prev, targetPlanId],
      );
      toast("Workout created", {
        description: "Add exercises to build it out.",
      });
      navigate(`/fitness/workouts/${targetPlanId}/${workout.id}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unable to create workout";
      toast("Workout not created", { description: message });
    } finally {
      setCreating(false);
    }
  };

  return (
    <AppShell experience="fitness">
      <div className="w-full text-foreground">
        <div className="pt-6">
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
        </div>

        <div className="mx-auto w-full max-w-sm px-5 pb-10">
          <section className="mt-8 space-y-6">
          {showEmptyState ? (
            <motion.div
              className="space-y-5"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: "easeOut" }}
            >
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                  Ready to build
                </p>
                <h2 className="mt-2 text-xl font-display font-semibold text-white">
                  Create your first workout
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Start with a workout, then organize it into folders when you are ready.
                </p>
              </div>
              <motion.div
                className="rounded-[28px] border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent px-5 py-6 text-center shadow-[0_25px_50px_rgba(0,0,0,0.35)]"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.05 }}
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/70">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <p className="mt-4 text-sm text-white/70">
                  No workouts yet. Create one and add exercises as you go.
                </p>
                <div className="mt-5 grid gap-2">
                  <Button
                    className="w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                    onClick={() => handleCreateWorkout(activePlanForHud?.id ?? null)}
                    disabled={creating}
                  >
                    {creating ? "Creating workout..." : "Create workout"}
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full rounded-full border-white/20 text-white hover:bg-white/10"
                    onClick={handleCreatePlan}
                    disabled={creating}
                  >
                    {creating ? "Creating folder..." : "Create folder"}
                  </Button>
                  {isAdmin ? (
                    <Button
                      variant="secondary"
                      className="w-full rounded-full bg-white/15 text-white hover:bg-white/25"
                      onClick={() => navigate("/fitness/admin/exercises")}
                    >
                      <Wrench className="h-4 w-4" />
                      Manage thumbnails
                    </Button>
                  ) : null}
                  <Button
                    variant="secondary"
                    className="w-full rounded-full bg-white/15 text-white hover:bg-white/25"
                    onClick={() => navigate("/fitness/exercises/create")}
                  >
                    Create exercise
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <>
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
              >
                <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                  Today in focus
                </p>
                <h2 className="mt-2 text-xl font-display font-semibold text-white">
                  Design your strength
                </h2>
                <p className="mt-1 text-sm text-white/60">
                  Plan the routine, then drop into Flow mode when you are ready.
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
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
                  <Button
                    variant="secondary"
                    className="w-full rounded-full bg-white/10 text-white hover:bg-white/20"
                    onClick={() => navigate("/fitness/exercises/create")}
                  >
                    Create exercise
                  </Button>
                  {creating ? (
                    <p className="text-xs text-white/60">
                      Preparing your workout...
                    </p>
                  ) : null}
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
              </motion.div>

              <WorkoutPlanSection
                plans={workoutPlans}
                expandedPlans={expandedPlans}
                activePlanId={activePlanForHud?.id ?? null}
                onExpandedChange={setExpandedPlans}
                onOpenPlanMenu={handleOpenPlanMenu}
                onOpenWorkoutMenu={handleOpenWorkoutMenu}
                      onOpenWorkoutActions={handleOpenWorkoutActions}
                onCreatePlan={handleCreatePlan}
                onCreateWorkout={handleCreateWorkout}
              />
            </>
          )}
          </section>
        </div>
      </div>

      <ExerciseDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        exercise={selectedExercise}
        canAddToRoutine={canAddToRoutine}
        onAddToRoutine={handleAddToRoutine}
        onAddToWorkout={handleAddToWorkout}
        onEditExercise={handleEditExercise}
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

      <WorkoutTemplateSheet
        open={workoutSheetOpen}
        onOpenChange={setWorkoutSheetOpen}
        plan={selectedPlan}
        workout={selectedWorkout}
        onEdit={() => {
          if (!selectedPlan || !selectedWorkout) return;
          setWorkoutSheetOpen(false);
          navigate(`/fitness/workouts/${selectedPlan.id}/${selectedWorkout.id}`);
        }}
        onRename={(name) => {
          if (!selectedPlan || !selectedWorkout) return;
          updateWorkoutTemplate(selectedPlan.id, selectedWorkout.id, { name });
          setSelectedWorkout((prev) => (prev ? { ...prev, name } : prev));
          setWorkoutSheetOpen(false);
          toast("Workout updated", {
            description: "Workout name saved.",
          });
        }}
        onDelete={() => {
          if (!selectedPlan || !selectedWorkout) return;
          deleteWorkoutTemplate(selectedPlan.id, selectedWorkout.id);
          setWorkoutSheetOpen(false);
          toast("Workout deleted", {
            description: "Removed from your plan.",
          });
        }}
      />
    </AppShell>
  );
};

export default Fitness;
