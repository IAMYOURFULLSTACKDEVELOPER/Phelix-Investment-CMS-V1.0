-- ============================================================================
-- Migration: Enhanced Audit Log System
-- This adds automatic triggers for database operations and improved logging
-- Run this after the base schema (01_schema.sql) to enable automatic tracking
-- ============================================================================

-- Add new columns to existing audit_logs table if they don't exist
do $$
begin
  -- Add new columns if they don't exist
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'audit_logs' and column_name = 'user_agent'
  ) then
    alter table audit_logs add column user_agent text;
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'audit_logs' and column_name = 'success'
  ) then
    alter table audit_logs add column success boolean default true;
  end if;
  
  if not exists (
    select 1 from information_schema.columns 
    where table_name = 'audit_logs' and column_name = 'error_message'
  ) then
    alter table audit_logs add column error_message text;
  end if;
end $$;

-- Create indexes for better performance
create index if not exists idx_audit_logs_user_id on audit_logs(user_id);
create index if not exists idx_audit_logs_created_at on audit_logs(created_at desc);
create index if not exists idx_audit_logs_action on audit_logs(action);
create index if not exists idx_audit_logs_entity_type on audit_logs(entity_type);
create index if not exists idx_audit_logs_entity_id on audit_logs(entity_id);

-- Update the log_user_action function with enhanced error handling
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

-- Create helper functions for querying audit logs
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

-- Add automatic triggers for important tables

-- Drop existing triggers if they exist to avoid conflicts
drop trigger if exists accounting_entries_audit on accounting_entries;
drop trigger if exists workers_audit on workers;
drop trigger if exists fuel_logs_audit on fuel_logs;

-- Trigger for accounting_entries
create or replace function log_accounting_entry_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform log_user_action(
      'created_accounting_entry',
      'accounting_entry',
      new.id,
      jsonb_build_object(
        'type', new.type,
        'category', new.category,
        'amount', new.amount,
        'entry_date', new.entry_date
      )
    );
    return new;
  elsif TG_OP = 'UPDATE' then
    perform log_user_action(
      'updated_accounting_entry',
      'accounting_entry',
      new.id,
      jsonb_build_object(
        'old_type', old.type,
        'new_type', new.type,
        'old_amount', old.amount,
        'new_amount', new.amount
      )
    );
    return new;
  elsif TG_OP = 'DELETE' then
    perform log_user_action(
      'deleted_accounting_entry',
      'accounting_entry',
      old.id,
      jsonb_build_object(
        'type', old.type,
        'category', old.category,
        'amount', old.amount
      )
    );
    return old;
  end if;
  return null;
end;
$$;

create trigger accounting_entries_audit
  after insert or update or delete on accounting_entries
  for each row execute function log_accounting_entry_changes();

-- Trigger for workers
create or replace function log_worker_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform log_user_action(
      'created_worker',
      'worker',
      new.id,
      jsonb_build_object(
        'full_name', new.full_name,
        'depot', new.depot,
        'position', new.position,
        'status', new.status
      )
    );
    return new;
  elsif TG_OP = 'UPDATE' then
    perform log_user_action(
      'updated_worker',
      'worker',
      new.id,
      jsonb_build_object(
        'full_name', new.full_name,
        'old_status', old.status,
        'new_status', new.status,
        'old_position', old.position,
        'new_position', new.position
      )
    );
    return new;
  elsif TG_OP = 'DELETE' then
    perform log_user_action(
      'deleted_worker',
      'worker',
      old.id,
      jsonb_build_object(
        'full_name', old.full_name,
        'depot', old.depot,
        'position', old.position
      )
    );
    return old;
  end if;
  return null;
end;
$$;

create trigger workers_audit
  after insert or update or delete on workers
  for each row execute function log_worker_changes();

-- Trigger for fuel_logs
create or replace function log_fuel_changes()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    perform log_user_action(
      'created_fuel_log',
      'fuel_log',
      new.id,
      jsonb_build_object(
        'depot', new.depot,
        'quantity_liters', new.quantity_liters,
        'received_by', new.received_by
      )
    );
    return new;
  elsif TG_OP = 'UPDATE' then
    perform log_user_action(
      'updated_fuel_log',
      'fuel_log',
      new.id,
      jsonb_build_object(
        'old_quantity', old.quantity_liters,
        'new_quantity', new.quantity_liters
      )
    );
    return new;
  elsif TG_OP = 'DELETE' then
    perform log_user_action(
      'deleted_fuel_log',
      'fuel_log',
      old.id,
      jsonb_build_object(
        'depot', old.depot,
        'quantity_liters', old.quantity_liters
      )
    );
    return old;
  end if;
  return null;
end;
$$;

create trigger fuel_logs_audit
  after insert or update or delete on fuel_logs
  for each row execute function log_fuel_changes();