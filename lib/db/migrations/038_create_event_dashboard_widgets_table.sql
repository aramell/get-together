-- Story 14.5: Per-Event Layout
-- Per-event override of the group's dashboard widget layout. Same shape as
-- group_dashboard_widgets (033/036) plus event_id. An event has rows here only
-- once it has been customized; layout resolves event override, then group
-- default, then system default. No backfill. Widget keys and positions are
-- validated in application code (widget registry), so no CHECK constraints.

CREATE TABLE IF NOT EXISTS event_dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES event_proposals(id) ON DELETE CASCADE,
  widget_key VARCHAR(50) NOT NULL,
  position INT NOT NULL,
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(event_id, widget_key)
);

-- event_id leads the UNIQUE(event_id, widget_key) index, which serves
-- `WHERE event_id = $1`.

ALTER TABLE event_dashboard_widgets ENABLE ROW LEVEL SECURITY;
