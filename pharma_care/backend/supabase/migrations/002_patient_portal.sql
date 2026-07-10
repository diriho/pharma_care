-- Pharma Core — Migration 002: Patient Portal
-- Run this in the Supabase SQL editor AFTER schema.sql (001).
--
-- Why each table exists:
--   patient_profiles    — patients are auth users too; this stores their demographic
--                         profile (mirrors pharmacy_settings for the patient role).
--   pharmacy_ratings    — patient ratings/reviews of pharmacies (1–5 stars). Aggregates
--                         (rating_avg, rating_count) are denormalized onto
--                         pharmacy_settings for cheap directory listing.
--   medication_orders   — prescription orders placed by patients at a pharmacy, with a
--                         status workflow (pending → … → completed/cancelled) and an
--                         optional prescription file stored in the "prescriptions" bucket.
--   patient_medications — drug history per patient (medication, dosage, physician,
--                         dates, refills, status) shown on the Drug History page.
--   conversations       — one thread per (patient, pharmacy) pair for secure messaging.
--   messages            — messages inside a conversation; read_at powers unread badges.
--
-- The existing "notifications" table (001) is reused for both pharmacy notifications
-- (new rating received) and patient notifications (order status changes, replies).

-- ============== pharmacy_settings additions ==============
-- Directory metadata used by the patient portal listing.
alter table pharmacy_settings
  add column if not exists operating_hours jsonb not null default
    '{"mon":"08:00-20:00","tue":"08:00-20:00","wed":"08:00-20:00","thu":"08:00-20:00","fri":"08:00-20:00","sat":"09:00-18:00","sun":"09:00-13:00"}'::jsonb,
  add column if not exists rating_avg numeric not null default 0,
  add column if not exists rating_count integer not null default 0;

-- ============== patient_profiles ==============
create table if not exists patient_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  date_of_birth date,
  gender text,
  address text,
  allergies text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============== pharmacy_ratings ==============
create table if not exists pharmacy_ratings (
  id uuid primary key default gen_random_uuid(),
  pharmacy_user_id uuid not null references auth.users(id) on delete cascade,
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (pharmacy_user_id, patient_user_id)
);
create index if not exists pharmacy_ratings_pharmacy_idx on pharmacy_ratings(pharmacy_user_id);
create index if not exists pharmacy_ratings_patient_idx on pharmacy_ratings(patient_user_id);

-- ============== medication_orders ==============
create table if not exists medication_orders (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  pharmacy_user_id uuid not null references auth.users(id) on delete cascade,
  items jsonb not null default '[]'::jsonb,
  prescription_path text,
  status text not null default 'pending'
    check (status in ('pending','approved','preparing','ready_for_pickup','completed','cancelled')),
  total numeric not null default 0,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists medication_orders_patient_idx on medication_orders(patient_user_id);
create index if not exists medication_orders_pharmacy_idx on medication_orders(pharmacy_user_id);
create index if not exists medication_orders_status_idx on medication_orders(status);

-- ============== patient_medications (drug history) ==============
create table if not exists patient_medications (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  medication_name text not null,
  dosage text,
  physician text,
  start_date date,
  end_date date,
  refills integer not null default 0,
  status text not null default 'active' check (status in ('active','completed','stopped')),
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists patient_medications_patient_idx
  on patient_medications(patient_user_id, created_at desc);

-- ============== conversations & messages ==============
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  patient_user_id uuid not null references auth.users(id) on delete cascade,
  pharmacy_user_id uuid not null references auth.users(id) on delete cascade,
  subject text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (patient_user_id, pharmacy_user_id)
);
create index if not exists conversations_patient_idx on conversations(patient_user_id);
create index if not exists conversations_pharmacy_idx on conversations(pharmacy_user_id);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations(id) on delete cascade,
  sender_user_id uuid not null references auth.users(id) on delete cascade,
  body text not null,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists messages_conversation_idx on messages(conversation_id, created_at);

-- ============== fuzzy search support ==============
-- pg_trgm powers partial/fuzzy medicine search (ilike '%q%' stays index-assisted).
create extension if not exists pg_trgm;
create index if not exists medicines_name_trgm_idx on medicines using gin (name gin_trgm_ops);

-- ============== storage: prescriptions bucket ==============
-- Private bucket for uploaded doctor prescriptions; accessed via the backend
-- (service role), so no public storage policies are required.
insert into storage.buckets (id, name, public)
values ('prescriptions', 'prescriptions', false)
on conflict (id) do nothing;

-- ============== RLS ==============
-- All API traffic goes through the backend (service role), which scopes queries
-- manually. These policies are defense-in-depth for any direct client access.
alter table patient_profiles enable row level security;
alter table pharmacy_ratings enable row level security;
alter table medication_orders enable row level security;
alter table patient_medications enable row level security;
alter table conversations enable row level security;
alter table messages enable row level security;

do $$ begin
  create policy "own_patient_profile" on patient_profiles
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "ratings_participants" on pharmacy_ratings
    using (patient_user_id = auth.uid() or pharmacy_user_id = auth.uid())
    with check (patient_user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "orders_participants" on medication_orders
    using (patient_user_id = auth.uid() or pharmacy_user_id = auth.uid())
    with check (patient_user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own_medications" on patient_medications
    using (patient_user_id = auth.uid()) with check (patient_user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "conversations_participants" on conversations
    using (patient_user_id = auth.uid() or pharmacy_user_id = auth.uid())
    with check (patient_user_id = auth.uid() or pharmacy_user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "messages_participants" on messages
    using (
      exists (
        select 1 from conversations c
        where c.id = conversation_id
          and (c.patient_user_id = auth.uid() or c.pharmacy_user_id = auth.uid())
      )
    )
    with check (sender_user_id = auth.uid());
exception when duplicate_object then null; end $$;
