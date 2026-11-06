-- ============================================================================
-- PHELIX INVESTMENT CMS — Evacuation Payment Status
-- Adds payment status tracking to evacuation records
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Add payment_status column to evacuation_records table
-- ----------------------------------------------------------------------------
alter table evacuation_records
add column if not exists payment_status text
  check (payment_status in ('paid', 'not_paid', null))
  default null;

-- ----------------------------------------------------------------------------
-- 2. Add payment_date column to track when payment was marked
-- ----------------------------------------------------------------------------
alter table evacuation_records
add column if not exists payment_date timestamptz;

-- ----------------------------------------------------------------------------
-- 3. Add payment_confirmed_by column to track who confirmed payment
-- ----------------------------------------------------------------------------
alter table evacuation_records
add column if not exists payment_confirmed_by uuid references profiles(id);

-- ----------------------------------------------------------------------------
-- 4. Add payment_notes column for additional payment information
-- ----------------------------------------------------------------------------
alter table evacuation_records
add column if not exists payment_notes text;

-- ----------------------------------------------------------------------------
-- 5. Create index for payment status queries
-- ----------------------------------------------------------------------------
create index if not exists idx_evacuation_payment_status on evacuation_records(payment_status);
create index if not exists idx_evacuation_payment_date on evacuation_records(payment_date desc);

-- ----------------------------------------------------------------------------
-- 6. Update RLS policies to allow evacuation officers to update payment status
-- ----------------------------------------------------------------------------
drop policy if exists "evacuation_officer_update" on evacuation_records;

create policy "evacuation_officer_update_payment" on evacuation_records
  for update using (
    auth_role() = 'super_admin'
    or (auth_role() = 'evacuation_officer' and processed_by = auth.uid())
  )
  with check (
    auth_role() = 'super_admin'
    or (auth_role() = 'evacuation_officer' and processed_by = auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 7. Create function to get payment statistics
-- ----------------------------------------------------------------------------
create or replace function get_payment_statistics()
returns table (
  total_evacuations bigint,
  paid_evacuations bigint,
  not_paid_evacuations bigint,
  pending_payment bigint,
  total_value numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with stats as (
    select
      count(*) as total,
      count(*) filter (where payment_status = 'paid') as paid,
      count(*) filter (where payment_status = 'not_paid') as not_paid,
      count(*) filter (where payment_status is null) as pending
    from evacuation_records
  )
  select
    total,
    paid,
    not_paid,
    pending,
    0 as total_value -- Can be updated if you track payment amounts
  from stats;
$$;

-- ----------------------------------------------------------------------------
-- 8. Grant execute on the function
-- ----------------------------------------------------------------------------
grant execute on function get_payment_statistics() to authenticated;

-- ============================================================================
-- END OF EVACUATION PAYMENT STATUS MIGRATION
-- ============================================================================
