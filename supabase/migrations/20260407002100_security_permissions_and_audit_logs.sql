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

create table if not exists public.permission_overrides (
  id uuid primary key default gen_random_uuid(),
  role_name text not null,
  permission_key text not null,
  access_mode text not null default 'allow',
  notes text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint permission_overrides_role_name_check check (role_name in ('member', 'staff', 'admin')),
  constraint permission_overrides_access_mode_check check (access_mode in ('allow', 'deny')),
  constraint permission_overrides_role_permission_unique unique (role_name, permission_key)
);

create table if not exists public.audit_log_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references public.profiles(id) on delete set null,
  actor_email text,
  actor_role text,
  branch_id uuid references public.gym_branches(id) on delete set null,
  entity_type text not null,
  entity_id text,
  action_key text not null,
  action_summary text,
  before_state jsonb not null default '{}'::jsonb,
  after_state jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  request_ip text,
  user_agent text,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.security_incidents (
  id uuid primary key default gen_random_uuid(),
  incident_status text not null default 'open',
  severity text not null default 'medium',
  title text not null,
  description text,
  branch_id uuid references public.gym_branches(id) on delete set null,
  owner_user_id uuid references public.profiles(id) on delete set null,
  related_user_id uuid references public.profiles(id) on delete set null,
  related_entity_type text,
  related_entity_id text,
  resolution_notes text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  resolved_at timestamp with time zone,
  constraint security_incidents_status_check check (incident_status in ('open', 'monitoring', 'resolved')),
  constraint security_incidents_severity_check check (severity in ('low', 'medium', 'high', 'critical'))
);

create table if not exists public.user_security_flags (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  require_password_reset boolean not null default false,
  member_portal_access boolean not null default true,
  staff_portal_access boolean not null default true,
  admin_portal_access boolean not null default true,
  notes text,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists audit_log_events_created_at_idx
  on public.audit_log_events (created_at desc);

create index if not exists audit_log_events_action_key_created_at_idx
  on public.audit_log_events (action_key, created_at desc);

create index if not exists audit_log_events_entity_type_created_at_idx
  on public.audit_log_events (entity_type, created_at desc);

create index if not exists security_incidents_status_severity_idx
  on public.security_incidents (incident_status, severity, updated_at desc);

create index if not exists user_security_flags_updated_at_idx
  on public.user_security_flags (updated_at desc);

drop trigger if exists permission_overrides_handle_updated_at on public.permission_overrides;
create trigger permission_overrides_handle_updated_at
before update on public.permission_overrides
for each row execute function public.handle_updated_at();

drop trigger if exists security_incidents_handle_updated_at on public.security_incidents;
create trigger security_incidents_handle_updated_at
before update on public.security_incidents
for each row execute function public.handle_updated_at();

drop trigger if exists user_security_flags_handle_updated_at on public.user_security_flags;
create trigger user_security_flags_handle_updated_at
before update on public.user_security_flags
for each row execute function public.handle_updated_at();

alter table public.permission_overrides enable row level security;
alter table public.audit_log_events enable row level security;
alter table public.security_incidents enable row level security;
alter table public.user_security_flags enable row level security;

drop policy if exists "Admins can manage permission overrides" on public.permission_overrides;
create policy "Admins can manage permission overrides"
on public.permission_overrides
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can view audit log events" on public.audit_log_events;
create policy "Admins can view audit log events"
on public.audit_log_events
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can insert audit log events" on public.audit_log_events;
create policy "Admins can insert audit log events"
on public.audit_log_events
for insert
to authenticated
with check (public.is_admin());

drop policy if exists "Admins can manage security incidents" on public.security_incidents;
create policy "Admins can manage security incidents"
on public.security_incidents
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage user security flags" on public.user_security_flags;
create policy "Admins can manage user security flags"
on public.user_security_flags
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.list_security_dashboard_snapshot()
returns table (
  open_incidents bigint,
  critical_incidents bigint,
  overrides_count bigint,
  flagged_users bigint,
  audit_events_7d bigint,
  audit_events_30d bigint
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
    count(*) filter (where incident_status in ('open', 'monitoring'))::bigint as open_incidents,
    count(*) filter (where severity = 'critical' and incident_status in ('open', 'monitoring'))::bigint as critical_incidents,
    (select count(*)::bigint from public.permission_overrides) as overrides_count,
    (
      select count(*)::bigint
      from public.user_security_flags
      where require_password_reset = true
         or member_portal_access = false
         or staff_portal_access = false
         or admin_portal_access = false
    ) as flagged_users,
    (
      select count(*)::bigint
      from public.audit_log_events
      where created_at >= timezone('utc', now()) - interval '7 days'
    ) as audit_events_7d,
    (
      select count(*)::bigint
      from public.audit_log_events
      where created_at >= timezone('utc', now()) - interval '30 days'
    ) as audit_events_30d
  from public.security_incidents;
end;
$$;

revoke all on function public.list_security_dashboard_snapshot() from public;
grant execute on function public.list_security_dashboard_snapshot() to authenticated;

create or replace function public.list_permission_overrides()
returns table (
  id uuid,
  role_name text,
  permission_key text,
  access_mode text,
  notes text,
  updated_by uuid,
  updated_by_name text,
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
    overrides.id,
    overrides.role_name,
    overrides.permission_key,
    overrides.access_mode,
    overrides.notes,
    overrides.updated_by,
    updater.full_name as updated_by_name,
    overrides.created_at,
    overrides.updated_at
  from public.permission_overrides as overrides
  left join public.profiles as updater on updater.id = overrides.updated_by
  order by overrides.role_name asc, overrides.permission_key asc;
end;
$$;

revoke all on function public.list_permission_overrides() from public;
grant execute on function public.list_permission_overrides() to authenticated;

create or replace function public.upsert_permission_override(
  p_role_name text,
  p_permission_key text,
  p_access_mode text,
  p_notes text default null
)
returns public.permission_overrides
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_record public.permission_overrides;
  cleaned_permission_key text;
  cleaned_notes text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  cleaned_permission_key := nullif(lower(btrim(coalesce(p_permission_key, ''))), '');
  cleaned_notes := nullif(btrim(coalesce(p_notes, '')), '');

  if p_role_name not in ('member', 'staff', 'admin') then
    raise exception 'Unsupported role name.';
  end if;

  if cleaned_permission_key is null then
    raise exception 'Permission key is required.';
  end if;

  if p_access_mode not in ('allow', 'deny') then
    raise exception 'Unsupported access mode.';
  end if;

  insert into public.permission_overrides (
    role_name,
    permission_key,
    access_mode,
    notes,
    updated_by
  )
  values (
    p_role_name,
    cleaned_permission_key,
    p_access_mode,
    cleaned_notes,
    auth.uid()
  )
  on conflict (role_name, permission_key)
  do update
  set
    access_mode = excluded.access_mode,
    notes = excluded.notes,
    updated_by = auth.uid(),
    updated_at = timezone('utc', now())
  returning * into saved_record;

  insert into public.audit_log_events (
    actor_user_id,
    actor_email,
    actor_role,
    entity_type,
    entity_id,
    action_key,
    action_summary,
    metadata
  )
  values (
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    (select role from public.profiles where id = auth.uid()),
    'permission_override',
    saved_record.id::text,
    'security.permission_override_upsert',
    format('Updated override %s for %s', saved_record.permission_key, saved_record.role_name),
    jsonb_build_object(
      'role_name', saved_record.role_name,
      'permission_key', saved_record.permission_key,
      'access_mode', saved_record.access_mode
    )
  );

  return saved_record;
end;
$$;

revoke all on function public.upsert_permission_override(text, text, text, text) from public;
grant execute on function public.upsert_permission_override(text, text, text, text) to authenticated;

create or replace function public.delete_permission_override(p_override_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_record public.permission_overrides;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select *
  into existing_record
  from public.permission_overrides
  where id = p_override_id
  for update;

  if existing_record.id is null then
    raise exception 'Permission override not found.';
  end if;

  delete from public.permission_overrides where id = p_override_id;

  insert into public.audit_log_events (
    actor_user_id,
    actor_email,
    actor_role,
    entity_type,
    entity_id,
    action_key,
    action_summary,
    metadata
  )
  values (
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    (select role from public.profiles where id = auth.uid()),
    'permission_override',
    existing_record.id::text,
    'security.permission_override_delete',
    format('Deleted override %s for %s', existing_record.permission_key, existing_record.role_name),
    jsonb_build_object(
      'role_name', existing_record.role_name,
      'permission_key', existing_record.permission_key,
      'access_mode', existing_record.access_mode
    )
  );
end;
$$;

revoke all on function public.delete_permission_override(uuid) from public;
grant execute on function public.delete_permission_override(uuid) to authenticated;

create or replace function public.list_security_incidents(
  p_status text default null,
  p_severity text default null,
  p_limit integer default 50
)
returns table (
  id uuid,
  incident_status text,
  severity text,
  title text,
  description text,
  branch_id uuid,
  branch_name text,
  owner_user_id uuid,
  owner_name text,
  related_user_id uuid,
  related_user_name text,
  related_entity_type text,
  related_entity_id text,
  resolution_notes text,
  created_by uuid,
  created_by_name text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  resolved_at timestamp with time zone
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
    incidents.id,
    incidents.incident_status,
    incidents.severity,
    incidents.title,
    incidents.description,
    incidents.branch_id,
    branches.name as branch_name,
    incidents.owner_user_id,
    owner_profile.full_name as owner_name,
    incidents.related_user_id,
    related_profile.full_name as related_user_name,
    incidents.related_entity_type,
    incidents.related_entity_id,
    incidents.resolution_notes,
    incidents.created_by,
    creator_profile.full_name as created_by_name,
    incidents.created_at,
    incidents.updated_at,
    incidents.resolved_at
  from public.security_incidents as incidents
  left join public.gym_branches as branches on branches.id = incidents.branch_id
  left join public.profiles as owner_profile on owner_profile.id = incidents.owner_user_id
  left join public.profiles as related_profile on related_profile.id = incidents.related_user_id
  left join public.profiles as creator_profile on creator_profile.id = incidents.created_by
  where (p_status is null or incidents.incident_status = p_status)
    and (p_severity is null or incidents.severity = p_severity)
  order by
    case incidents.incident_status
      when 'open' then 0
      when 'monitoring' then 1
      else 2
    end asc,
    incidents.updated_at desc
  limit greatest(coalesce(p_limit, 50), 1);
end;
$$;

revoke all on function public.list_security_incidents(text, text, integer) from public;
grant execute on function public.list_security_incidents(text, text, integer) to authenticated;

create or replace function public.save_security_incident(
  p_id uuid default null,
  p_incident_status text default 'open',
  p_severity text default 'medium',
  p_title text default null,
  p_description text default null,
  p_branch_id uuid default null,
  p_owner_user_id uuid default null,
  p_related_user_id uuid default null,
  p_related_entity_type text default null,
  p_related_entity_id text default null,
  p_resolution_notes text default null
)
returns public.security_incidents
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_record public.security_incidents;
  cleaned_title text;
  cleaned_description text;
  cleaned_related_entity_type text;
  cleaned_related_entity_id text;
  cleaned_resolution_notes text;
  action_label text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  cleaned_title := nullif(btrim(coalesce(p_title, '')), '');
  cleaned_description := nullif(btrim(coalesce(p_description, '')), '');
  cleaned_related_entity_type := nullif(lower(btrim(coalesce(p_related_entity_type, ''))), '');
  cleaned_related_entity_id := nullif(btrim(coalesce(p_related_entity_id, '')), '');
  cleaned_resolution_notes := nullif(btrim(coalesce(p_resolution_notes, '')), '');

  if cleaned_title is null then
    raise exception 'Incident title is required.';
  end if;

  if p_incident_status not in ('open', 'monitoring', 'resolved') then
    raise exception 'Unsupported incident status.';
  end if;

  if p_severity not in ('low', 'medium', 'high', 'critical') then
    raise exception 'Unsupported severity level.';
  end if;

  if p_id is null then
    insert into public.security_incidents (
      incident_status,
      severity,
      title,
      description,
      branch_id,
      owner_user_id,
      related_user_id,
      related_entity_type,
      related_entity_id,
      resolution_notes,
      created_by,
      resolved_at
    )
    values (
      p_incident_status,
      p_severity,
      cleaned_title,
      cleaned_description,
      p_branch_id,
      p_owner_user_id,
      p_related_user_id,
      cleaned_related_entity_type,
      cleaned_related_entity_id,
      cleaned_resolution_notes,
      auth.uid(),
      case when p_incident_status = 'resolved' then timezone('utc', now()) else null end
    )
    returning * into saved_record;

    action_label := 'security.incident_create';
  else
    update public.security_incidents
    set
      incident_status = p_incident_status,
      severity = p_severity,
      title = cleaned_title,
      description = cleaned_description,
      branch_id = p_branch_id,
      owner_user_id = p_owner_user_id,
      related_user_id = p_related_user_id,
      related_entity_type = cleaned_related_entity_type,
      related_entity_id = cleaned_related_entity_id,
      resolution_notes = cleaned_resolution_notes,
      resolved_at = case when p_incident_status = 'resolved' then coalesce(resolved_at, timezone('utc', now())) else null end,
      updated_at = timezone('utc', now())
    where id = p_id
    returning * into saved_record;

    if saved_record.id is null then
      raise exception 'Security incident not found.';
    end if;

    action_label := 'security.incident_update';
  end if;

  insert into public.audit_log_events (
    actor_user_id,
    actor_email,
    actor_role,
    branch_id,
    entity_type,
    entity_id,
    action_key,
    action_summary,
    metadata
  )
  values (
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    (select role from public.profiles where id = auth.uid()),
    saved_record.branch_id,
    'security_incident',
    saved_record.id::text,
    action_label,
    format('Saved incident "%s" (%s)', saved_record.title, saved_record.incident_status),
    jsonb_build_object(
      'severity', saved_record.severity,
      'status', saved_record.incident_status,
      'related_entity_type', saved_record.related_entity_type,
      'related_entity_id', saved_record.related_entity_id
    )
  );

  return saved_record;
end;
$$;

revoke all on function public.save_security_incident(uuid, text, text, text, text, uuid, uuid, uuid, text, text, text) from public;
grant execute on function public.save_security_incident(uuid, text, text, text, text, uuid, uuid, uuid, text, text, text) to authenticated;

create or replace function public.list_security_subject_users(
  p_search text default null,
  p_limit integer default 100
)
returns table (
  id uuid,
  full_name text,
  email text,
  role text,
  membership_status text,
  is_active boolean
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
    profiles.id,
    profiles.full_name,
    profiles.email,
    profiles.role,
    profiles.membership_status,
    profiles.is_active
  from public.profiles as profiles
  where (
    p_search is null
    or profiles.full_name ilike '%' || p_search || '%'
    or profiles.email ilike '%' || p_search || '%'
    or coalesce(profiles.phone, '') ilike '%' || p_search || '%'
  )
  order by profiles.full_name asc nulls last
  limit greatest(coalesce(p_limit, 100), 1);
end;
$$;

revoke all on function public.list_security_subject_users(text, integer) from public;
grant execute on function public.list_security_subject_users(text, integer) to authenticated;

create or replace function public.list_security_branches()
returns table (
  id uuid,
  branch_code text,
  name text,
  city text,
  state text,
  is_active boolean
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
    branches.id,
    branches.branch_code,
    branches.name,
    branches.city,
    branches.state,
    branches.is_active
  from public.gym_branches as branches
  order by branches.name asc;
end;
$$;

revoke all on function public.list_security_branches() from public;
grant execute on function public.list_security_branches() to authenticated;

create or replace function public.list_user_security_flags(
  p_search text default null,
  p_limit integer default 80
)
returns table (
  user_id uuid,
  full_name text,
  email text,
  role text,
  membership_status text,
  require_password_reset boolean,
  member_portal_access boolean,
  staff_portal_access boolean,
  admin_portal_access boolean,
  notes text,
  updated_at timestamp with time zone,
  updated_by uuid,
  updated_by_name text
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
    profiles.id as user_id,
    profiles.full_name,
    profiles.email,
    profiles.role,
    profiles.membership_status,
    coalesce(flags.require_password_reset, false) as require_password_reset,
    coalesce(flags.member_portal_access, true) as member_portal_access,
    coalesce(flags.staff_portal_access, true) as staff_portal_access,
    coalesce(flags.admin_portal_access, true) as admin_portal_access,
    flags.notes,
    coalesce(flags.updated_at, profiles.updated_at, profiles.created_at, timezone('utc', now())) as updated_at,
    flags.updated_by,
    updater.full_name as updated_by_name
  from public.profiles as profiles
  left join public.user_security_flags as flags on flags.user_id = profiles.id
  left join public.profiles as updater on updater.id = flags.updated_by
  where (
    p_search is null
    or profiles.full_name ilike '%' || p_search || '%'
    or profiles.email ilike '%' || p_search || '%'
    or coalesce(profiles.phone, '') ilike '%' || p_search || '%'
  )
  order by
    coalesce(flags.require_password_reset, false) desc,
    coalesce(flags.updated_at, profiles.updated_at, profiles.created_at, timezone('utc', now())) desc,
    profiles.full_name asc nulls last
  limit greatest(coalesce(p_limit, 80), 1);
end;
$$;

revoke all on function public.list_user_security_flags(text, integer) from public;
grant execute on function public.list_user_security_flags(text, integer) to authenticated;

create or replace function public.upsert_user_security_flag(
  p_user_id uuid,
  p_require_password_reset boolean default false,
  p_member_portal_access boolean default true,
  p_staff_portal_access boolean default true,
  p_admin_portal_access boolean default true,
  p_notes text default null
)
returns public.user_security_flags
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_record public.user_security_flags;
  cleaned_notes text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_user_id is null then
    raise exception 'User is required.';
  end if;

  cleaned_notes := nullif(btrim(coalesce(p_notes, '')), '');

  insert into public.user_security_flags (
    user_id,
    require_password_reset,
    member_portal_access,
    staff_portal_access,
    admin_portal_access,
    notes,
    updated_by
  )
  values (
    p_user_id,
    coalesce(p_require_password_reset, false),
    coalesce(p_member_portal_access, true),
    coalesce(p_staff_portal_access, true),
    coalesce(p_admin_portal_access, true),
    cleaned_notes,
    auth.uid()
  )
  on conflict (user_id)
  do update
  set
    require_password_reset = excluded.require_password_reset,
    member_portal_access = excluded.member_portal_access,
    staff_portal_access = excluded.staff_portal_access,
    admin_portal_access = excluded.admin_portal_access,
    notes = excluded.notes,
    updated_by = auth.uid(),
    updated_at = timezone('utc', now())
  returning * into saved_record;

  insert into public.audit_log_events (
    actor_user_id,
    actor_email,
    actor_role,
    entity_type,
    entity_id,
    action_key,
    action_summary,
    metadata
  )
  values (
    auth.uid(),
    (select email from public.profiles where id = auth.uid()),
    (select role from public.profiles where id = auth.uid()),
    'user_security_flag',
    saved_record.user_id::text,
    'security.user_flag_upsert',
    format('Updated security controls for %s', coalesce((select email from public.profiles where id = saved_record.user_id), saved_record.user_id::text)),
    jsonb_build_object(
      'require_password_reset', saved_record.require_password_reset,
      'member_portal_access', saved_record.member_portal_access,
      'staff_portal_access', saved_record.staff_portal_access,
      'admin_portal_access', saved_record.admin_portal_access
    )
  );

  return saved_record;
end;
$$;

revoke all on function public.upsert_user_security_flag(uuid, boolean, boolean, boolean, boolean, text) from public;
grant execute on function public.upsert_user_security_flag(uuid, boolean, boolean, boolean, boolean, text) to authenticated;

create or replace function public.list_audit_log_events(
  p_limit integer default 100,
  p_action_key text default null,
  p_entity_type text default null,
  p_branch_id uuid default null
)
returns table (
  id uuid,
  actor_user_id uuid,
  actor_full_name text,
  actor_email text,
  actor_role text,
  branch_id uuid,
  branch_name text,
  entity_type text,
  entity_id text,
  action_key text,
  action_summary text,
  metadata jsonb,
  created_at timestamp with time zone
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
    events.id,
    events.actor_user_id,
    actor_profile.full_name as actor_full_name,
    events.actor_email,
    events.actor_role,
    events.branch_id,
    branches.name as branch_name,
    events.entity_type,
    events.entity_id,
    events.action_key,
    events.action_summary,
    events.metadata,
    events.created_at
  from public.audit_log_events as events
  left join public.profiles as actor_profile on actor_profile.id = events.actor_user_id
  left join public.gym_branches as branches on branches.id = events.branch_id
  where (p_action_key is null or events.action_key = p_action_key)
    and (p_entity_type is null or events.entity_type = p_entity_type)
    and (p_branch_id is null or events.branch_id = p_branch_id)
  order by events.created_at desc
  limit greatest(coalesce(p_limit, 100), 1);
end;
$$;

revoke all on function public.list_audit_log_events(integer, text, text, uuid) from public;
grant execute on function public.list_audit_log_events(integer, text, text, uuid) to authenticated;
