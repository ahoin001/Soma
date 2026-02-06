import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AppShell,
  RoutineBuilderPanel,
  VirtualizedExerciseList,
} from "@/components/aura";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/state/AppStore";
import type { Exercise } from "@/types/fitness";

const FitnessRoutines = () => {
  const navigate = useNavigate();
  const {
    fitnessLibrary: { query, results, status, error, searchExercises, setQuery },
    fitnessPlanner,
  } = useAppStore();
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const abortRef = useRef<AbortController | null>(null);

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

  const previewItems = useMemo(() => results.slice(0, 120), [results]);

  return (
    <AppShell experience="fitness" onAddAction={() => navigate("/fitness")} safeAreaTop="extra">
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">
              Architect
            </p>
            <h1 className="mt-2 text-2xl font-display font-semibold">
              Routines
            </h1>
            <p className="mt-1 text-sm text-white/60">
              Build reusable flows and launch a session fast.
            </p>
          </div>
          <Button
            variant="ghost"
            className="h-10 rounded-full bg-white/10 text-white hover:bg-white/20"
            onClick={() => navigate("/fitness")}
          >
            Back
          </Button>
        </div>

        <div className="mt-6 space-y-5">
          <div className="rounded-[24px] border border-white/10 bg-white/5 px-4 py-4">
            <p className="text-xs uppercase tracking-[0.2em] text-white/40">
              Atlas picker
            </p>
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search exercises to add"
              className="mt-3 border-white/10 bg-white/5 text-white placeholder:text-white/40"
            />
            <div className="mt-3">
              {status === "loading" ? (
                <p className="text-sm text-white/60">Searching…</p>
              ) : error ? (
                <p className="text-sm text-rose-300">{error}</p>
              ) : previewItems.length ? (
                <VirtualizedExerciseList
                  items={previewItems}
                  selectedId={selectedExercise?.id ?? null}
                  onSelect={(exercise) => setSelectedExercise(exercise)}
                />
              ) : (
                <p className="text-sm text-white/50">
                  Start typing to select an exercise.
                </p>
              )}
            </div>
          </div>

          <RoutineBuilderPanel
            routines={fitnessPlanner.routines}
            activeRoutineId={fitnessPlanner.activeRoutineId}
            activeRoutine={fitnessPlanner.activeRoutine}
            selectedExercise={selectedExercise}
            hasActiveSession={Boolean(fitnessPlanner.activeSession)}
            onSelectRoutine={fitnessPlanner.setActiveRoutineId}
            onCreateRoutine={fitnessPlanner.createRoutine}
            onRenameRoutine={fitnessPlanner.renameRoutine}
            onRemoveRoutine={fitnessPlanner.removeRoutine}
            onAddExercise={fitnessPlanner.addExerciseToRoutine}
            onRemoveExercise={fitnessPlanner.removeExerciseFromRoutine}
            onUpdateExercise={fitnessPlanner.updateRoutineExercise}
            onStartSession={(routineId) => {
              fitnessPlanner.startSession(routineId);
              navigate("/fitness");
            }}
          />
        </div>
      </div>
    </AppShell>
  );
};

export default FitnessRoutines;
