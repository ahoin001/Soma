BEGIN;

CREATE TABLE IF NOT EXISTS user_food_favorites (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, food_id)
);

CREATE INDEX IF NOT EXISTS user_food_favorites_user_idx
  ON user_food_favorites (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS user_food_history (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  last_logged_at timestamptz NOT NULL DEFAULT now(),
  times_logged int NOT NULL DEFAULT 1,
  PRIMARY KEY (user_id, food_id)
);

CREATE INDEX IF NOT EXISTS user_food_history_user_idx
  ON user_food_history (user_id, last_logged_at DESC);

COMMIT;
