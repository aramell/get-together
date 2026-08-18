-- Migration: Fix uuid/varchar type mismatch on Cognito-sub reference columns
--
-- 000_create_groups_schema.sql (and 005/008/009) declared user-reference
-- columns as UUID before the users table existed. 013_create_users_table.sql
-- later made users.id VARCHAR(128) (Cognito sub is not guaranteed to be a
-- valid uuid). Any query joining these columns to users.id fails with
-- "operator does not exist: uuid = character varying". Bring the columns
-- that are actually joined to users.id in line with that type.

ALTER TABLE group_memberships ALTER COLUMN user_id TYPE VARCHAR(128) USING user_id::text;
ALTER TABLE availabilities ALTER COLUMN user_id TYPE VARCHAR(128) USING user_id::text;
ALTER TABLE wishlist_items ALTER COLUMN created_by TYPE VARCHAR(128) USING created_by::text;
ALTER TABLE event_comments ALTER COLUMN created_by TYPE VARCHAR(128) USING created_by::text;
ALTER TABLE wishlist_comments ALTER COLUMN created_by TYPE VARCHAR(128) USING created_by::text;
