-- Row Level Security (RLS) for Supabase.
-- Run after 001-018 schema migrations and 017 (auth sync). Enables auth.uid() so PostgREST/Supabase client
-- only returns each user's data. Apply via Supabase Dashboard SQL Editor or: supabase db push
--
-- Prerequisite: Supabase Auth in use; public.users synced with auth.users via handle_new_auth_user trigger.

BEGIN;

-- ─── public.users (synced from auth.users) ─────────────────────────────────────
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read own user row" ON public.users;
CREATE POLICY "Users can read own user row"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

-- ─── user_profiles ────────────────────────────────────────────────────────────
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own profile" ON public.user_profiles;
CREATE POLICY "Users can manage own profile"
  ON public.user_profiles FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── user_preferences ─────────────────────────────────────────────────────────
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own preferences" ON public.user_preferences;
CREATE POLICY "Users can manage own preferences"
  ON public.user_preferences FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── user_nutrition_settings ──────────────────────────────────────────────────
ALTER TABLE public.user_nutrition_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own nutrition settings" ON public.user_nutrition_settings;
CREATE POLICY "Users can manage own nutrition settings"
  ON public.user_nutrition_settings FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── user_activity_goals ──────────────────────────────────────────────────────
ALTER TABLE public.user_activity_goals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own activity goals" ON public.user_activity_goals;
CREATE POLICY "Users can manage own activity goals"
  ON public.user_activity_goals FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── foods (global readable, user can CRUD own) ────────────────────────────────
ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read global and own foods" ON public.foods;
CREATE POLICY "Users can read global and own foods"
  ON public.foods FOR SELECT
  USING (is_global = true OR created_by_user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert own foods" ON public.foods;
CREATE POLICY "Users can insert own foods"
  ON public.foods FOR INSERT
  WITH CHECK (created_by_user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own foods" ON public.foods;
CREATE POLICY "Users can update own foods"
  ON public.foods FOR UPDATE
  USING (created_by_user_id = auth.uid())
  WITH CHECK (created_by_user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete own foods" ON public.foods;
CREATE POLICY "Users can delete own foods"
  ON public.foods FOR DELETE
  USING (created_by_user_id = auth.uid());

-- ─── food_servings (via foods) ─────────────────────────────────────────────────
ALTER TABLE public.food_servings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage food_servings for accessible foods" ON public.food_servings;
CREATE POLICY "Users can manage food_servings for accessible foods"
  ON public.food_servings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.foods f
      WHERE f.id = food_servings.food_id
      AND (f.is_global = true OR f.created_by_user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.foods f
      WHERE f.id = food_servings.food_id
      AND f.created_by_user_id = auth.uid()
    )
  );

-- ─── user_food_overrides ──────────────────────────────────────────────────────
ALTER TABLE public.user_food_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own food overrides" ON public.user_food_overrides;
CREATE POLICY "Users can manage own food overrides"
  ON public.user_food_overrides FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── user_food_favorites ──────────────────────────────────────────────────────
ALTER TABLE public.user_food_favorites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own food favorites" ON public.user_food_favorites;
CREATE POLICY "Users can manage own food favorites"
  ON public.user_food_favorites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── user_food_history ────────────────────────────────────────────────────────
ALTER TABLE public.user_food_history ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own food history" ON public.user_food_history;
CREATE POLICY "Users can manage own food history"
  ON public.user_food_history FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── meal_types (global readable, user can CRUD own) ───────────────────────────
ALTER TABLE public.meal_types ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read global and own meal_types" ON public.meal_types;
CREATE POLICY "Users can read global and own meal_types"
  ON public.meal_types FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());
DROP POLICY IF EXISTS "Users can insert own meal_types" ON public.meal_types;
CREATE POLICY "Users can insert own meal_types"
  ON public.meal_types FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own meal_types" ON public.meal_types;
CREATE POLICY "Users can update own meal_types"
  ON public.meal_types FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete own meal_types" ON public.meal_types;
CREATE POLICY "Users can delete own meal_types"
  ON public.meal_types FOR DELETE
  USING (user_id = auth.uid());

-- ─── meal_entries ─────────────────────────────────────────────────────────────
ALTER TABLE public.meal_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own meal_entries" ON public.meal_entries;
CREATE POLICY "Users can manage own meal_entries"
  ON public.meal_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── meal_entry_items (via meal_entries) ───────────────────────────────────────
ALTER TABLE public.meal_entry_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own meal_entry_items" ON public.meal_entry_items;
CREATE POLICY "Users can manage own meal_entry_items"
  ON public.meal_entry_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_entries me
      WHERE me.id = meal_entry_items.meal_entry_id AND me.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_entries me
      WHERE me.id = meal_entry_items.meal_entry_id AND me.user_id = auth.uid()
    )
  );

-- ─── daily_nutrition_targets ───────────────────────────────────────────────────
ALTER TABLE public.daily_nutrition_targets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own daily_nutrition_targets" ON public.daily_nutrition_targets;
CREATE POLICY "Users can manage own daily_nutrition_targets"
  ON public.daily_nutrition_targets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── daily_nutrition_summary ───────────────────────────────────────────────────
ALTER TABLE public.daily_nutrition_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own daily_nutrition_summary" ON public.daily_nutrition_summary;
CREATE POLICY "Users can manage own daily_nutrition_summary"
  ON public.daily_nutrition_summary FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── exercises (read all, write only own custom) ───────────────────────────────
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read exercises" ON public.exercises;
CREATE POLICY "Authenticated can read exercises"
  ON public.exercises FOR SELECT
  USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can insert own custom exercises" ON public.exercises;
CREATE POLICY "Users can insert own custom exercises"
  ON public.exercises FOR INSERT
  WITH CHECK (created_by_user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own custom exercises" ON public.exercises;
CREATE POLICY "Users can update own custom exercises"
  ON public.exercises FOR UPDATE
  USING (created_by_user_id = auth.uid())
  WITH CHECK (created_by_user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete own custom exercises" ON public.exercises;
CREATE POLICY "Users can delete own custom exercises"
  ON public.exercises FOR DELETE
  USING (created_by_user_id = auth.uid());

-- ─── workout_plans ────────────────────────────────────────────────────────────
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own workout_plans" ON public.workout_plans;
CREATE POLICY "Users can manage own workout_plans"
  ON public.workout_plans FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── workout_templates (via workout_plans) ─────────────────────────────────────
ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own workout_templates" ON public.workout_templates;
CREATE POLICY "Users can manage own workout_templates"
  ON public.workout_templates FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = workout_templates.plan_id AND wp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_plans wp
      WHERE wp.id = workout_templates.plan_id AND wp.user_id = auth.uid()
    )
  );

-- ─── workout_template_exercises (via workout_templates) ────────────────────────
ALTER TABLE public.workout_template_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own workout_template_exercises" ON public.workout_template_exercises;
CREATE POLICY "Users can manage own workout_template_exercises"
  ON public.workout_template_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_templates wt
      JOIN public.workout_plans wp ON wp.id = wt.plan_id
      WHERE wt.id = workout_template_exercises.template_id AND wp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_templates wt
      JOIN public.workout_plans wp ON wp.id = wt.plan_id
      WHERE wt.id = workout_template_exercises.template_id AND wp.user_id = auth.uid()
    )
  );

-- ─── routines ─────────────────────────────────────────────────────────────────
ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own routines" ON public.routines;
CREATE POLICY "Users can manage own routines"
  ON public.routines FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── routine_exercises (via routines) ──────────────────────────────────────────
ALTER TABLE public.routine_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own routine_exercises" ON public.routine_exercises;
CREATE POLICY "Users can manage own routine_exercises"
  ON public.routine_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.routines r
      WHERE r.id = routine_exercises.routine_id AND r.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.routines r
      WHERE r.id = routine_exercises.routine_id AND r.user_id = auth.uid()
    )
  );

-- ─── workout_sessions ─────────────────────────────────────────────────────────
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own workout_sessions" ON public.workout_sessions;
CREATE POLICY "Users can manage own workout_sessions"
  ON public.workout_sessions FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── session_exercises (via workout_sessions) ──────────────────────────────────
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own session_exercises" ON public.session_exercises;
CREATE POLICY "Users can manage own session_exercises"
  ON public.session_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = session_exercises.session_id AND ws.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = session_exercises.session_id AND ws.user_id = auth.uid()
    )
  );

-- ─── session_sets (via session_exercises -> workout_sessions) ──────────────────
ALTER TABLE public.session_sets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own session_sets" ON public.session_sets;
CREATE POLICY "Users can manage own session_sets"
  ON public.session_sets FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.session_exercises se
      JOIN public.workout_sessions ws ON ws.id = se.session_id
      WHERE se.id = session_sets.session_exercise_id AND ws.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.session_exercises se
      JOIN public.workout_sessions ws ON ws.id = se.session_id
      WHERE se.id = session_sets.session_exercise_id AND ws.user_id = auth.uid()
    )
  );

-- ─── session_summary (via workout_sessions) ────────────────────────────────────
ALTER TABLE public.session_summary ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own session_summary" ON public.session_summary;
CREATE POLICY "Users can manage own session_summary"
  ON public.session_summary FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = session_summary.session_id AND ws.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.workout_sessions ws
      WHERE ws.id = session_summary.session_id AND ws.user_id = auth.uid()
    )
  );

-- ─── weight_logs ──────────────────────────────────────────────────────────────
ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own weight_logs" ON public.weight_logs;
CREATE POLICY "Users can manage own weight_logs"
  ON public.weight_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── water_logs ───────────────────────────────────────────────────────────────
ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own water_logs" ON public.water_logs;
CREATE POLICY "Users can manage own water_logs"
  ON public.water_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── steps_logs ───────────────────────────────────────────────────────────────
ALTER TABLE public.steps_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own steps_logs" ON public.steps_logs;
CREATE POLICY "Users can manage own steps_logs"
  ON public.steps_logs FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── grocery_bag_items ────────────────────────────────────────────────────────
ALTER TABLE public.grocery_bag_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own grocery_bag_items" ON public.grocery_bag_items;
CREATE POLICY "Users can manage own grocery_bag_items"
  ON public.grocery_bag_items FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── brands (read all, write own) ──────────────────────────────────────────────
ALTER TABLE public.brands ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated can read brands" ON public.brands;
CREATE POLICY "Authenticated can read brands"
  ON public.brands FOR SELECT
  USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can insert own brands" ON public.brands;
CREATE POLICY "Users can insert own brands"
  ON public.brands FOR INSERT
  WITH CHECK (created_by_user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own brands" ON public.brands;
CREATE POLICY "Users can update own brands"
  ON public.brands FOR UPDATE
  USING (created_by_user_id = auth.uid())
  WITH CHECK (created_by_user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete own brands" ON public.brands;
CREATE POLICY "Users can delete own brands"
  ON public.brands FOR DELETE
  USING (created_by_user_id = auth.uid());

-- ─── meal_plan_groups ─────────────────────────────────────────────────────────
ALTER TABLE public.meal_plan_groups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own meal_plan_groups" ON public.meal_plan_groups;
CREATE POLICY "Users can manage own meal_plan_groups"
  ON public.meal_plan_groups FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── meal_plan_days ───────────────────────────────────────────────────────────
ALTER TABLE public.meal_plan_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own meal_plan_days" ON public.meal_plan_days;
CREATE POLICY "Users can manage own meal_plan_days"
  ON public.meal_plan_days FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── meal_plan_meals (via meal_plan_days) ──────────────────────────────────────
ALTER TABLE public.meal_plan_meals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own meal_plan_meals" ON public.meal_plan_meals;
CREATE POLICY "Users can manage own meal_plan_meals"
  ON public.meal_plan_meals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plan_days mpd
      WHERE mpd.id = meal_plan_meals.day_id AND mpd.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_plan_days mpd
      WHERE mpd.id = meal_plan_meals.day_id AND mpd.user_id = auth.uid()
    )
  );

-- ─── meal_plan_items (via meal_plan_meals -> meal_plan_days) ───────────────────
ALTER TABLE public.meal_plan_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own meal_plan_items" ON public.meal_plan_items;
CREATE POLICY "Users can manage own meal_plan_items"
  ON public.meal_plan_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.meal_plan_meals mpm
      JOIN public.meal_plan_days mpd ON mpd.id = mpm.day_id
      WHERE mpm.id = meal_plan_items.meal_id AND mpd.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.meal_plan_meals mpm
      JOIN public.meal_plan_days mpd ON mpd.id = mpm.day_id
      WHERE mpm.id = meal_plan_items.meal_id AND mpd.user_id = auth.uid()
    )
  );

-- ─── meal_plan_week_assignments ────────────────────────────────────────────────
ALTER TABLE public.meal_plan_week_assignments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own meal_plan_week_assignments" ON public.meal_plan_week_assignments;
CREATE POLICY "Users can manage own meal_plan_week_assignments"
  ON public.meal_plan_week_assignments FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── meal_plan_target_presets ──────────────────────────────────────────────────
ALTER TABLE public.meal_plan_target_presets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own meal_plan_target_presets" ON public.meal_plan_target_presets;
CREATE POLICY "Users can manage own meal_plan_target_presets"
  ON public.meal_plan_target_presets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── exercise_media (user_id nullable for global; all can read, only own for write) ─
ALTER TABLE public.exercise_media ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read exercise_media" ON public.exercise_media;
CREATE POLICY "Users can read exercise_media"
  ON public.exercise_media FOR SELECT
  USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Users can insert own exercise_media" ON public.exercise_media;
CREATE POLICY "Users can insert own exercise_media"
  ON public.exercise_media FOR INSERT
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can update own exercise_media" ON public.exercise_media;
CREATE POLICY "Users can update own exercise_media"
  ON public.exercise_media FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Users can delete own exercise_media" ON public.exercise_media;
CREATE POLICY "Users can delete own exercise_media"
  ON public.exercise_media FOR DELETE
  USING (user_id = auth.uid());

-- ─── exercise_overrides ───────────────────────────────────────────────────────
ALTER TABLE public.exercise_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own exercise_overrides" ON public.exercise_overrides;
CREATE POLICY "Users can manage own exercise_overrides"
  ON public.exercise_overrides FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── exercise_stats_daily ──────────────────────────────────────────────────────
ALTER TABLE public.exercise_stats_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own exercise_stats_daily" ON public.exercise_stats_daily;
CREATE POLICY "Users can manage own exercise_stats_daily"
  ON public.exercise_stats_daily FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── muscle_stats_daily ────────────────────────────────────────────────────────
ALTER TABLE public.muscle_stats_daily ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own muscle_stats_daily" ON public.muscle_stats_daily;
CREATE POLICY "Users can manage own muscle_stats_daily"
  ON public.muscle_stats_daily FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── body_measurements ─────────────────────────────────────────────────────────
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own body_measurements" ON public.body_measurements;
CREATE POLICY "Users can manage own body_measurements"
  ON public.body_measurements FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ─── progress_photos ──────────────────────────────────────────────────────────
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own progress_photos" ON public.progress_photos;
CREATE POLICY "Users can manage own progress_photos"
  ON public.progress_photos FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMIT;
