alter table public.audit_log_events
  add column if not exists severity text not null default 'info';

alter table public.audit_log_events
  add column if not exists source_area text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'audit_log_events_severity_check'
      and conrelid = 'public.audit_log_events'::regclass
  ) then
    alter table public.audit_log_events
      add constraint audit_log_events_severity_check
      check (severity in ('info', 'warn', 'critical'));
  end if;
end $$;

create index if not exists audit_log_events_severity_created_at_idx
  on public.audit_log_events (severity, created_at desc);

create index if not exists audit_log_events_source_area_created_at_idx
  on public.audit_log_events (source_area, created_at desc);

create or replace function public.get_current_user_security_policy()
returns table (
  user_id uuid,
  role text,
  require_password_reset boolean,
  member_portal_access boolean,
  staff_portal_access boolean,
  admin_portal_access boolean,
  denied_permissions jsonb,
  allowed_permissions jsonb,
  notes text,
  updated_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    profiles.id as user_id,
    profiles.role,
    coalesce(flags.require_password_reset, false) as require_password_reset,
    coalesce(flags.member_portal_access, true) as member_portal_access,
    coalesce(flags.staff_portal_access, true) as staff_portal_access,
    coalesce(flags.admin_portal_access, true) as admin_portal_access,
    coalesce(
      (
        select jsonb_agg(overrides.permission_key order by overrides.permission_key)
        from public.permission_overrides as overrides
        where overrides.role_name = profiles.role
          and overrides.access_mode = 'deny'
      ),
      '[]'::jsonb
    ) as denied_permissions,
    coalesce(
      (
        select jsonb_agg(overrides.permission_key order by overrides.permission_key)
        from public.permission_overrides as overrides
        where overrides.role_name = profiles.role
          and overrides.access_mode = 'allow'
      ),
      '[]'::jsonb
    ) as allowed_permissions,
    flags.notes,
    coalesce(flags.updated_at, profiles.updated_at, profiles.created_at, timezone('utc', now())) as updated_at
  from public.profiles as profiles
  left join public.user_security_flags as flags on flags.user_id = profiles.id
  where profiles.id = current_user_id;
end;
$$;

revoke all on function public.get_current_user_security_policy() from public;
grant execute on function public.get_current_user_security_policy() to authenticated;

create or replace function public.log_security_event(
  p_action_key text,
  p_entity_type text default 'security_policy',
  p_entity_id text default null,
  p_action_summary text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_severity text default 'warn',
  p_source_area text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid;
  actor_profile public.profiles%rowtype;
  saved_event_id uuid;
  cleaned_action_key text;
  cleaned_entity_type text;
  cleaned_entity_id text;
  cleaned_summary text;
  cleaned_source_area text;
  cleaned_severity text;
begin
  current_user_id := auth.uid();

  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into actor_profile
  from public.profiles
  where id = current_user_id;

  if actor_profile.id is null then
    raise exception 'Actor profile not found';
  end if;

  cleaned_action_key := nullif(lower(btrim(coalesce(p_action_key, ''))), '');
  cleaned_entity_type := coalesce(nullif(btrim(coalesce(p_entity_type, '')), ''), 'security_policy');
  cleaned_entity_id := nullif(btrim(coalesce(p_entity_id, '')), '');
  cleaned_summary := nullif(btrim(coalesce(p_action_summary, '')), '');
  cleaned_source_area := nullif(lower(btrim(coalesce(p_source_area, ''))), '');
  cleaned_severity := lower(btrim(coalesce(p_severity, 'warn')));

  if cleaned_action_key is null then
    raise exception 'Action key is required';
  end if;

  if cleaned_action_key not like 'security.%' and cleaned_action_key not like 'auth.%' then
    raise exception 'Unsupported action key';
  end if;

  if cleaned_severity not in ('info', 'warn', 'critical') then
    raise exception 'Unsupported severity';
  end if;

  insert into public.audit_log_events (
    actor_user_id,
    actor_email,
    actor_role,
    entity_type,
    entity_id,
    action_key,
    action_summary,
    metadata,
    severity,
    source_area
  )
  values (
    current_user_id,
    actor_profile.email,
    actor_profile.role,
    cleaned_entity_type,
    cleaned_entity_id,
    cleaned_action_key,
    cleaned_summary,
    coalesce(p_metadata, '{}'::jsonb),
    cleaned_severity,
    cleaned_source_area
  )
  returning id into saved_event_id;

  return saved_event_id;
end;
$$;

revoke all on function public.log_security_event(text, text, text, text, jsonb, text, text) from public;
grant execute on function public.log_security_event(text, text, text, text, jsonb, text, text) to authenticated;
