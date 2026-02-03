CREATE TABLE IF NOT EXISTS exercise_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id bigint NULL REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  steps text[] NULL,
  guide_url text NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, exercise_name)
);

CREATE INDEX IF NOT EXISTS exercise_overrides_lookup_idx
  ON exercise_overrides (exercise_name, user_id);
