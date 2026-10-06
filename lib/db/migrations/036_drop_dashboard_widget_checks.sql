-- Story 14.1: Widget Registry
-- The widget set now comes from a code registry (lib/dashboard/widgetRegistry.ts)
-- and widget_key / position are validated in application code, so new widget
-- types and layouts with more than 5 entries need no schema change.
-- Drops the two CHECK constraints from migration 033. Constraint names are
-- looked up rather than assumed, so this is safe whatever Postgres named them.

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'group_dashboard_widgets'::regclass
      AND contype = 'c'
      AND (
        pg_get_constraintdef(oid) ILIKE '%widget_key%'
        OR pg_get_constraintdef(oid) ILIKE '%position%'
      )
  LOOP
    EXECUTE format('ALTER TABLE group_dashboard_widgets DROP CONSTRAINT %I', c.conname);
  END LOOP;
END $$;

-- widget_key was VARCHAR(20); registry keys may be longer.
ALTER TABLE group_dashboard_widgets ALTER COLUMN widget_key TYPE VARCHAR(50);
