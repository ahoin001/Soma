BEGIN;

CREATE TABLE IF NOT EXISTS grocery_bag_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name text NOT NULL,
  bucket text NOT NULL CHECK (bucket IN ('staples', 'rotation', 'special')),
  macro_group text,
  category text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS grocery_bag_unique_idx
  ON grocery_bag_items (user_id, lower(name), bucket);

CREATE INDEX IF NOT EXISTS grocery_bag_user_idx
  ON grocery_bag_items (user_id, bucket, created_at DESC);

COMMIT;
