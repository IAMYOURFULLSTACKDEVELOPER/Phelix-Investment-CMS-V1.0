-- ============================================================================
-- PHELIX INVESTMENT CMS — Evacuation Dashboard Enhancements
-- Additional functions and views for Super Admin evacuation dashboard
-- ============================================================================
-- This script adds enhanced statistics and functions for the Super Admin's
-- evacuation dashboard to track all evacuation activities
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Function to get comprehensive evacuation statistics
-- ----------------------------------------------------------------------------
create or replace function get_evacuation_statistics()
returns table (
  total_evacuations bigint,
  today_evacuations bigint,
  week_evacuations bigint,
  month_evacuations bigint,
  active_officers bigint,
  total_weight numeric,
  unique_containers bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with stats as (
    select
      count(*) as total,
      count(*) filter (where date(delivered_at) = current_date) as today,
      count(*) filter (where delivered_at >= current_date - interval '7 days') as week,
      count(*) filter (where delivered_at >= current_date - interval '30 days') as month,
      count(distinct processed_by) filter (where date(delivered_at) = current_date) as active_officers,
      sum(container_weight) as total_weight,
      count(distinct container_number) as unique_containers
    from evacuation_records
  )
  select
    total,
    today,
    week,
    month,
    active_officers,
    coalesce(total_weight, 0),
    unique_containers
  from stats;
$$;

-- ----------------------------------------------------------------------------
-- 2. Function to get active officers with their today's evacuation count
-- ----------------------------------------------------------------------------
create or replace function get_active_officers()
returns table (
  officer_id uuid,
  officer_name text,
  officer_email text,
  today_evacuations bigint,
  total_evacuations bigint,
  last_evacuation_time timestamptz
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    p.id as officer_id,
    p.full_name as officer_name,
    au.email as officer_email,
    count(*) filter (where date(er.delivered_at) = current_date) as today_evacuations,
    count(*) as total_evacuations,
    max(er.processed_at) as last_evacuation_time
  from profiles p
  join auth.users au on p.id = au.id
  join evacuation_records er on p.id = er.processed_by
  where p.role = 'evacuation_officer'
    and date(er.delivered_at) = current_date
  group by p.id, p.full_name, au.email
  order by today_evacuations desc;
$$;

-- ----------------------------------------------------------------------------
-- 3. Function to get evacuation summary by shipping line
-- ----------------------------------------------------------------------------
create or replace function get_evacuation_by_shipping_line()
returns table (
  shipping_line text,
  total_evacuations bigint,
  today_evacuations bigint,
  week_evacuations bigint,
  current_quota bigint,
  remaining_quota bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(er.shipping_line, 'Unknown') as shipping_line,
    count(*) as total_evacuations,
    count(*) filter (where date(er.delivered_at) = current_date) as today_evacuations,
    count(*) filter (where delivered_at >= current_date - interval '7 days') as week_evacuations,
    coalesce(eq.total_evacuations, 0) as current_quota,
    coalesce(eq.total_evacuations, 0) - count(*) filter (where delivered_at >= current_date - interval '7 days') as remaining_quota
  from evacuation_records er
  left join evacuation_quotas eq on er.shipping_line = eq.shipping_line
  group by er.shipping_line, eq.total_evacuations
  order by total_evacuations desc;
$$;

-- ----------------------------------------------------------------------------
-- 4. Function to get recent evacuations for the dashboard
-- ----------------------------------------------------------------------------
create or replace function get_recent_evacuations(p_limit int default 10)
returns table (
  id uuid,
  container_number text,
  container_weight numeric,
  truck_driver_name text,
  truck_license_plate text,
  shipping_line text,
  officer_name text,
  officer_id uuid,
  delivered_at date,
  processed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    er.id,
    er.container_number,
    er.container_weight,
    er.truck_driver_name,
    er.truck_license_plate,
    er.shipping_line,
    p.full_name as officer_name,
    p.id as officer_id,
    er.delivered_at,
    er.processed_at
  from evacuation_records er
  join profiles p on er.processed_by = p.id
  order by er.processed_at desc
  limit p_limit;
$$;

-- ----------------------------------------------------------------------------
-- 5. View for officer performance summary
-- ----------------------------------------------------------------------------
create or replace view officer_performance_summary as
select
  p.id as officer_id,
  p.full_name as officer_name,
  count(*) as total_evacuations,
  count(*) filter (where date(er.delivered_at) = current_date) as today_evacuations,
  count(*) filter (where er.delivered_at >= current_date - interval '7 days') as week_evacuations,
  count(*) filter (where er.delivered_at >= current_date - interval '30 days') as month_evacuations,
  sum(er.container_weight) as total_weight,
  coalesce(avg(er.container_weight), 0) as avg_weight,
  min(er.delivered_at) as first_evacuation,
  max(er.delivered_at) as last_evacuation
from profiles p
join evacuation_records er on p.id = er.processed_by
where p.role = 'evacuation_officer'
group by p.id, p.full_name
order by total_evacuations desc;

-- ----------------------------------------------------------------------------
-- 6. Grant permissions for new functions
-- ----------------------------------------------------------------------------
grant execute on function get_evacuation_statistics() to authenticated;
grant execute on function get_active_officers() to authenticated;
grant execute on function get_evacuation_by_shipping_line() to authenticated;
grant execute on function get_recent_evacuations(p_limit int) to authenticated;

-- ----------------------------------------------------------------------------
-- 7. Grant select on the view
-- ----------------------------------------------------------------------------
grant select on officer_performance_summary to authenticated;

-- ----------------------------------------------------------------------------
-- 8. Create RLS policy for the view (for extra security)
-- ----------------------------------------------------------------------------
drop policy if exists "officer_performance_read" on officer_performance_summary;

create policy "officer_performance_read" on officer_performance_summary
  for select using (is_super_admin());

-- ============================================================================
-- END OF EVACUATION DASHBOARD ENHANCEMENTS
-- ============================================================================
