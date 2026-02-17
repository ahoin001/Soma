-- Journal: body measurements and progress photos (Physique pillar).
-- Fixed measurement types for simple queries and charting.

DO $$ BEGIN
  CREATE TYPE journal_measurement_type AS ENUM (
    'body_weight',
    'neck',
    'shoulders',
    'chest',
    'left_bicep',
    'right_bicep',
    'left_forearm',
    'right_forearm',
    'waist',
    'hips',
    'left_thigh',
    'right_thigh',
    'left_calf',
    'right_calf'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS body_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  measurement_type journal_measurement_type NOT NULL,
  value numeric(8, 2) NOT NULL,
  unit text NOT NULL DEFAULT 'cm',
  logged_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS body_measurements_user_type_logged_idx
  ON body_measurements (user_id, measurement_type, logged_at DESC);

CREATE INDEX IF NOT EXISTS body_measurements_user_logged_idx
  ON body_measurements (user_id, logged_at DESC);

CREATE TABLE IF NOT EXISTS progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  taken_at timestamptz NOT NULL DEFAULT now(),
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS progress_photos_user_taken_idx
  ON progress_photos (user_id, taken_at DESC);
