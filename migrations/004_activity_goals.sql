BEGIN;

CREATE TABLE IF NOT EXISTS user_activity_goals (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  steps_goal int,
  water_goal_ml int,
  weight_unit text DEFAULT 'lb',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
