-- ============================================================================
-- PART 1: Add new enum value (must be run separately and committed first)
-- ============================================================================
-- Run this part first, commit it, then run PART 2
-- If you get an error saying the value already exists, that's fine - it means it was already added

-- ----------------------------------------------------------------------------
-- 1. UPDATE APP_ROLE ENUM TO INCLUDE EVACUATION_OFFICER
-- ----------------------------------------------------------------------------
-- Add the new value to the existing enum (PostgreSQL 12+ supports this)


-- ============================================================================
-- END OF PART 1 - COMMIT THIS FIRST BEFORE RUNNING PART 2
-- ============================================================================
-- Note: If you get an error "enum value already exists", that's okay!
-- It just means the value was already added. You can proceed to Part 2.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 2. CREATE EVACUATION RECORDS TABLE
-- ----------------------------------------------------------------------------
create table evacuation_records (
  id uuid primary key default gen_random_uuid(),
  
  -- Container Information
  container_number text not null,
  container_weight numeric(10,2) not null,
  usage_status_type text not null, -- e.g., "Repo To terminal/40HC"
  
  -- Truck Information
  truck_driver_name text not null,
  truck_license_plate text not null,
  
  -- Timing Information
  delivered_at date not null,
  gate_out_time timestamptz,
  
  -- Shipping Line
  shipping_line text check (shipping_line in ('Grimaldi', 'CMA CGM', 'MAERSK LINE', 'MSC', 'HAPAG LLYOD')),
  
  -- Document References
  export_receipt_number text,
  booking_number text,
  barcode_number text,
  
  -- Additional Information
  remarks text,
  
  -- Signatories
  terminal_clerk_name text,
  clerk_name text,
  truck_driver_signature text,
  customs_signature text,
  
  -- Condition Statement
  condition_statement text default 'This equipment was received/Delivered in good condition except as noted above.',
  
  -- Processing Information
  processed_by uuid not null references profiles(id) on delete cascade,
  processed_at timestamptz not null default now(),
  
  -- Document Generation
  document_generated boolean default false,
  document_generated_at timestamptz,
  
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Add unique constraint for container numbers to prevent duplicates
create unique index idx_evacuation_container_number on evacuation_records(container_number);

-- Add indexes for better query performance
create index idx_evacuation_processed_by on evacuation_records(processed_by);
create index idx_evacuation_delivered_at on evacuation_records(delivered_at desc);
create index idx_evacuation_shipping_line on evacuation_records(shipping_line);
create index idx_evacuation_processed_at on evacuation_records(processed_at desc);

-- Enable RLS
alter table evacuation_records enable row level security;

-- ----------------------------------------------------------------------------
-- 3. EVACUATION RLS POLICIES
-- ----------------------------------------------------------------------------

-- Evacuation officers can insert their own records
create policy "evacuation_officer_insert" on evacuation_records
  for insert with check (
    auth_role() = 'super_admin'
    or (auth_role() = 'evacuation_officer' and processed_by = auth.uid())
  );

-- Evacuation officers can view their own records
create policy "evacuation_officer_read_own" on evacuation_records
  for select using (
    auth_role() = 'super_admin'
    or (auth_role() = 'evacuation_officer' and processed_by = auth.uid())
  );

-- Super admin can view all evacuation records
create policy "evacuation_super_admin_read" on evacuation_records
  for select using (is_super_admin());

-- Super admin can update evacuation records
create policy "evacuation_super_admin_update" on evacuation_records
  for update using (is_super_admin());

-- ----------------------------------------------------------------------------
-- 4. EVACUATION SPECIFIC USERS SETUP
-- ----------------------------------------------------------------------------
-- Note: These should be created via the signup process or manually in Supabase Auth
-- This is a reference for the expected users:

-- Mr Phelix - Super Admin (already exists in system)
-- Email: mrphelix@phelix.investment (example - update with actual email)
-- Role: super_admin

-- Mr Panford - Evacuation Officer
-- Email: mrpanford@phelix.investment (example - update with actual email)
-- Role: evacuation_officer

-- Mr Kempess - Evacuation Officer
-- Email: mrkempess@phelix.investment (example - update with actual email)
-- Role: evacuation_officer

-- Mr Chair - Evacuation Officer
-- Email: mrchair@phelix.investment (example - update with actual email)
-- Role: evacuation_officer

-- ----------------------------------------------------------------------------
-- 5. EVACUATION NOTIFICATIONS TABLE
-- ----------------------------------------------------------------------------
create table evacuation_notifications (
  id uuid primary key default gen_random_uuid(),
  super_admin_id uuid not null references profiles(id) on delete cascade,
  evacuation_record_id uuid not null references evacuation_records(id) on delete cascade,
  message text not null,
  is_read boolean default false,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

-- Add indexes
create index idx_evacuation_notifications_admin on evacuation_notifications(super_admin_id);
create index idx_evacuation_notifications_record on evacuation_notifications(evacuation_record_id);
create index idx_evacuation_notifications_is_read on evacuation_notifications(is_read, created_at desc);

-- Enable RLS
alter table evacuation_notifications enable row level security;

-- Only super admin can read their own notifications
create policy "notifications_read" on evacuation_notifications
  for select using (super_admin_id = auth.uid() or is_super_admin());

-- Only system (via trigger) can insert notifications
create policy "notifications_insert" on evacuation_notifications
  for insert with check (is_super_admin());

-- Super admin can mark notifications as read
create policy "notifications_update" on evacuation_notifications
  for update using (super_admin_id = auth.uid() or is_super_admin());

-- ----------------------------------------------------------------------------
-- 6. TRIGGER TO CREATE NOTIFICATIONS FOR SUPER ADMIN
-- ----------------------------------------------------------------------------
create or replace function notify_super_admin_on_evacuation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  super_admin profiles;
  officer_name text;
begin
  -- Get the super admin user
  select * into super_admin
  from profiles
  where role = 'super_admin'
  limit 1;
  
  -- Get the officer's name
  select full_name into officer_name
  from profiles
  where id = new.processed_by;
  
  -- Create notification for super admin
  if super_admin is not null then
    insert into evacuation_notifications (
      super_admin_id,
      evacuation_record_id,
      message
    ) values (
      super_admin.id,
      new.id,
      format(
        'Evacuation Alert: %s evacuated Container %s (Plate: %s, Weight: %s kg, Shipping Line: %s)',
        officer_name,
        new.container_number,
        new.truck_license_plate,
        new.container_weight,
        coalesce(new.shipping_line, 'N/A')
      )
    );
  end if;
  
  return new;
end;
$$;

create trigger notify_super_admin_on_evacuation_trigger
  after insert on evacuation_records
  for each row execute function notify_super_admin_on_evacuation();

-- ----------------------------------------------------------------------------
-- 7. UPDATE TRIGGER FUNCTION FOR EVACUATION AUDIT LOGGING
-- ----------------------------------------------------------------------------
create or replace function log_evacuation_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform log_user_action(
      'created_evacuation_record',
      'evacuation_record',
      new.id,
      jsonb_build_object(
        'container_number', new.container_number,
        'truck_driver_name', new.truck_driver_name,
        'truck_license_plate', new.truck_license_plate,
        'shipping_line', new.shipping_line,
        'container_weight', new.container_weight,
        'delivered_at', new.delivered_at
      )
    );
    return new;
  elsif TG_OP = 'UPDATE' then
    perform log_user_action(
      'updated_evacuation_record',
      'evacuation_record',
      new.id,
      jsonb_build_object(
        'container_number', new.container_number,
        'old_gate_out_time', old.gate_out_time,
        'new_gate_out_time', new.gate_out_time
      )
    );
    return new;
  elsif TG_OP = 'DELETE' then
    perform log_user_action(
      'deleted_evacuation_record',
      'evacuation_record',
      old.id,
      jsonb_build_object(
        'container_number', old.container_number,
        'truck_driver_name', old.truck_driver_name
      )
    );
    return old;
  end if;
  return null;
end;
$$;

create trigger evacuation_records_audit
  after insert or update or delete on evacuation_records
  for each row execute function log_evacuation_changes();

-- ----------------------------------------------------------------------------
-- 8. UPDATE TIMESTAMP TRIGGER
-- ----------------------------------------------------------------------------
create or replace function update_evacuation_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_evacuation_updated_at_trigger
  before update on evacuation_records
  for each row execute function update_evacuation_updated_at();

-- ----------------------------------------------------------------------------
-- 9. HELPER FUNCTION TO CHECK IF CONTAINER EXISTS
-- ----------------------------------------------------------------------------
create or replace function container_exists(p_container_number text)
returns boolean
language sql
stable security definer
set search_path = public
as $$
  select exists(
    select 1 from evacuation_records
    where container_number = p_container_number
  );
$$;

-- ----------------------------------------------------------------------------
-- 10. STORAGE BUCKET FOR EVACUATION DOCUMENTS
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public) values ('evacuation-docs', 'evacuation-docs', false)
  on conflict (id) do nothing;

create policy "evacuation_docs_upload" on storage.objects
  for insert with check (
    bucket_id = 'evacuation-docs'
    and (auth_role() in ('evacuation_officer', 'super_admin'))
  );

create policy "evacuation_docs_read" on storage.objects
  for select using (
    bucket_id = 'evacuation-docs'
    and (auth_role() in ('evacuation_officer', 'super_admin'))
  );

-- ----------------------------------------------------------------------------
-- 11. VIEW FOR EVACUATION STATISTICS (SUPER ADMIN)
-- ----------------------------------------------------------------------------
create view evacuation_statistics as
select
  processed_by,
  profiles.full_name as officer_name,
  count(*) as total_evacuations,
  count(distinct shipping_line) as unique_shipping_lines,
  sum(container_weight) as total_weight,
  min(delivered_at) as first_evacuation,
  max(delivered_at) as last_evacuation
from evacuation_records
join profiles on evacuation_records.processed_by = profiles.id
group by processed_by, profiles.full_name;

-- ----------------------------------------------------------------------------
-- 12. FUNCTION TO GET EVACUATION BY OFFICER
-- ----------------------------------------------------------------------------
create or replace function get_evacuations_by_officer(p_officer_id uuid, p_limit int default 100)
returns table (
  id uuid,
  container_number text,
  container_weight numeric,
  truck_driver_name text,
  truck_license_plate text,
  delivered_at date,
  shipping_line text,
  booking_number text,
  processed_at timestamptz
)
language sql
stable security definer
set search_path = public
as $$
  select
    id, container_number, container_weight, truck_driver_name,
    truck_license_plate, delivered_at, shipping_line, booking_number, processed_at
  from evacuation_records
  where processed_by = p_officer_id
  order by processed_at desc
  limit p_limit;
$$;

-- ============================================================================
-- END OF EVACUATION INTEGRATION MIGRATION
-- ============================================================================
