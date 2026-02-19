BEGIN;

-- Performance indexes for high-frequency user-scoped reads.
CREATE INDEX IF NOT EXISTS user_food_history_user_last_logged_idx
  ON public.user_food_history (user_id, last_logged_at DESC);

CREATE INDEX IF NOT EXISTS user_food_favorites_user_created_idx
  ON public.user_food_favorites (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS grocery_bag_items_user_created_idx
  ON public.grocery_bag_items (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS meal_plan_groups_user_sort_idx
  ON public.meal_plan_groups (user_id, sort_order);

CREATE INDEX IF NOT EXISTS meal_plan_days_user_updated_idx
  ON public.meal_plan_days (user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS meal_plan_items_meal_sort_idx
  ON public.meal_plan_items (meal_id, sort_order);

CREATE INDEX IF NOT EXISTS meal_plan_target_presets_user_sort_idx
  ON public.meal_plan_target_presets (user_id, sort_order);

CREATE INDEX IF NOT EXISTS workout_plans_user_sort_active_idx
  ON public.workout_plans (user_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS workout_templates_plan_sort_active_idx
  ON public.workout_templates (plan_id, sort_order)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS water_logs_user_logged_idx
  ON public.water_logs (user_id, logged_at DESC);

CREATE INDEX IF NOT EXISTS steps_logs_user_logged_idx
  ON public.steps_logs (user_id, logged_at DESC);

-- Realtime publication additions for all UI subscriptions.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'user_food_favorites',
    'steps_logs',
    'water_logs',
    'user_activity_goals',
    'grocery_bag_items',
    'meal_plan_groups',
    'meal_plan_days',
    'meal_plan_meals',
    'meal_plan_items',
    'meal_plan_week_assignments',
    'meal_plan_target_presets',
    'workout_plans',
    'workout_templates',
    'workout_template_exercises'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE n.nspname = 'public' AND c.relname = t
    ) AND NOT EXISTS (
      SELECT 1
      FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = t
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
    END IF;
  END LOOP;
END $$;

COMMIT;
