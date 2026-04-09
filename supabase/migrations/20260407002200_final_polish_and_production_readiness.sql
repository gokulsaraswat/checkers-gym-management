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
  status text not null default 'queued' check (status in ('queued', 'running', 'completed', 'failed')),
  started_at timestamp with time zone,
  finished_at timestamp with time zone,
  file_url text,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists ops_checklist_items_completed_idx on public.ops_checklist_items (completed, priority);
create index if not exists ops_incidents_status_idx on public.ops_incidents (status, severity);
create index if not exists ops_release_notes_published_idx on public.ops_release_notes (published_at desc);
create index if not exists ops_export_jobs_status_idx on public.ops_export_jobs (status, created_at desc);

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

alter table public.ops_checklist_items enable row level security;
alter table public.ops_incidents enable row level security;
alter table public.ops_release_notes enable row level security;
alter table public.ops_export_jobs enable row level security;

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
as $$
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
    execute $$
      select count(*)::bigint
      from public.profiles
      where role = 'member'
    $$ into v_total_members;

    execute $$
      select count(*)::bigint
      from public.profiles
      where role = 'member'
        and membership_status = 'active'
    $$ into v_active_members;

    execute $$
      select count(*)::bigint
      from public.profiles
      where role = 'member'
        and membership_end_date is not null
        and membership_end_date >= current_date
        and membership_end_date <= current_date + interval '30 days'
    $$ into v_expiring_members_30d;
  end if;

  if to_regclass('public.billing_invoices') is not null then
    execute $$
      select count(*)::bigint
      from public.billing_invoices
      where invoice_status in ('issued', 'overdue', 'partially_paid')
    $$ into v_unpaid_invoices;
  end if;

  if to_regclass('public.gym_branches') is not null then
    execute 'select count(*)::bigint from public.gym_branches' into v_branch_count;
  end if;

  select count(*)::bigint
  into v_open_incident_count
  from public.ops_incidents
  where status <> 'resolved';

  select count(*)::bigint
  into v_queued_export_count
  from public.ops_export_jobs
  where status in ('queued', 'running');

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
$$;

revoke all on function public.get_admin_operations_snapshot() from public;
grant execute on function public.get_admin_operations_snapshot() to authenticated;

insert into public.ops_checklist_items (title, description, priority, completed)
select *
from (
  values
    ('Deploy critical Edge Functions', 'Confirm billing, payment, QR, and webhook functions are deployed in the target Supabase project.', 'critical', false),
    ('Verify payment and email secrets', 'Check that Razorpay and Resend secrets are set and valid in the production environment.', 'critical', false),
    ('Review branch and security policies', 'Walk through role access, branch assignments, and incident/audit views before go-live.', 'high', false),
    ('Test tablet and laptop layouts', 'Validate the main admin surfaces on the actual devices used at reception and by managers.', 'high', false),
    ('Dry-run exports and renewal flow', 'Generate a finance export, issue a renewal invoice, and confirm the member email path works.', 'high', false)
) as seed(title, description, priority, completed)
where not exists (select 1 from public.ops_checklist_items);

insert into public.ops_release_notes (title, summary, body_markdown)
select *
from (
  values
    (
      'Operations workspace enabled',
      'Patch 21 adds an admin ops board for launch readiness, incidents, and release visibility.',
      'Use this page to track pre-launch tasks, surface open incidents, and keep admins aligned on what changed recently.'
    )
) as seed(title, summary, body_markdown)
where not exists (select 1 from public.ops_release_notes);
