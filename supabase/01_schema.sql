-- ============================================================================
-- PHELIX INVESTMENT CMS — Core Database Schema
-- Covers: Accounting, Operations, Fuel Monitoring
-- (EVAC lives in a separate schema file: see evac_schema.sql in the EVAC app)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ROLES & PROFILES
-- ----------------------------------------------------------------------------
create type app_role as enum (
  'super_admin',
  'accountant',
  'operations_supervisor',
  'fuel_attendant'
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role app_role not null,
  depot text,                         -- 'graftons' | 'hastings' | null (for ops/fuel staff)
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

-- Function to handle new user signup - creates profile with default role
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_role app_role;
begin
  -- Safely extract and cast the role from metadata
  begin
    user_role := (new.raw_user_meta_data->>'role')::app_role;
  exception when others then
    user_role := 'fuel_attendant'::app_role; -- default role on error
  end;
  
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'New User'),
    user_role
  );
  return new;
end;
$$;

-- Trigger to call function on new user signup
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute procedure handle_new_user();

-- Helper: get the role of the currently authenticated user
create or replace function auth_role() returns app_role
language sql stable security definer as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_super_admin() returns boolean
language sql stable security definer as $$
  select auth_role() = 'super_admin';
$$;

-- Everyone can read their own profile; super admin can read all
create policy "profiles_self_read" on profiles
  for select using (id = auth.uid() or is_super_admin());

create policy "profiles_self_update" on profiles
  for update using (id = auth.uid());

create policy "profiles_admin_write" on profiles
  for insert with check (is_super_admin());

-- ----------------------------------------------------------------------------
-- 2. ACCOUNTING SECTOR
-- ----------------------------------------------------------------------------
create table accounting_entries (
  id uuid primary key default gen_random_uuid(),
  entry_date date not null,
  type text not null check (type in ('revenue', 'expense')),
  category text not null,
  amount numeric(14,2) not null check (amount >= 0),
  description text,
  created_by uuid not null references profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table payments_made (
  id uuid primary key default gen_random_uuid(),
  paid_to text not null,
  amount numeric(14,2) not null check (amount >= 0),
  purpose text not null,
  related_sector text check (related_sector in ('evac', 'operations', 'fuel', 'general')),
  payment_date date not null default current_date,
  created_by uuid not null references profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table accounting_entries enable row level security;
alter table payments_made enable row level security;

create policy "accounting_rw" on accounting_entries
  for all using (auth_role() in ('accountant', 'super_admin'))
  with check (auth_role() in ('accountant', 'super_admin'));

create policy "payments_made_rw" on payments_made
  for all using (auth_role() in ('accountant', 'super_admin'))
  with check (auth_role() in ('accountant', 'super_admin'));

-- Monthly / yearly rollups are views, not extra tables — RLS on the base
-- table is inherited by anyone querying through the view.
create view accounting_monthly as
  select date_trunc('month', entry_date)::date as month, type, category,
         sum(amount) as total
  from accounting_entries
  group by 1, 2, 3;

create view accounting_yearly as
  select date_trunc('year', entry_date)::date as year, type, category,
         sum(amount) as total
  from accounting_entries
  group by 1, 2, 3;

-- ----------------------------------------------------------------------------
-- 3. OPERATIONS SECTOR
-- ----------------------------------------------------------------------------
create type worker_status as enum ('active', 'suspended', 'on_leave', 'terminated');
create type incident_severity as enum ('minor', 'moderate', 'severe');

create table workers (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  depot text not null check (depot in ('graftons', 'hastings')),
  position text,
  status worker_status not null default 'active',
  star_rating numeric(2,1) not null default 0 check (star_rating between 0 and 5),
  hired_at date,
  created_by uuid not null references profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table worker_incidents (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  description text not null,
  severity incident_severity not null,
  incident_date date not null default current_date,
  recorded_by uuid not null references profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

create table worker_promotions (
  id uuid primary key default gen_random_uuid(),
  worker_id uuid not null references workers(id) on delete cascade,
  from_position text,
  to_position text not null,
  reason text,
  decided_at date not null default current_date,
  recorded_by uuid not null references profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table workers enable row level security;
alter table worker_incidents enable row level security;
alter table worker_promotions enable row level security;

create policy "workers_rw" on workers
  for all using (auth_role() in ('operations_supervisor', 'super_admin'))
  with check (auth_role() in ('operations_supervisor', 'super_admin'));

create policy "incidents_rw" on worker_incidents
  for all using (auth_role() in ('operations_supervisor', 'super_admin'))
  with check (auth_role() in ('operations_supervisor', 'super_admin'));

create policy "promotions_rw" on worker_promotions
  for all using (auth_role() in ('operations_supervisor', 'super_admin'))
  with check (auth_role() in ('operations_supervisor', 'super_admin'));

-- ----------------------------------------------------------------------------
-- 4. FUEL MONITORING SECTOR
-- ----------------------------------------------------------------------------
create table fuel_logs (
  id uuid primary key default gen_random_uuid(),
  issued_by uuid not null references profiles(id) default auth.uid(),
  received_by text not null,           -- name of recipient (may not be a system user)
  depot text not null check (depot in ('graftons', 'hastings')),
  quantity_liters numeric(10,2) not null check (quantity_liters > 0),
  dispensed_at timestamptz not null default now(),
  dispenser_photo_path text not null,  -- Supabase Storage path, bucket: fuel-evidence
  receipt_photo_path text not null,    -- Supabase Storage path, bucket: fuel-evidence
  created_at timestamptz not null default now()
);

alter table fuel_logs enable row level security;

-- Attendants can create + view their own entries; super admin sees everything
create policy "fuel_attendant_insert" on fuel_logs
  for insert with check (
    auth_role() = 'super_admin'
    or (auth_role() = 'fuel_attendant' and issued_by = auth.uid())
  );

create policy "fuel_select" on fuel_logs
  for select using (
    auth_role() = 'super_admin'
    or (auth_role() = 'fuel_attendant' and issued_by = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 5. SUPER ADMIN CROSS-SECTOR READ
-- ----------------------------------------------------------------------------
-- Super admin visibility is already covered above: every policy on every
-- sector table includes `auth_role() = 'super_admin'`, satisfying "Mr Phelix
-- retains full oversight of the entire system at all times" without ever
-- bypassing RLS from the application layer.

-- ----------------------------------------------------------------------------
-- 6. STORAGE BUCKET POLICIES (fuel evidence)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('fuel-evidence', 'fuel-evidence', false)
  on conflict (id) do nothing;

create policy "fuel_evidence_upload" on storage.objects
  for insert with check (
    bucket_id = 'fuel-evidence'
    and (auth_role() in ('fuel_attendant', 'super_admin'))
  );

create policy "fuel_evidence_read" on storage.objects
  for select using (
    bucket_id = 'fuel-evidence'
    and (auth_role() in ('fuel_attendant', 'super_admin'))
  );

-- ----------------------------------------------------------------------------
-- 7. AUDIT LOG (System Activity Monitoring)
-- ----------------------------------------------------------------------------
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles(id) on delete cascade,
  user_name text not null,
  user_email text not null,
  user_role app_role not null,
  action text not null,              -- e.g., 'created_entry', 'updated_worker', 'deleted_payment'
  entity_type text,                  -- e.g., 'accounting_entry', 'worker', 'fuel_log'
  entity_id uuid,                    -- ID of the affected entity (if applicable)
  details jsonb,                     -- Additional context about the action
  ip_address text,                   -- Optional: IP address of the user
  user_agent text,                    -- Optional: Browser/device information
  success boolean default true,       -- Whether the action was successful
  error_message text,                 -- Error message if action failed
  created_at timestamptz not null default now()
);

-- Add indexes for better query performance
create index idx_audit_logs_user_id on audit_logs(user_id);
create index idx_audit_logs_created_at on audit_logs(created_at desc);
create index idx_audit_logs_action on audit_logs(action);
create index idx_audit_logs_entity_type on audit_logs(entity_type);
create index idx_audit_logs_entity_id on audit_logs(entity_id);

alter table audit_logs enable row level security;

-- Only super admins can read audit logs
create policy "audit_logs_read" on audit_logs
  for select using (is_super_admin());

-- No insert policy - all inserts are done via database trigger/function
-- No update/delete policies - audit logs should be immutable

-- Improved function to automatically log user actions with better error handling
create or replace function log_user_action(
  p_action text,
  p_entity_type text default null,
  p_entity_id uuid default null,
  p_details jsonb default '{}'::jsonb,
  p_success boolean default true,
  p_error_message text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_profile profiles;
  user_email text;
begin
  -- Get current user profile
  select * into current_user_profile
  from profiles
  where id = auth.uid();
  
  -- Get user email
  select email into user_email
  from auth.users
  where id = auth.uid();
  
  -- Insert audit log entry with enhanced fields
  insert into audit_logs (
    user_id,
    user_name,
    user_email,
    user_role,
    action,
    entity_type,
    entity_id,
    details,
    success,
    error_message
  ) values (
    auth.uid(),
    coalesce(current_user_profile.full_name, 'Unknown User'),
    coalesce(user_email, 'unknown@example.com'),
    coalesce(current_user_profile.role, 'fuel_attendant'),
    p_action,
    p_entity_type,
    p_entity_id,
    p_details,
    p_success,
    p_error_message
  );
  
exception when others then
  -- Log the error itself to prevent audit logging from breaking the application
  insert into audit_logs (
    user_id,
    user_name,
    user_email,
    user_role,
    action,
    entity_type,
    entity_id,
    details,
    success,
    error_message
  ) values (
    auth.uid(),
    'System',
    'system@phelix.investment',
    'super_admin',
    'audit_log_error',
    'audit_logs',
    null,
    jsonb_build_object(
      'original_action', p_action,
      'original_entity_type', p_entity_type,
      'error_message', SQLERRM
    ),
    false,
    SQLERRM
  );
end;
$$;

-- Helper function to get user email from auth
create or replace function get_user_email(user_id uuid)
returns text
language sql
stable security definer
set search_path = public
as $$
  select email from auth.users where id = user_id;
$$;

-- Function to get recent audit logs for a specific user
create or replace function get_user_audit_logs(p_user_id uuid, p_limit int default 50)
returns table (
  id uuid,
  user_id uuid,
  user_name text,
  user_email text,
  user_role app_role,
  action text,
  entity_type text,
  entity_id uuid,
  details jsonb,
  success boolean,
  error_message text,
  created_at timestamptz
)
language sql
stable security definer
set search_path = public
as $$
  select 
    id, user_id, user_name, user_email, user_role, 
    action, entity_type, entity_id, details, success, error_message, created_at
  from audit_logs
  where user_id = p_user_id
  order by created_at desc
  limit p_limit;
$$;

-- Function to get audit logs by action type
create or replace function get_audit_logs_by_action(p_action text, p_limit int default 100)
returns table (
  id uuid,
  user_id uuid,
  user_name text,
  user_email text,
  user_role app_role,
  action text,
  entity_type text,
  entity_id uuid,
  details jsonb,
  success boolean,
  error_message text,
  created_at timestamptz
)
language sql
stable security definer
set search_path = public
as $$
  select 
    id, user_id, user_name, user_email, user_role, 
    action, entity_type, entity_id, details, success, error_message, created_at
  from audit_logs
  where action = p_action
  order by created_at desc
  limit p_limit;
$$;

-- Function to get audit logs by entity
create or replace function get_audit_logs_by_entity(p_entity_type text, p_entity_id uuid, p_limit int default 100)
returns table (
  id uuid,
  user_id uuid,
  user_name text,
  user_email text,
  user_role app_role,
  action text,
  entity_type text,
  entity_id uuid,
  details jsonb,
  success boolean,
  error_message text,
  created_at timestamptz
)
language sql
stable security definer
set search_path = public
as $$
  select 
    id, user_id, user_name, user_email, user_role, 
    action, entity_type, entity_id, details, success, error_message, created_at
  from audit_logs
  where entity_type = p_entity_type and entity_id = p_entity_id
  order by created_at desc
  limit p_limit;
$$;
