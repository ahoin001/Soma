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
import { EmptyState } from "@/components/ui/empty-state";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAppStore } from "@/state/AppStore";
import type { Exercise } from "@/types/fitness";
import type { WorkoutPlan, WorkoutTemplate } from "@/types/fitness";
import {
  useLocation,
  useNavigate,
  useNavigationType,
  useSearchParams,
} from "react-router-dom";
import { toast } from "sonner";
import { deleteExercise, fetchCurrentUser } from "@/lib/api";
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
    workoutPlansLoaded,
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
  const navigationType = useNavigationType();
  const location = useLocation();
  const abortRef = useRef<AbortController | null>(null);
  const [expandedPlans, setExpandedPlans] = useState<string[]>([
    workoutPlans[0]?.id ?? "",
  ]);
  const [params, setParams] = useSearchParams();
  const [creating, setCreating] = useState(false);
  const [startingSession, setStartingSession] = useState(false);
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
  const shouldAnimate = navigationType !== "POP";
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
  const activeRoutine = fitnessPlanner.activeRoutine;

  const sheet = params.get("sheet");
  const sheetExerciseId = params.get("exerciseId");
  const sheetExerciseName = params.get("exerciseName");
  const sheetPlanId = params.get("planId");
  const sheetWorkoutId = params.get("workoutId");

  const selectedExercise = useMemo(() => {
    if (!sheetExerciseId && !sheetExerciseName) return null;
    return (
      results.find((item) => item.id === sheetExerciseId) ??
      results.find((item) => item.name === sheetExerciseName) ??
      null
    );
  }, [results, sheetExerciseId, sheetExerciseName]);

  const selectedPlan = useMemo(
    () => workoutPlans.find((plan) => plan.id === sheetPlanId) ?? null,
    [sheetPlanId, workoutPlans],
  );

  const selectedWorkout = useMemo(
    () =>
      selectedPlan?.workouts.find((workout) => workout.id === sheetWorkoutId) ??
      null,
    [selectedPlan, sheetWorkoutId],
  );

  const detailOpen = sheet === "exercise";
  const planSheetOpen = sheet === "plan";
  const workoutSheetOpen = sheet === "workout";
  const canResolveExercise = status !== "loading";
  const detailLoading = detailOpen && !selectedExercise;
  const planSheetLoading = planSheetOpen && !selectedPlan;
  const workoutSheetLoading = workoutSheetOpen && (!selectedPlan || !selectedWorkout);

  const openSheet = (next: Record<string, string>) => {
    setParams(next);
  };

  const closeSheet = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
    } else {
      setParams({}, { replace: true });
    }
  };

  useEffect(() => {
    if (sheet !== "exercise") return;
    if (!canResolveExercise) return;
    if (!selectedExercise && (sheetExerciseName || sheetExerciseId)) {
      setParams({}, { replace: true });
    }
  }, [
    sheet,
    sheetExerciseName,
    sheetExerciseId,
    selectedExercise,
    canResolveExercise,
    setParams,
  ]);

  useEffect(() => {
    if (sheet !== "plan") return;
    if (!workoutPlansLoaded) return;
    if (!selectedPlan) {
      setParams({}, { replace: true });
    }
  }, [sheet, selectedPlan, workoutPlansLoaded, setParams]);

  useEffect(() => {
    if (sheet !== "workout") return;
    if (!workoutPlansLoaded) return;
    if (!selectedPlan || !selectedWorkout) {
      setParams({}, { replace: true });
    }
  }, [sheet, selectedPlan, selectedWorkout, workoutPlansLoaded, setParams]);

  const handleSelectExercise = (exercise: Exercise) => {
    openSheet({
      sheet: "exercise",
      exerciseId: exercise.id,
      exerciseName: exercise.name,
    });
  };

  const handleAddToWorkout = (exercise: Exercise) => {
    setParams({}, { replace: true });
    navigate(`/fitness/exercises/add?name=${encodeURIComponent(exercise.name)}`);
  };

  const handleEditExercise = (exercise: Exercise) => {
    setParams({}, { replace: true });
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
    openSheet({ sheet: "plan", planId: plan.id });
  };

  const handleOpenWorkoutMenu = (workout: WorkoutTemplate, plan: WorkoutPlan) => {
    navigate(`/fitness/workouts/${plan.id}/${workout.id}`);
  };

  const handleOpenWorkoutActions = (
    workout: WorkoutTemplate,
    plan: WorkoutPlan,
  ) => {
    openSheet({ sheet: "workout", planId: plan.id, workoutId: workout.id });
  };
  
  const handleStartNextWorkout = async () => {
    if (startingSession) return;
    setStartingSession(true);
    if (!nextWorkout || !activePlanForHud) {
      await handleCreateWorkout(activePlanForHud?.id ?? null);
      setStartingSession(false);
      return;
    }
    try {
      await fitnessPlanner.startSessionFromTemplate(
        nextWorkout.name,
        nextWorkout.exercises.map((exercise) => exercise.name),
      );
      navigate(`/fitness/workouts/${activePlanForHud.id}/${nextWorkout.id}/session`);
    } catch {
      // handled in hook
    } finally {
      setStartingSession(false);
    }
  };

  const handleQuickAdd = () => {
    if (!activePlanForHud || !nextWorkout) return;
    navigate(
      `/fitness/exercises/add?planId=${encodeURIComponent(
        activePlanForHud.id,
      )}&workoutId=${encodeURIComponent(nextWorkout.id)}`,
    );
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
    <AppShell experience="fitness" onAddAction={handleStartNextWorkout}>
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10">
        {/* Header extends to screen edges for immersive gradient effect (mirrors Nutrition) */}
        <div className="-mx-4">
          <FitnessHeader
            planName={activePlanForHud?.name}
            lastWorkout={
              lastWorkout
                ? `${lastWorkout.name} · ${lastWorkout.lastPerformed ?? "Done"}`
                : "No sessions yet"
            }
            nextSession={nextWorkout ? nextWorkout.name : "Add a workout"}
            readiness="Readiness 82%"
            onStartWorkout={handleStartNextWorkout}
            starting={startingSession}
          />
        </div>

        {hasActiveSession && activeRoutine ? (
          <div className="mt-6 space-y-3">
            <div className="rounded-[24px] border border-emerald-400/30 bg-emerald-400/10 px-4 py-4 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">
                Session in progress
              </p>
              <p className="mt-1 text-lg font-semibold text-white">
                {activeRoutine.name}
              </p>
              <p className="text-xs text-white/60">
                Keep logging sets or finish when you are done.
              </p>
            </div>
            <LiveSessionPanel
              activeSession={fitnessPlanner.activeSession}
              activeRoutine={activeRoutine}
              onLogSet={fitnessPlanner.logSet}
              onAdvanceExercise={handleAdvanceExercise}
              onFinishSession={fitnessPlanner.finishSession}
              unitUsed={fitnessPlanner.weightUnit ?? "lb"}
            />
          </div>
        ) : null}

        <div>
          <section className="mt-8 space-y-6">
          {!showEmptyState && nextWorkout && activePlanForHud ? (
            <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                Quick add
              </p>
              <p className="mt-1 text-sm text-white/70">
                Add an exercise to {nextWorkout.name}.
              </p>
              <Button
                className="mt-3 w-full rounded-full bg-white/10 text-white hover:bg-white/20"
                onClick={handleQuickAdd}
              >
                Add exercise
              </Button>
            </div>
          ) : null}
          {showEmptyState ? (
            <motion.div
              className="space-y-5"
              initial={shouldAnimate ? { opacity: 0, y: 12 } : false}
              animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
              transition={shouldAnimate ? { duration: 0.4, ease: "easeOut" } : undefined}
            >
              <EmptyState
                icon={Dumbbell}
                title="Create your first workout"
                description="Start with a workout, then organize it into folders when you are ready."
                action={{
                  label: creating ? "Creating workout..." : "Create workout",
                  onClick: () => handleCreateWorkout(activePlanForHud?.id ?? null),
                  icon: Dumbbell,
                }}
                secondaryAction={{
                  label: creating ? "Creating folder..." : "Create folder",
                  onClick: () => handleCreatePlan(),
                }}
                className="rounded-[28px] border border-white/10 bg-white/5 py-8 [&_.text-foreground]:!text-white [&_.text-muted-foreground]:!text-white/70"
                size="lg"
              />
              <div className="flex flex-wrap justify-center gap-2">
                {isAdmin ? (
                  <Button
                    variant="secondary"
                    size="sm"
                    className="rounded-full border-white/20 text-white hover:bg-white/10"
                    onClick={() => navigate("/fitness/admin/exercises")}
                  >
                    <Wrench className="mr-2 h-4 w-4" />
                    Manage thumbnails
                  </Button>
                ) : null}
                <Button
                  variant="secondary"
                  size="sm"
                  className="rounded-full border-white/20 text-white hover:bg-white/10"
                  onClick={() => navigate("/fitness/exercises/create")}
                >
                  Create exercise
                </Button>
              </div>
            </motion.div>
          ) : (
            <>
              <motion.div
                initial={shouldAnimate ? { opacity: 0, y: 6 } : false}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
                transition={
                  shouldAnimate ? { duration: 0.3, ease: "easeOut" } : undefined
                }
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
                initial={shouldAnimate ? { opacity: 0, y: 8 } : false}
                animate={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
                transition={
                  shouldAnimate ? { duration: 0.35, ease: "easeOut" } : undefined
                }
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
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        exercise={selectedExercise}
        loading={detailLoading}
        canAddToRoutine={canAddToRoutine}
        onAddToRoutine={handleAddToRoutine}
        onAddToWorkout={handleAddToWorkout}
        onEditExercise={handleEditExercise}
        isAdmin={isAdmin}
        onDeleteExercise={
          isAdmin
            ? async (ex) => {
                try {
                  await deleteExercise(ex.id);
                  closeSheet();
                  toast("Exercise deleted");
                  if (query.trim()) {
                    const ctrl = new AbortController();
                    searchExercises(query, ctrl.signal, "mine");
                  }
                } catch (err) {
                  const msg =
                    err instanceof Error ? err.message : "Delete failed.";
                  toast("Could not delete exercise", { description: msg });
                  throw err;
                }
              }
            : undefined
        }
      />

      <WorkoutPlanSheet
        open={planSheetOpen}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        plan={selectedPlan}
        loading={planSheetLoading}
        isActive={selectedPlan?.id === activePlanId}
        onEditPlan={async (name) => {
          if (!selectedPlan) return;
          try {
            await updateWorkoutPlan(selectedPlan.id, { name });
            toast("Plan updated");
          } catch {
            // handled in hook
          }
        }}
        onManageWorkouts={closeSheet}
        onSetActive={() => {
          if (!selectedPlan) return;
          setActivePlanId(selectedPlan.id);
          closeSheet();
          toast("Active plan set");
        }}
        onDeletePlan={async () => {
          if (!selectedPlan) return;
          try {
            await deleteWorkoutPlan(selectedPlan.id);
            setExpandedPlans((prev) => prev.filter((id) => id !== selectedPlan.id));
            closeSheet();
            toast("Plan deleted");
          } catch {
            // handled in hook
          }
        }}
      />

      <WorkoutTemplateSheet
        open={workoutSheetOpen}
        onOpenChange={(open) => {
          if (!open) closeSheet();
        }}
        plan={selectedPlan}
        workout={selectedWorkout}
        loading={workoutSheetLoading}
        onEdit={() => {
          if (!selectedPlan || !selectedWorkout) return;
          closeSheet();
          navigate(`/fitness/workouts/${selectedPlan.id}/${selectedWorkout.id}`);
        }}
        onRename={async (name) => {
          if (!selectedPlan || !selectedWorkout) return;
          try {
            await updateWorkoutTemplate(selectedPlan.id, selectedWorkout.id, { name });
            closeSheet();
            toast("Workout updated", {
              description: "Workout name saved.",
            });
          } catch {
            // handled in hook
          }
        }}
        onDelete={async () => {
          if (!selectedPlan || !selectedWorkout) return;
          try {
            await deleteWorkoutTemplate(selectedPlan.id, selectedWorkout.id);
            closeSheet();
            toast("Workout deleted", {
              description: "Removed from your plan.",
            });
          } catch {
            // handled in hook
          }
        }}
      />
    </AppShell>
  );
};

export default Fitness;
