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

create table if not exists public.ops_checklist_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'critical')),
  completed boolean not null default false,
  completed_at timestamp with time zone,
  completed_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.ops_incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  severity text not null default 'medium' check (severity in ('low', 'medium', 'high', 'critical')),
  status text not null default 'open' check (status in ('open', 'investigating', 'acknowledged', 'resolved')),
  owner_id uuid references public.profiles(id) on delete set null,
  opened_at timestamp with time zone not null default timezone('utc', now()),
  resolved_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.ops_release_notes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  summary text,
  body_markdown text,
  published_at timestamp with time zone not null default timezone('utc', now()),
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.ops_export_jobs (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid references public.profiles(id) on delete set null,
  export_type text not null,
  export_label text,
  file_format text not null default 'csv',
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  file_url text,
  filters jsonb not null default '{}'::jsonb,
  notes text,
  requested_at timestamp with time zone not null default timezone('utc', now()),
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

alter table public.ops_export_jobs add column if not exists export_label text;
alter table public.ops_export_jobs add column if not exists file_format text not null default 'csv';
alter table public.ops_export_jobs add column if not exists notes text;
alter table public.ops_export_jobs add column if not exists requested_at timestamp with time zone not null default timezone('utc', now());

update public.ops_export_jobs
set requested_at = coalesce(requested_at, created_at, timezone('utc', now()))
where requested_at is null;

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
  created_by uuid references public.profiles(id) on delete set null
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
  created_by uuid references public.profiles(id) on delete set null
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

create index if not exists ops_checklist_items_completed_idx on public.ops_checklist_items (completed, priority);
create index if not exists ops_incidents_status_idx on public.ops_incidents (status, severity);
create index if not exists ops_release_notes_published_idx on public.ops_release_notes (published_at desc);
create index if not exists ops_export_jobs_status_idx on public.ops_export_jobs (status, created_at desc);
create index if not exists ops_export_jobs_requested_at_idx on public.ops_export_jobs (requested_at desc);
create index if not exists backup_policies_enabled_idx on public.backup_policies (enabled, policy_name);
create index if not exists backup_run_logs_started_at_idx on public.backup_run_logs (started_at desc);
create index if not exists scheduled_job_runs_started_at_idx on public.scheduled_job_runs (started_at desc);
create index if not exists scheduled_job_runs_status_idx on public.scheduled_job_runs (run_status);
create index if not exists system_health_checks_status_idx on public.system_health_checks (status, severity);

drop trigger if exists set_ops_checklist_items_updated_at on public.ops_checklist_items;
create trigger set_ops_checklist_items_updated_at
before update on public.ops_checklist_items
for each row execute function public.handle_updated_at();

drop trigger if exists set_ops_incidents_updated_at on public.ops_incidents;
create trigger set_ops_incidents_updated_at
before update on public.ops_incidents
for each row execute function public.handle_updated_at();

drop trigger if exists set_ops_release_notes_updated_at on public.ops_release_notes;
create trigger set_ops_release_notes_updated_at
before update on public.ops_release_notes
for each row execute function public.handle_updated_at();

drop trigger if exists set_ops_export_jobs_updated_at on public.ops_export_jobs;
create trigger set_ops_export_jobs_updated_at
before update on public.ops_export_jobs
for each row execute function public.handle_updated_at();

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

alter table public.ops_checklist_items enable row level security;
alter table public.ops_incidents enable row level security;
alter table public.ops_release_notes enable row level security;
alter table public.ops_export_jobs enable row level security;
alter table public.backup_policies enable row level security;
alter table public.backup_run_logs enable row level security;
alter table public.scheduled_job_definitions enable row level security;
alter table public.scheduled_job_runs enable row level security;
alter table public.system_health_checks enable row level security;

drop policy if exists "Admins can read ops checklist items" on public.ops_checklist_items;
create policy "Admins can read ops checklist items"
on public.ops_checklist_items
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can manage ops checklist items" on public.ops_checklist_items;
create policy "Admins can manage ops checklist items"
on public.ops_checklist_items
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read ops incidents" on public.ops_incidents;
create policy "Admins can read ops incidents"
on public.ops_incidents
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can manage ops incidents" on public.ops_incidents;
create policy "Admins can manage ops incidents"
on public.ops_incidents
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read ops release notes" on public.ops_release_notes;
create policy "Admins can read ops release notes"
on public.ops_release_notes
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can manage ops release notes" on public.ops_release_notes;
create policy "Admins can manage ops release notes"
on public.ops_release_notes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can read ops export jobs" on public.ops_export_jobs;
create policy "Admins can read ops export jobs"
on public.ops_export_jobs
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can manage ops export jobs" on public.ops_export_jobs;
create policy "Admins can manage ops export jobs"
on public.ops_export_jobs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

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

create or replace function public.list_ops_checklist()
returns table (
  id uuid,
  title text,
  description text,
  priority text,
  completed boolean,
  completed_at timestamp with time zone,
  completed_by uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    item.id,
    item.title,
    item.description,
    item.priority,
    item.completed,
    item.completed_at,
    item.completed_by,
    item.created_at,
    item.updated_at
  from public.ops_checklist_items as item
  order by
    case item.priority
      when 'critical' then 0
      when 'high' then 1
      when 'normal' then 2
      else 3
    end,
    item.created_at asc;
end;
$$;

revoke all on function public.list_ops_checklist() from public;
grant execute on function public.list_ops_checklist() to authenticated;

create or replace function public.toggle_ops_checklist_item(p_id uuid, p_completed boolean)
returns public.ops_checklist_items
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_item public.ops_checklist_items;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_id is null then
    raise exception 'Checklist id is required';
  end if;

  update public.ops_checklist_items
  set
    completed = coalesce(p_completed, false),
    completed_at = case when coalesce(p_completed, false) then timezone('utc', now()) else null end,
    completed_by = case when coalesce(p_completed, false) then auth.uid() else null end
  where id = p_id
  returning * into updated_item;

  if updated_item.id is null then
    raise exception 'Checklist item not found';
  end if;

  return updated_item;
end;
$$;

revoke all on function public.toggle_ops_checklist_item(uuid, boolean) from public;
grant execute on function public.toggle_ops_checklist_item(uuid, boolean) to authenticated;

create or replace function public.list_open_ops_incidents()
returns table (
  id uuid,
  title text,
  summary text,
  severity text,
  status text,
  owner_id uuid,
  opened_at timestamp with time zone,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    incident.id,
    incident.title,
    incident.summary,
    incident.severity,
    incident.status,
    incident.owner_id,
    incident.opened_at,
    incident.resolved_at,
    incident.created_at,
    incident.updated_at
  from public.ops_incidents as incident
  where incident.status <> 'resolved'
  order by
    case incident.severity
      when 'critical' then 0
      when 'high' then 1
      when 'medium' then 2
      else 3
    end,
    incident.opened_at desc;
end;
$$;

revoke all on function public.list_open_ops_incidents() from public;
grant execute on function public.list_open_ops_incidents() to authenticated;

create or replace function public.list_release_notes(p_limit integer default 10)
returns table (
  id uuid,
  title text,
  summary text,
  body_markdown text,
  published_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    note.id,
    note.title,
    note.summary,
    note.body_markdown,
    note.published_at,
    note.created_at,
    note.updated_at
  from public.ops_release_notes as note
  order by note.published_at desc
  limit greatest(coalesce(p_limit, 10), 1);
end;
$$;

revoke all on function public.list_release_notes(integer) from public;
grant execute on function public.list_release_notes(integer) to authenticated;

create or replace function public.list_ops_export_jobs(p_limit integer default 20)
returns table (
  id uuid,
  requested_by uuid,
  export_type text,
  export_label text,
  file_format text,
  status text,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  file_url text,
  filters jsonb,
  notes text,
  requested_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  return query
  select
    job.id,
    job.requested_by,
    job.export_type,
    coalesce(job.export_label, job.export_type) as export_label,
    coalesce(job.file_format, 'csv') as file_format,
    job.status,
    job.started_at,
    job.finished_at,
    job.file_url,
    job.filters,
    job.notes,
    coalesce(job.requested_at, job.created_at) as requested_at,
    job.created_at,
    job.updated_at
  from public.ops_export_jobs as job
  order by coalesce(job.requested_at, job.created_at) desc
  limit greatest(coalesce(p_limit, 20), 1);
end;
$$;

revoke all on function public.list_ops_export_jobs(integer) from public;
grant execute on function public.list_ops_export_jobs(integer) to authenticated;

create or replace function public.queue_ops_export_job(
  p_export_type text,
  p_export_label text default null,
  p_file_format text default 'csv',
  p_filters jsonb default '{}'::jsonb,
  p_notes text default null
)
returns public.ops_export_jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_row public.ops_export_jobs;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if nullif(btrim(coalesce(p_export_type, '')), '') is null then
    raise exception 'Export type is required';
  end if;

  insert into public.ops_export_jobs (
    requested_by,
    export_type,
    export_label,
    file_format,
    status,
    filters,
    notes,
    requested_at
  )
  values (
    auth.uid(),
    btrim(p_export_type),
    coalesce(nullif(btrim(coalesce(p_export_label, '')), ''), replace(btrim(p_export_type), '_', ' ')),
    coalesce(nullif(lower(btrim(coalesce(p_file_format, ''))), ''), 'csv'),
    'queued',
    coalesce(p_filters, '{}'::jsonb),
    nullif(btrim(coalesce(p_notes, '')), ''),
    timezone('utc', now())
  )
  returning * into saved_row;

  return saved_row;
end;
$$;

revoke all on function public.queue_ops_export_job(text, text, text, jsonb, text) from public;
grant execute on function public.queue_ops_export_job(text, text, text, jsonb, text) to authenticated;

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

create or replace function public.list_recent_backup_runs(p_limit integer default 12)
returns table (
  id uuid,
  policy_id uuid,
  policy_name text,
  run_status text,
  run_source text,
  backup_location text,
  bytes_copied bigint,
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  notes text,
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
    run.id,
    run.policy_id,
    run.policy_name,
    run.run_status,
    run.run_source,
    run.backup_location,
    run.bytes_copied,
    run.started_at,
    run.finished_at,
    run.notes,
    run.created_at
  from public.backup_run_logs as run
  order by run.started_at desc
  limit greatest(coalesce(p_limit, 12), 1);
end;
$$;

revoke all on function public.list_recent_backup_runs(integer) from public;
grant execute on function public.list_recent_backup_runs(integer) to authenticated;

create or replace function public.record_backup_run(
  p_policy_id uuid default null,
  p_policy_name text default null,
  p_run_status text default 'completed',
  p_run_source text default 'manual',
  p_backup_location text default null,
  p_bytes_copied bigint default null,
  p_notes text default null
)
returns public.backup_run_logs
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_row public.backup_run_logs;
  resolved_policy_name text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_policy_id is not null then
    select policy_name
    into resolved_policy_name
    from public.backup_policies
    where id = p_policy_id;
  end if;

  resolved_policy_name := coalesce(resolved_policy_name, nullif(btrim(coalesce(p_policy_name, '')), ''));

  insert into public.backup_run_logs (
    policy_id,
    policy_name,
    run_status,
    run_source,
    backup_location,
    bytes_copied,
    started_at,
    finished_at,
    notes
  )
  values (
    p_policy_id,
    resolved_policy_name,
    coalesce(nullif(btrim(coalesce(p_run_status, '')), ''), 'completed'),
    coalesce(nullif(btrim(coalesce(p_run_source, '')), ''), 'manual'),
    nullif(btrim(coalesce(p_backup_location, '')), ''),
    p_bytes_copied,
    timezone('utc', now()),
    timezone('utc', now()),
    nullif(btrim(coalesce(p_notes, '')), '')
  )
  returning * into saved_row;

  if p_policy_id is not null then
    update public.backup_policies
    set last_run_at = saved_row.finished_at
    where id = p_policy_id;
  elsif resolved_policy_name is not null then
    update public.backup_policies
    set last_run_at = saved_row.finished_at
    where policy_name = resolved_policy_name;
  end if;

  return saved_row;
end;
$$;

revoke all on function public.record_backup_run(uuid, text, text, text, text, bigint, text) from public;
grant execute on function public.record_backup_run(uuid, text, text, text, text, bigint, text) to authenticated;

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

  if nullif(btrim(coalesce(p_job_key, '')), '') is null then
    raise exception 'Job key is required';
  end if;

  if nullif(btrim(coalesce(p_job_name, '')), '') is null then
    raise exception 'Job name is required';
  end if;

  if nullif(btrim(coalesce(p_function_name, '')), '') is null then
    raise exception 'Function name is required';
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

create or replace function public.list_recent_job_runs(p_limit integer default 12)
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
  limit greatest(coalesce(p_limit, 12), 1);
end;
$$;

revoke all on function public.list_recent_job_runs(integer) from public;
grant execute on function public.list_recent_job_runs(integer) to authenticated;

create or replace function public.record_system_health_check(
  p_check_key text,
  p_check_name text,
  p_status text default 'unknown',
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

  if nullif(btrim(coalesce(p_check_key, '')), '') is null then
    raise exception 'Check key is required';
  end if;

  if nullif(btrim(coalesce(p_check_name, '')), '') is null then
    raise exception 'Check name is required';
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

create or replace function public.list_system_health_checks()
returns table (
  id uuid,
  check_key text,
  check_name text,
  status text,
  severity text,
  response_time_ms integer,
  meta jsonb,
  last_checked_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
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
    check_item.id,
    check_item.check_key,
    check_item.check_name,
    check_item.status,
    check_item.severity,
    check_item.response_time_ms,
    check_item.meta,
    check_item.last_checked_at,
    check_item.created_at,
    check_item.updated_at
  from public.system_health_checks as check_item
  order by
    case when lower(check_item.status) in ('healthy', 'success', 'ok') then 1 else 0 end,
    case lower(check_item.severity)
      when 'critical' then 0
      when 'error' then 1
      when 'warning' then 2
      else 3
    end,
    check_item.check_name asc;
end;
$$;

revoke all on function public.list_system_health_checks() from public;
grant execute on function public.list_system_health_checks() to authenticated;

create or replace function public.get_ops_tooling_snapshot()
returns table (
  total_members bigint,
  unpaid_invoices bigint,
  open_incident_count bigint,
  queued_export_count bigint,
  active_backup_policies bigint,
  failed_job_runs_7d bigint,
  unhealthy_health_checks bigint,
  latest_backup_status text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_total_members bigint := 0;
  v_unpaid_invoices bigint := 0;
  v_open_incident_count bigint := 0;
  v_queued_export_count bigint := 0;
  v_active_backup_policies bigint := 0;
  v_failed_job_runs_7d bigint := 0;
  v_unhealthy_health_checks bigint := 0;
  v_latest_backup_status text := 'unknown';
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
  end if;

  if to_regclass('public.billing_invoices') is not null then
    execute $ops$
      select count(*)::bigint
      from public.billing_invoices
      where invoice_status in ('issued', 'overdue', 'partially_paid')
    $ops$ into v_unpaid_invoices;
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

  if to_regclass('public.backup_policies') is not null then
    select count(*)::bigint
    into v_active_backup_policies
    from public.backup_policies
    where enabled;
  end if;

  if to_regclass('public.scheduled_job_runs') is not null then
    select count(*)::bigint
    into v_failed_job_runs_7d
    from public.scheduled_job_runs
    where run_status = 'failed'
      and started_at >= timezone('utc', now()) - interval '7 days';
  end if;

  if to_regclass('public.system_health_checks') is not null then
    select count(*)::bigint
    into v_unhealthy_health_checks
    from public.system_health_checks
    where lower(status) not in ('healthy', 'success', 'ok');
  end if;

  if to_regclass('public.backup_run_logs') is not null then
    select coalesce(run_status, 'unknown')
    into v_latest_backup_status
    from public.backup_run_logs
    order by coalesce(finished_at, started_at) desc, created_at desc
    limit 1;
  end if;

  return query
  select
    v_total_members,
    v_unpaid_invoices,
    v_open_incident_count,
    v_queued_export_count,
    v_active_backup_policies,
    v_failed_job_runs_7d,
    v_unhealthy_health_checks,
    coalesce(v_latest_backup_status, 'unknown');
end;
$$;

revoke all on function public.get_ops_tooling_snapshot() from public;
grant execute on function public.get_ops_tooling_snapshot() to authenticated;

create or replace function public.seed_ops_tooling_defaults()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  insert into public.ops_checklist_items (title, description, priority)
  select
    'Confirm backup owner and retention policy',
    'Document who verifies backups and how long each environment must be retained.',
    'high'
  where not exists (
    select 1 from public.ops_checklist_items where title = 'Confirm backup owner and retention policy'
  );

  insert into public.ops_checklist_items (title, description, priority)
  select
    'Review export queue hygiene',
    'Make sure old queued exports are either completed, failed with notes, or cleared by an operator.',
    'normal'
  where not exists (
    select 1 from public.ops_checklist_items where title = 'Review export queue hygiene'
  );

  insert into public.ops_checklist_items (title, description, priority)
  select
    'Verify health checks after deploy',
    'Update the latest health-check statuses after shipping a production change.',
    'normal'
  where not exists (
    select 1 from public.ops_checklist_items where title = 'Verify health checks after deploy'
  );

  insert into public.ops_release_notes (title, summary, body_markdown, published_at)
  select
    'Patch 39 workspace enabled',
    'Backup, export, and admin ops tools are now available from /admin/ops.',
    'Seeded by Patch 39 so the admin team has an initial workspace note.',
    timezone('utc', now())
  where not exists (
    select 1 from public.ops_release_notes where title = 'Patch 39 workspace enabled'
  );

  insert into public.backup_policies (
    policy_name,
    backup_scope,
    backup_mode,
    retention_days,
    enabled,
    notes,
    created_by
  )
  values
    ('daily-database-backup', 'database', 'scheduled', 30, true, 'Seeded by Patch 39', auth.uid()),
    ('weekly-storage-backup', 'storage', 'scheduled', 60, true, 'Seeded by Patch 39', auth.uid())
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
    settings,
    created_by
  )
  values
    ('renewal-reminders', 'Renewal reminders', 'run-renewal-reminders', 'daily 08:00', 'scheduled', true, '{}'::jsonb, auth.uid()),
    ('daily-ops-summary', 'Daily ops summary', 'run-daily-ops-summary', 'daily 20:00', 'scheduled', true, '{}'::jsonb, auth.uid()),
    ('ops-export-processor', 'Ops export processor', 'run-ops-export-processor', 'hourly', 'scheduled', true, '{}'::jsonb, auth.uid())
  on conflict (job_key) do update
  set
    job_name = excluded.job_name,
    function_name = excluded.function_name,
    schedule_label = excluded.schedule_label,
    trigger_mode = excluded.trigger_mode,
    enabled = excluded.enabled,
    settings = excluded.settings;

  insert into public.system_health_checks (
    check_key,
    check_name,
    status,
    severity,
    response_time_ms,
    meta,
    last_checked_at
  )
  values
    ('public-homepage', 'Public homepage', 'healthy', 'info', 180, jsonb_build_object('surface', 'marketing-site'), timezone('utc', now())),
    ('admin-rpc-snapshot', 'Admin RPC snapshot', 'healthy', 'info', 240, jsonb_build_object('surface', 'admin-ops'), timezone('utc', now())),
    ('export-queue-worker', 'Export queue worker', 'unknown', 'warning', null, jsonb_build_object('surface', 'ops'), timezone('utc', now()))
  on conflict (check_key) do update
  set
    check_name = excluded.check_name,
    status = excluded.status,
    severity = excluded.severity,
    response_time_ms = excluded.response_time_ms,
    meta = excluded.meta,
    last_checked_at = excluded.last_checked_at;

  return jsonb_build_object(
    'ok', true,
    'seeded_at', timezone('utc', now()),
    'message', 'Patch 39 defaults seeded.'
  );
end;
$$;

revoke all on function public.seed_ops_tooling_defaults() from public;
grant execute on function public.seed_ops_tooling_defaults() to authenticated;
