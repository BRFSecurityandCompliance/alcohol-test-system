-- =====================================================
-- Alcohol Test System — Initial Schema
-- =====================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- =====================================================
-- LOCATIONS
-- =====================================================
create table locations (
  code        text primary key,
  name        text not null,
  address     text default '',
  contact     text default '',
  phone       text default '',
  created_at  timestamptz default now()
);

-- =====================================================
-- COMPANIES
-- =====================================================
create table companies (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null unique,
  created_at  timestamptz default now()
);

-- =====================================================
-- DEVICES
-- =====================================================
create table devices (
  id                uuid primary key default uuid_generate_v4(),
  serial            text not null unique,
  model             text not null,
  location_code     text references locations(code) on delete set null,
  last_calibrated   date,
  next_calibration  date,
  created_at        timestamptz default now()
);

-- =====================================================
-- ADMIN USERS
-- =====================================================
create table admin_users (
  id          uuid primary key default uuid_generate_v4(),
  username    text not null unique,
  name        text not null,
  email       text,
  role        text not null check (role in ('super','manager','viewer','auditor')),
  sites       jsonb default '"all"'::jsonb,  -- "all" or ["QR001","QR002"]
  created_at  timestamptz default now()
);

-- =====================================================
-- PERSONS (employee directory)
-- =====================================================
create table persons (
  id          uuid primary key default uuid_generate_v4(),
  employee_id text not null unique,
  full_name   text not null,
  department  text default '',
  company     text default '',
  plate_number text default '',
  phone       text default '',
  created_at  timestamptz default now()
);

-- =====================================================
-- TESTS
-- =====================================================
create table tests (
  id                  uuid primary key default uuid_generate_v4(),
  employee_id         text default '',
  full_name           text not null,
  department          text not null,
  plate_number        text default '',
  company             text not null,
  alcohol_value       numeric(6,2) not null default 0,
  is_zero             boolean not null default true,
  level               text not null default 'pass',  -- pass|caution|no-drive|illegal
  location_code       text not null references locations(code),
  location_name       text not null,
  photo_url           text default '',
  shift_id            text not null,                 -- morning|afternoon|night
  device_serial       text default '',
  operator_id         uuid references admin_users(id) on delete set null,
  signature_employee  text default '',
  retest_of           uuid references tests(id) on delete set null,
  retest_status       text check (retest_status in (null,'required','completed','failed')),
  action_taken        text check (action_taken in (null,'pending','sent-home','suspended','allowed')),
  action_note         text default '',
  action_by           uuid references admin_users(id) on delete set null,
  created_at          timestamptz default now()
);

-- Indexes for common queries
create index idx_tests_created_at    on tests(created_at desc);
create index idx_tests_location_code on tests(location_code);
create index idx_tests_is_zero       on tests(is_zero);
create index idx_tests_action_taken  on tests(action_taken);
create index idx_tests_full_name     on tests(full_name);
create index idx_tests_employee_id   on tests(employee_id);

-- =====================================================
-- WATCHLIST
-- =====================================================
create table watchlist (
  id          uuid primary key default uuid_generate_v4(),
  full_name   text not null,
  employee_id text default '',
  reason      text not null,
  added_at    timestamptz default now()
);

-- =====================================================
-- ALERT CHANNELS
-- =====================================================
create table alert_channels (
  id          uuid primary key default uuid_generate_v4(),
  kind        text not null check (kind in ('line','email','webhook')),
  label       text not null,
  target      text not null,
  enabled     boolean default true,
  created_at  timestamptz default now()
);

-- =====================================================
-- AUDIT LOG
-- =====================================================
create table audit_log (
  id          uuid primary key default uuid_generate_v4(),
  actor_id    uuid references admin_users(id) on delete set null,
  actor_name  text not null,
  action      text not null,
  target      text default '',
  detail      text default '',
  created_at  timestamptz default now()
);

create index idx_audit_created_at on audit_log(created_at desc);

-- =====================================================
-- SETTINGS (single row)
-- =====================================================
create table settings (
  id                    int primary key default 1 check (id = 1),
  retest_minutes        int not null default 5,
  watchlist_threshold   int not null default 2,
  watchlist_window_days int not null default 30,
  language              text not null default 'th',
  updated_at            timestamptz default now()
);

insert into settings default values;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
alter table locations      enable row level security;
alter table companies      enable row level security;
alter table devices        enable row level security;
alter table admin_users    enable row level security;
alter table persons        enable row level security;
alter table tests          enable row level security;
alter table watchlist      enable row level security;
alter table alert_channels enable row level security;
alter table audit_log      enable row level security;
alter table settings       enable row level security;

-- Public read for user-facing form (locations, companies)
create policy "public_read_locations"  on locations      for select using (true);
create policy "public_read_companies"  on companies      for select using (true);
create policy "public_insert_tests"    on tests          for insert with check (true);

-- Anon can read settings (for retest_minutes countdown)
create policy "public_read_settings"   on settings       for select using (true);

-- Service role (backend/admin) full access
create policy "service_all_locations"  on locations      for all using (auth.role() = 'service_role');
create policy "service_all_companies"  on companies      for all using (auth.role() = 'service_role');
create policy "service_all_devices"    on devices        for all using (auth.role() = 'service_role');
create policy "service_all_users"      on admin_users    for all using (auth.role() = 'service_role');
create policy "service_all_persons"    on persons        for all using (auth.role() = 'service_role');
create policy "service_all_tests"      on tests          for all using (auth.role() = 'service_role');
create policy "service_all_watchlist"  on watchlist      for all using (auth.role() = 'service_role');
create policy "service_all_channels"   on alert_channels for all using (auth.role() = 'service_role');
create policy "service_all_audit"      on audit_log      for all using (auth.role() = 'service_role');
create policy "service_all_settings"   on settings       for all using (auth.role() = 'service_role');
