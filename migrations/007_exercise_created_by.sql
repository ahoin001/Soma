ALTER TABLE exercises
ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS exercises_created_by_idx
  ON exercises (created_by_user_id);
