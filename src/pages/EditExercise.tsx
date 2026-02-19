import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { AppShell } from "@/components/aura";
import { Button } from "@/components/ui/button";
import { CreateExerciseForm } from "@/components/aura/CreateExerciseSheet";
import { fetchExerciseById, updateExerciseMaster } from "@/lib/api";
import { appToast } from "@/lib/toast";
import { createExerciseMedia } from "@/data/exerciseMediaApi";
import { useAppStore } from "@/state/AppStore";

type ExerciseRecord = {
  id: number;
  name: string;
  description: string | null;
  category: string | null;
  equipment: string[] | null;
  muscles: string[] | null;
  image_url?: string | null;
};

const EditExercise = () => {
  const navigate = useNavigate();
  const { exerciseId } = useParams();
  const [loading, setLoading] = useState(true);
  const [exercise, setExercise] = useState<ExerciseRecord | null>(null);
  const { fitnessLibrary } = useAppStore();
  const { upsertExerciseRecord, clearSearchCache } = fitnessLibrary;

  useEffect(() => {
    const id = Number(exerciseId);
    if (!Number.isFinite(id)) return;
    const load = async () => {
      try {
        setLoading(true);
        const response = await fetchExerciseById(id);
        setExercise(response.exercise as ExerciseRecord | null);
      } catch {
        setExercise(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [exerciseId]);

  if (loading) {
    return (
      <AppShell experience="fitness" showNav={false}>
        <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6 text-foreground">
          <p className="text-sm text-muted-foreground">Loading exercise...</p>
        </div>
      </AppShell>
    );
  }

  if (!exercise) {
    return (
      <AppShell experience="fitness" showNav={false}>
        <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-6 text-foreground">
          <div className="rounded-[28px] border border-border/70 bg-card/55 px-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              We could not find that exercise.
            </p>
            <Button
              variant="outline"
              className="mt-4 rounded-full border-border/70 text-foreground hover:bg-secondary/70"
              onClick={() => navigate(-1)}
            >
              Back
            </Button>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell experience="fitness" showNav={false}>
      <div className="mx-auto w-full max-w-[420px] px-4 pb-10 pt-4 text-foreground">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            className="h-10 w-10 rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/80"
            onClick={() => navigate(-1)}
          >
            ✕
          </Button>
          <div className="text-center">
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Edit exercise
            </p>
          </div>
          <div className="h-10 w-10" />
        </div>

        <div className="mt-4 rounded-[28px] border border-border/70 bg-card/55 shadow-[0_24px_40px_rgba(0,0,0,0.35)]">
          <CreateExerciseForm
            initial={{
              name: exercise.name ?? "",
              category: exercise.category ?? "",
              muscles: exercise.muscles ?? [],
              equipment: exercise.equipment ?? [],
              description: exercise.description ?? "",
              imageUrl: exercise.image_url ?? "",
              videoUrl: "",
            }}
            submitLabel="Save changes"
            onSubmit={async (payload) => {
              const response = await updateExerciseMaster(exercise.id, {
                name: payload.name,
                category: payload.category,
                description: payload.description || null,
                muscles: payload.muscles,
                equipment: payload.equipment,
                imageUrl: payload.imageUrl || null,
              });
              if (response.exercise) {
                upsertExerciseRecord(response.exercise);
                clearSearchCache();
              }
              if (payload.videoUrl) {
                await createExerciseMedia({
                  exerciseName: payload.name,
                  sourceType: "external",
                  mediaUrl: payload.videoUrl,
                  isPrimary: true,
                });
              }
              appToast.success("Exercise updated", {
                description: "Changes saved successfully.",
              });
              navigate(-1);
            }}
            onCancel={() => navigate(-1)}
          />
        </div>
      </div>
    </AppShell>
  );
};

export default EditExercise;
