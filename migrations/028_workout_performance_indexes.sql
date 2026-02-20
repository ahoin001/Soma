BEGIN;

CREATE INDEX IF NOT EXISTS session_exercises_substituted_idx
  ON public.session_exercises (substituted_from_template_exercise_id)
  WHERE substituted_from_template_exercise_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS workout_template_exercises_template_exercise_idx
  ON public.workout_template_exercises (template_id, exercise_id)
  WHERE exercise_id IS NOT NULL;

COMMIT;
