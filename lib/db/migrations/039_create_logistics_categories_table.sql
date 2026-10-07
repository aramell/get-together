-- Story 14.6: Configurable Logistics Categories and Labels
-- Per-group logistics categories. A group with no rows uses the built-in
-- defaults (bring/single, carpool/seats) defined in
-- lib/logistics/defaultCategories.ts. `mode` ('single' | 'seats') and label
-- length are validated in application code, so no CHECK constraints. No backfill.

CREATE TABLE IF NOT EXISTS logistics_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  category_key VARCHAR(50) NOT NULL,
  label VARCHAR(50) NOT NULL,
  mode VARCHAR(10) NOT NULL,
  position INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(group_id, category_key)
);

-- group_id leads the UNIQUE(group_id, category_key) index, which serves
-- `WHERE group_id = $1`.

ALTER TABLE logistics_categories ENABLE ROW LEVEL SECURITY;

-- event_logistics_items.category now holds a category key validated in
-- application code. Drop the category IN ('bring','carpool') CHECK and
-- carpool_requires_capacity (capacity rules now follow the category mode).
-- Constraint names are looked up rather than assumed (same pattern as 036).
DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'event_logistics_items'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%category%'
  LOOP
    EXECUTE format('ALTER TABLE event_logistics_items DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

ALTER TABLE event_logistics_items ALTER COLUMN category TYPE VARCHAR(50);
