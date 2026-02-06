type WorkoutPlansData = {
  plans?: Array<{ id: string; name: string }>;
  templates?: Array<{
    id: string;
    plan_id: string;
    name: string;
    last_performed_at?: string | null;
  }>;
  exercises?: Array<{
    id: string;
    template_id: string;
    exercise_name: string;
    item_order: number;
  }>;
};

type FitnessPlannerData = {
  routinesRes: {
    routines: Array<{ id: string; name: string; updated_at: string }>;
    exercises: Array<{
      id: string;
      routine_id: string;
      exercise_id?: number | null;
      exercise_name: string;
      target_sets?: number | null;
      notes?: string | null;
    }>;
  };
  activeRes: {
    session: { id: string; routine_id: string | null; started_at: string } | null;
    exercises: Array<{
      id: string;
      session_exercise_id: string;
      exercise_id: number | null;
      exercise_name: string;
      item_order: number;
    }>;
    sets: Array<{
      id: string;
      session_exercise_id: string;
      weight: number;
      reps: number;
    }>;
  };
  historyRes: {
    items: Array<{
      id: string;
      routine_id: string | null;
      started_at: string;
      ended_at: string;
      total_sets: number;
      total_volume: number;
    }>;
  };
  goalsRes: { goals: { weight_unit?: string | null } | null };
};

type TrainingAnalyticsData = {
  weeks: number;
  items: Array<{ week_start: string; volume: number; total_sets: number }>;
};

const WORKOUT_PLANS_TTL = 5 * 60 * 1000;
const FITNESS_PLANNER_TTL = 5 * 60 * 1000;
const TRAINING_ANALYTICS_TTL = 10 * 60 * 1000;

let workoutPlansCache: { updatedAt: number; data: WorkoutPlansData } | null = null;
let fitnessPlannerCache: { updatedAt: number; data: FitnessPlannerData } | null = null;
const trainingAnalyticsCache = new Map<
  number,
  { updatedAt: number; data: TrainingAnalyticsData }
>();

const isFresh = (updatedAt: number, ttl: number) => Date.now() - updatedAt < ttl;

export const getWorkoutPlansCache = () =>
  workoutPlansCache && isFresh(workoutPlansCache.updatedAt, WORKOUT_PLANS_TTL)
    ? workoutPlansCache.data
    : null;

export const setWorkoutPlansCache = (data: WorkoutPlansData) => {
  workoutPlansCache = { data, updatedAt: Date.now() };
};

export const clearWorkoutPlansCache = () => {
  workoutPlansCache = null;
};

export const getFitnessPlannerCache = () =>
  fitnessPlannerCache && isFresh(fitnessPlannerCache.updatedAt, FITNESS_PLANNER_TTL)
    ? fitnessPlannerCache.data
    : null;

export const setFitnessPlannerCache = (data: FitnessPlannerData) => {
  fitnessPlannerCache = { data, updatedAt: Date.now() };
};

export const clearFitnessPlannerCache = () => {
  fitnessPlannerCache = null;
};

export const getTrainingAnalyticsCache = (weeks: number) => {
  const cached = trainingAnalyticsCache.get(weeks);
  if (!cached) return null;
  return isFresh(cached.updatedAt, TRAINING_ANALYTICS_TTL) ? cached.data : null;
};

export const setTrainingAnalyticsCache = (data: TrainingAnalyticsData) => {
  trainingAnalyticsCache.set(data.weeks, { data, updatedAt: Date.now() });
};

export const clearTrainingAnalyticsCache = (weeks?: number) => {
  if (typeof weeks === "number") {
    trainingAnalyticsCache.delete(weeks);
    return;
  }
  trainingAnalyticsCache.clear();
};
