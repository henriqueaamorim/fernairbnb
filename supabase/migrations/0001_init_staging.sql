create extension if not exists "pgcrypto";

create table if not exists public.import_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '2 hours')
);

create table if not exists public.staging_reservations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.import_sessions(id) on delete cascade,
  platform text not null,
  unit_raw_name text not null,
  unit_id text not null,
  start_date date,
  end_date date,
  confirmation_code text,
  nights numeric(10,2) not null default 0,
  booking_value numeric(12,2) not null default 0,
  status text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_staging_session on public.staging_reservations(session_id);
create index if not exists idx_staging_unit on public.staging_reservations(session_id, unit_id);
