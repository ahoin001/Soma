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
