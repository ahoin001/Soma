BEGIN;

-- Commonly tracked micronutrients (dieting / nutrition apps):
-- fiber, sugars, sodium/potassium, cholesterol, sat/trans fat, and key vitamins/minerals.
ALTER TABLE public.foods
  ADD COLUMN IF NOT EXISTS fiber_g numeric(10,2),
  ADD COLUMN IF NOT EXISTS sugar_g numeric(10,2),
  ADD COLUMN IF NOT EXISTS added_sugar_g numeric(10,2),
  ADD COLUMN IF NOT EXISTS sodium_mg numeric(10,2),
  ADD COLUMN IF NOT EXISTS potassium_mg numeric(10,2),
  ADD COLUMN IF NOT EXISTS cholesterol_mg numeric(10,2),
  ADD COLUMN IF NOT EXISTS saturated_fat_g numeric(10,2),
  ADD COLUMN IF NOT EXISTS trans_fat_g numeric(10,2),
  ADD COLUMN IF NOT EXISTS calcium_mg numeric(10,2),
  ADD COLUMN IF NOT EXISTS iron_mg numeric(10,2),
  ADD COLUMN IF NOT EXISTS magnesium_mg numeric(10,2),
  ADD COLUMN IF NOT EXISTS zinc_mg numeric(10,2),
  ADD COLUMN IF NOT EXISTS vitamin_d_mcg numeric(10,2),
  ADD COLUMN IF NOT EXISTS vitamin_c_mg numeric(10,2),
  ADD COLUMN IF NOT EXISTS vitamin_a_mcg numeric(10,2),
  ADD COLUMN IF NOT EXISTS vitamin_b12_mcg numeric(10,2),
  ADD COLUMN IF NOT EXISTS folate_mcg numeric(10,2),
  ADD COLUMN IF NOT EXISTS omega3_g numeric(10,2),
  ADD COLUMN IF NOT EXISTS omega6_g numeric(10,2);

ALTER TABLE public.meal_entry_items
  ADD COLUMN IF NOT EXISTS fiber_g numeric(10,2),
  ADD COLUMN IF NOT EXISTS sugar_g numeric(10,2),
  ADD COLUMN IF NOT EXISTS added_sugar_g numeric(10,2),
  ADD COLUMN IF NOT EXISTS sodium_mg numeric(10,2),
  ADD COLUMN IF NOT EXISTS potassium_mg numeric(10,2),
  ADD COLUMN IF NOT EXISTS cholesterol_mg numeric(10,2),
  ADD COLUMN IF NOT EXISTS saturated_fat_g numeric(10,2),
  ADD COLUMN IF NOT EXISTS trans_fat_g numeric(10,2),
  ADD COLUMN IF NOT EXISTS calcium_mg numeric(10,2),
  ADD COLUMN IF NOT EXISTS iron_mg numeric(10,2),
  ADD COLUMN IF NOT EXISTS magnesium_mg numeric(10,2),
  ADD COLUMN IF NOT EXISTS zinc_mg numeric(10,2),
  ADD COLUMN IF NOT EXISTS vitamin_d_mcg numeric(10,2),
  ADD COLUMN IF NOT EXISTS vitamin_c_mg numeric(10,2),
  ADD COLUMN IF NOT EXISTS vitamin_a_mcg numeric(10,2),
  ADD COLUMN IF NOT EXISTS vitamin_b12_mcg numeric(10,2),
  ADD COLUMN IF NOT EXISTS folate_mcg numeric(10,2),
  ADD COLUMN IF NOT EXISTS omega3_g numeric(10,2),
  ADD COLUMN IF NOT EXISTS omega6_g numeric(10,2);

CREATE OR REPLACE FUNCTION public.safe_to_numeric(value_text text)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
  IF value_text IS NULL OR btrim(value_text) = '' THEN
    RETURN NULL;
  END IF;
  RETURN value_text::numeric;
EXCEPTION
  WHEN others THEN
    RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_micro_columns_from_jsonb()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.fiber_g := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'fiber_g'),
    public.safe_to_numeric(NEW.micronutrients->>'fiber'),
    public.safe_to_numeric(NEW.micronutrients->>'dietary_fiber_g'),
    public.safe_to_numeric(NEW.micronutrients->>'dietary_fiber'),
    NEW.fiber_g
  );
  NEW.sugar_g := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'sugar_g'),
    public.safe_to_numeric(NEW.micronutrients->>'sugar'),
    public.safe_to_numeric(NEW.micronutrients->>'total_sugar_g'),
    public.safe_to_numeric(NEW.micronutrients->>'total_sugar'),
    NEW.sugar_g
  );
  NEW.added_sugar_g := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'added_sugar_g'),
    public.safe_to_numeric(NEW.micronutrients->>'added_sugar'),
    NEW.added_sugar_g
  );
  NEW.sodium_mg := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'sodium_mg'),
    public.safe_to_numeric(NEW.micronutrients->>'sodium'),
    NEW.sodium_mg
  );
  NEW.potassium_mg := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'potassium_mg'),
    public.safe_to_numeric(NEW.micronutrients->>'potassium'),
    NEW.potassium_mg
  );
  NEW.cholesterol_mg := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'cholesterol_mg'),
    public.safe_to_numeric(NEW.micronutrients->>'cholesterol'),
    NEW.cholesterol_mg
  );
  NEW.saturated_fat_g := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'saturated_fat_g'),
    public.safe_to_numeric(NEW.micronutrients->>'saturated_fat'),
    NEW.saturated_fat_g
  );
  NEW.trans_fat_g := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'trans_fat_g'),
    public.safe_to_numeric(NEW.micronutrients->>'trans_fat'),
    NEW.trans_fat_g
  );
  NEW.calcium_mg := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'calcium_mg'),
    public.safe_to_numeric(NEW.micronutrients->>'calcium'),
    NEW.calcium_mg
  );
  NEW.iron_mg := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'iron_mg'),
    public.safe_to_numeric(NEW.micronutrients->>'iron'),
    NEW.iron_mg
  );
  NEW.magnesium_mg := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'magnesium_mg'),
    public.safe_to_numeric(NEW.micronutrients->>'magnesium'),
    NEW.magnesium_mg
  );
  NEW.zinc_mg := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'zinc_mg'),
    public.safe_to_numeric(NEW.micronutrients->>'zinc'),
    NEW.zinc_mg
  );
  NEW.vitamin_d_mcg := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'vitamin_d_mcg'),
    public.safe_to_numeric(NEW.micronutrients->>'vitamin_d'),
    NEW.vitamin_d_mcg
  );
  NEW.vitamin_c_mg := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'vitamin_c_mg'),
    public.safe_to_numeric(NEW.micronutrients->>'vitamin_c'),
    NEW.vitamin_c_mg
  );
  NEW.vitamin_a_mcg := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'vitamin_a_mcg'),
    public.safe_to_numeric(NEW.micronutrients->>'vitamin_a'),
    NEW.vitamin_a_mcg
  );
  NEW.vitamin_b12_mcg := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'vitamin_b12_mcg'),
    public.safe_to_numeric(NEW.micronutrients->>'vitamin_b12'),
    NEW.vitamin_b12_mcg
  );
  NEW.folate_mcg := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'folate_mcg'),
    public.safe_to_numeric(NEW.micronutrients->>'folate'),
    NEW.folate_mcg
  );
  NEW.omega3_g := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'omega3_g'),
    public.safe_to_numeric(NEW.micronutrients->>'omega3'),
    NEW.omega3_g
  );
  NEW.omega6_g := COALESCE(
    public.safe_to_numeric(NEW.micronutrients->>'omega6_g'),
    public.safe_to_numeric(NEW.micronutrients->>'omega6'),
    NEW.omega6_g
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS foods_sync_micro_columns_tg ON public.foods;
CREATE TRIGGER foods_sync_micro_columns_tg
BEFORE INSERT OR UPDATE OF micronutrients
ON public.foods
FOR EACH ROW
EXECUTE FUNCTION public.sync_micro_columns_from_jsonb();

DROP TRIGGER IF EXISTS meal_entry_items_sync_micro_columns_tg ON public.meal_entry_items;
CREATE TRIGGER meal_entry_items_sync_micro_columns_tg
BEFORE INSERT OR UPDATE OF micronutrients
ON public.meal_entry_items
FOR EACH ROW
EXECUTE FUNCTION public.sync_micro_columns_from_jsonb();

-- Backfill existing rows.
UPDATE public.foods SET micronutrients = micronutrients;
UPDATE public.meal_entry_items SET micronutrients = micronutrients;

COMMIT;
