-- ============================================================================
-- PHELIX INVESTMENT CMS — 16. Evacuation form update
--  * Gate out time is recorded automatically when the document is processed
--  * Usage/Status/Type limited to Transit, Evacuation, Export
-- Safe to re-run. Run after clearing old evacuation records (old free-text values would fail the check).
-- ============================================================================

begin;

create or replace function public.set_evacuation_gate_out_time()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    new.gate_out_time := now();
  else
    new.gate_out_time := old.gate_out_time;
  end if;
  return new;
end;
$$;

drop trigger if exists trigger_set_evacuation_gate_out_time on public.evacuation_records;
create trigger trigger_set_evacuation_gate_out_time
  before insert or update on public.evacuation_records
  for each row execute function public.set_evacuation_gate_out_time();

alter table public.evacuation_records drop constraint if exists evacuation_records_usage_status_type_check;
alter table public.evacuation_records add constraint evacuation_records_usage_status_type_check
  check (usage_status_type in ('Transit', 'Evacuation', 'Export'));

commit;
