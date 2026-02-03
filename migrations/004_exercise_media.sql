CREATE TABLE IF NOT EXISTS exercise_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id bigint NULL REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
  source_type text NOT NULL,
  media_url text NOT NULL,
  thumb_url text NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exercise_media_lookup_idx
  ON exercise_media (exercise_name, user_id);
