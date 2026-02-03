ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS is_custom boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX IF NOT EXISTS exercises_custom_name_idx
  ON exercises (created_by_user_id, lower(name))
  WHERE created_by_user_id IS NOT NULL AND is_custom;

ALTER TABLE session_sets
ADD COLUMN IF NOT EXISTS weight_kg numeric(10, 2),
ADD COLUMN IF NOT EXISTS weight_display numeric(10, 2),
ADD COLUMN IF NOT EXISTS unit_used text,
ADD COLUMN IF NOT EXISTS rpe numeric(4, 2),
ADD COLUMN IF NOT EXISTS rest_seconds int;

UPDATE session_sets
SET weight_kg = weight,
    weight_display = weight,
    unit_used = COALESCE(unit_used, 'lb')
WHERE weight IS NOT NULL
  AND weight_kg IS NULL;

CREATE TABLE IF NOT EXISTS exercise_stats_daily (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  exercise_id bigint NOT NULL REFERENCES exercises(id) ON DELETE CASCADE,
  day date NOT NULL,
  total_sets int NOT NULL DEFAULT 0,
  total_reps int NOT NULL DEFAULT 0,
  total_volume_kg numeric(12, 2) NOT NULL DEFAULT 0,
  max_weight_kg numeric(10, 2),
  est_one_rm_kg numeric(10, 2),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, exercise_id, day)
);

CREATE INDEX IF NOT EXISTS exercise_stats_daily_day_idx
  ON exercise_stats_daily (user_id, day);

CREATE TABLE IF NOT EXISTS muscle_stats_daily (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  muscle text NOT NULL,
  day date NOT NULL,
  total_sets int NOT NULL DEFAULT 0,
  total_volume_kg numeric(12, 2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, muscle, day)
);

CREATE INDEX IF NOT EXISTS muscle_stats_daily_day_idx
  ON muscle_stats_daily (user_id, day);
