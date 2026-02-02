BEGIN;

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'exercise_group_type') THEN
    CREATE TYPE exercise_group_type AS ENUM (
      'straight_set',
      'superset',
      'circuit',
      'giant_set'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  auth_provider text,
  auth_subject text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  display_name text NOT NULL,
  sex text,
  dob date,
  height_cm numeric(5, 2),
  units text DEFAULT 'metric',
  timezone text DEFAULT 'UTC',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme text,
  notifications jsonb,
  privacy jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text GENERATED ALWAYS AS (lower(name)) STORED,
  brand text,
  barcode text,
  source text,
  is_global boolean NOT NULL DEFAULT false,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  parent_food_id uuid REFERENCES foods(id) ON DELETE SET NULL,
  portion_label text,
  portion_grams numeric(10, 2),
  kcal numeric(10, 2) NOT NULL DEFAULT 0,
  carbs_g numeric(10, 2) NOT NULL DEFAULT 0,
  protein_g numeric(10, 2) NOT NULL DEFAULT 0,
  fat_g numeric(10, 2) NOT NULL DEFAULT 0,
  micronutrients jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT foods_owner_check CHECK (is_global OR created_by_user_id IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS foods_global_barcode_idx
  ON foods (barcode)
  WHERE barcode IS NOT NULL AND is_global;

CREATE UNIQUE INDEX IF NOT EXISTS foods_user_unique_idx
  ON foods (created_by_user_id, normalized_name, (coalesce(brand, '')))
  WHERE created_by_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS foods_search_idx
  ON foods USING GIN (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(brand, '')));

CREATE TABLE IF NOT EXISTS food_servings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  food_id uuid NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  label text NOT NULL,
  grams numeric(10, 2) NOT NULL
);

CREATE TABLE IF NOT EXISTS food_nutrients (
  food_id uuid NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  nutrient_key text NOT NULL,
  amount numeric(10, 2) NOT NULL DEFAULT 0,
  unit text,
  PRIMARY KEY (food_id, nutrient_key)
);

CREATE TABLE IF NOT EXISTS user_food_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES foods(id) ON DELETE CASCADE,
  portion_label text,
  portion_grams numeric(10, 2),
  kcal numeric(10, 2),
  carbs_g numeric(10, 2),
  protein_g numeric(10, 2),
  fat_g numeric(10, 2),
  micronutrients jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, food_id)
);

CREATE TABLE IF NOT EXISTS meal_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE CASCADE,
  label text NOT NULL,
  emoji text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS meal_types_user_label_idx
  ON meal_types (user_id, label);

CREATE UNIQUE INDEX IF NOT EXISTS meal_types_global_label_idx
  ON meal_types (label)
  WHERE user_id IS NULL;

CREATE TABLE IF NOT EXISTS meal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  meal_type_id uuid REFERENCES meal_types(id) ON DELETE SET NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS meal_entries_user_date_idx
  ON meal_entries (user_id, local_date);

CREATE INDEX IF NOT EXISTS meal_entries_user_logged_idx
  ON meal_entries (user_id, logged_at DESC);

CREATE TABLE IF NOT EXISTS meal_entry_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_entry_id uuid NOT NULL REFERENCES meal_entries(id) ON DELETE CASCADE,
  food_id uuid REFERENCES foods(id) ON DELETE SET NULL,
  food_name text NOT NULL,
  portion_label text,
  portion_grams numeric(10, 2),
  quantity numeric(10, 2) NOT NULL DEFAULT 1,
  kcal numeric(10, 2) NOT NULL DEFAULT 0,
  carbs_g numeric(10, 2) NOT NULL DEFAULT 0,
  protein_g numeric(10, 2) NOT NULL DEFAULT 0,
  fat_g numeric(10, 2) NOT NULL DEFAULT 0,
  micronutrients jsonb NOT NULL DEFAULT '{}'::jsonb,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meal_entry_items_entry_idx
  ON meal_entry_items (meal_entry_id, sort_order);

CREATE TABLE IF NOT EXISTS daily_nutrition_targets (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  kcal_goal numeric(10, 2),
  carbs_g numeric(10, 2),
  protein_g numeric(10, 2),
  fat_g numeric(10, 2),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, local_date)
);

CREATE TABLE IF NOT EXISTS daily_nutrition_summary (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  eaten_kcal numeric(10, 2) NOT NULL DEFAULT 0,
  burned_kcal numeric(10, 2) NOT NULL DEFAULT 0,
  carbs_g numeric(10, 2) NOT NULL DEFAULT 0,
  protein_g numeric(10, 2) NOT NULL DEFAULT 0,
  fat_g numeric(10, 2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, local_date)
);

CREATE TABLE IF NOT EXISTS exercises (
  id bigserial PRIMARY KEY,
  name text NOT NULL,
  description text,
  category text,
  equipment text[],
  muscles text[],
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS exercises_search_idx
  ON exercises USING GIN (to_tsvector('simple', coalesce(name, '') || ' ' || coalesce(category, '')));

CREATE TABLE IF NOT EXISTS workout_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS workout_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES workout_plans(id) ON DELETE CASCADE,
  name text NOT NULL,
  last_performed_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS workout_templates_plan_idx
  ON workout_templates (plan_id, sort_order);

CREATE TABLE IF NOT EXISTS workout_template_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id bigint REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  group_id uuid,
  group_type exercise_group_type NOT NULL DEFAULT 'straight_set',
  group_order int NOT NULL DEFAULT 0,
  item_order int NOT NULL,
  target_sets int NOT NULL DEFAULT 3,
  notes text
);

CREATE UNIQUE INDEX IF NOT EXISTS workout_template_exercises_order_idx
  ON workout_template_exercises (template_id, item_order);

CREATE TABLE IF NOT EXISTS routines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE IF NOT EXISTS routine_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  routine_id uuid NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  exercise_id bigint REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  group_id uuid,
  group_type exercise_group_type NOT NULL DEFAULT 'straight_set',
  group_order int NOT NULL DEFAULT 0,
  item_order int NOT NULL,
  target_sets int NOT NULL DEFAULT 3,
  notes text
);

CREATE UNIQUE INDEX IF NOT EXISTS routine_exercises_order_idx
  ON routine_exercises (routine_id, item_order);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  routine_id uuid REFERENCES routines(id) ON DELETE SET NULL,
  template_id uuid REFERENCES workout_templates(id) ON DELETE SET NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT workout_sessions_source_check CHECK (routine_id IS NOT NULL OR template_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS workout_sessions_user_started_idx
  ON workout_sessions (user_id, started_at DESC);

CREATE TABLE IF NOT EXISTS session_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id bigint REFERENCES exercises(id) ON DELETE SET NULL,
  exercise_name text NOT NULL,
  group_id uuid,
  group_type exercise_group_type NOT NULL DEFAULT 'straight_set',
  group_order int NOT NULL DEFAULT 0,
  item_order int NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS session_exercises_order_idx
  ON session_exercises (session_id, item_order);

CREATE TABLE IF NOT EXISTS session_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id uuid NOT NULL REFERENCES session_exercises(id) ON DELETE CASCADE,
  weight numeric(10, 2),
  reps int,
  rir numeric(4, 2),
  completed_at timestamptz NOT NULL DEFAULT now(),
  notes text
);

CREATE INDEX IF NOT EXISTS session_sets_exercise_idx
  ON session_sets (session_exercise_id, completed_at DESC);

CREATE TABLE IF NOT EXISTS session_summary (
  session_id uuid PRIMARY KEY REFERENCES workout_sessions(id) ON DELETE CASCADE,
  total_sets int,
  total_volume numeric(12, 2),
  duration_sec int,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  weight numeric(8, 2) NOT NULL,
  unit text NOT NULL DEFAULT 'kg',
  notes text
);

CREATE UNIQUE INDEX IF NOT EXISTS weight_logs_unique_day
  ON weight_logs (user_id, local_date);

CREATE INDEX IF NOT EXISTS weight_logs_user_logged_idx
  ON weight_logs (user_id, logged_at DESC);

CREATE TABLE IF NOT EXISTS water_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  amount_ml int NOT NULL,
  source text
);

CREATE INDEX IF NOT EXISTS water_logs_user_date_idx
  ON water_logs (user_id, local_date);

CREATE TABLE IF NOT EXISTS steps_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  local_date date NOT NULL,
  logged_at timestamptz NOT NULL DEFAULT now(),
  steps int NOT NULL,
  source text
);

CREATE UNIQUE INDEX IF NOT EXISTS steps_logs_unique_source_day
  ON steps_logs (user_id, local_date, coalesce(source, ''));

CREATE INDEX IF NOT EXISTS steps_logs_user_date_idx
  ON steps_logs (user_id, local_date);

COMMIT;
