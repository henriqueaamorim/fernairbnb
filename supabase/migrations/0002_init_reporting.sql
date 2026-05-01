create table if not exists public.consolidated_reservations (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.import_sessions(id) on delete cascade,
  unit_id text not null,
  unit_name text not null,
  platform text not null,
  start_date date,
  end_date date,
  confirmation_code text,
  nights numeric(10,2) not null default 0,
  booking_value numeric(12,2) not null default 0,
  status text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.session_totals (
  session_id uuid primary key references public.import_sessions(id) on delete cascade,
  habitat_fee_percent numeric(5,2) not null default 20,
  subtotal numeric(12,2) not null default 0,
  habitat_fee_value numeric(12,2) not null default 0,
  net_value numeric(12,2) not null default 0,
  updated_at timestamptz not null default now()
);

create index if not exists idx_consolidated_session on public.consolidated_reservations(session_id);
create index if not exists idx_consolidated_unit on public.consolidated_reservations(session_id, unit_id);
