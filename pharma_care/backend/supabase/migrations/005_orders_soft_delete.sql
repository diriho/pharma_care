-- Pharma Core — Migration 005: soft delete for medication orders
-- Run this in the Supabase SQL editor AFTER 004_soft_delete.sql.
--
-- Unlike messages/notifications (single owner, one deleted_at column), a
-- medication_orders row has two participants (patient_user_id and
-- pharmacy_user_id). Deletion must be independent per side — a patient
-- clearing an order from their history must not remove the pharmacy's copy,
-- and vice versa — so this uses two columns instead of one.
-- API queries filter their own side's column `is null`, so a row deleted by
-- one participant simply keeps showing up for the other.
--
-- No RLS changes are needed: the existing "orders_participants" policy
-- already allows UPDATE access to either participant.

alter table medication_orders add column if not exists patient_deleted_at timestamptz;
alter table medication_orders add column if not exists pharmacy_deleted_at timestamptz;
