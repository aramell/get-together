-- Defense in depth for Supabase: this app never uses Supabase's Data API or
-- Supabase Auth. It connects directly to Postgres as the table owner via
-- lib/db/client.ts, which RLS does not restrict (owners bypass RLS unless
-- FORCE ROW LEVEL SECURITY is set, which is intentionally NOT used here).
--
-- Enabling RLS with zero policies denies all access to every other role,
-- including the anon/authenticated roles Supabase's REST Data API uses to
-- reach tables in the public schema. If the Data API is ever turned on for
-- this project, these tables stay unreachable through it by default.

ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE availabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE wishlist_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public_rsvps ENABLE ROW LEVEL SECURITY;
ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
