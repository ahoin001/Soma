BEGIN;

CREATE TABLE IF NOT EXISTS meal_plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_kcal numeric(10, 2) NOT NULL DEFAULT 0,
  target_protein_g numeric(10, 2) NOT NULL DEFAULT 0,
  target_carbs_g numeric(10, 2) NOT NULL DEFAULT 0,
  target_fat_g numeric(10, 2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meal_plan_days_user_idx
  ON meal_plan_days (user_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS meal_plan_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day_id uuid NOT NULL REFERENCES meal_plan_days(id) ON DELETE CASCADE,
  label text NOT NULL,
  emoji text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meal_plan_meals_day_idx
  ON meal_plan_meals (day_id, sort_order ASC);

CREATE TABLE IF NOT EXISTS meal_plan_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_id uuid NOT NULL REFERENCES meal_plan_meals(id) ON DELETE CASCADE,
  food_id uuid REFERENCES foods(id) ON DELETE SET NULL,
  food_name text NOT NULL,
  quantity numeric(10, 2) NOT NULL DEFAULT 1,
  slot text NOT NULL DEFAULT 'balance'
    CHECK (slot IN ('protein', 'carbs', 'balance')),
  kcal numeric(10, 2) NOT NULL DEFAULT 0,
  protein_g numeric(10, 2) NOT NULL DEFAULT 0,
  carbs_g numeric(10, 2) NOT NULL DEFAULT 0,
  fat_g numeric(10, 2) NOT NULL DEFAULT 0,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meal_plan_items_meal_idx
  ON meal_plan_items (meal_id, sort_order ASC);

CREATE TABLE IF NOT EXISTS meal_plan_week_assignments (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  weekday smallint NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  day_id uuid REFERENCES meal_plan_days(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, weekday)
);

CREATE INDEX IF NOT EXISTS meal_plan_week_assignments_day_idx
  ON meal_plan_week_assignments (day_id);

COMMIT;
