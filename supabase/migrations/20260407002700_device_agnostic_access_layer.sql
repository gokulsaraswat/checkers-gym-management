create table if not exists public.access_hardware_devices (
  id uuid primary key default gen_random_uuid(),
  device_key text not null unique default concat('dev_', encode(gen_random_bytes(8), 'hex')),
  branch_name text not null default 'Main Branch',
  access_point_id uuid references public.access_points(id) on delete set null,
  device_name text not null,
  device_type text not null default 'scanner',
  integration_mode text not null default 'bridge',
  credential_types text[] not null default array['qr', 'access_token']::text[],
  relay_behavior text not null default 'none',
  heartbeat_status text not null default 'offline',
  last_seen_at timestamp with time zone,
  config jsonb not null default '{}'::jsonb,
  notes text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint access_hardware_devices_device_type_check check (
    device_type in ('scanner', 'relay', 'controller', 'reader', 'tablet', 'kiosk', 'bridge')
  ),
  constraint access_hardware_devices_integration_mode_check check (
    integration_mode in ('manual', 'bridge', 'webhook', 'polling', 'sdk')
  ),
  constraint access_hardware_devices_relay_behavior_check check (
    relay_behavior in ('none', 'door_strike', 'turnstile', 'maglock', 'aux')
  ),
  constraint access_hardware_devices_heartbeat_status_check check (
    heartbeat_status in ('online', 'offline', 'warning', 'maintenance')
  )
);

create table if not exists public.access_hardware_events (
  id uuid primary key default gen_random_uuid(),
  device_id uuid references public.access_hardware_devices(id) on delete cascade,
  access_point_id uuid references public.access_points(id) on delete set null,
  event_type text not null default 'heartbeat',
  status text not null default 'received',
  event_payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc', now()),
  constraint access_hardware_events_event_type_check check (
    event_type in ('heartbeat', 'decision', 'error', 'configuration', 'test')
  ),
  constraint access_hardware_events_status_check check (
    status in ('received', 'online', 'offline', 'warning', 'maintenance', 'allow', 'deny', 'error', 'ok')
  )
);

create index if not exists access_hardware_devices_branch_name_idx
  on public.access_hardware_devices (branch_name, device_name);

create index if not exists access_hardware_devices_access_point_id_idx
  on public.access_hardware_devices (access_point_id);

create index if not exists access_hardware_devices_last_seen_at_idx
  on public.access_hardware_devices (last_seen_at desc);

create index if not exists access_hardware_events_created_at_idx
  on public.access_hardware_events (created_at desc);

create index if not exists access_hardware_events_device_created_at_idx
  on public.access_hardware_events (device_id, created_at desc);

create index if not exists access_hardware_events_access_point_created_at_idx
  on public.access_hardware_events (access_point_id, created_at desc);

drop trigger if exists access_hardware_devices_touch_updated_at on public.access_hardware_devices;
create trigger access_hardware_devices_touch_updated_at
before update on public.access_hardware_devices
for each row
execute function public.touch_access_updated_at();

alter table public.access_events
  drop constraint if exists access_events_entry_method_check;

alter table public.access_events
  add constraint access_events_entry_method_check
  check (entry_method in ('qr', 'manual', 'staff_override', 'offline_code', 'hardware'));


create or replace function public.log_access_hardware_heartbeat(
  p_device_key text,
  p_status text default 'online',
  p_payload jsonb default '{}'::jsonb
)
returns public.access_hardware_devices
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_key text;
  cleaned_status text;
  saved_device public.access_hardware_devices;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  cleaned_key := nullif(btrim(coalesce(p_device_key, '')), '');
  cleaned_status := lower(coalesce(nullif(btrim(coalesce(p_status, '')), ''), 'online'));

  if cleaned_key is null then
    raise exception 'Device key is required.';
  end if;

  if cleaned_status not in ('online', 'offline', 'warning', 'maintenance') then
    raise exception 'Heartbeat status must be online, offline, warning, or maintenance.';
  end if;

  update public.access_hardware_devices
  set
    last_seen_at = timezone('utc', now()),
    heartbeat_status = cleaned_status,
    updated_at = timezone('utc', now())
  where device_key = cleaned_key
  returning * into saved_device;

  if saved_device.id is null then
    raise exception 'Access hardware device not found.';
  end if;

  insert into public.access_hardware_events (
    device_id,
    access_point_id,
    event_type,
    status,
    event_payload
  )
  values (
    saved_device.id,
    saved_device.access_point_id,
    'heartbeat',
    cleaned_status,
    coalesce(p_payload, '{}'::jsonb)
  );

  return saved_device;
end;
$$;

revoke all on function public.log_access_hardware_heartbeat(text, text, jsonb) from public;
grant execute on function public.log_access_hardware_heartbeat(text, text, jsonb) to authenticated;

create or replace function public.resolve_access_credential(
  p_device_id uuid default null,
  p_access_point_id uuid default null,
  p_credential_type text default 'access_token',
  p_credential_value text default null,
  p_entry_method text default 'hardware',
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_type text;
  cleaned_value text;
  cleaned_entry_method text;
  target_device public.access_hardware_devices;
  target_access_point_id uuid;
  decision_result jsonb := '{}'::jsonb;
  access_event_id uuid;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  cleaned_type := lower(coalesce(nullif(btrim(coalesce(p_credential_type, '')), ''), 'access_token'));
  cleaned_value := nullif(btrim(coalesce(p_credential_value, '')), '');
  cleaned_entry_method := lower(coalesce(nullif(btrim(coalesce(p_entry_method, '')), ''), 'hardware'));

  if cleaned_entry_method not in ('hardware', 'offline_code') then
    cleaned_entry_method := 'hardware';
  end if;

  if cleaned_value is null then
    raise exception 'Credential value is required.';
  end if;

  if p_device_id is not null then
    select *
    into target_device
    from public.access_hardware_devices
    where id = p_device_id;

    if target_device.id is null then
      raise exception 'Access hardware device not found.';
    end if;

    update public.access_hardware_devices
    set
      last_seen_at = timezone('utc', now()),
      heartbeat_status = case
        when target_device.is_active then 'online'
        else 'maintenance'
      end,
      updated_at = timezone('utc', now())
    where id = target_device.id;
  end if;

  target_access_point_id := coalesce(p_access_point_id, target_device.access_point_id);

  if cleaned_type in ('access_token', 'qr', 'qr_token') then
    decision_result := public.verify_member_access_pass(
      cleaned_value,
      target_access_point_id,
      cleaned_entry_method
    );
  else
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
      target_access_point_id,
      null,
      cleaned_entry_method,
      'deny',
      format('Credential type %s is not supported yet.', cleaned_type),
      'unknown',
      jsonb_build_object(
        'credentialType', cleaned_type,
        'deviceId', p_device_id,
        'payload', coalesce(p_payload, '{}'::jsonb)
      )
    )
    returning id into access_event_id;

    decision_result := jsonb_build_object(
      'decision', 'deny',
      'reason', format('Credential type %s is not supported yet.', cleaned_type),
      'accessEventId', access_event_id
    );
  end if;

  if p_device_id is not null then
    insert into public.access_hardware_events (
      device_id,
      access_point_id,
      event_type,
      status,
      event_payload
    )
    values (
      p_device_id,
      target_access_point_id,
      'decision',
      coalesce(decision_result ->> 'decision', 'received'),
      jsonb_build_object(
        'credentialType', cleaned_type,
        'entryMethod', cleaned_entry_method,
        'result', decision_result,
        'payload', coalesce(p_payload, '{}'::jsonb)
      )
    );
  end if;

  return coalesce(decision_result, '{}'::jsonb) || jsonb_build_object(
    'credentialType', cleaned_type,
    'deviceId', p_device_id,
    'accessPointId', target_access_point_id
  );
end;
$$;

revoke all on function public.resolve_access_credential(uuid, uuid, text, text, text, jsonb) from public;
grant execute on function public.resolve_access_credential(uuid, uuid, text, text, text, jsonb) to authenticated;

create or replace function public.get_access_hardware_snapshot(p_days integer default 7)
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

  days_window := greatest(coalesce(p_days, 7), 1);

  select jsonb_build_object(
    'deviceCount', (select count(*) from public.access_hardware_devices),
    'activeDeviceCount', (select count(*) from public.access_hardware_devices where is_active = true),
    'linkedAccessPointCount', (select count(distinct access_point_id) from public.access_hardware_devices where access_point_id is not null),
    'onlineDeviceCount', (
      select count(*)
      from public.access_hardware_devices
      where heartbeat_status = 'online'
        and last_seen_at is not null
        and last_seen_at >= timezone('utc', now()) - interval '10 minutes'
    ),
    'staleDeviceCount', (
      select count(*)
      from public.access_hardware_devices
      where is_active = true
        and (last_seen_at is null or last_seen_at < timezone('utc', now()) - interval '1 day')
    ),
    'recentHeartbeatCount', (
      select count(*)
      from public.access_hardware_events
      where event_type = 'heartbeat'
        and created_at >= timezone('utc', now()) - make_interval(days => days_window)
    ),
    'recentErrorCount', (
      select count(*)
      from public.access_hardware_events
      where status = 'error'
        and created_at >= timezone('utc', now()) - make_interval(days => days_window)
    )
  )
  into snapshot;

  return coalesce(snapshot, '{}'::jsonb);
end;
$$;

revoke all on function public.get_access_hardware_snapshot(integer) from public;
grant execute on function public.get_access_hardware_snapshot(integer) to authenticated;

create or replace function public.list_recent_access_hardware_events(p_limit integer default 30)
returns table (
  id uuid,
  created_at timestamp with time zone,
  event_type text,
  status text,
  device_id uuid,
  device_key text,
  device_name text,
  device_type text,
  access_point_id uuid,
  access_point_name text,
  branch_name text,
  event_payload jsonb
)
language sql
stable
security definer
set search_path = public
as $$
  select
    events.id,
    events.created_at,
    events.event_type,
    events.status,
    devices.id as device_id,
    devices.device_key,
    devices.device_name,
    devices.device_type,
    points.id as access_point_id,
    points.name as access_point_name,
    coalesce(points.branch_name, devices.branch_name) as branch_name,
    events.event_payload
  from public.access_hardware_events as events
  left join public.access_hardware_devices as devices on devices.id = events.device_id
  left join public.access_points as points on points.id = events.access_point_id
  where auth.uid() is not null
    and public.is_staff()
  order by events.created_at desc
  limit greatest(coalesce(p_limit, 30), 1);
$$;

revoke all on function public.list_recent_access_hardware_events(integer) from public;
grant execute on function public.list_recent_access_hardware_events(integer) to authenticated;

alter table public.access_hardware_devices enable row level security;
alter table public.access_hardware_events enable row level security;

drop policy if exists "Staff can view access hardware devices" on public.access_hardware_devices;
create policy "Staff can view access hardware devices"
on public.access_hardware_devices
for select
to authenticated
using (public.is_staff());

drop policy if exists "Admins can manage access hardware devices" on public.access_hardware_devices;
create policy "Admins can manage access hardware devices"
on public.access_hardware_devices
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Staff can view access hardware events" on public.access_hardware_events;
create policy "Staff can view access hardware events"
on public.access_hardware_events
for select
to authenticated
using (public.is_staff());

drop policy if exists "Staff can insert access hardware events" on public.access_hardware_events;
create policy "Staff can insert access hardware events"
on public.access_hardware_events
for insert
to authenticated
with check (public.is_staff());
