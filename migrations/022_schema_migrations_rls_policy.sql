BEGIN;

-- Keep RLS enabled on public table and add explicit policy to satisfy linter.
ALTER TABLE IF EXISTS public.schema_migrations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read schema_migrations" ON public.schema_migrations;
CREATE POLICY "Authenticated can read schema_migrations"
  ON public.schema_migrations
  FOR SELECT
  TO authenticated
  USING (true);

COMMIT;
