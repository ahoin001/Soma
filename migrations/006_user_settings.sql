BEGIN;

CREATE TABLE IF NOT EXISTS user_nutrition_settings (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  kcal_goal numeric(10, 2),
  carbs_g numeric(10, 2),
  protein_g numeric(10, 2),
  fat_g numeric(10, 2),
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;
