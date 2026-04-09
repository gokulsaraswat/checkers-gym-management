create extension if not exists pgcrypto;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.backup_policies (
  id uuid primary key default gen_random_uuid(),
  policy_name text not null unique,
  backup_scope text not null,
  backup_mode text not null default 'manual',
  retention_days integer not null default 30,
  enabled boolean not null default true,
  notes text,
  last_run_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  created_by uuid
);

create table if not exists public.backup_run_logs (
  id uuid primary key default gen_random_uuid(),
  policy_id uuid references public.backup_policies(id) on delete set null,
  policy_name text,
  run_status text not null default 'queued',
  run_source text not null default 'manual',
  backup_location text,
  bytes_copied bigint,
  started_at timestamp with time zone not null default timezone('utc', now()),
  finished_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.scheduled_job_definitions (
  id uuid primary key default gen_random_uuid(),
  job_key text not null unique,
  job_name text not null,
  function_name text not null,
  schedule_label text,
  trigger_mode text not null default 'manual',
  enabled boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  last_run_at timestamp with time zone,
  last_run_status text,
  next_run_hint timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  created_by uuid
);

create table if not exists public.scheduled_job_runs (
  id uuid primary key default gen_random_uuid(),
  job_definition_id uuid references public.scheduled_job_definitions(id) on delete set null,
  job_key text not null,
  job_name text,
  function_name text,
  run_status text not null default 'queued',
  run_source text not null default 'manual',
  started_at timestamp with time zone not null default timezone('utc', now()),
  finished_at timestamp with time zone,
  duration_ms integer,
  details jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.system_health_checks (
  id uuid primary key default gen_random_uuid(),
  check_key text not null unique,
  check_name text not null,
  status text not null default 'unknown',
  severity text not null default 'info',
  response_time_ms integer,
  meta jsonb not null default '{}'::jsonb,
  last_checked_at timestamp with time zone not null default timezone('utc', now()),
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists backup_run_logs_started_at_idx
  on public.backup_run_logs(started_at desc);

create index if not exists scheduled_job_runs_started_at_idx
  on public.scheduled_job_runs(started_at desc);

create index if not exists scheduled_job_runs_status_idx
  on public.scheduled_job_runs(run_status);

drop trigger if exists trg_backup_policies_updated_at on public.backup_policies;
create trigger trg_backup_policies_updated_at
before update on public.backup_policies
for each row execute function public.handle_updated_at();

drop trigger if exists trg_scheduled_job_definitions_updated_at on public.scheduled_job_definitions;
create trigger trg_scheduled_job_definitions_updated_at
before update on public.scheduled_job_definitions
for each row execute function public.handle_updated_at();

drop trigger if exists trg_system_health_checks_updated_at on public.system_health_checks;
create trigger trg_system_health_checks_updated_at
before update on public.system_health_checks
for each row execute function public.handle_updated_at();

alter table public.backup_policies enable row level security;
alter table public.backup_run_logs enable row level security;
alter table public.scheduled_job_definitions enable row level security;
alter table public.scheduled_job_runs enable row level security;
alter table public.system_health_checks enable row level security;

drop policy if exists "Admins manage backup policies" on public.backup_policies;
create policy "Admins manage backup policies"
on public.backup_policies
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins read backup run logs" on public.backup_run_logs;
create policy "Admins read backup run logs"
on public.backup_run_logs
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins insert backup run logs" on public.backup_run_logs;
create policy "Admins insert backup run logs"
on public.backup_run_logs
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins manage scheduled job definitions" on public.scheduled_job_definitions;
create policy "Admins manage scheduled job definitions"
on public.scheduled_job_definitions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins read scheduled job runs" on public.scheduled_job_runs;
create policy "Admins read scheduled job runs"
on public.scheduled_job_runs
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins insert scheduled job runs" on public.scheduled_job_runs;
create policy "Admins insert scheduled job runs"
on public.scheduled_job_runs
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins manage health checks" on public.system_health_checks;
create policy "Admins manage health checks"
on public.system_health_checks
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.list_backup_policies()
returns setof public.backup_policies
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select *
  from public.backup_policies
  order by enabled desc, policy_name asc;
end;
$$;

revoke all on function public.list_backup_policies() from public;
grant execute on function public.list_backup_policies() to authenticated;

create or replace function public.save_backup_policy(
  p_policy_name text,
  p_backup_scope text,
  p_backup_mode text default 'manual',
  p_retention_days integer default 30,
  p_enabled boolean default true,
  p_notes text default null
)
returns public.backup_policies
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_row public.backup_policies;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if nullif(btrim(coalesce(p_policy_name, '')), '') is null then
    raise exception 'Policy name is required';
  end if;

  if nullif(btrim(coalesce(p_backup_scope, '')), '') is null then
    raise exception 'Backup scope is required';
  end if;

  insert into public.backup_policies (
    policy_name,
    backup_scope,
    backup_mode,
    retention_days,
    enabled,
    notes,
    created_by
  )
  values (
    btrim(p_policy_name),
    btrim(p_backup_scope),
    coalesce(nullif(btrim(coalesce(p_backup_mode, '')), ''), 'manual'),
    greatest(coalesce(p_retention_days, 30), 1),
    coalesce(p_enabled, true),
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  on conflict (policy_name) do update
  set
    backup_scope = excluded.backup_scope,
    backup_mode = excluded.backup_mode,
    retention_days = excluded.retention_days,
    enabled = excluded.enabled,
    notes = excluded.notes
  returning * into saved_row;

  return saved_row;
end;
$$;

revoke all on function public.save_backup_policy(text, text, text, integer, boolean, text) from public;
grant execute on function public.save_backup_policy(text, text, text, integer, boolean, text) to authenticated;

create or replace function public.upsert_scheduled_job(
  p_job_key text,
  p_job_name text,
  p_function_name text,
  p_schedule_label text default null,
  p_trigger_mode text default 'manual',
  p_enabled boolean default true,
  p_next_run_hint timestamp with time zone default null,
  p_settings jsonb default '{}'::jsonb
)
returns public.scheduled_job_definitions
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_row public.scheduled_job_definitions;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  insert into public.scheduled_job_definitions (
    job_key,
    job_name,
    function_name,
    schedule_label,
    trigger_mode,
    enabled,
    next_run_hint,
    settings,
    created_by
  )
  values (
    btrim(p_job_key),
    btrim(p_job_name),
    btrim(p_function_name),
    nullif(btrim(coalesce(p_schedule_label, '')), ''),
    coalesce(nullif(btrim(coalesce(p_trigger_mode, '')), ''), 'manual'),
    coalesce(p_enabled, true),
    p_next_run_hint,
    coalesce(p_settings, '{}'::jsonb),
    auth.uid()
  )
  on conflict (job_key) do update
  set
    job_name = excluded.job_name,
    function_name = excluded.function_name,
    schedule_label = excluded.schedule_label,
    trigger_mode = excluded.trigger_mode,
    enabled = excluded.enabled,
    next_run_hint = excluded.next_run_hint,
    settings = excluded.settings
  returning * into saved_row;

  return saved_row;
end;
$$;

revoke all on function public.upsert_scheduled_job(text, text, text, text, text, boolean, timestamp with time zone, jsonb) from public;
grant execute on function public.upsert_scheduled_job(text, text, text, text, text, boolean, timestamp with time zone, jsonb) to authenticated;

create or replace function public.list_recent_job_runs(p_limit integer default 25)
returns table (
  id uuid,
  job_definition_id uuid,
  job_key text,
  job_name text,
  function_name text,
  run_status text,
  run_source text,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  duration_ms integer,
  details jsonb,
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    runs.id,
    runs.job_definition_id,
    runs.job_key,
    runs.job_name,
    runs.function_name,
    runs.run_status,
    runs.run_source,
    runs.started_at,
    runs.finished_at,
    runs.duration_ms,
    runs.details,
    runs.created_at
  from public.scheduled_job_runs as runs
  order by runs.started_at desc
  limit greatest(coalesce(p_limit, 25), 1);
end;
$$;

revoke all on function public.list_recent_job_runs(integer) from public;
grant execute on function public.list_recent_job_runs(integer) to authenticated;

create or replace function public.record_system_health_check(
  p_check_key text,
  p_check_name text,
  p_status text,
  p_severity text default 'info',
  p_response_time_ms integer default null,
  p_meta jsonb default '{}'::jsonb
)
returns public.system_health_checks
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_row public.system_health_checks;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  insert into public.system_health_checks (
    check_key,
    check_name,
    status,
    severity,
    response_time_ms,
    meta,
    last_checked_at
  )
  values (
    btrim(p_check_key),
    btrim(p_check_name),
    coalesce(nullif(btrim(coalesce(p_status, '')), ''), 'unknown'),
    coalesce(nullif(btrim(coalesce(p_severity, '')), ''), 'info'),
    p_response_time_ms,
    coalesce(p_meta, '{}'::jsonb),
    timezone('utc', now())
  )
  on conflict (check_key) do update
  set
    check_name = excluded.check_name,
    status = excluded.status,
    severity = excluded.severity,
    response_time_ms = excluded.response_time_ms,
    meta = excluded.meta,
    last_checked_at = timezone('utc', now())
  returning * into saved_row;

  return saved_row;
end;
$$;

revoke all on function public.record_system_health_check(text, text, text, text, integer, jsonb) from public;
grant execute on function public.record_system_health_check(text, text, text, text, integer, jsonb) to authenticated;

create or replace function public.get_admin_automation_snapshot()
returns table (
  active_jobs bigint,
  failed_runs_last_7_days bigint,
  active_backup_policies bigint,
  latest_backup_status text,
  unpaid_invoices bigint,
  expiring_members_next_7_days bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_active_jobs bigint := 0;
  v_failed_runs bigint := 0;
  v_active_policies bigint := 0;
  v_latest_backup_status text := 'unknown';
  v_unpaid_invoices bigint := 0;
  v_expiring_members bigint := 0;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select count(*) into v_active_jobs
  from public.scheduled_job_definitions
  where enabled = true;

  select count(*) into v_failed_runs
  from public.scheduled_job_runs
  where run_status = 'failed'
    and started_at >= timezone('utc', now()) - interval '7 days';

  select count(*) into v_active_policies
  from public.backup_policies
  where enabled = true;

  select coalesce(run_status, 'unknown')
  into v_latest_backup_status
  from public.backup_run_logs
  order by started_at desc
  limit 1;

  if to_regclass('public.billing_invoices') is not null then
    execute $sql$
      select count(*)
      from public.billing_invoices
      where invoice_status in ('issued', 'partially_paid', 'overdue')
    $sql$ into v_unpaid_invoices;
  end if;

  if to_regclass('public.profiles') is not null then
    begin
      execute $sql$
        select count(*)
        from public.profiles
        where membership_end_date is not null
          and membership_end_date::date between current_date and current_date + 7
      $sql$ into v_expiring_members;
    exception
      when undefined_column then
        v_expiring_members := 0;
    end;
  end if;

  return query
  select
    v_active_jobs,
    v_failed_runs,
    v_active_policies,
    coalesce(v_latest_backup_status, 'unknown'),
    v_unpaid_invoices,
    v_expiring_members;
end;
$$;

revoke all on function public.get_admin_automation_snapshot() from public;
grant execute on function public.get_admin_automation_snapshot() to authenticated;

insert into public.backup_policies (
  policy_name,
  backup_scope,
  backup_mode,
  retention_days,
  enabled,
  notes
)
values
  ('daily-database-backup', 'database', 'scheduled', 30, true, 'Seeded by Patch 22'),
  ('weekly-storage-backup', 'storage', 'scheduled', 60, true, 'Seeded by Patch 22')
on conflict (policy_name) do update
set
  backup_scope = excluded.backup_scope,
  backup_mode = excluded.backup_mode,
  retention_days = excluded.retention_days,
  enabled = excluded.enabled,
  notes = excluded.notes;

insert into public.scheduled_job_definitions (
  job_key,
  job_name,
  function_name,
  schedule_label,
  trigger_mode,
  enabled,
  settings
)
values
  ('renewal-reminders', 'Renewal reminders', 'run-renewal-reminders', 'daily 08:00', 'scheduled', true, '{}'::jsonb),
  ('daily-ops-summary', 'Daily ops summary', 'run-daily-ops-summary', 'daily 20:00', 'scheduled', true, '{}'::jsonb)
on conflict (job_key) do update
set
  job_name = excluded.job_name,
  function_name = excluded.function_name,
  schedule_label = excluded.schedule_label,
  trigger_mode = excluded.trigger_mode,
  enabled = excluded.enabled,
  settings = excluded.settings;
