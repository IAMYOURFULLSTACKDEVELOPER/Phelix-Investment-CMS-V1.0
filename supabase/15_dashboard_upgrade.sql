-- ============================================================================
-- PHELIX INVESTMENT CMS — 15. Dashboard upgrade
--  * Payment status columns (from 14, never applied)
--  * Online presence (profiles.last_seen_at) for "active users / officers"
--  * Auto-generated barcode numbers for evacuation records
--  * Multiple containers per truck (truck_group_id, container_type, container_size)
--  * Daily per-shipping-line evacuation quotas, enforced in the database
--  * Super admin statistics RPCs (evacuations, shipping lines, active officers/users)
--  * Realtime publication for live dashboards
-- Safe to re-run.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 1. Payment status columns
-- ----------------------------------------------------------------------------
alter table public.evacuation_records add column if not exists payment_status text;
alter table public.evacuation_records add column if not exists payment_date timestamptz;
alter table public.evacuation_records add column if not exists payment_confirmed_by uuid references public.profiles(id) on delete set null;
alter table public.evacuation_records add column if not exists payment_notes text;

alter table public.evacuation_records drop constraint if exists evacuation_records_payment_status_check;
alter table public.evacuation_records add constraint evacuation_records_payment_status_check
  check (payment_status is null or payment_status in ('paid', 'not_paid'));

-- ----------------------------------------------------------------------------
-- 2. Multiple containers per truck + auto barcode
-- ----------------------------------------------------------------------------
alter table public.evacuation_records add column if not exists truck_group_id uuid;
alter table public.evacuation_records add column if not exists container_type text;
alter table public.evacuation_records add column if not exists container_size text;

alter table public.evacuation_records drop constraint if exists evacuation_records_container_type_check;
alter table public.evacuation_records add constraint evacuation_records_container_type_check
  check (container_type is null or container_type in ('Tank', 'FlatTrack', 'OpenTop', 'Reefer', 'HC', 'General'));

alter table public.evacuation_records drop constraint if exists evacuation_records_container_size_check;
alter table public.evacuation_records add constraint evacuation_records_container_size_check
  check (container_size is null or container_size in ('20DV', '40HC', 'LG51', '40DV'));

create index if not exists idx_evacuation_records_truck_group on public.evacuation_records(truck_group_id);
create index if not exists idx_evacuation_records_processed_at on public.evacuation_records(processed_at desc);
create index if not exists idx_evacuation_payment_status on public.evacuation_records(payment_status);

create sequence if not exists public.evacuation_barcode_seq;

update public.evacuation_records
set barcode_number = 'PHX' || to_char(processed_at, 'YYYYMMDD') || lpad(nextval('public.evacuation_barcode_seq')::text, 6, '0')
where barcode_number is null or barcode_number !~ '^PHX[0-9]{14}$';

create or replace function public.assign_evacuation_barcode()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.barcode_number := 'PHX' || to_char(now(), 'YYYYMMDD') || lpad(nextval('public.evacuation_barcode_seq')::text, 6, '0');
  elsif new.barcode_number is distinct from old.barcode_number then
    new.barcode_number := old.barcode_number;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_assign_evacuation_barcode on public.evacuation_records;
create trigger trigger_assign_evacuation_barcode
  before insert or update on public.evacuation_records
  for each row execute function public.assign_evacuation_barcode();

create unique index if not exists evacuation_records_barcode_number_key on public.evacuation_records(barcode_number);

-- ----------------------------------------------------------------------------
-- 3. Daily evacuation quotas per shipping line
-- ----------------------------------------------------------------------------
alter table public.evacuation_quotas add column if not exists quota_date date not null default current_date;
alter table public.evacuation_quotas add column if not exists set_by uuid references public.profiles(id) on delete set null;

alter table public.evacuation_quotas drop constraint if exists evacuation_quotas_line_date_key;
alter table public.evacuation_quotas add constraint evacuation_quotas_line_date_key unique (shipping_line, quota_date);

alter table public.evacuation_quotas drop constraint if exists evacuation_quotas_total_nonneg;
alter table public.evacuation_quotas add constraint evacuation_quotas_total_nonneg check (total_evacuations >= 0);

drop policy if exists "Super admins can view evacuation quotas" on public.evacuation_quotas;
drop policy if exists "Super admins can insert evacuation quotas" on public.evacuation_quotas;
drop policy if exists "Super admins can update evacuation quotas" on public.evacuation_quotas;
drop policy if exists "Service role can update evacuation quotas" on public.evacuation_quotas;
drop policy if exists evacuation_quotas_read on public.evacuation_quotas;
drop policy if exists evacuation_quotas_admin_write on public.evacuation_quotas;

create policy evacuation_quotas_read on public.evacuation_quotas
  for select to authenticated
  using (auth_role() in ('super_admin', 'evacuation_officer'));

create policy evacuation_quotas_admin_write on public.evacuation_quotas
  for all to authenticated
  using (is_super_admin())
  with check (is_super_admin());

-- Super admin sets (or raises) the quota for a shipping line on a given day.
create or replace function public.set_evacuation_quota(p_shipping_line text, p_total integer, p_date date default current_date)
returns public.evacuation_quotas
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.evacuation_quotas;
begin
  if not is_super_admin() then
    raise exception 'Only the Super Admin can set evacuation quotas';
  end if;
  if p_total is null or p_total < 0 then
    raise exception 'Quota must be zero or more';
  end if;

  insert into public.evacuation_quotas (shipping_line, quota_date, total_evacuations, current_evacuations, set_by)
  values (
    p_shipping_line,
    p_date,
    p_total,
    (select count(*) from public.evacuation_records er
      where er.shipping_line = p_shipping_line and er.processed_at::date = p_date),
    auth.uid()
  )
  on conflict (shipping_line, quota_date)
  do update set total_evacuations = excluded.total_evacuations, set_by = excluded.set_by, updated_at = now()
  returning * into result;

  return result;
end;
$$;

-- Blocks an evacuation when today's quota for its shipping line is used up,
-- otherwise counts it against the quota. Runs in the same transaction as the insert.
create or replace function public.enforce_evacuation_quota()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q public.evacuation_quotas;
begin
  if new.shipping_line is null then
    return new;
  end if;

  select * into q
  from public.evacuation_quotas
  where shipping_line = new.shipping_line
    and quota_date = coalesce(new.processed_at, now())::date
  for update;

  if not found then
    return new;
  end if;

  if q.current_evacuations >= q.total_evacuations then
    raise exception 'QUOTA_REACHED: The daily evacuation quota for % has been reached (% of %). You cannot process any more evacuation documents for this shipping line unless the Super Admin increases the quota.',
      new.shipping_line, q.current_evacuations, q.total_evacuations
      using errcode = 'P0001';
  end if;

  update public.evacuation_quotas
  set current_evacuations = current_evacuations + 1
  where id = q.id;

  return new;
end;
$$;

drop trigger if exists trigger_enforce_evacuation_quota on public.evacuation_records;
create trigger trigger_enforce_evacuation_quota
  before insert on public.evacuation_records
  for each row execute function public.enforce_evacuation_quota();

-- Quota counting moved to enforce_evacuation_quota; keep only the activity tracking here.
create or replace function public.track_evacuation_activity()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  officer_name text;
begin
  select full_name into officer_name from profiles where id = new.processed_by;

  insert into evacuation_tracking (day_of_week, officer_id, officer_name, shipping_line, amount_done, record_date)
  values (
    trim(to_char(new.processed_at, 'Day')),
    new.processed_by,
    coalesce(officer_name, 'Unknown'),
    coalesce(new.shipping_line, 'Unknown'),
    1,
    new.processed_at::date
  );

  return new;
end;
$$;

-- ----------------------------------------------------------------------------
-- 4. Online presence
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists last_seen_at timestamptz;

create or replace function public.touch_last_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set last_seen_at = now() where id = auth.uid();
$$;

create or replace function public.mark_offline()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set last_seen_at = null where id = auth.uid();
$$;

-- Approved users seen in the last 3 minutes (the app pings every minute).
create or replace function public.get_active_users()
returns table (user_id uuid, full_name text, email text, role app_role, last_seen_at timestamptz)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not is_super_admin() then
    raise exception 'Only the Super Admin can view active users';
  end if;

  return query
  select p.id, p.full_name, au.email::text, p.role, p.last_seen_at
  from public.profiles p
  join auth.users au on au.id = p.id
  where p.last_seen_at > now() - interval '3 minutes'
    and coalesce(p.verification_status, 'approved') = 'approved'
    and p.is_active
  order by p.role, p.full_name;
end;
$$;

-- ----------------------------------------------------------------------------
-- 5. Evacuation statistics for the Super Admin
-- ----------------------------------------------------------------------------
drop function if exists public.get_evacuation_statistics();
drop function if exists public.get_active_officers();
drop function if exists public.get_evacuation_by_shipping_line();
drop function if exists public.get_recent_evacuations(int);

create or replace function public.get_evacuation_statistics()
returns table (
  total_evacuations bigint,
  today_evacuations bigint,
  week_evacuations bigint,
  month_evacuations bigint,
  active_officers bigint,
  total_weight numeric,
  unique_containers bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_super_admin() then
    raise exception 'Only the Super Admin can view evacuation statistics';
  end if;

  return query
  select
    (select count(*) from evacuation_records),
    (select count(*) from evacuation_records where processed_at >= date_trunc('day', now())),
    (select count(*) from evacuation_records where processed_at >= date_trunc('week', now())),
    (select count(*) from evacuation_records where processed_at >= date_trunc('month', now())),
    (select count(*) from profiles
      where role = 'evacuation_officer'
        and last_seen_at > now() - interval '3 minutes'
        and coalesce(verification_status, 'approved') = 'approved'
        and is_active),
    (select coalesce(sum(container_weight), 0) from evacuation_records),
    (select count(distinct container_number) from evacuation_records);
end;
$$;

-- Evacuation officers currently online, with their counts.
create or replace function public.get_active_officers()
returns table (
  officer_id uuid,
  officer_name text,
  officer_email text,
  today_evacuations bigint,
  total_evacuations bigint,
  last_evacuation_time timestamptz,
  last_seen_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if not is_super_admin() then
    raise exception 'Only the Super Admin can view active officers';
  end if;

  return query
  select
    p.id,
    p.full_name,
    au.email::text,
    count(er.id) filter (where er.processed_at >= date_trunc('day', now())),
    count(er.id),
    max(er.processed_at),
    p.last_seen_at
  from profiles p
  join auth.users au on au.id = p.id
  left join evacuation_records er on er.processed_by = p.id
  where p.role = 'evacuation_officer'
    and p.last_seen_at > now() - interval '3 minutes'
    and coalesce(p.verification_status, 'approved') = 'approved'
    and p.is_active
  group by p.id, p.full_name, au.email, p.last_seen_at
  order by p.full_name;
end;
$$;

-- One row per shipping line (always all five), with today's quota.
create or replace function public.get_evacuation_by_shipping_line()
returns table (
  shipping_line text,
  total_evacuations bigint,
  today_evacuations bigint,
  week_evacuations bigint,
  month_evacuations bigint,
  total_weight numeric,
  today_quota integer,
  today_remaining integer
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not is_super_admin() then
    raise exception 'Only the Super Admin can view shipping line statistics';
  end if;

  return query
  select
    l.name,
    count(er.id),
    count(er.id) filter (where er.processed_at >= date_trunc('day', now())),
    count(er.id) filter (where er.processed_at >= date_trunc('week', now())),
    count(er.id) filter (where er.processed_at >= date_trunc('month', now())),
    coalesce(sum(er.container_weight), 0),
    q.total_evacuations,
    case when q.id is null then null else greatest(q.total_evacuations - q.current_evacuations, 0) end
  from (values (1, 'CMA CGM'), (2, 'Grimaldi'), (3, 'MAERSK LINE'), (4, 'HAPAG LLYOD'), (5, 'MSC')) as l(ord, name)
  left join evacuation_records er on er.shipping_line = l.name
  left join evacuation_quotas q on q.shipping_line = l.name and q.quota_date = current_date
  group by l.ord, l.name, q.id, q.total_evacuations, q.current_evacuations
  order by l.ord;
end;
$$;

grant execute on function public.set_evacuation_quota(text, integer, date) to authenticated;
grant execute on function public.touch_last_seen() to authenticated;
grant execute on function public.mark_offline() to authenticated;
grant execute on function public.get_active_users() to authenticated;
grant execute on function public.get_evacuation_statistics() to authenticated;
grant execute on function public.get_active_officers() to authenticated;
grant execute on function public.get_evacuation_by_shipping_line() to authenticated;

-- ----------------------------------------------------------------------------
-- 6. Realtime for live dashboards (RLS still applies to subscribers)
-- ----------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array['accounting_entries', 'payments_made', 'fuel_logs', 'evacuation_records', 'evacuation_quotas', 'evacuation_notifications', 'profiles', 'workers']
  loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

commit;
