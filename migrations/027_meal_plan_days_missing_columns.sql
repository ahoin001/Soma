-- Add missing columns to meal_plan_days if your DB was created before 013/016.
-- Run this in Supabase Dashboard → SQL Editor if you get:
--   "Could not find the 'target_carbs_g_max' column of 'meal_plan_days' in the schema cache"

-- From 013: meal_plan_groups table (required for group_id FK)
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

-- From 013: group_id (optional link to a meal plan group)
ALTER TABLE meal_plan_days
  ADD COLUMN IF NOT EXISTS group_id uuid REFERENCES meal_plan_groups(id) ON DELETE SET NULL;

-- From 016: target range columns (min/max per macro)
ALTER TABLE meal_plan_days
  ADD COLUMN IF NOT EXISTS target_kcal_min numeric(10, 2),
  ADD COLUMN IF NOT EXISTS target_kcal_max numeric(10, 2),
  ADD COLUMN IF NOT EXISTS target_protein_g_min numeric(10, 2),
  ADD COLUMN IF NOT EXISTS target_protein_g_max numeric(10, 2),
  ADD COLUMN IF NOT EXISTS target_carbs_g_min numeric(10, 2),
  ADD COLUMN IF NOT EXISTS target_carbs_g_max numeric(10, 2),
  ADD COLUMN IF NOT EXISTS target_fat_g_min numeric(10, 2),
  ADD COLUMN IF NOT EXISTS target_fat_g_max numeric(10, 2);

-- Index for group_id (from 013) – safe if already exists
CREATE INDEX IF NOT EXISTS meal_plan_days_group_idx
  ON meal_plan_days (group_id)
  WHERE group_id IS NOT NULL;
