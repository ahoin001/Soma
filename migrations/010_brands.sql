BEGIN;

CREATE TABLE IF NOT EXISTS brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  normalized_name text GENERATED ALWAYS AS (lower(name)) STORED,
  is_verified boolean NOT NULL DEFAULT false,
  created_by_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  website_url text,
  logo_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS brands_normalized_name_idx
  ON brands (normalized_name);

ALTER TABLE foods
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES brands(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS foods_brand_id_idx
  ON foods (brand_id);

INSERT INTO brands (name, is_verified)
SELECT DISTINCT trim(brand), true
FROM foods
WHERE brand IS NOT NULL AND trim(brand) <> ''
ON CONFLICT (normalized_name) DO NOTHING;

UPDATE foods
SET brand_id = brands.id
FROM brands
WHERE foods.brand IS NOT NULL
  AND lower(foods.brand) = brands.normalized_name
  AND foods.brand_id IS NULL;

COMMIT;
