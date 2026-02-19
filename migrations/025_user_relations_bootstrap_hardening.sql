BEGIN;

CREATE OR REPLACE FUNCTION public.bootstrap_user_relations(
  p_user_id uuid,
  p_display_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_profiles (user_id, display_name)
  VALUES (
    p_user_id,
    COALESCE(NULLIF(trim(p_display_name), ''), 'You')
  )
  ON CONFLICT (user_id) DO UPDATE
  SET
    display_name = COALESCE(public.user_profiles.display_name, EXCLUDED.display_name),
    updated_at = now();

  INSERT INTO public.user_preferences (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_nutrition_settings (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_activity_goals (user_id)
  VALUES (p_user_id)
  ON CONFLICT (user_id) DO NOTHING;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_display_name text;
BEGIN
  INSERT INTO public.users (id, email, auth_provider, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_app_meta_data->>'provider', 'email'),
    COALESCE(NEW.created_at, now()),
    COALESCE(NEW.updated_at, now())
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    auth_provider = EXCLUDED.auth_provider,
    updated_at = now();

  v_display_name := COALESCE(
    NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'name', ''),
    CASE WHEN NEW.email IS NOT NULL THEN split_part(NEW.email, '@', 1) ELSE NULL END,
    'You'
  );

  PERFORM public.bootstrap_user_relations(NEW.id, v_display_name);

  RETURN NEW;
END;
$function$;

-- Backfill bootstrap defaults for any existing mirrored users.
INSERT INTO public.user_profiles (user_id, display_name)
SELECT
  u.id,
  COALESCE(
    NULLIF(split_part(COALESCE(u.email, ''), '@', 1), ''),
    'You'
  )
FROM public.users u
LEFT JOIN public.user_profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

INSERT INTO public.user_preferences (user_id)
SELECT u.id
FROM public.users u
LEFT JOIN public.user_preferences p ON p.user_id = u.id
WHERE p.user_id IS NULL;

INSERT INTO public.user_nutrition_settings (user_id)
SELECT u.id
FROM public.users u
LEFT JOIN public.user_nutrition_settings p ON p.user_id = u.id
WHERE p.user_id IS NULL;

INSERT INTO public.user_activity_goals (user_id)
SELECT u.id
FROM public.users u
LEFT JOIN public.user_activity_goals p ON p.user_id = u.id
WHERE p.user_id IS NULL;

COMMIT;
