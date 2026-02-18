export type Exercise = {
  id: number;
  name: string;
  description: string;
  category: string;
  equipment: string[];
  muscles: string[];
  imageUrl?: string;
};

export type ExerciseSearchStatus = "idle" | "loading" | "error";

export type WorkoutExerciseEntry = {
  id: string;
  name: string;
  /** Alternate exercises (per template slot) the user can swap to in-session */
  alternates?: Array<{ id: number; name: string }>;
  note?: string;
  steps?: string[];
  guideUrl?: string;
  customVideoName?: string;
};

/**
 * Editable set row (weight, reps, etc.) used in workout session UI.
 * WorkoutSessionSheet uses base fields; WorkoutSessionEditor also uses rpe, restSeconds.
 */
export type EditableSet = {
  id: string;
  weight: string;
  reps: string;
  previous: string;
  rpe?: string;
  restSeconds?: string;
  /** Session mode: user marked this set done; triggers rest and counts toward completion. */
  completed?: boolean;
};

/**
 * Editable exercise with sets, used in workout session UI.
 * WorkoutSessionSheet uses id, name, sets; WorkoutSessionEditor also uses note, steps, guideUrl, customVideoName.
 */
export type EditableExercise = {
  id: string;
  name: string;
  sets: EditableSet[];
  note?: string;
  steps?: string[];
  guideUrl?: string;
  customVideoName?: string;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  exercises: WorkoutExerciseEntry[];
  lastPerformed?: string;
};

export type WorkoutPlan = {
  id: string;
  name: string;
  workouts: WorkoutTemplate[];
};

export type RoutineExercise = {
  id: string;
  exerciseId: number;
  name: string;
  targetSets: number;
  notes?: string;
};

export type Routine = {
  id: string;
  name: string;
  exercises: RoutineExercise[];
  updatedAt: number;
};

export type SessionSet = {
  id: string;
  exerciseId: number;
  weight: number;
  reps: number;
  completedAt: number;
};

export type ActiveSession = {
  id: string;
  routineId: string;
  startedAt: number;
  currentExerciseIndex: number;
  sets: SessionSet[];
};

export type SessionHistory = {
  id: string;
  routineId: string;
  startedAt: number;
  endedAt: number;
  totalSets: number;
  totalVolume: number;
};
