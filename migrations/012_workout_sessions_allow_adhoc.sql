-- Allow workout_sessions without routine_id or template_id (ad-hoc sessions started
-- from a plan workout with just exercise names; session_exercises are still inserted).
ALTER TABLE workout_sessions
  DROP CONSTRAINT IF EXISTS workout_sessions_source_check;
