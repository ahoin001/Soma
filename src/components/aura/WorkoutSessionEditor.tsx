import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type {
  WorkoutExerciseEntry,
  WorkoutPlan,
  WorkoutTemplate,
} from "@/types/fitness";
import { MoreHorizontal, Plus } from "lucide-react";
import { ReplaceExerciseSheet } from "./ReplaceExerciseSheet";
import { ExerciseGuideSheet } from "./ExerciseGuideSheet";
import { cn } from "@/lib/utils";

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

const createId = () => `set_${Math.random().toString(36).slice(2, 9)}`;

const createDefaultSets = () => [
  { id: createId(), weight: "35", reps: "14", previous: "35 lb × 14" },
  { id: createId(), weight: "45", reps: "12", previous: "45 lb × 12" },
  { id: createId(), weight: "55", reps: "10", previous: "55 lb × 10" },
];

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
};

export const WorkoutSessionEditor = ({
  mode,
  workout,
  plan,
  onSave,
  onFinish,
  onBack,
  onStartSession,
}: WorkoutSessionEditorProps) => {
  const [exercises, setExercises] = useState<EditableExercise[]>([]);
  const [replaceTargetId, setReplaceTargetId] = useState<string | null>(null);
  const [replaceOpen, setReplaceOpen] = useState(false);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [swipedSetId, setSwipedSetId] = useState<string | null>(null);
  const [dragTargetIndex, setDragTargetIndex] = useState<number | null>(null);
  const [ghostY, setGhostY] = useState<number | null>(null);
  const [ghostName, setGhostName] = useState<string | null>(null);
  const [guideOpenId, setGuideOpenId] = useState<string | null>(null);
  const [noteOpenIds, setNoteOpenIds] = useState<Set<string>>(() => new Set());
  const dragItemIndex = useRef<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const pointerState = useRef<{
    x: number;
    y: number;
    active: boolean;
    dragReady: boolean;
    id: string | null;
  } | null>(null);
  const dragTimerRef = useRef<number | null>(null);
  const setSwipeState = useRef<{
    id: string | null;
    startX: number;
    startY: number;
    active: boolean;
  } | null>(null);

  useEffect(() => {
    if (!workout) return;
    setExercises(
      workout.exercises.map((exercise) => ({
        id: exercise.id,
        name: exercise.name,
        note: exercise.note ?? "",
        steps: exercise.steps ?? [],
        guideUrl: exercise.guideUrl ?? "",
        customVideoName: exercise.customVideoName ?? "",
        sets: createDefaultSets(),
      })),
    );
  }, [workout]);

  const isEditMode = mode === "edit";

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

  const reorder = (from: number, to: number) => {
    setExercises((prev) => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  };

  const handleDragStart = (index: number, id: string) => {
    dragItemIndex.current = index;
    setDraggingId(id);
  };

  const handleDragEnd = () => {
    if (dragItemIndex.current !== null && dragTargetIndex !== null) {
      reorder(dragItemIndex.current, dragTargetIndex);
    }
    dragItemIndex.current = null;
    setDraggingId(null);
    setDragOverId(null);
    setDragTargetIndex(null);
    setGhostY(null);
    setGhostName(null);
  };

  const getIndexFromPointer = (clientY: number) => {
    const items = itemRefs.current;
    for (let index = 0; index < items.length; index += 1) {
      const element = items[index];
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      if (clientY >= rect.top && clientY <= rect.bottom) {
        return index;
      }
    }
    return null;
  };

  const prepareDrag = (index: number, id: string) => {
    dragItemIndex.current = index;
    setDraggingId(id);
    setGhostName(exercises[index]?.name ?? null);
    if (navigator.vibrate) {
      navigator.vibrate(8);
    }
  };

  const handlePointerStart = (
    event: React.PointerEvent,
    index: number,
    id: string,
  ) => {
    if (event.pointerType === "mouse") return;
    const target = event.target as HTMLElement;
    if (target.closest("[data-swipe-ignore]")) return;
    pointerState.current = {
      x: event.clientX,
      y: event.clientY,
      active: true,
      dragReady: false,
      id,
    };
    if (dragTimerRef.current) {
      window.clearTimeout(dragTimerRef.current);
    }
    dragTimerRef.current = window.setTimeout(() => {
      if (!pointerState.current?.active) return;
      pointerState.current.dragReady = true;
      prepareDrag(index, id);
    }, 220);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!pointerState.current?.active) return;
    const deltaY = event.clientY - pointerState.current.y;
    if (!pointerState.current.dragReady) {
      if (Math.abs(deltaY) > 12) {
        pointerState.current.active = false;
        return;
      }
      return;
    }
    const nextIndex = getIndexFromPointer(event.clientY);
    if (nextIndex !== null) {
      setDragTargetIndex(nextIndex);
      const nextId = exercises[nextIndex]?.id ?? null;
      setDragOverId(nextId);
    }
    const containerTop = containerRef.current?.getBoundingClientRect().top ?? 0;
    setGhostY(event.clientY - containerTop);
  };

  const handlePointerEnd = () => {
    if (dragTimerRef.current) {
      window.clearTimeout(dragTimerRef.current);
      dragTimerRef.current = null;
    }
    pointerState.current = null;
    handleDragEnd();
  };

  const headerAction = isEditMode ? "Save" : "Finish";
  const hasExercises = exercises.length > 0;

  return (
    <div
      className="relative min-h-screen bg-slate-950 text-white select-none touch-pan-y"
      ref={containerRef}
    >
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
            className="h-10 rounded-full bg-emerald-400 px-4 text-slate-950 hover:bg-emerald-300"
            onClick={() => {
              if (isEditMode) {
                saveExercises();
              } else {
                onFinish?.();
              }
            }}
            disabled={hasInvalidEntries || (isEditMode && !hasExercises)}
          >
            {headerAction}
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

          {exercises.map((exercise, index) => (
            <div
              key={exercise.id}
              ref={(node) => {
                itemRefs.current[index] = node;
              }}
              draggable
              className={cn(
                "relative rounded-[22px] border border-white/10 bg-white/5 px-3 py-3 transition-transform duration-200",
                draggingId === exercise.id && "scale-[0.98] opacity-70",
                dragOverId === exercise.id && "border-emerald-400/60",
              )}
              onDragStart={(event) => {
                const target = event.target as HTMLElement;
                if (target.closest("input, textarea, button")) {
                  event.preventDefault();
                  return;
                }
                handleDragStart(index, exercise.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                if (dragOverId !== exercise.id) {
                  setDragOverId(exercise.id);
                }
              }}
              onDrop={() => {
                if (dragItemIndex.current === null) return;
                setDragTargetIndex(index);
                handleDragEnd();
              }}
              onPointerDown={(event) => handlePointerStart(event, index, exercise.id)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
            >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      className="text-left text-lg font-semibold text-white hover:text-emerald-200"
                      onClick={() => setGuideOpenId(exercise.id)}
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
            </div>
          ))}
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

      {ghostY !== null && ghostName ? (
        <div
          className="pointer-events-none absolute left-0 right-0 z-40 flex justify-center"
          style={{ top: ghostY }}
        >
          <div className="w-full max-w-sm px-5">
            <div className="rounded-[22px] border border-emerald-400/60 bg-slate-900/90 px-4 py-3 text-white shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
              <p className="text-sm font-semibold">{ghostName}</p>
              <p className="text-xs text-white/60">Reordering</p>
            </div>
          </div>
        </div>
      ) : null}

      <ReplaceExerciseSheet
        open={replaceOpen}
        onOpenChange={setReplaceOpen}
        onSelect={(name) => {
          handleReplace(name);
        }}
      />

      <ExerciseGuideSheet
        open={Boolean(guideOpenId)}
        onOpenChange={(open) => setGuideOpenId(open ? guideOpenId : null)}
        exercise={exercises.find((exercise) => exercise.id === guideOpenId) ?? null}
        onUpdate={(patch) => {
          if (!guideOpenId) return;
          setExercises((prev) =>
            prev.map((item) =>
              item.id === guideOpenId ? { ...item, ...patch } : item,
            ),
          );
        }}
      />
    </div>
  );
};
