import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  WorkoutExerciseEntry,
  WorkoutPlan,
  WorkoutTemplate,
} from "@/types/fitness";
import { MoreHorizontal, Plus, Trash2 } from "lucide-react";
import { ReplaceExerciseSheet } from "./ReplaceExerciseSheet";
import { preloadExerciseGuide } from "./ExerciseGuideSheet";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useNavigationType } from "react-router-dom";
import { useAppStore } from "@/state/AppStore";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type EditableSet = {
  id: string;
  weight: string;
  reps: string;
  previous: string;
};

type EditableExercise = {
  id: string;
  name: string;
  sets: EditableSet[];
  note: string;
  steps?: string[];
  guideUrl?: string;
  customVideoName?: string;
};

type SortableExerciseProps = {
  id: string;
  disabled: boolean;
  className: string;
  variants: Record<string, unknown>;
  children: React.ReactNode;
  handle: React.ReactNode;
};

const SortableExercise = ({
  id,
  disabled,
  className,
  variants,
  children,
  handle,
}: SortableExerciseProps) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    touchAction: "none",
  };
  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(className, isDragging && "opacity-70")}
      variants={variants}
      whileTap={{ scale: 0.98 }}
      {...attributes}
    >
      <div
        ref={setActivatorNodeRef}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70"
        {...listeners}
        aria-label="Drag to reorder"
      >
        {handle}
      </div>
      {children}
    </motion.div>
  );
};

const createId = () => `set_${Math.random().toString(36).slice(2, 9)}`;

const createDefaultSets = () => [
  { id: createId(), weight: "35", reps: "14", previous: "35 lb × 14" },
  { id: createId(), weight: "45", reps: "12", previous: "45 lb × 12" },
  { id: createId(), weight: "55", reps: "10", previous: "55 lb × 10" },
];

const formatPrevious = (weight: string, reps: string) => {
  if (!weight && !reps) return "—";
  return `${weight || "—"} lb × ${reps || "—"}`;
};

const isValidNumber = (value: string) =>
  value.trim() === "" || Number(value) > 0;

type WorkoutSessionEditorProps = {
  mode: "edit" | "session";
  workout: WorkoutTemplate | null;
  plan: WorkoutPlan | null;
  onSave?: (exercises: WorkoutExerciseEntry[]) => void;
  onFinish?: () => void;
  onBack: () => void;
  onStartSession?: () => void;
  onOpenGuide?: (exercise: { id: string; name: string }) => void;
};

export const WorkoutSessionEditor = ({
  mode,
  workout,
  plan,
  onSave,
  onFinish,
  onBack,
  onStartSession,
  onOpenGuide,
}: WorkoutSessionEditorProps) => {
  const { workoutDrafts, setWorkoutDraft, clearWorkoutDraft } = useAppStore();
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [swipedSetId, setSwipedSetId] = useState<string | null>(null);
  const [noteOpenIds, setNoteOpenIds] = useState<Set<string>>(() => new Set());
  const [savePulse, setSavePulse] = useState(false);
  const draftTimerRef = useRef<number | null>(null);
  const navigationType = useNavigationType();
  const shouldAnimateList = navigationType !== "POP";
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const setSwipeState = useRef<{
    id: string | null;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { delay: 180, tolerance: 6 },
    }),
  );

  useEffect(() => {
    if (!workout) return;
    const storedRaw =
      typeof window !== "undefined"
        ? window.localStorage.getItem(`ironflow-workout-last-sets:${workout.id}`)
        : null;
    const stored =
      storedRaw && mode === "session"
        ? (JSON.parse(storedRaw) as Record<string, Array<{ weight: string; reps: string }>>)
        : {};
    const draft = mode === "edit" ? workoutDrafts[workout.id] : null;
    const base = draft?.length ? draft : workout.exercises;
    setExercises(
      base.map((exercise) => {
        const previousSets = stored?.[exercise.name];
        const sets = previousSets?.length
          ? previousSets.map((set) => ({
              id: createId(),
              weight: set.weight ?? "",
              reps: set.reps ?? "",
              previous: formatPrevious(set.weight ?? "", set.reps ?? ""),
            }))
          : createDefaultSets();
        return {
          id: exercise.id,
          name: exercise.name,
          note: exercise.note ?? "",
          steps: exercise.steps ?? [],
          guideUrl: exercise.guideUrl ?? "",
          customVideoName: exercise.customVideoName ?? "",
          sets,
        };
      }),
    );
  }, [workout, mode, workoutDrafts]);

  const isEditMode = mode === "edit";
  const listVariants = useMemo(
    () => ({
      hidden: { opacity: 0 },
      show: {
        opacity: 1,
        transition: { staggerChildren: 0.04, delayChildren: 0.05 },
      },
    }),
    [],
  );
  const itemVariants = useMemo(
    () => ({
      hidden: { opacity: 0, y: 6 },
      show: { opacity: 1, y: 0 },
    }),
    [],
  );

  const handleReplace = (name: string) => {
    if (replaceTargetId === "new") {
      setExercises((prev) => [
        ...prev,
        {
          id: createId(),
          name,
          note: "",
          steps: [],
          guideUrl: "",
          customVideoName: "",
          sets: createDefaultSets(),
        },
      ]);
      return;
    }
    setExercises((prev) =>
      prev.map((exercise) =>
        exercise.id === replaceTargetId ? { ...exercise, name } : exercise,
      ),
    );
  };

  const saveExercises = () => {
    if (!onSave) return;
    setSavePulse(true);
    window.setTimeout(() => setSavePulse(false), 900);
    onSave(
      exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        note: exercise.note.trim() || undefined,
        steps: exercise.steps?.length ? exercise.steps : undefined,
        guideUrl: exercise.guideUrl?.trim() || undefined,
        customVideoName: exercise.customVideoName || undefined,
      })),
    );
    if (workout?.id) {
      clearWorkoutDraft(workout.id);
    }
  };

  useEffect(() => {
    if (!workout || mode !== "edit") return;
    if (draftTimerRef.current) {
      window.clearTimeout(draftTimerRef.current);
    }
    draftTimerRef.current = window.setTimeout(() => {
      const next = exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        note: exercise.note.trim() || undefined,
        steps: exercise.steps?.length ? exercise.steps : undefined,
        guideUrl: exercise.guideUrl?.trim() || undefined,
        customVideoName: exercise.customVideoName || undefined,
      }));
      setWorkoutDraft(workout.id, next);
    }, 300);
    return () => {
      if (draftTimerRef.current) {
        window.clearTimeout(draftTimerRef.current);
        draftTimerRef.current = null;
      }
    };
  }, [exercises, mode, setWorkoutDraft, workout?.id]);

  const persistSessionSets = () => {
    if (mode !== "session" || !workout || typeof window === "undefined") return;
    const payload: Record<string, Array<{ weight: string; reps: string }>> = {};
    exercises.forEach((exercise) => {
      payload[exercise.name] = exercise.sets.map((set) => ({
        weight: set.weight,
        reps: set.reps,
      }));
    });
    window.localStorage.setItem(
      `ironflow-workout-last-sets:${workout.id}`,
      JSON.stringify(payload),
    );
  };

  const totalSets = useMemo(
    () => exercises.reduce((sum, exercise) => sum + exercise.sets.length, 0),
    [exercises],
  );

  const hasInvalidEntries = useMemo(
    () =>
      exercises.some((exercise) =>
        exercise.sets.some(
          (set) => !isValidNumber(set.weight) || !isValidNumber(set.reps),
        ),
      ),
    [exercises],
  );

  const handleDragEnd = (event: { active: { id: string }; over?: { id: string } | null }) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setExercises((prev) => {
      const oldIndex = prev.findIndex((item) => item.id === active.id);
      const newIndex = prev.findIndex((item) => item.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  };

  const headerAction = isEditMode ? "Save" : "Finish";
  const hasExercises = exercises.length > 0;

  return (
    <div className="relative min-h-screen bg-slate-950 text-white select-none touch-pan-y">
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={onBack}
          >
            ✕
          </Button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              {isEditMode ? "Edit template" : "In session"}
            </p>
            <h3 className="mt-1 text-lg font-display font-semibold">
              {workout?.name ?? "Workout"}
            </h3>
            <p className="text-xs text-white/60">
              {plan?.name ?? "Workout plan"} · {totalSets} sets
            </p>
          </div>
          <Button
            className={cn(
              "h-10 rounded-full bg-emerald-400 px-4 text-slate-950 transition hover:bg-emerald-300",
              savePulse && "shadow-[0_0_24px_rgba(52,211,153,0.5)]",
            )}
            onClick={() => {
              if (isEditMode) {
                saveExercises();
              } else {
                persistSessionSets();
                onFinish?.();
              }
            }}
            disabled={hasInvalidEntries || (isEditMode && !hasExercises)}
          >
            {savePulse && isEditMode ? "Saved" : headerAction}
          </Button>
        </div>
        {hasInvalidEntries ? (
          <p className="mt-3 text-center text-xs text-rose-300">
            Fix invalid numbers before saving.
          </p>
        ) : null}

        <div className="mt-6 space-y-4">
          {isEditMode && onStartSession ? (
            <Button
              className="w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              onClick={onStartSession}
            >
              Start session
            </Button>
          ) : null}
          {!hasExercises ? (
            <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-6 text-center">
              <p className="text-sm text-white/70">
                No exercises yet. Add your first movement to get started.
              </p>
              <Button
                variant="outline"
                className="mt-4 rounded-full border-white/20 text-white hover:bg-white/10"
                onClick={() => {
                  setReplaceTargetId("new");
                  setReplaceOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add exercise
              </Button>
            </div>
          ) : null}

          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={(event) => {
              setActiveDragId(String(event.active.id));
              if (navigator.vibrate) {
                navigator.vibrate(8);
              }
            }}
            onDragEnd={(event) => {
              handleDragEnd(event);
              setActiveDragId(null);
            }}
            onDragCancel={() => setActiveDragId(null)}
          >
            <SortableContext
              items={exercises.map((exercise) => exercise.id)}
              strategy={verticalListSortingStrategy}
            >
              <motion.div
                variants={listVariants}
                initial={shouldAnimateList ? "hidden" : false}
                animate={shouldAnimateList ? "show" : undefined}
                className="space-y-4"
              >
                {exercises.map((exercise) => (
                    <SortableExercise
                    key={exercise.id}
                    id={exercise.id}
                    disabled={!isEditMode}
                            className="relative rounded-[22px] border border-white/10 bg-white/5 px-3 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/30 touch-none will-change-transform"
                    variants={itemVariants}
                    handle={<svg viewBox="0 0 24 24" className="h-4 w-4">
                      <circle cx="9" cy="7" r="1.5" fill="currentColor" />
                      <circle cx="15" cy="7" r="1.5" fill="currentColor" />
                      <circle cx="9" cy="12" r="1.5" fill="currentColor" />
                      <circle cx="15" cy="12" r="1.5" fill="currentColor" />
                      <circle cx="9" cy="17" r="1.5" fill="currentColor" />
                      <circle cx="15" cy="17" r="1.5" fill="currentColor" />
                    </svg>}
                  >
                <div className="flex items-start gap-2 pl-11">
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="text-left text-lg font-semibold text-white hover:text-emerald-200"
                      onClick={() =>
                        onOpenGuide?.({ id: exercise.id, name: exercise.name })
                      }
                      onPointerDown={() => {
                        if (exercise.name) {
                          preloadExerciseGuide(exercise.name);
                        }
                      }}
                      onMouseEnter={() => {
                        preloadExerciseGuide(exercise.name);
                      }}
                      data-swipe-ignore
                    >
                      {exercise.name}
                    </button>
                    {exercise.note || noteOpenIds.has(exercise.id) ? (
                      <Textarea
                        value={exercise.note}
                        onChange={(event) => {
                          const value = event.target.value;
                          setExercises((prev) =>
                            prev.map((item) =>
                              item.id === exercise.id
                                ? { ...item, note: value }
                                : item,
                            ),
                          );
                        }}
                        onBlur={() => {
                          if (!exercise.note.trim()) {
                            setNoteOpenIds((prev) => {
                              const next = new Set(prev);
                              next.delete(exercise.id);
                              return next;
                            });
                          }
                        }}
                        onPointerDown={(event) => event.stopPropagation()}
                        placeholder="Add a quick cue..."
                        rows={1}
                        className="mt-2 min-h-[40px] resize-none border-white/10 bg-white/5 text-white placeholder:text-white/40 select-text"
                        disabled={!isEditMode}
                        data-swipe-ignore
                      />
                    ) : (
                      <button
                        type="button"
                        className="mt-2 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:border-white/30 hover:text-white"
                        onClick={() =>
                          setNoteOpenIds((prev) => new Set(prev).add(exercise.id))
                        }
                        disabled={!isEditMode}
                        data-swipe-ignore
                      >
                        Add note
                      </button>
                    )}
                  </div>
                  {isEditMode ? (
                    <div className="flex items-center gap-2">
                          <Button
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-full bg-white/10 text-white hover:bg-white/20"
                        onClick={() => {
                          setReplaceTargetId(exercise.id);
                          setReplaceOpen(true);
                        }}
                        data-swipe-ignore
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full bg-rose-500/20 text-rose-100 hover:bg-rose-500/30"
                            data-swipe-ignore
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent className="border-white/10 bg-slate-950 text-white">
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove this exercise?</AlertDialogTitle>
                            <AlertDialogDescription className="text-white/60">
                              This deletes it from the workout template.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel className="rounded-full border-white/20 text-white hover:bg-white/10">
                              Cancel
                            </AlertDialogCancel>
                            <AlertDialogAction
                              className="rounded-full bg-rose-500 text-white hover:bg-rose-400"
                              onClick={() => {
                                setExercises((prev) =>
                                  prev.filter((item) => item.id !== exercise.id),
                                );
                              }}
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  ) : null}
                </div>

                <div className="mt-3 grid grid-cols-[48px_1fr_72px_72px] items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/40">
                <span>Set</span>
                <span>Previous</span>
                <span>lbs</span>
                <span>Reps</span>
              </div>

              <div className="mt-3 space-y-3">
                {exercise.sets.map((set, setIndex) => {
                  const weightValid = isValidNumber(set.weight);
                  const repsValid = isValidNumber(set.reps);
                  return (
                    <div key={set.id} className="space-y-2">
                      <div
                        className="relative overflow-hidden rounded-[18px]"
                        onPointerDown={(event) => {
                          if (event.pointerType === "mouse") return;
                          setSwipeState.current = {
                            id: set.id,
                            startX: event.clientX,
                            startY: event.clientY,
                            active: true,
                          };
                        }}
                        onPointerMove={(event) => {
                          const state = setSwipeState.current;
                          if (!state?.active || state.id !== set.id) return;
                          const deltaX = event.clientX - state.startX;
                          const deltaY = event.clientY - state.startY;
                          if (
                            Math.abs(deltaY) > Math.abs(deltaX) &&
                            Math.abs(deltaY) > 12
                          ) {
                            state.active = false;
                            return;
                          }
                          if (deltaX < -24) {
                            setSwipedSetId(set.id);
                          } else if (deltaX > 12) {
                            setSwipedSetId(null);
                          }
                        }}
                        onPointerUp={() => {
                          if (setSwipeState.current?.id === set.id) {
                            setSwipeState.current.active = false;
                          }
                        }}
                        onPointerCancel={() => {
                          if (setSwipeState.current?.id === set.id) {
                            setSwipeState.current.active = false;
                          }
                        }}
                      >
                        <div
                          className={cn(
                            "absolute inset-y-0 right-0 flex items-center justify-end px-3",
                            swipedSetId === set.id ? "opacity-100" : "opacity-0",
                          )}
                        >
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 rounded-full bg-rose-500 text-white hover:bg-rose-400"
                            onClick={() => {
                              setExercises((prev) =>
                                prev.map((item) =>
                                  item.id === exercise.id
                                    ? {
                                        ...item,
                                        sets: item.sets.filter(
                                          (row) => row.id !== set.id,
                                        ),
                                      }
                                    : item,
                                ),
                              );
                              setSwipedSetId(null);
                            }}
                            data-swipe-ignore
                          >
                            ✕
                          </Button>
                        </div>
                        <div
                          className={cn(
                            "grid grid-cols-[48px_1fr_72px_72px] items-center gap-3 transition-transform duration-200",
                            swipedSetId === set.id
                              ? "-translate-x-12"
                              : "translate-x-0",
                          )}
                        >
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-sm font-semibold text-white">
                            {setIndex + 1}
                          </div>
                          <span className="text-sm text-white/50">
                            {set.previous}
                          </span>
                          <Input
                            type="number"
                            inputMode="decimal"
                            value={set.weight}
                            onChange={(event) => {
                              const value = event.target.value;
                              setExercises((prev) =>
                                prev.map((item) =>
                                  item.id === exercise.id
                                    ? {
                                        ...item,
                                        sets: item.sets.map((row) =>
                                          row.id === set.id
                                            ? { ...row, weight: value }
                                            : row,
                                        ),
                                      }
                                    : item,
                                ),
                              );
                            }}
                            onPointerDown={(event) => event.stopPropagation()}
                            aria-invalid={!weightValid}
                            className={cn(
                              "h-10 rounded-2xl border-white/10 bg-white/5 text-center text-white select-text",
                              !weightValid && "border-rose-400/60",
                            )}
                            data-swipe-ignore
                          />
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={set.reps}
                            onChange={(event) => {
                              const value = event.target.value;
                              setExercises((prev) =>
                                prev.map((item) =>
                                  item.id === exercise.id
                                    ? {
                                        ...item,
                                        sets: item.sets.map((row) =>
                                          row.id === set.id
                                            ? { ...row, reps: value }
                                            : row,
                                        ),
                                      }
                                    : item,
                                ),
                              );
                            }}
                            onPointerDown={(event) => event.stopPropagation()}
                            aria-invalid={!repsValid}
                            className={cn(
                              "h-10 rounded-2xl border-white/10 bg-white/5 text-center text-white select-text",
                              !repsValid && "border-rose-400/60",
                            )}
                            data-swipe-ignore
                          />
                        </div>
                      </div>
                      {!weightValid || !repsValid ? (
                        <p className="text-xs text-rose-300">
                          Use positive numbers for weight and reps.
                        </p>
                      ) : null}
                      {mode === "session" ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-white/40">
                            <span>Rest</span>
                            <span>2:00</span>
                          </div>
                          <div className="h-1 rounded-full bg-white/10">
                            <div className="h-1 origin-left rounded-full bg-emerald-400/70 animate-restBar" />
                          </div>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <Button
                variant="outline"
                className="mt-3 w-full rounded-full border-white/20 text-white hover:bg-white/10"
                onClick={() =>
                  setExercises((prev) =>
                    prev.map((item) =>
                      item.id === exercise.id
                        ? {
                            ...item,
                            sets: [
                              ...item.sets,
                              {
                                id: createId(),
                                weight: "",
                                reps: "",
                                previous: "—",
                              },
                            ],
                          }
                        : item,
                    ),
                  )
                }
              >
                <Plus className="h-4 w-4" />
                Add set
              </Button>
                  </SortableExercise>
                ))}
              </motion.div>
            </SortableContext>
            <DragOverlay>
              {activeDragId ? (
                <div className="rounded-[22px] border border-emerald-400/60 bg-slate-900/90 px-4 py-3 text-white shadow-[0_24px_40px_rgba(0,0,0,0.45)]">
                  <p className="text-sm font-semibold">
                    {exercises.find((e) => e.id === activeDragId)?.name}
                  </p>
                  <p className="text-xs text-white/60">Reordering</p>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {isEditMode && hasExercises ? (
          <Button
            variant="outline"
            className="mt-6 w-full rounded-full border-white/20 text-white hover:bg-white/10"
            onClick={() => {
              setReplaceTargetId("new");
              setReplaceOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Add exercise
          </Button>
        ) : null}
      </div>

      <ReplaceExerciseSheet
        open={replaceOpen}
        onOpenChange={setReplaceOpen}
        onSelect={(name) => {
          handleReplace(name);
        }}
      />

    </div>
  );
};
