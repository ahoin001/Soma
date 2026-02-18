-- Alternate exercises: per-workout-template alternates + session swap tracking.
-- Template: each template exercise can have N alternate exercises (many-to-many).
-- Session: record which slot came from which template exercise and when user swapped.

-- Junction: which exercises are valid alternates for a given template exercise slot
CREATE TABLE IF NOT EXISTS workout_template_exercise_alternates (
  template_exercise_id uuid NOT NULL REFERENCES workout_template_exercises(id) ON DELETE CASCADE,
  alternate_exercise_id bigint NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (template_exercise_id, alternate_exercise_id)
);

CREATE INDEX IF NOT EXISTS workout_template_exercise_alternates_template_idx
  ON workout_template_exercise_alternates (template_exercise_id);

-- Session exercise: which template slot this row came from (for showing alternates)
ALTER TABLE session_exercises
  ADD COLUMN IF NOT EXISTS source_template_exercise_id uuid REFERENCES workout_template_exercises(id) ON DELETE SET NULL;

-- Session exercise: when user swapped, this slot was "instead of" this template exercise
ALTER TABLE session_exercises
  ADD COLUMN IF NOT EXISTS substituted_from_template_exercise_id uuid REFERENCES workout_template_exercises(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS session_exercises_source_template_idx
  ON session_exercises (source_template_exercise_id)
  WHERE source_template_exercise_id IS NOT NULL;
