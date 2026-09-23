-- Story 13.4: Customizable Widget Layout
-- Per-group (not per-user) layout state for the Dashboard's 5 widgets:
-- position and visibility, one row per (group, widget). Any group member
-- may reorder/hide via the "Customize layout" entry point on the Dashboard;
-- changes are shared, not per-viewer preferences.
-- No FK from group_dashboard_widgets to a "widgets" catalog table -- the
-- widget set is small and fixed (checklist/timeline/logistics/photos/polls),
-- enforced instead with a CHECK constraint, matching how event_logistics_items
-- constrains its 'category' column.
-- Surrogate id + UNIQUE(group_id, widget_key) (rather than a bare composite
-- PK), plus created_at/updated_at, matches the closest structural analog,
-- event_poll_votes (021) -- also a composite-natural-key join table.

CREATE TABLE IF NOT EXISTS group_dashboard_widgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  widget_key VARCHAR(20) NOT NULL CHECK (widget_key IN ('photos', 'checklist', 'timeline', 'logistics', 'polls')),
  position INT NOT NULL CHECK (position BETWEEN 1 AND 5),
  visible BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE(group_id, widget_key)
);

-- No separate index on group_id: it's already the leading column of the
-- UNIQUE(group_id, widget_key) constraint's index, which already serves
-- `WHERE group_id = $1`.

ALTER TABLE group_dashboard_widgets ENABLE ROW LEVEL SECURITY;

-- Backfill every existing (non-deleted) group with today's hardcoded
-- EventPlanningTab render order, all visible. New groups created after this
-- migration simply have no rows yet -- dashboardWidgetsService.getWidgetLayout
-- falls back to this same default order/visibility for those.
INSERT INTO group_dashboard_widgets (group_id, widget_key, position, visible)
SELECT g.id, w.widget_key, w.position, true
FROM groups g
CROSS JOIN (
  VALUES
    ('photos', 1),
    ('checklist', 2),
    ('timeline', 3),
    ('logistics', 4),
    ('polls', 5)
) AS w(widget_key, position)
WHERE g.deleted_at IS NULL
ON CONFLICT (group_id, widget_key) DO NOTHING;
