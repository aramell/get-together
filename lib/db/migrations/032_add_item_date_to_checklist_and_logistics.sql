-- Story 13.3: Date/Day Context on Checklist & Logistics Items
--
-- Optional, nullable item_date on both tables so a checklist/logistics item
-- can be pinned to a specific day of a multi-day trip. Plain absolute DATE,
-- not a day-N-of-trip offset (event_proposals has no end_date to offset
-- against). "Today" grouping is computed client-side per viewer against the
-- browser-local date — no timezone infra exists in this codebase.

ALTER TABLE event_checklist_items
  ADD COLUMN item_date DATE;

ALTER TABLE event_logistics_items
  ADD COLUMN item_date DATE;

CREATE INDEX IF NOT EXISTS idx_event_checklist_items_event_id_item_date
  ON event_checklist_items(event_id, item_date);

CREATE INDEX IF NOT EXISTS idx_event_logistics_items_event_id_item_date
  ON event_logistics_items(event_id, item_date);
