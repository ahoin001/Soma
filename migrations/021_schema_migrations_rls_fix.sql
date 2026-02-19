BEGIN;

-- Supabase migration metadata should not require RLS policies.
-- Keeping this table unrestricted avoids advisor noise and prevents accidental lockouts.
ALTER TABLE IF EXISTS public.schema_migrations DISABLE ROW LEVEL SECURITY;

COMMIT;
