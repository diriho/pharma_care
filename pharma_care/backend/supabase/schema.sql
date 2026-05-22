-- Pharma Core — Supabase schema
-- Run this in your Supabase SQL editor before starting the backend.
-- Each row is scoped to a pharmacy (user_id = auth.uid()).

-- ============== Tables ==============

create table if not exists pharmacy_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  address text not null,
  commune text not null,
  province text not null,
  phone text not null,
  currency text not null default 'FBU',
  nif text,
  rc text,
  expiry_alert_months integer not null default 6,
  low_stock_alert_level integer not null default 15,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  contact_name text,
  phone text,
  email text,
  address text,
  categories text[] default '{}',
  created_at timestamptz not null default now()
);
create index if not exists suppliers_user_idx on suppliers(user_id);

create table if not exists medicines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  dosage text,
  molecule text,
  category text,
  stock integer not null default 0,
  min_stock_level integer not null default 10,
  purchase_price numeric not null default 0,
  selling_price numeric not null default 0,
  batch_number text,
  expiry_date date,
  shelf_location text,
  supplier_id uuid references suppliers(id) on delete set null,
  description text,
  created_at timestamptz not null default now()
);
create index if not exists medicines_user_idx on medicines(user_id);

create table if not exists patients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  full_name text not null,
  phone text,
  email text,
  date_of_birth date,
  gender text,
  address text,
  allergies text,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists patients_user_idx on patients(user_id);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  patient_id uuid references patients(id) on delete set null,
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  payment_method text default 'cash',
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists sales_user_idx on sales(user_id);

create table if not exists restock_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  items jsonb not null default '[]'::jsonb,
  total numeric not null default 0,
  status text not null default 'pending',
  expected_at date,
  received_at timestamptz,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists restock_user_idx on restock_orders(user_id);

create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null,
  message text not null,
  meta jsonb default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on notifications(user_id);

-- ============== Stock RPCs ==============

create or replace function decrement_medicine_stock(
  p_medicine_id uuid,
  p_quantity integer,
  p_user uuid
) returns void language sql as $$
  update medicines
     set stock = greatest(stock - p_quantity, 0)
   where id = p_medicine_id and user_id = p_user;
$$;

create or replace function increment_medicine_stock(
  p_medicine_id uuid,
  p_quantity integer,
  p_user uuid
) returns void language sql as $$
  update medicines
     set stock = stock + p_quantity
   where id = p_medicine_id and user_id = p_user;
$$;

-- ============== RLS ==============

alter table pharmacy_settings enable row level security;
alter table suppliers enable row level security;
alter table medicines enable row level security;
alter table patients enable row level security;
alter table sales enable row level security;
alter table restock_orders enable row level security;
alter table notifications enable row level security;

do $$ begin
  create policy "own_settings" on pharmacy_settings
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own_suppliers" on suppliers
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own_medicines" on medicines
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own_patients" on patients
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own_sales" on sales
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own_restock" on restock_orders
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own_notifications" on notifications
    using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
