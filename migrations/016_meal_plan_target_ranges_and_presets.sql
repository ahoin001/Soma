-- Target ranges: optional min/max per macro (when null, single target_* is used)
ALTER TABLE meal_plan_days
  ADD COLUMN IF NOT EXISTS target_kcal_min numeric(10, 2),
  ADD COLUMN IF NOT EXISTS target_kcal_max numeric(10, 2),
  ADD COLUMN IF NOT EXISTS target_protein_g_min numeric(10, 2),
  ADD COLUMN IF NOT EXISTS target_protein_g_max numeric(10, 2),
  ADD COLUMN IF NOT EXISTS target_carbs_g_min numeric(10, 2),
  ADD COLUMN IF NOT EXISTS target_carbs_g_max numeric(10, 2),
  ADD COLUMN IF NOT EXISTS target_fat_g_min numeric(10, 2),
  ADD COLUMN IF NOT EXISTS target_fat_g_max numeric(10, 2);

-- Target presets: reusable named target sets (single + optional ranges)
CREATE TABLE IF NOT EXISTS meal_plan_target_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  target_kcal numeric(10, 2) NOT NULL DEFAULT 0,
  target_protein_g numeric(10, 2) NOT NULL DEFAULT 0,
  target_carbs_g numeric(10, 2) NOT NULL DEFAULT 0,
  target_fat_g numeric(10, 2) NOT NULL DEFAULT 0,
  target_kcal_min numeric(10, 2),
  target_kcal_max numeric(10, 2),
  target_protein_g_min numeric(10, 2),
  target_protein_g_max numeric(10, 2),
  target_carbs_g_min numeric(10, 2),
  target_carbs_g_max numeric(10, 2),
  target_fat_g_min numeric(10, 2),
  target_fat_g_max numeric(10, 2),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS meal_plan_target_presets_user_idx
  ON meal_plan_target_presets (user_id, sort_order ASC);
