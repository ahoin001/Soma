import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { AppShell, VirtualizedExerciseList } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/state/AppStore";
import { toast } from "sonner";
import { fetchCurrentUser, fetchExerciseByName, updateExerciseMaster } from "@/lib/api";
import { uploadImageFile } from "@/lib/uploadImage";

const createId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `exercise_${Math.random().toString(36).slice(2, 9)}`;

const AddExerciseToWorkout = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const exerciseName = params.get("name") ?? "";
  const planIdParam = params.get("planId");
  const workoutIdParam = params.get("workoutId");
  const adminEdit = params.get("adminEdit") === "true";
  const { workoutPlans, updateWorkoutTemplate, createWorkoutTemplate, fitnessLibrary } =
    useAppStore();
  const {
    upsertExerciseRecord,
    query,
    results,
    status,
    error,
    searchExercises,
    setQuery,
  } = fitnessLibrary;
  const [isAdmin, setIsAdmin] = useState(false);
  const [loadingAdmin, setLoadingAdmin] = useState(false);
  const [masterId, setMasterId] = useState<number | null>(null);
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [thumbnailUploading, setThumbnailUploading] = useState(false);
  const [thumbnailProgress, setThumbnailProgress] = useState(0);
  const [thumbnailNotice, setThumbnailNotice] = useState<string | null>(null);
  const [selectedName, setSelectedName] = useState(exerciseName);
  const abortRef = useRef<AbortController | null>(null);

  const plans = useMemo(() => workoutPlans, [workoutPlans]);
  const previewItems = useMemo(() => results.slice(0, 120), [results]);
  const targetPlan = planIdParam
    ? workoutPlans.find((item) => item.id === planIdParam) ?? null
    : null;
  const targetWorkout = targetPlan?.workouts.find((item) => item.id === workoutIdParam) ?? null;

  useEffect(() => {
    setSelectedName(exerciseName);
  }, [exerciseName]);

  useEffect(() => {
    if (!query.trim()) return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;
    const timer = window.setTimeout(() => {
      searchExercises(query, controller.signal, "mine");
    }, 300);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchExercises]);

  useEffect(() => {
    if (!adminEdit) return;
    let cancelled = false;
    const load = async () => {
      try {
        setLoadingAdmin(true);
        const user = await fetchCurrentUser();
        if (cancelled) return;
        const admin = user.user?.email === "ahoin001@gmail.com";
        setIsAdmin(admin);
        if (!admin) return;
        if (exerciseName.trim()) {
          const response = await fetchExerciseByName(exerciseName);
          const record = response.exercise as { id?: number; image_url?: string | null } | null;
          setMasterId(record?.id ? Number(record.id) : null);
          setThumbnailUrl(record?.image_url ?? "");
        }
      } catch {
        if (!cancelled) {
          setIsAdmin(false);
        }
      } finally {
        if (!cancelled) setLoadingAdmin(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [adminEdit, exerciseName]);

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
        <div className="mx-auto w-full max-w-sm px-5 pb-10 pt-6 text-white">
          <div className="rounded-[28px] border border-white/10 bg-white/5 px-4 py-6 text-center">
            <p className="text-sm text-white/70">
              We could not find that exercise.
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-full border-white/20 text-white hover:bg-white/10"
              onClick={handleBack}
            >
              Back
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  const handleAdd = async (planId: string, workoutId: string, name: string) => {
    const plan = plans.find((item) => item.id === planId);
    const workout = plan?.workouts.find((item) => item.id === workoutId);
    if (!plan || !workout) return;
    const nextExercises = [
      ...workout.exercises,
      { id: createId(), name },
    ];
    try {
      await updateWorkoutTemplate(plan.id, workout.id, { exercises: nextExercises });
      if (navigator.vibrate) {
        navigator.vibrate(8);
      }
      toast("Added to workout", {
        description: `${name} added to ${workout.name}.`,
      });
      navigate(`/fitness/workouts/${plan.id}/${workout.id}`);
    } catch {
      // handled in hook
    }
  };

  return (
    <AppShell experience="fitness" showNav={false} safeAreaTop="extra">
      <div className="mx-auto w-full max-w-sm px-5 pb-10 pt-4 text-white">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={handleBack}
          >
            ✕
          </Button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              {adminEdit ? "Admin edit" : "Add to workout"}
            </p>
            <p className="text-sm text-white/80">
              {selectedName || exerciseName || "Select an exercise"}
            </p>
          </div>
          <div className="h-10 w-10" />
        </div>

        <div className="mt-6 space-y-4">
          {!adminEdit ? (
            <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">
                Choose exercise
              </p>
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search exercises"
                className="mt-3 border-white/10 bg-white/5 text-white placeholder:text-white/40"
              />
              {status === "error" ? (
                <p className="mt-2 text-sm text-rose-300">{error}</p>
              ) : null}
              {status === "loading" ? (
                <p className="mt-2 text-sm text-white/60">Loading exercises...</p>
              ) : null}
              {previewItems.length ? (
                <div className="mt-3">
                  <VirtualizedExerciseList
                    items={previewItems}
                    onSelect={(exercise) => {
                      setSelectedName(exercise.name);
                      if (targetPlan && targetWorkout) {
                        void handleAdd(targetPlan.id, targetWorkout.id, exercise.name);
                      }
                    }}
                  />
                </div>
              ) : (
                <p className="mt-3 text-sm text-white/50">
                  Start typing to search the Atlas.
                </p>
              )}
              {query.trim().length > 1 ? (
                <Button
                  className="mt-3 w-full rounded-full bg-white/10 text-white hover:bg-white/20"
                  onClick={() => {
                    setSelectedName(query.trim());
                    if (targetPlan && targetWorkout) {
                      void handleAdd(targetPlan.id, targetWorkout.id, query.trim());
                    }
                  }}
                >
                  Create "{query.trim()}"
                </Button>
              ) : null}
            </div>
          ) : null}
          {adminEdit && isAdmin ? (
            <div className="rounded-[24px] border border-emerald-400/30 bg-emerald-400/10 px-4 py-4">
              <p className="text-xs uppercase tracking-[0.2em] text-emerald-200/80">
                Thumbnail manager
              </p>
              <p className="mt-2 text-sm text-white/70">
                Update the thumbnail for this exercise.
              </p>
              <Input
                value={thumbnailUrl}
                onChange={(event) => setThumbnailUrl(event.target.value)}
                placeholder="Thumbnail image URL"
                className="mt-3 border-emerald-400/30 bg-white/10 text-white placeholder:text-white/50"
              />
              <label className="mt-3 flex cursor-pointer items-center justify-between rounded-2xl border border-emerald-400/30 bg-white/10 px-4 py-3 text-xs font-semibold text-emerald-100">
                <span>{thumbnailUploading ? "Uploading..." : "Upload thumbnail"}</span>
                <span className="text-emerald-200">Browse</span>
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
                    uploadImageFile(file, setThumbnailProgress)
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
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-emerald-400/15">
                  <div
                    className="h-full rounded-full bg-emerald-300 transition-all"
                    style={{ width: `${thumbnailProgress}%` }}
                  />
                </div>
              ) : null}
              {thumbnailNotice ? (
                <p className="mt-2 text-xs text-emerald-200">{thumbnailNotice}</p>
              ) : null}
              <Button
                className="mt-3 w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                onClick={async () => {
                  if (!masterId) {
                    toast("Master exercise not found");
                    return;
                  }
                  try {
                    const response = await updateExerciseMaster(masterId, {
                      imageUrl: thumbnailUrl.trim() || null,
                    });
                    if (response.exercise) {
                      upsertExerciseRecord(response.exercise);
                    }
                    toast("Thumbnail saved");
                  } catch {
                    toast("Unable to update thumbnail");
                  }
                }}
                disabled={loadingAdmin}
              >
                Save thumbnail
              </Button>
            </div>
          ) : null}
          {selectedName || exerciseName ? (
            targetPlan && targetWorkout ? (
              <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4 text-center">
                <p className="text-sm text-white/70">
                  Adding to {targetWorkout.name}.
                </p>
                <Button
                  className="mt-4 w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                  onClick={() =>
                    void handleAdd(
                      targetPlan.id,
                      targetWorkout.id,
                      selectedName || exerciseName,
                    )
                  }
                >
                  Add exercise
                </Button>
              </div>
            ) : plans.length === 0 ? (
            <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-6 text-center">
              <p className="text-sm text-white/70">
                Create a workout first, then add exercises.
              </p>
              <Button
                className="mt-4 w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
                onClick={() => navigate("/fitness")}
              >
                Go to workouts
              </Button>
            </div>
            ) : (
            plans.map((plan) => (
              <div
                key={plan.id}
                className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4"
              >
                <p className="text-sm font-semibold text-white">{plan.name}</p>
                <div className="mt-3 space-y-2">
                  {plan.workouts.map((workout) => (
                    <button
                      key={workout.id}
                      type="button"
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left text-sm text-white/80 hover:border-white/30"
                      onClick={() =>
                        void handleAdd(
                          plan.id,
                          workout.id,
                          selectedName || exerciseName,
                        )
                      }
                    >
                      <span>{workout.name}</span>
                      <span className="text-xs text-white/50">
                        {workout.exercises.length} exercises
                      </span>
                    </button>
                  ))}
                  <Button
                    variant="outline"
                    className="w-full rounded-full border-white/20 text-white hover:bg-white/10"
                    onClick={async () => {
                      const workout = await createWorkoutTemplate(
                        plan.id,
                        "New workout",
                      );
                      await handleAdd(
                        plan.id,
                        workout.id,
                        selectedName || exerciseName,
                      );
                    }}
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
