-- Supabase Auth sync: when a user is created in auth.users, ensure public.users has a matching row.
-- Run this AFTER data import. Keeps public.users.id = auth.users.id for all users.
-- All existing FKs (REFERENCES users(id)) continue to work without changes.

-- Function: insert or update public.users when auth.users gets a new row
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
  RETURN NEW;
END;
$$;

-- Trigger: after insert on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE PROCEDURE public.handle_new_auth_user();

-- Optional: ensure public.users.id can reference auth.users for integrity
-- Only run if you want a FK; requires auth.users to already have all users.
-- ALTER TABLE public.users
--   DROP CONSTRAINT IF EXISTS users_pkey,
--   ADD PRIMARY KEY (id),
--   ADD CONSTRAINT users_id_auth_fk FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
