import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppShell, VirtualizedExerciseList } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchField } from "@/components/ui/search-field";
import { useAppStore } from "@/state/AppStore";
import { appToast } from "@/lib/toast";
import { fetchExerciseByName, updateExerciseMaster } from "@/lib/api";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { uploadImageFile } from "@/lib/uploadImage";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `exercise_${Math.random().toString(36).slice(2, 9)}`;

const buildSignature = (entries: WorkoutTemplate["exercises"]) =>
  entries
    .map((exercise) => {
      const steps = exercise.steps?.join("|") ?? "";
      return [
        exercise.id,
        exercise.name,
        exercise.note ?? "",
        steps,
        exercise.guideUrl ?? "",
        exercise.customVideoName ?? "",
      ].join("::");
    })
    .join("||");

const AddExerciseToWorkout = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const exerciseName = params.get("name") ?? "";
  const planIdParam = params.get("planId");
  const workoutIdParam = params.get("workoutId");
  const adminEdit = params.get("adminEdit") === "true";
  const {
    workoutPlans,
    updateWorkoutTemplate,
    createWorkoutTemplate,
    workoutDrafts,
    setWorkoutDraft,
    clearWorkoutDraft,
    fitnessLibrary,
  } = useAppStore();
  const {
    upsertExerciseRecord,
    query,
    results,
    status,
    error,
    searchExercises,
    setQuery,
  } = fitnessLibrary;
  const isAdmin = useIsAdmin();
  const [loadingMaster, setLoadingMaster] = useState(false);
  const [masterId, setMasterId] = useState<number | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [thumbnailNotice, setThumbnailNotice] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState(exerciseName);
  const [selectedExerciseNames, setSelectedExerciseNames] = useState<string[]>(
    exerciseName.trim() ? [exerciseName.trim()] : [],
  );
  const [selectedExerciseIds, setSelectedExerciseIds] = useState<number[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const previewItems = useMemo(() => results.slice(0, 120), [results]);
  const targetPlan = planIdParam
    ? workoutPlans.find((item) => item.id === planIdParam) ?? null
    : null;
  const targetWorkout = targetPlan?.workouts.find((item) => item.id === workoutIdParam) ?? null;

  useEffect(() => {
    setSelectedName(exerciseName);
    setSelectedExerciseNames(exerciseName.trim() ? [exerciseName.trim()] : []);
    setSelectedExerciseIds([]);
  }, [exerciseName]);

  useEffect(() => {
    if (!query.trim()) return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const timer = window.setTimeout(() => {
      searchExercises(query, controller.signal, "all");
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchExercises]);

  useEffect(() => {
    if (!adminEdit || !isAdmin || !exerciseName.trim()) return;
    let cancelled = false;
    setLoadingMaster(true);
    fetchExerciseByName(exerciseName)
      .then((response) => {
        if (cancelled) return;
        const record = response.exercise as { id?: number; image_url?: string | null } | null;
        setMasterId(record?.id ? Number(record.id) : null);
        setThumbnailUrl(record?.image_url ?? "");
      })
      .catch(() => {
        if (!cancelled) {
          setMasterId(null);
          setThumbnailUrl("");
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingMaster(false);
      });
    return () => {
      cancelled = true;
    };
  }, [adminEdit, isAdmin, exerciseName]);

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate("/fitness");
  };

  if (!exerciseName.trim() && !planIdParam) {
    return (
      <AppShell experience="fitness" showNav={false} safeAreaTop="extra">
        <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6 text-foreground">
          <div className="rounded-[28px] border border-border/70 bg-card/55 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              We could not find that exercise.
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-full border-border/70 text-foreground hover:bg-secondary/70"
              onClick={handleBack}
            >
              Back
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const handleAddMany = async (
    planId: string,
    workoutId: string,
    names: string[],
  ) => {
    const cleanNames = names.map((entry) => entry.trim()).filter(Boolean);
    if (!cleanNames.length) return;
    const plan = workoutPlans.find((item) => item.id === planId);
    const workout = plan?.workouts.find((item) => item.id === workoutId);
    if (!plan || !workout) return;
    const draft = workoutDrafts[workout.id];
    const signature = buildSignature(workout.exercises);
    const draftMatches = Boolean(draft?.exercises.length && draft.baseSignature === signature);
    if (draft && !draftMatches) {
      clearWorkoutDraft(workout.id);
    }
    const baseExercises = draftMatches ? draft?.exercises ?? [] : workout.exercises;
    const nextExercises = [
      ...baseExercises,
      ...cleanNames.map((name) => ({ id: createId(), name })),
    ];
    try {
      await updateWorkoutTemplate(plan.id, workout.id, { exercises: nextExercises });
      if (navigator.vibrate) {
        navigator.vibrate(8);
      }
      appToast.info("Added to workout", {
        description:
          cleanNames.length === 1
            ? `${cleanNames[0]} added to ${workout.name}.`
            : `${cleanNames.length} exercises added to ${workout.name}.`,
      });
      if (draft?.exercises.length) {
        const existingNames = new Set(draft.exercises.map((entry) => entry.name));
        const nextDraftExercises = [...draft.exercises];
        for (const name of cleanNames) {
          if (existingNames.has(name)) continue;
          nextDraftExercises.push({ id: createId(), name });
          existingNames.add(name);
        }
        setWorkoutDraft(workout.id, nextDraftExercises, draft.baseSignature);
      } else {
        clearWorkoutDraft(workout.id);
      }
      setSelectedExerciseNames([]);
      setSelectedExerciseIds([]);
      setSelectedName("");
      navigate(`/fitness/workouts/${plan.id}/${workout.id}`);
    } catch {
      // handled in hook
    }
  };

  const selectedOrderById = useMemo(() => {
    const orderMap: Record<number, number> = {};
    selectedExerciseIds.forEach((id, idx) => {
      orderMap[id] = idx + 1;
    });
    return orderMap;
  }, [selectedExerciseIds]);

  const toggleExerciseSelection = (exercise: { id: number; name: string }) => {
    setSelectedName(exercise.name);
    setSelectedExerciseNames((prev) => {
      if (prev.includes(exercise.name)) {
        return prev.filter((entry) => entry !== exercise.name);
      }
      return [...prev, exercise.name];
    });
    setSelectedExerciseIds((prev) => {
      if (prev.includes(exercise.id)) {
        return prev.filter((entry) => entry !== exercise.id);
      }
      return [...prev, exercise.id];
    });
  };

  const selectCustomExercise = (name: string) => {
    const normalized = name.trim();
    if (!normalized) return;
    setSelectedName(normalized);
    setSelectedExerciseNames((prev) =>
      prev.includes(normalized) ? prev : [...prev, normalized],
    );
  };

  return (
    <AppShell experience="fitness" showNav={false} safeAreaTop="extra">
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-4 text-foreground">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
            onClick={handleBack}
          >
            ✕
          </Button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              {adminEdit ? "Admin edit" : "Add to workout"}
            </p>
            <p className="text-sm text-foreground/85">
              {selectedExerciseNames.length > 0
                ? `${selectedExerciseNames.length} selected`
                : selectedName || exerciseName || "Select an exercise"}
            </p>
          </div>
          <div className="h-10 w-10" />
        </div>

        <div className="mt-6 space-y-4">
          {!adminEdit ? (
            <div className="rounded-[24px] border border-border/70 bg-card/55 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Choose exercise
              </p>
              <SearchField
                value={query}
                onValueChange={setQuery}
                placeholder="Search exercises"
                sticky
                stickyClassName="mt-3"
                selfContainedScroll
                contentClassName="space-y-3"
              >
                {status === "error" ? (
                  <p className="text-sm text-destructive">{error}</p>
                ) : null}
                {status === "loading" ? (
                  <p className="text-sm text-muted-foreground">Loading exercises...</p>
                ) : null}
                {previewItems.length ? (
                  <VirtualizedExerciseList
                    items={previewItems}
                    selectedIds={selectedExerciseIds}
                    selectedOrderById={selectedOrderById}
                    onSelect={(exercise) => {
                      toggleExerciseSelection(exercise);
                    }}
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Start typing to search the Atlas.
                  </p>
                )}
                {query.trim().length > 1 ? (
                  <Button
                    className="w-full rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    onClick={() => {
                      selectCustomExercise(query.trim());
                    }}
                  >
                    Select "{query.trim()}"
                  </Button>
                ) : null}
                {selectedExerciseNames.length > 0 ? (
                  <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/60 px-3 py-2">
                    <p className="text-xs text-muted-foreground">
                      Selection order is preserved when adding.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 rounded-full px-3 text-xs"
                      onClick={() => {
                        setSelectedExerciseNames([]);
                        setSelectedExerciseIds([]);
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                ) : null}
              </SearchField>
            </div>
          ) : null}
          {adminEdit && isAdmin ? (
            <div className="rounded-[24px] border border-primary/30 bg-primary/12 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-primary/85">
                Thumbnail manager
              </p>
              <p className="mt-2 text-sm text-foreground/80">
                Update the thumbnail for this exercise.
              </p>
              <Input
                value={thumbnailUrl}
                onChange={(event) => setThumbnailUrl(event.target.value)}
                placeholder="Thumbnail image URL"
                className="mt-3 border-primary/35 bg-card/60 text-foreground placeholder:text-muted-foreground"
              />
              <label className="mt-3 flex cursor-pointer items-center justify-between rounded-2xl border border-primary/35 bg-card/60 px-4 py-3 text-xs font-semibold text-primary">
                <span>{thumbnailUploading ? "Uploading..." : "Upload thumbnail"}</span>
                <span className="text-primary/80">Browse</span>
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    setThumbnailUploading(true);
                    setThumbnailProgress(0);
                    setThumbnailNotice(null);
                    uploadImageFile(file, setThumbnailProgress, "exercises")
                      .then((url) => {
                        setThumbnailUrl(url);
                        setThumbnailNotice("Thumbnail uploaded.");
                      })
                      .catch(() => {
                        setThumbnailNotice("Upload failed.");
                      })
                      .finally(() => setThumbnailUploading(false));
                  }}
                />
              </label>
              {thumbnailUploading ? (
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-primary/15">
                  <div
                    className="h-full rounded-full bg-primary transition-all"
                    style={{ width: `${thumbnailProgress}%` }}
                  />
                </div>
              ) : null}
              {thumbnailNotice ? (
                <p className="mt-2 text-xs text-primary">{thumbnailNotice}</p>
              ) : null}
              <Button
                className="mt-3 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={async () => {
                  if (!masterId) {
                    appToast.info("Master exercise not found");
                    return;
                  }
                  try {
                    const response = await updateExerciseMaster(masterId, {
                      imageUrl: thumbnailUrl.trim() || null,
                    });
                    if (response.exercise) {
                      upsertExerciseRecord(response.exercise);
                    }
                    appToast.info("Thumbnail saved");
                  } catch {
                    appToast.info("Unable to update thumbnail");
                  }
                }}
                disabled={loadingMaster}
              >
                Save thumbnail
              </Button>
            </div>
          ) : null}
          {selectedName || exerciseName ? (
            targetPlan && targetWorkout ? (
              <div className="rounded-[24px] border border-border/70 bg-card/55 px-4 py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  Adding to {targetWorkout.name}.
                </p>
                <Button
                  className="mt-4 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() =>
                    void handleAddMany(
                      targetPlan.id,
                      targetWorkout.id,
                      selectedExerciseNames,
                    )
                  }
                  disabled={selectedExerciseNames.length === 0}
                >
                  {selectedExerciseNames.length === 0
                    ? "Select exercises to add"
                    : `Add ${selectedExerciseNames.length} exercise${selectedExerciseNames.length === 1 ? "" : "s"}`}
                </Button>
              </div>
            ) : workoutPlans.length === 0 ? (
            <div className="rounded-[24px] border border-border/70 bg-card/55 px-4 py-6 text-center">
              <p className="text-sm text-muted-foreground">
                Create a workout first, then add exercises.
              </p>
              <Button
                className="mt-4 w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => navigate("/fitness")}
              >
                Go to workouts
              </Button>
            </div>
            ) : (
            workoutPlans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-[24px] border border-border/70 bg-card/55 px-4 py-4"
              >
                <p className="text-sm font-semibold text-foreground">{plan.name}</p>
                <div className="mt-3 space-y-2">
                  {plan.workouts.map((workout) => (
                    <button
                      key={workout.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-2xl border border-border/70 bg-card/60 px-3 py-3 text-left text-sm text-foreground/85 hover:border-border"
                      onClick={() =>
                        void handleAddMany(
                          plan.id,
                          workout.id,
                          selectedExerciseNames,
                        )
                      }
                      disabled={selectedExerciseNames.length === 0}
                    >
                      <span>{workout.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {workout.exercises.length} exercises
                      </span>
                    </button>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full rounded-full border-border/70 text-foreground hover:bg-secondary/70"
                    onClick={async () => {
                      const workout = await createWorkoutTemplate(
                        plan.id,
                        "New workout",
                      );
                      await handleAddMany(
                        plan.id,
                        workout.id,
                        selectedExerciseNames,
                      );
                    }}
                    disabled={selectedExerciseNames.length === 0}
                  >
                    Create workout in {plan.name}
                  </Button>
                </div>
              </div>
            ))
          )) : null}
        </div>
      </div>
    </AppShell>
  );
};

export default AddExerciseToWorkout;
