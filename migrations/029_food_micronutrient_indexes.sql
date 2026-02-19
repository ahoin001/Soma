BEGIN;

-- Practical indexes for micronutrient-focused food filtering/sorting.
-- These primarily help search/discovery flows when users filter by badge-like traits.
CREATE INDEX IF NOT EXISTS foods_fiber_g_idx
  ON public.foods (fiber_g)
  WHERE fiber_g IS NOT NULL;

CREATE INDEX IF NOT EXISTS foods_sodium_mg_idx
  ON public.foods (sodium_mg)
  WHERE sodium_mg IS NOT NULL;

CREATE INDEX IF NOT EXISTS foods_potassium_mg_idx
  ON public.foods (potassium_mg)
  WHERE potassium_mg IS NOT NULL;

CREATE INDEX IF NOT EXISTS foods_added_sugar_g_idx
  ON public.foods (added_sugar_g)
  WHERE added_sugar_g IS NOT NULL;

CREATE INDEX IF NOT EXISTS foods_cholesterol_mg_idx
  ON public.foods (cholesterol_mg)
  WHERE cholesterol_mg IS NOT NULL;

CREATE INDEX IF NOT EXISTS foods_saturated_fat_g_idx
  ON public.foods (saturated_fat_g)
  WHERE saturated_fat_g IS NOT NULL;

COMMIT;
