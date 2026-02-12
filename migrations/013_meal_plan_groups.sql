BEGIN;

CREATE TABLE IF NOT EXISTS meal_plan_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meal_plan_groups_user_idx
  ON meal_plan_groups (user_id, sort_order ASC);

ALTER TABLE meal_plan_days
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES meal_plan_groups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS meal_plan_days_group_idx
  ON meal_plan_days (group_id)
  WHERE group_id IS NOT NULL;

COMMIT;
