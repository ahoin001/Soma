import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  WorkoutExerciseEntry,
  WorkoutPlan,
  WorkoutTemplate,
} from "@/types/fitness";
import { MoreHorizontal, PencilLine, Plus, Trash2 } from "lucide-react";
import { ReplaceExerciseSheet } from "./ReplaceExerciseSheet";
import { preloadExerciseGuide } from "./ExerciseGuideSheet";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { useNavigationType } from "react-router-dom";
import { useAppStore } from "@/state/AppStore";
import {
  ensureUser,
  fetchActivityGoals,
  fetchCurrentUser,
  fetchExerciseByName,
  upsertActivityGoals,
} from "@/lib/api";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

const isInteractiveTarget = (target: EventTarget | null) => {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest(
      [
        "[data-dnd-ignore]",
        "button",
        "a",
        "input",
        "textarea",
        "select",
        "[role='button']",
      ].join(","),
    ),
  );
};

class SmartPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown" as const,
      handler: ({ nativeEvent }: { nativeEvent: PointerEvent }) => {
        if (isInteractiveTarget(nativeEvent.target)) return false;
        return true;
      },
    },
  ];
}

type EditableSet = {
  id: string;
  weight: string;
  reps: string;
  previous: string;
  rpe?: string;
  restSeconds?: string;
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
  renderActivator: (props: {
    setActivatorNodeRef: (node: HTMLElement | null) => void;
    listeners: Record<string, unknown>;
    isDragging: boolean;
  }) => React.ReactNode;
  children: React.ReactNode;
};

const SortableExercise = ({
  id,
  disabled,
  className,
  variants,
  renderActivator,
  children,
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
  };
  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      className={cn(className, isDragging && "opacity-70")}
      variants={variants}
      {...attributes}
    >
      {renderActivator({
        setActivatorNodeRef,
        listeners,
        isDragging,
      })}
      {children}
    </motion.div>
  );
};

const thumbnailCache = new Map<string, string | null>();

const createId = () => `set_${Math.random().toString(36).slice(2, 9)}`;

const createDefaultSets = (unitUsed: "lb" | "kg") => [
  {
    id: createId(),
    weight: "35",
    reps: "14",
    previous: `35 ${unitUsed} × 14`,
    rpe: "",
    restSeconds: "",
  },
  {
    id: createId(),
    weight: "45",
    reps: "12",
    previous: `45 ${unitUsed} × 12`,
    rpe: "",
    restSeconds: "",
  },
  {
    id: createId(),
    weight: "55",
    reps: "10",
    previous: `55 ${unitUsed} × 10`,
    rpe: "",
    restSeconds: "",
  },
];

const formatPrevious = (weight: string, reps: string, unitUsed: "lb" | "kg") => {
  if (!weight && !reps) return "—";
  return `${weight || "—"} ${unitUsed} × ${reps || "—"}`;
};

const isValidNumber = (value: string) =>
  value.trim() === "" || Number(value) > 0;

const isValidOptionalRange = (value: string, min: number, max: number) => {
  if (value.trim() === "") return true;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= min && numeric <= max;
};

const isValidOptionalMin = (value: string, min: number) => {
  if (value.trim() === "") return true;
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= min;
};

const getInitials = (value: string) =>
  value
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 3)
    .join("")
    .toUpperCase();

export type SessionExerciseForPersist = {
  id: string;
  exercise_name: string;
};

type PersistSetPayload = Array<{
  sessionExerciseId: string;
  sets: Array<{
    weight: number;
    reps: number;
    rpe?: number;
    restSeconds?: number;
  }>;
}>;

type WorkoutSessionEditorProps = {
  mode: "edit" | "session";
  workout: WorkoutTemplate | null;
  plan: WorkoutPlan | null;
  onSave?: (exercises: WorkoutExerciseEntry[]) => void;
  onFinish?: () => void;
  onBack: () => void;
  onStartSession?: () => void;
  onOpenGuide?: (exercise: { id: string; name: string }) => void;
  onEditExercise?: (exercise: { id: string; name: string }) => void;
  onAddExercise?: () => void;
  /** When in session mode: persist sets to server before calling onFinish. */
  activeSessionId?: string | null;
  sessionExercises?: SessionExerciseForPersist[];
  onPersistSets?: (payload: PersistSetPayload) => Promise<void>;
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
  onEditExercise,
  onAddExercise,
  activeSessionId,
  sessionExercises,
  onPersistSets,
}: WorkoutSessionEditorProps) => {
  const { workoutDrafts, setWorkoutDraft, clearWorkoutDraft } = useAppStore();
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [swipedSetId, setSwipedSetId] = useState<string | null>(null);
  const [noteOpenIds, setNoteOpenIds] = useState<Set<string>>(() => new Set());
  const [savePulse, setSavePulse] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [thumbnailMap, setThumbnailMap] = useState<Record<string, string | null>>({});
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const addTapRef = useRef(false);
  const [unitUsed, setUnitUsed] = useState<"lb" | "kg">("lb");
  const [advancedLogging, setAdvancedLogging] = useState(false);
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
    useSensor(SmartPointerSensor, {
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
              previous: formatPrevious(set.weight ?? "", set.reps ?? "", unitUsed),
              rpe: "",
              restSeconds: "",
            }))
          : createDefaultSets(unitUsed);
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("ironflow-advanced-logging");
    if (stored) {
      setAdvancedLogging(stored === "true");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(
      "ironflow-advanced-logging",
      advancedLogging ? "true" : "false",
    );
  }, [advancedLogging]);

  useEffect(() => {
    let cancelled = false;
    const loadUnit = async () => {
      try {
        await ensureUser();
        const response = await fetchActivityGoals();
        const unit = response.goals?.weight_unit === "kg" ? "kg" : "lb";
        if (!cancelled) setUnitUsed(unit);
      } catch {
        if (!cancelled) setUnitUsed("lb");
      }
    };
    void loadUnit();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    setExercises((prev) =>
      prev.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((set) => ({
          ...set,
          previous: formatPrevious(set.weight ?? "", set.reps ?? "", unitUsed),
        })),
      })),
    );
  }, [unitUsed]);

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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const names = Array.from(new Set(exercises.map((exercise) => exercise.name).filter(Boolean)));
      await Promise.all(
        names.map(async (name) => {
          if (cancelled) return;
          if (thumbnailCache.has(name)) {
            const cached = thumbnailCache.get(name) ?? null;
            if (!cancelled) {
              setThumbnailMap((prev) =>
                prev[name] === cached ? prev : { ...prev, [name]: cached },
              );
            }
            return;
          }
          try {
            const response = await fetchExerciseByName(name);
            const record = response.exercise as { image_url?: string | null } | null;
            const url = record?.image_url ?? null;
            thumbnailCache.set(name, url);
            if (!cancelled) {
              setThumbnailMap((prev) => ({ ...prev, [name]: url }));
            }
          } catch {
            thumbnailCache.set(name, null);
            if (!cancelled) {
              setThumbnailMap((prev) =>
                prev[name] === null ? prev : { ...prev, [name]: null },
              );
            }
          }
        }),
      );
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [exercises]);

  useEffect(() => {
    if (!highlightId) return;
    const timer = window.setTimeout(() => setHighlightId(null), 900);
    return () => window.clearTimeout(timer);
  }, [highlightId]);

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
      const newId = createId();
      setExercises((prev) => [
        ...prev,
        {
          id: newId,
          name,
          note: "",
          steps: [],
          guideUrl: "",
          customVideoName: "",
          sets: createDefaultSets(unitUsed),
        },
      ]);
      setHighlightId(newId);
      return;
    }
    setExercises((prev) =>
      prev.map((exercise) =>
        exercise.id === replaceTargetId ? { ...exercise, name } : exercise,
      ),
    );
    setHighlightId(replaceTargetId);
  };

  const triggerAddExercise = () => {
    if (onAddExercise) {
      onAddExercise();
      return;
    }
    setReplaceTargetId("new");
    setReplaceOpen(true);
  };

  const handleAddClick = () => {
    if (addTapRef.current) {
      addTapRef.current = false;
      return;
    }
    triggerAddExercise();
  };

  const handleAddTouchEnd = (event: React.TouchEvent) => {
    event.preventDefault();
    addTapRef.current = true;
    triggerAddExercise();
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
          (set) =>
            !isValidNumber(set.weight) ||
            !isValidNumber(set.reps) ||
            (mode === "session" &&
              advancedLogging &&
              (!isValidOptionalRange(set.rpe ?? "", 1, 10) ||
                !isValidOptionalMin(set.restSeconds ?? "", 0))),
        ),
      ),
    [advancedLogging, exercises, mode],
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

  const buildPersistPayload = (): PersistSetPayload => {
    if (!sessionExercises?.length) return [];
    return exercises
      .map((exercise) => {
        const sessionEx = sessionExercises.find(
          (se) => se.exercise_name === exercise.name,
        );
        if (!sessionEx) return null;
        const sets = exercise.sets
          .filter(
            (set) =>
              isValidNumber(set.weight) &&
              isValidNumber(set.reps) &&
              Number(set.weight) > 0 &&
              Number(set.reps) > 0,
          )
          .map((set) => ({
            weight: Number(set.weight),
            reps: Number(set.reps),
            rpe:
              advancedLogging && set.rpe?.trim()
                ? Number(set.rpe)
                : undefined,
            restSeconds:
              advancedLogging && set.restSeconds?.trim()
                ? Number(set.restSeconds)
                : undefined,
          }));
        if (sets.length === 0) return null;
        return { sessionExerciseId: sessionEx.id, sets };
      })
      .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  };

  const handleFinish = async () => {
    if (isEditMode) {
      saveExercises();
      return;
    }
    persistSessionSets();
    if (
      activeSessionId &&
      sessionExercises?.length &&
      onPersistSets &&
      exercises.length > 0
    ) {
      const payload = buildPersistPayload();
      if (payload.length > 0) {
        try {
          await onPersistSets(payload);
        } catch {
          toast("Unable to save sets. Retry or finish anyway.", {
            action: {
              label: "Finish anyway",
              onClick: () => onFinish?.(),
            },
          });
          return;
        }
      }
    }
    onFinish?.();
  };

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
            onClick={() => void handleFinish()}
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
        {mode === "session" ? (
          <div className="mt-4 flex items-center justify-between rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs">
            <div className="flex items-center gap-2">
              <Switch
                id="advanced-logging"
                checked={advancedLogging}
                onCheckedChange={setAdvancedLogging}
              />
              <Label htmlFor="advanced-logging" className="text-white/80">
                Advanced logging
              </Label>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-white/10 p-1">
              {(["lb", "kg"] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  className={cn(
                    "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em]",
                    unitUsed === unit
                      ? "bg-emerald-400 text-slate-950"
                      : "text-white/70 hover:text-white",
                  )}
                  onClick={async () => {
                    setUnitUsed(unit);
                    try {
                      await ensureUser();
                      await upsertActivityGoals({ weightUnit: unit });
                    } catch {
                      toast("Unable to save unit preference.");
                    }
                  }}
                >
                  {unit}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 space-y-4">
          {isEditMode && onStartSession ? (
            <Button
              className="w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
              onClick={onStartSession}
              onPointerDown={(event) => event.stopPropagation()}
              type="button"
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
                onClick={handleAddClick}
                onTouchEnd={handleAddTouchEnd}
                type="button"
                data-dnd-ignore
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
                {exercises.map((exercise) => {
                  const thumb = thumbnailMap[exercise.name] ?? null;
                  return (
                    <SortableExercise
                      key={exercise.id}
                      id={exercise.id}
                      disabled={!isEditMode}
                      className={cn(
                        "relative rounded-[22px] border border-white/10 bg-white/5 px-3 py-3 touch-pan-y will-change-transform",
                        exercise.id === highlightId &&
                          "ring-1 ring-emerald-400/60 shadow-[0_0_22px_rgba(52,211,153,0.28)]",
                      )}
                      variants={itemVariants}
                      renderActivator={({ setActivatorNodeRef, listeners, isDragging }) => (
                        <button
                          type="button"
                          ref={setActivatorNodeRef}
                          className={cn(
                            "absolute left-3 top-3 flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-400/20 via-slate-950 to-slate-900 text-xs font-semibold uppercase tracking-[0.2em] text-white/70 touch-none",
                            isDragging && "opacity-80",
                          )}
                          style={{ touchAction: "none" }}
                          {...listeners}
                          aria-label="Drag to reorder"
                          data-swipe-ignore
                        >
                          {thumb ? (
                            <img
                              src={thumb}
                              alt={`${exercise.name} thumbnail`}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <span>{getInitials(exercise.name || "Move")}</span>
                          )}
                        </button>
                      )}
                    >
                      <div className="flex items-start gap-3 pl-16">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
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
                              <p className="mt-1 text-xs text-white/50">
                                {exercise.sets.length} sets
                              </p>
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
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-9 w-9 rounded-full bg-white/10 text-white hover:bg-white/20"
                                      data-swipe-ignore
                                    >
                                      <MoreHorizontal className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent
                                    side="bottom"
                                    align="end"
                                    className="border-white/10 bg-slate-950 text-white"
                                  >
                                    {isAdmin ? (
                                      <DropdownMenuItem
                                        onSelect={() => {
                                          if (!onEditExercise) {
                                            toast("Edit exercise unavailable");
                                            return;
                                          }
                                          onEditExercise({
                                            id: exercise.id,
                                            name: exercise.name,
                                          });
                                        }}
                                      >
                                        <PencilLine className="h-4 w-4" />
                                        Edit exercise
                                      </DropdownMenuItem>
                                    ) : null}
                                    <DropdownMenuItem
                                      onSelect={() => {
                                        setReplaceTargetId(exercise.id);
                                        setReplaceOpen(true);
                                      }}
                                    >
                                      Replace exercise
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <DropdownMenuItem className="text-rose-200 focus:text-rose-100">
                                          <Trash2 className="h-4 w-4" />
                                          Delete
                                        </DropdownMenuItem>
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
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 grid grid-cols-[48px_1fr_72px_72px] items-center gap-3 text-xs uppercase tracking-[0.2em] text-white/40">
                        <span>Set</span>
                        <span>Previous</span>
                        <span>{unitUsed}</span>
                        <span>Reps</span>
                      </div>

                      <div className="mt-3 space-y-3">
                        {exercise.sets.map((set, setIndex) => {
                          const weightValid = isValidNumber(set.weight);
                          const repsValid = isValidNumber(set.reps);
                          const rpeValid = isValidOptionalRange(set.rpe ?? "", 1, 10);
                          const restValid = isValidOptionalMin(set.restSeconds ?? "", 0);
                          const restValue = Number(set.restSeconds);
                          const restSeconds = Number.isFinite(restValue) ? restValue : 120;
                          const restLabel = `${Math.floor(restSeconds / 60)}:${String(
                            restSeconds % 60,
                          ).padStart(2, "0")}`;
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
                              {mode === "session" && advancedLogging ? (
                                <div className="grid grid-cols-2 gap-3">
                                  <div className="space-y-1">
                                    <Label className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                                      RPE
                                    </Label>
                                    <Input
                                      type="number"
                                      inputMode="decimal"
                                      value={set.rpe ?? ""}
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        setExercises((prev) =>
                                          prev.map((item) =>
                                            item.id === exercise.id
                                              ? {
                                                  ...item,
                                                  sets: item.sets.map((row) =>
                                                    row.id === set.id
                                                      ? { ...row, rpe: value }
                                                      : row,
                                                  ),
                                                }
                                              : item,
                                          ),
                                        );
                                      }}
                                      onPointerDown={(event) => event.stopPropagation()}
                                      aria-invalid={!rpeValid}
                                      className={cn(
                                        "h-9 rounded-2xl border-white/10 bg-white/5 text-center text-white select-text",
                                        !rpeValid && "border-rose-400/60",
                                      )}
                                      placeholder="8.5"
                                      data-swipe-ignore
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <Label className="text-[11px] uppercase tracking-[0.2em] text-white/40">
                                      Rest (sec)
                                    </Label>
                                    <Input
                                      type="number"
                                      inputMode="numeric"
                                      value={set.restSeconds ?? ""}
                                      onChange={(event) => {
                                        const value = event.target.value;
                                        setExercises((prev) =>
                                          prev.map((item) =>
                                            item.id === exercise.id
                                              ? {
                                                  ...item,
                                                  sets: item.sets.map((row) =>
                                                    row.id === set.id
                                                      ? { ...row, restSeconds: value }
                                                      : row,
                                                  ),
                                                }
                                              : item,
                                          ),
                                        );
                                      }}
                                      onPointerDown={(event) => event.stopPropagation()}
                                      aria-invalid={!restValid}
                                      className={cn(
                                        "h-9 rounded-2xl border-white/10 bg-white/5 text-center text-white select-text",
                                        !restValid && "border-rose-400/60",
                                      )}
                                      placeholder="120"
                                      data-swipe-ignore
                                    />
                                  </div>
                                </div>
                              ) : null}
                              {mode === "session" ? (
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.2em] text-white/40">
                                    <span>Rest</span>
                                    <span>{restLabel}</span>
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
                                        rpe: "",
                                        restSeconds: "",
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
                  );
                })}
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
            onClick={handleAddClick}
            onTouchEnd={handleAddTouchEnd}
            type="button"
            data-dnd-ignore
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
