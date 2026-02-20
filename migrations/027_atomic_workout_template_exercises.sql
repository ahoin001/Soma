BEGIN;

CREATE OR REPLACE FUNCTION public.update_workout_template_exercises_atomic(
  p_template_id uuid,
  p_exercises jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_name text;
  v_item_order int;
BEGIN
  DELETE FROM public.workout_template_exercises
  WHERE template_id = p_template_id;

  IF p_exercises IS NULL OR jsonb_typeof(p_exercises) <> 'array' THEN
    RETURN;
  END IF;

  FOR item IN SELECT value FROM jsonb_array_elements(p_exercises)
  LOOP
    v_name := btrim(COALESCE(item->>'name', ''));
    v_item_order := COALESCE((item->>'itemOrder')::int, 0);

    IF v_name <> '' THEN
      INSERT INTO public.workout_template_exercises (
        template_id,
        exercise_name,
        item_order
      )
      VALUES (
        p_template_id,
        v_name,
        v_item_order
      );
    END IF;
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_workout_template_exercises_atomic(uuid, jsonb) TO authenticated;

COMMIT;
