import { useEffect, useMemo, useState } from "react";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { createExercise } from "@/lib/api";
import { createExerciseMedia } from "@/data/exerciseMediaApi";
import { useAppStore } from "@/state/AppStore";

const CATEGORY_OPTIONS = [
  "Chest",
  "Back",
  "Shoulders",
  "Arms",
  "Legs",
  "Glutes",
  "Core",
  "Full Body",
];

const MUSCLE_OPTIONS = [
  "Chest",
  "Upper Back",
  "Lower Back",
  "Lats",
  "Shoulders",
  "Traps",
  "Biceps",
  "Triceps",
  "Forearms",
  "Serratus anterior",
  "Quads",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Abs",
  "Obliques",
  "Hip Flexors",
];

const EQUIPMENT_OPTIONS = [
  "Bodyweight",
  "Dumbbell",
  "Barbell",
  "Kettlebell",
  "Cable",
  "Machine",
  "Bands",
  "Bench",
  "Pull-up bar",
];

const CATEGORY_MUSCLE_MAP: Record<string, string[]> = {
  Chest: ["Chest", "Shoulders", "Triceps", "Serratus anterior"],
  Back: ["Upper Back", "Lats", "Lower Back", "Traps", "Biceps", "Forearms"],
  Shoulders: ["Shoulders", "Traps", "Upper Back", "Triceps"],
  Arms: ["Biceps", "Triceps", "Forearms"],
  Legs: ["Quads", "Hamstrings", "Calves", "Glutes", "Hip Flexors"],
  Glutes: ["Glutes", "Hamstrings", "Quads", "Lower Back"],
  Core: ["Abs", "Obliques", "Lower Back", "Hip Flexors"],
  "Full Body": [
    "Chest",
    "Upper Back",
    "Lats",
    "Shoulders",
    "Traps",
    "Glutes",
    "Quads",
    "Hamstrings",
    "Calves",
    "Abs",
    "Obliques",
  ],
};

type ExerciseFormValues = {
  name: string;
  category: string;
  muscles: string[];
  equipment: string[];
  description: string;
  imageUrl: string;
  videoUrl: string;
};

type CreateExerciseFormProps = {
  onCreated?: (name: string) => void;
  onCancel?: () => void;
  initial?: Partial<ExerciseFormValues>;
  onSubmit?: (payload: ExerciseFormValues) => Promise<void>;
  submitLabel?: string;
};

export const CreateExerciseForm = ({
  onCreated,
  onCancel,
  initial,
  onSubmit,
  submitLabel = "Save exercise",
}: CreateExerciseFormProps) => {
  const { fitnessLibrary } = useAppStore();
  const { upsertExerciseRecord, clearSearchCache } = fitnessLibrary;
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [primaryMuscles, setPrimaryMuscles] = useState<string[]>([]);
  const [equipment, setEquipment] = useState<string[]>([]);
  const [customMuscles, setCustomMuscles] = useState("");
  const [customEquipment, setCustomEquipment] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [optionalOpen, setOptionalOpen] = useState(false);
  const [musclePickerMode, setMusclePickerMode] = useState<"pills" | "visual">(
    "pills",
  );

  const categoryMuscleOptions = useMemo(() => {
    if (!category) return MUSCLE_OPTIONS;
    const mapped = CATEGORY_MUSCLE_MAP[category];
    return mapped?.length ? mapped : MUSCLE_OPTIONS;
  }, [category]);

  const mergedMuscles = useMemo(() => {
    const extra = customMuscles
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return Array.from(new Set([...primaryMuscles, ...extra]));
  }, [primaryMuscles, customMuscles]);

  const mergedEquipment = useMemo(() => {
    const extra = customEquipment
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);
    return Array.from(new Set([...equipment, ...extra]));
  }, [equipment, customEquipment]);

  useEffect(() => {
    if (!category) return;
    setPrimaryMuscles((prev) =>
      prev.filter((muscle) => categoryMuscleOptions.includes(muscle)),
    );
  }, [category, categoryMuscleOptions]);

  const reset = () => {
    setName("");
    setCategory("");
    setPrimaryMuscles([]);
    setEquipment([]);
    setCustomMuscles("");
    setCustomEquipment("");
    setDescription("");
    setImageUrl("");
    setVideoUrl("");
    setOptionalOpen(false);
  };

  useEffect(() => {
    if (!initial) return;
    if (initial.name !== undefined) setName(initial.name);
    if (initial.category !== undefined) setCategory(initial.category);
    if (initial.muscles) setPrimaryMuscles(initial.muscles);
    if (initial.equipment) setEquipment(initial.equipment);
    if (initial.description !== undefined) setDescription(initial.description);
    if (initial.imageUrl !== undefined) setImageUrl(initial.imageUrl);
    if (initial.videoUrl !== undefined) setVideoUrl(initial.videoUrl);
  }, [initial]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast("Exercise name is required.");
      return;
    }
    if (!category) {
      toast("Pick a category.");
      return;
    }
    try {
      setSaving(true);
      setStatusMessage("Saving exercise...");
      const payload: ExerciseFormValues = {
        name: name.trim(),
        category: category.trim(),
        muscles: mergedMuscles,
        equipment: mergedEquipment,
        description: description.trim(),
        imageUrl: imageUrl.trim(),
        videoUrl: videoUrl.trim(),
      };
      if (onSubmit) {
        await onSubmit(payload);
      } else {
        const response = await createExercise({
          name: payload.name,
          category: payload.category,
          description: payload.description || undefined,
          muscles: payload.muscles,
          equipment: payload.equipment,
          imageUrl: payload.imageUrl || undefined,
        });
        if (response.exercise) {
          upsertExerciseRecord(response.exercise, { prepend: true });
          clearSearchCache();
        }
        if (payload.videoUrl) {
          setStatusMessage("Uploading media...");
          await createExerciseMedia({
            exerciseName: payload.name,
            sourceType: "external",
            mediaUrl: payload.videoUrl,
            isPrimary: true,
          });
        }
        toast("Exercise created", {
          description: "Added to your personal library.",
        });
      }
      onCreated?.(name.trim());
      reset();
      onCancel?.();
    } catch {
      toast("Exercise not saved", {
        description: "Check required fields and try again.",
      });
    } finally {
      setSaving(false);
      setStatusMessage("");
    }
  };

  return (
    <div className="aura-sheet-body" aria-busy={saving}>
      <div className="mt-2 text-center">
        <p className="text-xs uppercase tracking-[0.2em] text-white/50">
          Create exercise
        </p>
        <h3 className="mt-2 text-2xl font-display font-semibold">
          Build a custom move
        </h3>
        <p className="mt-2 text-sm text-white/60">
          This will live in your personal library.
        </p>
      </div>

          <div className="mt-6 grid gap-4">
            <div className="space-y-2">
              <Label htmlFor="create-exercise-name">Name</Label>
              <Input
                id="create-exercise-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Cable Row (Neutral Grip)"
                className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="h-11 rounded-full border-white/10 bg-white/5 text-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Primary muscles (recommended)</Label>
                <ToggleGroup
                  type="single"
                  value={musclePickerMode}
                  onValueChange={(value) =>
                    setMusclePickerMode((value as "pills" | "visual") || "pills")
                  }
                  className="rounded-full border border-white/10 bg-white/5 p-1"
                >
                  <ToggleGroupItem
                    value="pills"
                    className="rounded-full px-3 py-1 text-xs text-white/70 data-[state=on]:bg-emerald-400/20 data-[state=on]:text-emerald-200"
                  >
                    Pills
                  </ToggleGroupItem>
                  <ToggleGroupItem
                    value="visual"
                    className="rounded-full px-3 py-1 text-xs text-white/70 data-[state=on]:bg-emerald-400/20 data-[state=on]:text-emerald-200"
                  >
                    Visual
                  </ToggleGroupItem>
                </ToggleGroup>
              </div>
              {musclePickerMode === "pills" ? (
                <ToggleGroup
                  type="multiple"
                  value={primaryMuscles}
                  onValueChange={(value) => setPrimaryMuscles(value)}
                  className="flex flex-wrap justify-start gap-2"
                >
                  {categoryMuscleOptions.map((muscle) => (
                    <ToggleGroupItem
                      key={muscle}
                      value={muscle}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 data-[state=on]:border-emerald-400/60 data-[state=on]:bg-emerald-400/15 data-[state=on]:text-emerald-200"
                    >
                      {muscle}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {categoryMuscleOptions.map((muscle) => {
                    const active = primaryMuscles.includes(muscle);
                    return (
                      <button
                        key={muscle}
                        type="button"
                        onClick={() => {
                          setPrimaryMuscles((prev) =>
                            active
                              ? prev.filter((item) => item !== muscle)
                              : [...prev, muscle],
                          );
                        }}
                        className={`rounded-2xl border px-3 py-3 text-left text-sm transition ${
                          active
                            ? "border-emerald-400/60 bg-emerald-400/15 text-emerald-200"
                            : "border-white/10 bg-white/5 text-white/70 hover:border-white/30"
                        }`}
                      >
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">
                          Region
                        </p>
                        <p className="mt-1 font-semibold">{muscle}</p>
                      </button>
                    );
                  })}
                </div>
              )}
              <p className="text-xs text-white/50">
                Anatomy guide: primary movers for the selected category.
              </p>
              <Input
                value={customMuscles}
                onChange={(event) => setCustomMuscles(event.target.value)}
                placeholder="Add other muscles (comma separated)"
                className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
              />
            </div>
          </div>

          <Collapsible
            open={optionalOpen}
            onOpenChange={setOptionalOpen}
            className="mt-6"
          >
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="outline"
                className="w-full rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20"
              >
                Optional details
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-4 grid gap-4">
              <div className="space-y-3">
                <Label>Equipment</Label>
                <ToggleGroup
                  type="multiple"
                  value={equipment}
                  onValueChange={(value) => setEquipment(value)}
                  className="flex flex-wrap justify-start gap-2"
                >
                  {EQUIPMENT_OPTIONS.map((item) => (
                    <ToggleGroupItem
                      key={item}
                      value={item}
                      className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 data-[state=on]:border-emerald-400/60 data-[state=on]:bg-emerald-400/15 data-[state=on]:text-emerald-200"
                    >
                      {item}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
                <Input
                  value={customEquipment}
                  onChange={(event) => setCustomEquipment(event.target.value)}
                  placeholder="Other equipment (comma separated)"
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-exercise-description">Instructions</Label>
                <Textarea
                  id="create-exercise-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Short form cues or setup details."
                  className="min-h-[120px] border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-exercise-image">Image URL</Label>
                <Input
                  id="create-exercise-image"
                  value={imageUrl}
                  onChange={(event) => setImageUrl(event.target.value)}
                  placeholder="https://..."
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-exercise-video">Video URL</Label>
                <Input
                  id="create-exercise-video"
                  value={videoUrl}
                  onChange={(event) => setVideoUrl(event.target.value)}
                  placeholder="https://youtube.com/..."
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/40"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>

      {statusMessage ? (
        <p className="mt-4 text-sm text-emerald-200">{statusMessage}</p>
      ) : null}
      <div className="mt-4 grid gap-2">
        <Button
          className="w-full rounded-full bg-emerald-400 text-slate-950 hover:bg-emerald-300"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? "Saving..." : submitLabel}
        </Button>
        <Button
          variant="outline"
          className="w-full rounded-full border-white/20 bg-white/10 text-white hover:bg-white/20"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
};

type CreateExerciseSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: (name: string) => void;
};

export const CreateExerciseSheet = ({
  open,
  onOpenChange,
  onCreated,
}: CreateExerciseSheetProps) => (
  <Drawer open={open} onOpenChange={onOpenChange}>
    <DrawerContent className="rounded-t-[36px] border-none bg-slate-950 pb-[calc(1.5rem+env(safe-area-inset-bottom))] text-white">
      <CreateExerciseForm
        onCreated={onCreated}
        onCancel={() => onOpenChange(false)}
      />
    </DrawerContent>
  </Drawer>
  );
