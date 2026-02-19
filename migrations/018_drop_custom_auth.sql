-- Drop custom auth tables after migrating users to auth.users and switching to Supabase Auth.
-- Run ONLY after:
--   1. Migration 017 (auth sync trigger) is applied
--   2. All existing users have been migrated to auth.users (same id as public.users)
--   3. Frontend/backend are updated to use Supabase Auth

BEGIN;

-- Remove custom auth tables (Supabase Auth replaces these)
DROP TABLE IF EXISTS user_password_reset_tokens;
DROP TABLE IF EXISTS user_email_verification_tokens;
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS user_auth_local;

COMMIT;
