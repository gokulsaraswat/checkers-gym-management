create or replace function public.get_admin_operations_snapshot()
returns table (
  total_members bigint,
  active_members bigint,
  unpaid_invoices bigint,
  expiring_members_30d bigint,
  branch_count bigint,
  open_incident_count bigint,
  queued_export_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $function$
declare
  v_total_members bigint := 0;
  v_active_members bigint := 0;
  v_unpaid_invoices bigint := 0;
  v_expiring_members_30d bigint := 0;
  v_branch_count bigint := 0;
  v_open_incident_count bigint := 0;
  v_queued_export_count bigint := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if to_regclass('public.profiles') is not null then
    execute $ops$
      select count(*)::bigint
      from public.profiles
      where role = 'member'
    $ops$ into v_total_members;

    execute $ops$
      select count(*)::bigint
      from public.profiles
      where role = 'member'
        and membership_status = 'active'
    $ops$ into v_active_members;

    execute $ops$
      select count(*)::bigint
      from public.profiles
      where role = 'member'
        and membership_end_date is not null
        and membership_end_date >= current_date
        and membership_end_date <= current_date + interval '30 days'
    $ops$ into v_expiring_members_30d;
  end if;

  if to_regclass('public.billing_invoices') is not null then
    execute $ops$
      select count(*)::bigint
      from public.billing_invoices
      where invoice_status in ('issued', 'overdue', 'partially_paid')
    $ops$ into v_unpaid_invoices;
  end if;

  if to_regclass('public.gym_branches') is not null then
    execute 'select count(*)::bigint from public.gym_branches' into v_branch_count;
  end if;

  if to_regclass('public.ops_incidents') is not null then
    select count(*)::bigint
    into v_open_incident_count
    from public.ops_incidents
    where status <> 'resolved';
  end if;

  if to_regclass('public.ops_export_jobs') is not null then
    select count(*)::bigint
    into v_queued_export_count
    from public.ops_export_jobs
    where status in ('queued', 'running');
  end if;

  return query
  select
    v_total_members,
    v_active_members,
    v_unpaid_invoices,
    v_expiring_members_30d,
    v_branch_count,
    v_open_incident_count,
    v_queued_export_count;
end;
$function$;

revoke all on function public.get_admin_operations_snapshot() from public;
grant execute on function public.get_admin_operations_snapshot() to authenticated;
