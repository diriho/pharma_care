-- Pharma Core — Migration 003: Realtime messaging & notifications
-- Run this in the Supabase SQL editor AFTER 002_patient_portal.sql.
--
-- Adds the messaging tables to the `supabase_realtime` publication so the
-- frontend can subscribe to INSERT events instead of polling:
--   messages       — instant message delivery + unread counts in both portals
--   notifications  — instant unread badge updates in the patient portal
--
-- Realtime enforces the RLS policies defined in 001/002 per subscriber:
-- patients/pharmacies only receive rows they are allowed to SELECT
-- (messages: conversation participants; notifications: owner only).

do $$ begin
  alter publication supabase_realtime add table public.messages;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
