-- Pharma Core — Migration 004: soft delete for messages & notifications
-- Run this in the Supabase SQL editor AFTER 003_realtime_messaging.sql.
--
-- Deletions are soft (deleted_at) rather than hard DELETEs on purpose:
--   * Supabase Realtime authorizes INSERT/UPDATE events against RLS, but DELETE
--     events cannot be RLS-checked (the row no longer exists), so hard deletes
--     would not propagate reliably to the other participant's open client.
--     Soft deletes ride the same UPDATE events the app already subscribes to.
--   * A healthcare messaging trail should be recoverable/auditable rather than
--     destroyed.
-- API queries filter `deleted_at is null`, so deleted rows never reach clients.
--
-- No RLS changes are needed: the existing "messages_participants" policy only
-- lets the sender pass WITH CHECK on updates, and "own_notifications" already
-- restricts notifications to their owner.

alter table messages add column if not exists deleted_at timestamptz;
alter table notifications add column if not exists deleted_at timestamptz;
