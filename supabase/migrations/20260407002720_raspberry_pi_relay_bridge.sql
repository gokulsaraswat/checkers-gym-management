create table if not exists public.access_relay_bridge_commands (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.access_hardware_devices(id) on delete cascade,
  access_point_id uuid references public.access_points(id) on delete set null,
  command_type text not null default 'pulse',
  pulse_ms integer not null default 2500,
  relay_channel integer not null default 1,
  requested_by uuid,
  requested_reason text,
  command_status text not null default 'queued',
  command_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc', now()),
  dispatched_at timestamp with time zone,
  completed_at timestamp with time zone,
  constraint access_relay_bridge_commands_command_type_check check (
    command_type in ('pulse', 'unlock', 'lock', 'sync')
  ),
  constraint access_relay_bridge_commands_command_status_check check (
    command_status in ('queued', 'dispatched', 'completed', 'failed', 'cancelled')
  ),
  constraint access_relay_bridge_commands_pulse_ms_check check (
    pulse_ms between 300 and 15000
  ),
  constraint access_relay_bridge_commands_relay_channel_check check (
    relay_channel between 1 and 16
  )
);

create index if not exists access_relay_bridge_commands_device_status_idx
  on public.access_relay_bridge_commands (device_id, command_status, created_at desc);

create index if not exists access_relay_bridge_commands_status_created_idx
  on public.access_relay_bridge_commands (command_status, created_at desc);

create index if not exists access_relay_bridge_commands_access_point_idx
  on public.access_relay_bridge_commands (access_point_id, created_at desc);

alter table public.access_hardware_events
  drop constraint if exists access_hardware_events_event_type_check;

alter table public.access_hardware_events
  add constraint access_hardware_events_event_type_check
  check (event_type in ('heartbeat', 'decision', 'error', 'configuration', 'test', 'command'));

alter table public.access_hardware_events
  drop constraint if exists access_hardware_events_status_check;

alter table public.access_hardware_events
  add constraint access_hardware_events_status_check
  check (
    status in (
      'received',
      'online',
      'offline',
      'warning',
      'maintenance',
      'allow',
      'deny',
      'error',
      'ok',
      'queued',
      'dispatched',
      'completed',
      'failed',
      'cancelled'
    )
  );

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
    ),
    'relayReadyDeviceCount', (
      select count(*)
      from public.access_hardware_devices
      where is_active = true
        and relay_behavior <> 'none'
        and integration_mode = 'bridge'
    ),
    'queuedRelayCommandCount', (
      select count(*)
      from public.access_relay_bridge_commands
      where command_status in ('queued', 'dispatched')
    ),
    'recentRelayCommandCount', (
      select count(*)
      from public.access_relay_bridge_commands
      where created_at >= timezone('utc', now()) - make_interval(days => days_window)
    )
  )
  into snapshot;

  return coalesce(snapshot, '{}'::jsonb);
end;
$$;

revoke all on function public.get_access_hardware_snapshot(integer) from public;
grant execute on function public.get_access_hardware_snapshot(integer) to authenticated;

create or replace function public.queue_access_relay_bridge_command(
  p_device_id uuid,
  p_access_point_id uuid default null,
  p_command_type text default 'pulse',
  p_pulse_ms integer default 2500,
  p_reason text default null,
  p_payload jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_device public.access_hardware_devices;
  queued_command public.access_relay_bridge_commands;
  cleaned_command_type text;
  cleaned_reason text;
  resolved_access_point_id uuid;
  resolved_pulse_ms integer;
  resolved_channel integer;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  if p_device_id is null then
    raise exception 'Relay bridge device is required.';
  end if;

  select *
  into target_device
  from public.access_hardware_devices
  where id = p_device_id;

  if target_device.id is null then
    raise exception 'Relay bridge device not found.';
  end if;

  if not target_device.is_active then
    raise exception 'Relay bridge device must be active.';
  end if;

  if target_device.relay_behavior = 'none' then
    raise exception 'Selected device does not expose a relay output.';
  end if;

  cleaned_command_type := lower(coalesce(nullif(btrim(coalesce(p_command_type, '')), ''), 'pulse'));
  cleaned_reason := nullif(btrim(coalesce(p_reason, '')), '');
  resolved_access_point_id := coalesce(p_access_point_id, target_device.access_point_id);
  resolved_pulse_ms := greatest(300, least(coalesce(p_pulse_ms, 2500), 15000));
  resolved_channel := greatest(
    1,
    least(
      coalesce(
        case when coalesce(target_device.config ->> 'relayChannel', '') ~ '^[0-9]+$' then (target_device.config ->> 'relayChannel')::integer end,
        case when coalesce(target_device.config ->> 'relay_channel', '') ~ '^[0-9]+$' then (target_device.config ->> 'relay_channel')::integer end,
        case when coalesce(target_device.config ->> 'channel', '') ~ '^[0-9]+$' then (target_device.config ->> 'channel')::integer end,
        1
      ),
      16
    )
  );

  insert into public.access_relay_bridge_commands (
    device_id,
    access_point_id,
    command_type,
    pulse_ms,
    relay_channel,
    requested_by,
    requested_reason,
    command_payload,
    command_status
  )
  values (
    target_device.id,
    resolved_access_point_id,
    cleaned_command_type,
    resolved_pulse_ms,
    resolved_channel,
    auth.uid(),
    cleaned_reason,
    coalesce(p_payload, '{}'::jsonb),
    'queued'
  )
  returning * into queued_command;

  insert into public.access_hardware_events (
    device_id,
    access_point_id,
    event_type,
    status,
    event_payload
  )
  values (
    target_device.id,
    resolved_access_point_id,
    'command',
    'queued',
    jsonb_build_object(
      'commandId', queued_command.id,
      'commandType', queued_command.command_type,
      'pulseMs', queued_command.pulse_ms,
      'relayChannel', queued_command.relay_channel,
      'requestedReason', queued_command.requested_reason,
      'payload', queued_command.command_payload
    )
  );

  return jsonb_build_object(
    'commandId', queued_command.id,
    'deviceId', target_device.id,
    'deviceKey', target_device.device_key,
    'deviceName', target_device.device_name,
    'accessPointId', resolved_access_point_id,
    'commandType', queued_command.command_type,
    'pulseMs', queued_command.pulse_ms,
    'relayChannel', queued_command.relay_channel,
    'status', queued_command.command_status,
    'queuedAt', queued_command.created_at
  );
end;
$$;

revoke all on function public.queue_access_relay_bridge_command(uuid, uuid, text, integer, text, jsonb) from public;
grant execute on function public.queue_access_relay_bridge_command(uuid, uuid, text, integer, text, jsonb) to authenticated;

create or replace function public.claim_relay_bridge_commands(
  p_device_key text,
  p_limit integer default 10
)
returns table (
  id uuid,
  device_id uuid,
  access_point_id uuid,
  command_type text,
  pulse_ms integer,
  relay_channel integer,
  requested_reason text,
  command_payload jsonb,
  created_at timestamp with time zone,
  dispatched_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_device public.access_hardware_devices;
  cleaned_key text;
  row_limit integer;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  cleaned_key := nullif(btrim(coalesce(p_device_key, '')), '');
  row_limit := greatest(coalesce(p_limit, 10), 1);

  if cleaned_key is null then
    raise exception 'Device key is required.';
  end if;

  select *
  into target_device
  from public.access_hardware_devices
  where device_key = cleaned_key;

  if target_device.id is null then
    raise exception 'Relay bridge device not found.';
  end if;

  return query
  with picked as (
    select commands.id
    from public.access_relay_bridge_commands as commands
    where commands.device_id = target_device.id
      and commands.command_status = 'queued'
    order by commands.created_at asc
    limit row_limit
    for update skip locked
  ),
  updated as (
    update public.access_relay_bridge_commands as commands
    set
      command_status = 'dispatched',
      dispatched_at = timezone('utc', now())
    from picked
    where commands.id = picked.id
    returning
      commands.id,
      commands.device_id,
      commands.access_point_id,
      commands.command_type,
      commands.pulse_ms,
      commands.relay_channel,
      commands.requested_reason,
      commands.command_payload,
      commands.created_at,
      commands.dispatched_at
  ),
  logged as (
    insert into public.access_hardware_events (
      device_id,
      access_point_id,
      event_type,
      status,
      event_payload
    )
    select
      updated.device_id,
      updated.access_point_id,
      'command',
      'dispatched',
      jsonb_build_object(
        'commandId', updated.id,
        'commandType', updated.command_type,
        'pulseMs', updated.pulse_ms,
        'relayChannel', updated.relay_channel,
        'payload', updated.command_payload
      )
    from updated
    returning id
  )
  select
    updated.id,
    updated.device_id,
    updated.access_point_id,
    updated.command_type,
    updated.pulse_ms,
    updated.relay_channel,
    updated.requested_reason,
    updated.command_payload,
    updated.created_at,
    updated.dispatched_at
  from updated;
end;
$$;

revoke all on function public.claim_relay_bridge_commands(text, integer) from public;
grant execute on function public.claim_relay_bridge_commands(text, integer) to authenticated;

create or replace function public.complete_relay_bridge_command(
  p_command_id uuid,
  p_device_key text,
  p_status text default 'completed',
  p_result jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  target_device public.access_hardware_devices;
  saved_command public.access_relay_bridge_commands;
  cleaned_key text;
  cleaned_status text;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  if p_command_id is null then
    raise exception 'Command id is required.';
  end if;

  cleaned_key := nullif(btrim(coalesce(p_device_key, '')), '');
  cleaned_status := lower(coalesce(nullif(btrim(coalesce(p_status, '')), ''), 'completed'));

  if cleaned_key is null then
    raise exception 'Device key is required.';
  end if;

  if cleaned_status not in ('completed', 'failed', 'cancelled') then
    raise exception 'Relay bridge status must be completed, failed, or cancelled.';
  end if;

  select *
  into target_device
  from public.access_hardware_devices
  where device_key = cleaned_key;

  if target_device.id is null then
    raise exception 'Relay bridge device not found.';
  end if;

  update public.access_relay_bridge_commands
  set
    command_status = cleaned_status,
    result_payload = coalesce(p_result, '{}'::jsonb),
    completed_at = timezone('utc', now())
  where id = p_command_id
    and device_id = target_device.id
  returning * into saved_command;

  if saved_command.id is null then
    raise exception 'Relay bridge command not found for the selected device.';
  end if;

  insert into public.access_hardware_events (
    device_id,
    access_point_id,
    event_type,
    status,
    event_payload
  )
  values (
    saved_command.device_id,
    saved_command.access_point_id,
    'command',
    cleaned_status,
    jsonb_build_object(
      'commandId', saved_command.id,
      'commandType', saved_command.command_type,
      'pulseMs', saved_command.pulse_ms,
      'relayChannel', saved_command.relay_channel,
      'result', saved_command.result_payload
    )
  );

  return jsonb_build_object(
    'commandId', saved_command.id,
    'status', saved_command.command_status,
    'completedAt', saved_command.completed_at,
    'deviceId', saved_command.device_id,
    'result', saved_command.result_payload
  );
end;
$$;

revoke all on function public.complete_relay_bridge_command(uuid, text, text, jsonb) from public;
grant execute on function public.complete_relay_bridge_command(uuid, text, text, jsonb) to authenticated;

create or replace function public.list_recent_relay_bridge_commands(p_limit integer default 20)
returns table (
  id uuid,
  created_at timestamp with time zone,
  command_status text,
  command_type text,
  pulse_ms integer,
  relay_channel integer,
  requested_reason text,
  device_id uuid,
  device_key text,
  device_name text,
  access_point_id uuid,
  access_point_name text,
  branch_name text,
  command_payload jsonb,
  result_payload jsonb,
  dispatched_at timestamp with time zone,
  completed_at timestamp with time zone
)
language sql
stable
security definer
set search_path = public
as $$
  select
    commands.id,
    commands.created_at,
    commands.command_status,
    commands.command_type,
    commands.pulse_ms,
    commands.relay_channel,
    commands.requested_reason,
    devices.id as device_id,
    devices.device_key,
    devices.device_name,
    points.id as access_point_id,
    points.name as access_point_name,
    coalesce(points.branch_name, devices.branch_name) as branch_name,
    commands.command_payload,
    commands.result_payload,
    commands.dispatched_at,
    commands.completed_at
  from public.access_relay_bridge_commands as commands
  join public.access_hardware_devices as devices on devices.id = commands.device_id
  left join public.access_points as points on points.id = commands.access_point_id
  where auth.uid() is not null
    and public.is_staff()
  order by commands.created_at desc
  limit greatest(coalesce(p_limit, 20), 1);
$$;

revoke all on function public.list_recent_relay_bridge_commands(integer) from public;
grant execute on function public.list_recent_relay_bridge_commands(integer) to authenticated;

alter table public.access_relay_bridge_commands enable row level security;

drop policy if exists "Staff can view relay bridge commands" on public.access_relay_bridge_commands;
create policy "Staff can view relay bridge commands"
on public.access_relay_bridge_commands
for select
to authenticated
using (public.is_staff());

drop policy if exists "Admins can manage relay bridge commands" on public.access_relay_bridge_commands;
create policy "Admins can manage relay bridge commands"
on public.access_relay_bridge_commands
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
