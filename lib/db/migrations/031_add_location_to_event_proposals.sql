-- Migration: Add location to event_proposals
--
-- Freeform location text ("campsite 14B, gravel lot past the ranger
-- station", "123 Main St", "Zoom") for an event. Deliberately not a
-- structured address/lat-lng — most events here don't need geocoding, and
-- keeping it freeform keeps the model event-type-agnostic.

ALTER TABLE event_proposals
  ADD COLUMN location VARCHAR(255);
