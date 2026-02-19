-- Industry-standard multi-user IronFlow: per-user exercise notes + schema hardening.
-- Exercises remain shared (global library + custom per user). Each user has their own
-- plans, templates, sessions, set data, and now personal notes per exercise.
-- RLS on alternates ensures only plan owners can manage alternates.

BEGIN;

-- Per-user personal notes for any exercise (shown in guide and session).
-- Complements exercise_overrides.steps (cues) and guide_url; notes are freeform.
ALTER TABLE exercise_overrides
  ADD COLUMN IF NOT EXISTS notes text;

COMMENT ON COLUMN exercise_overrides.notes IS 'User personal notes for this exercise (e.g. form cues, reminders). Shown in guide and session.';

-- Timed sets (e.g. planks, holds): duration in seconds. Null = rep-based set.
ALTER TABLE session_sets
  ADD COLUMN IF NOT EXISTS duration_seconds int;

COMMENT ON COLUMN session_sets.duration_seconds IS 'For timed sets (planks, holds). Null for rep-based sets.';

-- RLS for alternates: only the plan owner can manage alternates for their template exercises.
ALTER TABLE workout_template_exercise_alternates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage alternates for own template exercises" ON workout_template_exercise_alternates;
CREATE POLICY "Users can manage alternates for own template exercises"
  ON workout_template_exercise_alternates FOR ALL
  USING (
    EXISTS (
      SELECT 1
      FROM workout_template_exercises wte
      JOIN workout_templates wt ON wt.id = wte.template_id
      JOIN workout_plans wp ON wp.id = wt.plan_id
      WHERE wte.id = workout_template_exercise_alternates.template_exercise_id
        AND wp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM workout_template_exercises wte
      JOIN workout_templates wt ON wt.id = wte.template_id
      JOIN workout_plans wp ON wp.id = wt.plan_id
      WHERE wte.id = workout_template_exercise_alternates.template_exercise_id
        AND wp.user_id = auth.uid()
    )
  );

COMMIT;
