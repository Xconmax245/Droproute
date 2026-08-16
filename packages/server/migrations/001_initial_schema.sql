-- DropRoute database schema
-- Run this in the Supabase SQL editor

create table apps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scheme text not null,
  created_at timestamptz not null default now()
);

create table referral_links (
  code text primary key,
  app_id uuid not null references apps(id) on delete cascade,
  source text not null,
  campaign text,
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  app_id uuid not null references apps(id) on delete cascade,
  referral_code text references referral_links(code) on delete set null,
  event_name text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Indexes for dashboard query performance
create index events_app_id_idx on events(app_id);
create index events_referral_code_idx on events(referral_code);
create index events_created_at_idx on events(created_at desc);
create index referral_links_app_id_idx on referral_links(app_id);
