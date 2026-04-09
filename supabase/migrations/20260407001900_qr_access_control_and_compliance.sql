create extension if not exists "pgcrypto";

create table if not exists public.access_points (
  id uuid primary key default gen_random_uuid(),
  branch_name text not null default 'Main Branch',
  name text not null,
  point_type text not null default 'front_desk',
  description text,
  offline_code text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint access_points_point_type_check check (point_type in ('front_desk', 'turnstile', 'door', 'studio', 'gate', 'self_check')),
  constraint access_points_branch_name_name_key unique (branch_name, name)
);

create table if not exists public.liability_waiver_templates (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  version_code text not null unique,
  summary text,
  active_from date not null default current_date,
  requires_renewal boolean not null default false,
  renewal_days integer,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint liability_waiver_templates_renewal_days_check check (renewal_days is null or renewal_days > 0)
);

create table if not exists public.member_waiver_acceptances (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  waiver_template_id uuid not null references public.liability_waiver_templates(id) on delete cascade,
  accepted_at timestamp with time zone not null default timezone('utc', now()),
  acceptance_source text not null default 'member_app',
  expires_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint member_waiver_acceptances_source_check check (acceptance_source in ('member_app', 'staff_desk', 'admin_panel', 'import')),
  constraint member_waiver_acceptances_user_template_key unique (user_id, waiver_template_id)
);

create table if not exists public.member_access_passes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  access_token text not null unique,
  issued_by uuid references public.profiles(id) on delete set null,
  issued_for_date date not null default current_date,
  status text not null default 'active',
  expires_at timestamp with time zone not null,
  last_verified_at timestamp with time zone,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint member_access_passes_status_check check (status in ('active', 'used', 'revoked', 'expired'))
);

create table if not exists public.access_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  access_point_id uuid references public.access_points(id) on delete set null,
  access_pass_id uuid references public.member_access_passes(id) on delete set null,
  entry_method text not null default 'qr',
  decision text not null,
  denial_reason text,
  membership_status text,
  plan_name text,
  waiver_status text,
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc', now()),
  constraint access_events_entry_method_check check (entry_method in ('qr', 'manual', 'staff_override', 'offline_code')),
  constraint access_events_decision_check check (decision in ('allow', 'deny'))
);

create index if not exists member_access_passes_user_status_idx
  on public.member_access_passes (user_id, status, expires_at desc);

create index if not exists member_access_passes_expires_at_idx
  on public.member_access_passes (expires_at asc);

create index if not exists access_events_created_at_idx
  on public.access_events (created_at desc);

create index if not exists access_events_user_created_at_idx
  on public.access_events (user_id, created_at desc);

create index if not exists member_waiver_acceptances_user_expires_at_idx
  on public.member_waiver_acceptances (user_id, expires_at desc);

create or replace function public.touch_access_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists access_points_touch_updated_at on public.access_points;
create trigger access_points_touch_updated_at
before update on public.access_points
for each row
execute function public.touch_access_updated_at();

drop trigger if exists liability_waiver_templates_touch_updated_at on public.liability_waiver_templates;
create trigger liability_waiver_templates_touch_updated_at
before update on public.liability_waiver_templates
for each row
execute function public.touch_access_updated_at();

drop trigger if exists member_waiver_acceptances_touch_updated_at on public.member_waiver_acceptances;
create trigger member_waiver_acceptances_touch_updated_at
before update on public.member_waiver_acceptances
for each row
execute function public.touch_access_updated_at();

drop trigger if exists member_access_passes_touch_updated_at on public.member_access_passes;
create trigger member_access_passes_touch_updated_at
before update on public.member_access_passes
for each row
execute function public.touch_access_updated_at();

create or replace function public.member_has_valid_waiver(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  with active_templates as (
    select id
    from public.liability_waiver_templates
    where is_active = true
  ),
  required_count as (
    select count(*) as total
    from active_templates
  ),
  matched_acceptances as (
    select count(distinct acceptances.waiver_template_id) as total
    from public.member_waiver_acceptances as acceptances
    inner join active_templates on active_templates.id = acceptances.waiver_template_id
    where acceptances.user_id = p_user_id
      and (acceptances.expires_at is null or acceptances.expires_at > timezone('utc', now()))
  )
  select case
    when (select total from required_count) = 0 then true
    else (select total from matched_acceptances) = (select total from required_count)
  end;
$$;

create or replace function public.accept_active_waiver(p_source text default 'member_app')
returns public.member_waiver_acceptances
language plpgsql
security definer
set search_path = public
as $$
declare
  target_template public.liability_waiver_templates;
  saved_acceptance public.member_waiver_acceptances;
  cleaned_source text;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  cleaned_source := coalesce(nullif(btrim(coalesce(p_source, '')), ''), 'member_app');

  select *
  into target_template
  from public.liability_waiver_templates
  where is_active = true
  order by active_from desc, created_at desc
  limit 1;

  if target_template.id is null then
    raise exception 'No active waiver template is configured.';
  end if;

  insert into public.member_waiver_acceptances (
    user_id,
    waiver_template_id,
    accepted_at,
    acceptance_source,
    expires_at
  )
  values (
    auth.uid(),
    target_template.id,
    timezone('utc', now()),
    cleaned_source,
    case
      when target_template.requires_renewal and target_template.renewal_days is not null
        then timezone('utc', now()) + make_interval(days => target_template.renewal_days)
      else null
    end
  )
  on conflict (user_id, waiver_template_id)
  do update
  set
    accepted_at = excluded.accepted_at,
    acceptance_source = excluded.acceptance_source,
    expires_at = excluded.expires_at,
    updated_at = timezone('utc', now())
  returning * into saved_acceptance;

  return saved_acceptance;
end;
$$;

revoke all on function public.accept_active_waiver(text) from public;
grant execute on function public.accept_active_waiver(text) to authenticated;

create or replace function public.issue_member_access_pass(p_expires_in_minutes integer default 15)
returns public.member_access_passes
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_pass public.member_access_passes;
  effective_minutes integer;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  if not public.is_active_member(auth.uid()) then
    raise exception 'Only active members can issue an access pass.';
  end if;

  effective_minutes := greatest(coalesce(p_expires_in_minutes, 15), 5);

  update public.member_access_passes
  set
    status = 'expired',
    updated_at = timezone('utc', now())
  where user_id = auth.uid()
    and status = 'active'
    and expires_at <= timezone('utc', now());

  insert into public.member_access_passes (
    user_id,
    access_token,
    issued_by,
    issued_for_date,
    status,
    expires_at,
    metadata
  )
  values (
    auth.uid(),
    encode(gen_random_bytes(18), 'hex'),
    auth.uid(),
    current_date,
    'active',
    timezone('utc', now()) + make_interval(mins => effective_minutes),
    jsonb_build_object('source', 'member_app')
  )
  returning * into saved_pass;

  return saved_pass;
end;
$$;

revoke all on function public.issue_member_access_pass(integer) from public;
grant execute on function public.issue_member_access_pass(integer) to authenticated;

create or replace function public.verify_member_access_pass(
  p_access_token text,
  p_access_point_id uuid default null,
  p_entry_method text default 'qr'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_pass public.member_access_passes;
  member_profile public.profiles;
  member_plan_name text;
  has_valid_membership boolean;
  has_valid_waiver boolean;
  decision text := 'deny';
  reason text;
  access_event_id uuid;
  cleaned_method text;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  cleaned_method := coalesce(nullif(btrim(coalesce(p_entry_method, '')), ''), 'qr');

  select *
  into target_pass
  from public.member_access_passes
  where access_token = p_access_token
  for update;

  if target_pass.id is null then
    insert into public.access_events (
      user_id,
      access_point_id,
      access_pass_id,
      entry_method,
      decision,
      denial_reason,
      waiver_status,
      event_payload
    )
    values (
      null,
      p_access_point_id,
      null,
      cleaned_method,
      'deny',
      'Access pass not found.',
      'unknown',
      jsonb_build_object('token_matched', false)
    )
    returning id into access_event_id;

    return jsonb_build_object(
      'decision', 'deny',
      'reason', 'Access pass not found.',
      'accessEventId', access_event_id
    );
  end if;

  select *
  into member_profile
  from public.profiles
  where id = target_pass.user_id;

  select plans.name
  into member_plan_name
  from public.membership_plans as plans
  where plans.id = member_profile.plan_id;

  has_valid_membership := public.is_active_member(target_pass.user_id);
  has_valid_waiver := public.member_has_valid_waiver(target_pass.user_id);

  if target_pass.status <> 'active' then
    reason := 'Access pass is not active.';
  elsif target_pass.expires_at <= timezone('utc', now()) then
    reason := 'Access pass has expired.';
  elsif not has_valid_membership then
    reason := 'Membership is not active.';
  elsif not has_valid_waiver then
    reason := 'Active waiver acceptance is required.';
  else
    decision := 'allow';
    reason := null;
  end if;

  update public.member_access_passes
  set
    last_verified_at = timezone('utc', now()),
    status = case when decision = 'allow' then 'used' else status end,
    updated_at = timezone('utc', now())
  where id = target_pass.id;

  insert into public.access_events (
    user_id,
    access_point_id,
    access_pass_id,
    entry_method,
    decision,
    denial_reason,
    membership_status,
    plan_name,
    waiver_status,
    event_payload
  )
  values (
    target_pass.user_id,
    p_access_point_id,
    target_pass.id,
    cleaned_method,
    decision,
    reason,
    member_profile.membership_status,
    member_plan_name,
    case when has_valid_waiver then 'valid' else 'missing' end,
    jsonb_build_object('expiresAt', target_pass.expires_at)
  )
  returning id into access_event_id;

  return jsonb_build_object(
    'decision', decision,
    'reason', reason,
    'accessEventId', access_event_id,
    'accessPassId', target_pass.id,
    'userId', target_pass.user_id,
    'fullName', member_profile.full_name,
    'email', member_profile.email,
    'membershipStatus', member_profile.membership_status,
    'planName', member_plan_name,
    'waiverValid', has_valid_waiver,
    'expiresAt', target_pass.expires_at
  );
end;
$$;

revoke all on function public.verify_member_access_pass(text, uuid, text) from public;
grant execute on function public.verify_member_access_pass(text, uuid, text) to authenticated;

create or replace function public.staff_log_manual_access(
  p_user_id uuid,
  p_access_point_id uuid default null,
  p_decision text default 'allow',
  p_reason text default null
)
returns public.access_events
language plpgsql
security definer
set search_path = public
as $$
declare
  member_profile public.profiles;
  member_plan_name text;
  cleaned_decision text;
  saved_event public.access_events;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  if p_user_id is null then
    raise exception 'User id is required';
  end if;

  cleaned_decision := coalesce(nullif(btrim(coalesce(p_decision, '')), ''), 'allow');

  if cleaned_decision not in ('allow', 'deny') then
    raise exception 'Decision must be allow or deny.';
  end if;

  select *
  into member_profile
  from public.profiles
  where id = p_user_id;

  if member_profile.id is null then
    raise exception 'Member profile not found.';
  end if;

  select plans.name
  into member_plan_name
  from public.membership_plans as plans
  where plans.id = member_profile.plan_id;

  insert into public.access_events (
    user_id,
    access_point_id,
    access_pass_id,
    entry_method,
    decision,
    denial_reason,
    membership_status,
    plan_name,
    waiver_status,
    event_payload
  )
  values (
    p_user_id,
    p_access_point_id,
    null,
    'manual',
    cleaned_decision,
    nullif(btrim(coalesce(p_reason, '')), ''),
    member_profile.membership_status,
    member_plan_name,
    case when public.member_has_valid_waiver(p_user_id) then 'valid' else 'missing' end,
    jsonb_build_object('recordedBy', auth.uid())
  )
  returning * into saved_event;

  return saved_event;
end;
$$;

revoke all on function public.staff_log_manual_access(uuid, uuid, text, text) from public;
grant execute on function public.staff_log_manual_access(uuid, uuid, text, text) to authenticated;

create or replace function public.get_access_control_snapshot(p_days integer default 14)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  days_window integer;
  snapshot jsonb;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  days_window := greatest(coalesce(p_days, 14), 1);

  select jsonb_build_object(
    'allowedCount', count(*) filter (where events.decision = 'allow' and events.created_at >= timezone('utc', now()) - make_interval(days => days_window)),
    'deniedCount', count(*) filter (where events.decision = 'deny' and events.created_at >= timezone('utc', now()) - make_interval(days => days_window)),
    'qrScans', count(*) filter (where events.entry_method = 'qr' and events.created_at >= timezone('utc', now()) - make_interval(days => days_window)),
    'manualOverrides', count(*) filter (where events.entry_method = 'manual' and events.created_at >= timezone('utc', now()) - make_interval(days => days_window)),
    'activePassCount', (select count(*) from public.member_access_passes where status = 'active' and expires_at > timezone('utc', now())),
    'expiringPassCount', (select count(*) from public.member_access_passes where status = 'active' and expires_at > timezone('utc', now()) and expires_at <= timezone('utc', now()) + interval '30 minutes'),
    'validWaiverMembers', (
      select count(*)
      from public.profiles as profiles
      where profiles.role in ('member', 'staff', 'admin')
        and public.member_has_valid_waiver(profiles.id)
    ),
    'activePoints', (select count(*) from public.access_points where is_active = true)
  )
  into snapshot
  from public.access_events as events;

  return coalesce(snapshot, '{}'::jsonb);
end;
$$;

revoke all on function public.get_access_control_snapshot(integer) from public;
grant execute on function public.get_access_control_snapshot(integer) to authenticated;

create or replace function public.list_recent_access_events(p_limit integer default 50)
returns table (
  id uuid,
  created_at timestamp with time zone,
  decision text,
  entry_method text,
  denial_reason text,
  user_id uuid,
  full_name text,
  email text,
  membership_status text,
  plan_name text,
  waiver_status text,
  access_point_name text,
  branch_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    events.id,
    events.created_at,
    events.decision,
    events.entry_method,
    events.denial_reason,
    events.user_id,
    profiles.full_name,
    profiles.email,
    events.membership_status,
    events.plan_name,
    events.waiver_status,
    points.name as access_point_name,
    points.branch_name
  from public.access_events as events
  left join public.profiles on profiles.id = events.user_id
  left join public.access_points as points on points.id = events.access_point_id
  where auth.uid() is not null
    and public.is_staff()
  order by events.created_at desc
  limit greatest(coalesce(p_limit, 50), 1);
$$;

revoke all on function public.list_recent_access_events(integer) from public;
grant execute on function public.list_recent_access_events(integer) to authenticated;

alter table public.access_points enable row level security;
alter table public.liability_waiver_templates enable row level security;
alter table public.member_waiver_acceptances enable row level security;
alter table public.member_access_passes enable row level security;
alter table public.access_events enable row level security;

drop policy if exists "Authenticated users can view active access points" on public.access_points;
create policy "Authenticated users can view active access points"
on public.access_points
for select
to authenticated
using (is_active = true or public.is_staff());

drop policy if exists "Admins can manage access points" on public.access_points;
create policy "Admins can manage access points"
on public.access_points
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can view active waiver templates" on public.liability_waiver_templates;
create policy "Authenticated users can view active waiver templates"
on public.liability_waiver_templates
for select
to authenticated
using (is_active = true or public.is_staff());

drop policy if exists "Admins can manage waiver templates" on public.liability_waiver_templates;
create policy "Admins can manage waiver templates"
on public.liability_waiver_templates
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members can view own waiver acceptances" on public.member_waiver_acceptances;
create policy "Members can view own waiver acceptances"
on public.member_waiver_acceptances
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "Members can insert own waiver acceptances" on public.member_waiver_acceptances;
create policy "Members can insert own waiver acceptances"
on public.member_waiver_acceptances
for insert
to authenticated
with check (user_id = auth.uid() or public.is_staff());

drop policy if exists "Members can update own waiver acceptances" on public.member_waiver_acceptances;
create policy "Members can update own waiver acceptances"
on public.member_waiver_acceptances
for update
to authenticated
using (user_id = auth.uid() or public.is_staff())
with check (user_id = auth.uid() or public.is_staff());

drop policy if exists "Members can view own access passes" on public.member_access_passes;
create policy "Members can view own access passes"
on public.member_access_passes
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "Members can view own access events" on public.access_events;
create policy "Members can view own access events"
on public.access_events
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

insert into public.access_points (
  branch_name,
  name,
  point_type,
  description,
  offline_code,
  is_active
)
values
  ('Main Branch', 'Front Desk', 'front_desk', 'Primary front-desk check-in point.', 'FD-1001', true),
  ('Main Branch', 'Main Gate', 'gate', 'Primary entry gate validation point.', 'GT-1001', true)
on conflict (branch_name, name)
do update
set
  point_type = excluded.point_type,
  description = excluded.description,
  offline_code = excluded.offline_code,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

insert into public.liability_waiver_templates (
  title,
  version_code,
  summary,
  active_from,
  requires_renewal,
  renewal_days,
  is_active
)
values (
  'General Gym Liability Waiver',
  'gym-liability-v1',
  'Covers general facility use, workout participation, and member responsibility terms.',
  current_date,
  true,
  365,
  true
)
on conflict (version_code)
do update
set
  title = excluded.title,
  summary = excluded.summary,
  active_from = excluded.active_from,
  requires_renewal = excluded.requires_renewal,
  renewal_days = excluded.renewal_days,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());
