BEGIN;

-- Fix legacy trigger function: local_date is a DATE, not text.
CREATE OR REPLACE FUNCTION public.recalc_daily_nutrition_summary()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid;
  v_date date;
BEGIN
  IF TG_OP = 'DELETE' THEN
    SELECT user_id, local_date INTO v_user_id, v_date
    FROM meal_entries WHERE id = OLD.meal_entry_id;
  ELSE
    SELECT user_id, local_date INTO v_user_id, v_date
    FROM meal_entries WHERE id = NEW.meal_entry_id;
  END IF;

  IF v_user_id IS NULL OR v_date IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  INSERT INTO daily_nutrition_summary (user_id, local_date, eaten_kcal, carbs_g, protein_g, fat_g)
  SELECT
    v_user_id,
    v_date,
    ROUND(COALESCE(SUM(mei.kcal), 0)),
    ROUND(COALESCE(SUM(mei.carbs_g), 0), 1),
    ROUND(COALESCE(SUM(mei.protein_g), 0), 1),
    ROUND(COALESCE(SUM(mei.fat_g), 0), 1)
  FROM meal_entries me
  JOIN meal_entry_items mei ON mei.meal_entry_id = me.id
  WHERE me.user_id = v_user_id AND me.local_date = v_date
  ON CONFLICT (user_id, local_date) DO UPDATE SET
    eaten_kcal = EXCLUDED.eaten_kcal,
    carbs_g = EXCLUDED.carbs_g,
    protein_g = EXCLUDED.protein_g,
    fat_g = EXCLUDED.fat_g,
    updated_at = now();

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- Remove user-owned foods linked to legacy users first.
-- These cannot survive user deletion because foods_owner_check requires creator for non-global rows.
DELETE FROM public.foods f
WHERE COALESCE(f.is_global, false) = false
  AND f.created_by_user_id IN (
    SELECT u.id
    FROM public.users u
    LEFT JOIN auth.users a ON a.id = u.id
    WHERE a.id IS NULL
  );

-- Remove legacy public.users rows that do not have a matching auth.users account.
-- This also cascades orphaned user-owned rows through existing FK ON DELETE CASCADE links.
DELETE FROM public.users u
WHERE NOT EXISTS (
  SELECT 1
  FROM auth.users a
  WHERE a.id = u.id
);

-- Ensure every auth.users row has a matching public.users mirror row.
INSERT INTO public.users (id, email, auth_provider, created_at, updated_at)
SELECT
  a.id,
  a.email,
  COALESCE(a.raw_app_meta_data->>'provider', 'email'),
  COALESCE(a.created_at, now()),
  COALESCE(a.updated_at, now())
FROM auth.users a
LEFT JOIN public.users u ON u.id = a.id
WHERE u.id IS NULL;

-- Keep mirrored fields synchronized for all linked rows.
UPDATE public.users u
SET
  email = a.email,
  auth_provider = COALESCE(a.raw_app_meta_data->>'provider', u.auth_provider, 'email'),
  updated_at = now()
FROM auth.users a
WHERE a.id = u.id
  AND (
    u.email IS DISTINCT FROM a.email
    OR u.auth_provider IS DISTINCT FROM COALESCE(a.raw_app_meta_data->>'provider', u.auth_provider, 'email')
  );

-- Enforce direct relation from public.users to auth.users so deletes stay consistent.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_id_auth_fk'
      AND conrelid = 'public.users'::regclass
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_id_auth_fk
      FOREIGN KEY (id)
      REFERENCES auth.users(id)
      ON DELETE CASCADE;
  END IF;
END $$;

COMMIT;
