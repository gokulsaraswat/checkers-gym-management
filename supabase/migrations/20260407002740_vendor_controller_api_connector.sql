create table if not exists public.access_vendor_controller_commands (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references public.access_hardware_devices(id) on delete cascade,
  access_point_id uuid references public.access_points(id) on delete set null,
  vendor_provider text not null default 'custom_api',
  command_type text not null default 'unlock',
  controller_identifier text,
  door_identifier text,
  requested_by uuid,
  requested_reason text,
  command_status text not null default 'queued',
  command_payload jsonb not null default '{}'::jsonb,
  result_payload jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc', now()),
  dispatched_at timestamp with time zone,
  completed_at timestamp with time zone,
  constraint access_vendor_controller_commands_command_type_check check (
    command_type in ('unlock', 'lock', 'sync', 'grant_access', 'refresh_device')
  ),
  constraint access_vendor_controller_commands_command_status_check check (
    command_status in ('queued', 'dispatched', 'completed', 'failed', 'cancelled')
  )
);

create index if not exists access_vendor_controller_commands_device_status_idx
  on public.access_vendor_controller_commands (device_id, command_status, created_at desc);

create index if not exists access_vendor_controller_commands_status_created_idx
  on public.access_vendor_controller_commands (command_status, created_at desc);

create index if not exists access_vendor_controller_commands_access_point_idx
  on public.access_vendor_controller_commands (access_point_id, created_at desc);

create index if not exists access_vendor_controller_commands_provider_created_idx
  on public.access_vendor_controller_commands (vendor_provider, created_at desc);

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
    ),
    'vendorReadyDeviceCount', (
      select count(*)
      from public.access_hardware_devices
      where is_active = true
        and device_type in ('controller', 'bridge', 'kiosk')
        and (
          integration_mode in ('sdk', 'polling', 'webhook')
          or coalesce(nullif(btrim(coalesce(config ->> 'vendorProvider', config ->> 'vendor_provider', config ->> 'controllerVendor', config ->> 'controller_vendor')), ''), '') <> ''
          or coalesce(nullif(btrim(coalesce(config ->> 'apiBaseUrl', config ->> 'api_base_url', config ->> 'baseUrl', config ->> 'base_url', config ->> 'controllerApiUrl', config ->> 'controller_api_url')), ''), '') <> ''
          or coalesce(nullif(btrim(coalesce(config ->> 'controllerId', config ->> 'controller_id', config ->> 'panelId', config ->> 'panel_id', config ->> 'controllerIdentifier', config ->> 'controller_identifier')), ''), '') <> ''
        )
    ),
    'queuedVendorCommandCount', (
      select count(*)
      from public.access_vendor_controller_commands
      where command_status in ('queued', 'dispatched')
    ),
    'recentVendorCommandCount', (
      select count(*)
      from public.access_vendor_controller_commands
      where created_at >= timezone('utc', now()) - make_interval(days => days_window)
    )
  )
  into snapshot;

  return coalesce(snapshot, '{}'::jsonb);
end;
$$;

revoke all on function public.get_access_hardware_snapshot(integer) from public;
grant execute on function public.get_access_hardware_snapshot(integer) to authenticated;

create or replace function public.queue_access_vendor_controller_command(
  p_device_id uuid,
  p_access_point_id uuid default null,
  p_command_type text default 'unlock',
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
  queued_command public.access_vendor_controller_commands;
  cleaned_command_type text;
  cleaned_reason text;
  resolved_access_point_id uuid;
  resolved_provider text;
  resolved_controller_identifier text;
  resolved_door_identifier text;
  integration_mode text;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  if p_device_id is null then
    raise exception 'Vendor controller device is required.';
  end if;

  select *
  into target_device
  from public.access_hardware_devices
  where id = p_device_id;

  if target_device.id is null then
    raise exception 'Vendor controller device not found.';
  end if;

  if not target_device.is_active then
    raise exception 'Vendor controller device must be active.';
  end if;

  integration_mode := lower(coalesce(nullif(btrim(coalesce(target_device.integration_mode, '')), ''), 'manual'));

  if lower(coalesce(nullif(btrim(coalesce(target_device.device_type, '')), ''), 'controller')) not in ('controller', 'bridge', 'kiosk') then
    raise exception 'Selected device is not a supported vendor controller target.';
  end if;

  if integration_mode not in ('sdk', 'polling', 'webhook')
    and coalesce(nullif(btrim(coalesce(target_device.config ->> 'vendorProvider', target_device.config ->> 'vendor_provider', target_device.config ->> 'controllerVendor', target_device.config ->> 'controller_vendor')), ''), '') = ''
    and coalesce(nullif(btrim(coalesce(target_device.config ->> 'apiBaseUrl', target_device.config ->> 'api_base_url', target_device.config ->> 'baseUrl', target_device.config ->> 'base_url', target_device.config ->> 'controllerApiUrl', target_device.config ->> 'controller_api_url')), ''), '') = ''
    and coalesce(nullif(btrim(coalesce(target_device.config ->> 'controllerId', target_device.config ->> 'controller_id', target_device.config ->> 'panelId', target_device.config ->> 'panel_id', target_device.config ->> 'controllerIdentifier', target_device.config ->> 'controller_identifier')), ''), '') = '' then
    raise exception 'Selected device is not configured for a vendor controller connector yet.';
  end if;

  cleaned_command_type := lower(coalesce(nullif(btrim(coalesce(p_command_type, '')), ''), 'unlock'));
  cleaned_reason := nullif(btrim(coalesce(p_reason, '')), '');
  resolved_access_point_id := coalesce(p_access_point_id, target_device.access_point_id);

  if cleaned_command_type in ('open', 'open_door', 'pulse') then
    cleaned_command_type := 'unlock';
  elsif cleaned_command_type in ('grant', 'grant_access', 'allow') then
    cleaned_command_type := 'grant_access';
  elsif cleaned_command_type in ('refresh', 'refresh_device', 'reload') then
    cleaned_command_type := 'refresh_device';
  end if;

  if cleaned_command_type not in ('unlock', 'lock', 'sync', 'grant_access', 'refresh_device') then
    raise exception 'Vendor controller command type must be unlock, lock, sync, grant_access, or refresh_device.';
  end if;

  resolved_provider := lower(coalesce(
    nullif(btrim(coalesce(p_payload ->> 'vendorProvider', p_payload ->> 'vendor_provider')), ''),
    nullif(btrim(coalesce(target_device.config ->> 'vendorProvider', target_device.config ->> 'vendor_provider', target_device.config ->> 'controllerVendor', target_device.config ->> 'controller_vendor', target_device.config ->> 'provider')), ''),
    case
      when integration_mode = 'sdk' then 'custom_sdk'
      when integration_mode = 'webhook' then 'custom_webhook'
      else 'custom_api'
    end
  ));

  resolved_controller_identifier := coalesce(
    nullif(btrim(coalesce(p_payload ->> 'controllerIdentifier', p_payload ->> 'controller_id')), ''),
    nullif(btrim(coalesce(target_device.config ->> 'controllerId', target_device.config ->> 'controller_id', target_device.config ->> 'panelId', target_device.config ->> 'panel_id', target_device.config ->> 'controllerIdentifier', target_device.config ->> 'controller_identifier')), ''),
    target_device.device_key
  );

  resolved_door_identifier := coalesce(
    nullif(btrim(coalesce(p_payload ->> 'doorIdentifier', p_payload ->> 'door_id', p_payload ->> 'zoneId', p_payload ->> 'zone_id')), ''),
    nullif(btrim(coalesce(target_device.config ->> 'doorId', target_device.config ->> 'door_id', target_device.config ->> 'doorIdentifier', target_device.config ->> 'door_identifier', target_device.config ->> 'zoneId', target_device.config ->> 'zone_id')), ''),
    nullif(coalesce(resolved_access_point_id::text, ''), ''),
    target_device.device_key
  );

  insert into public.access_vendor_controller_commands (
    device_id,
    access_point_id,
    vendor_provider,
    command_type,
    controller_identifier,
    door_identifier,
    requested_by,
    requested_reason,
    command_payload,
    command_status
  )
  values (
    target_device.id,
    resolved_access_point_id,
    resolved_provider,
    cleaned_command_type,
    resolved_controller_identifier,
    resolved_door_identifier,
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
      'commandFamily', 'vendor_controller',
      'commandId', queued_command.id,
      'commandType', queued_command.command_type,
      'vendorProvider', queued_command.vendor_provider,
      'controllerIdentifier', queued_command.controller_identifier,
      'doorIdentifier', queued_command.door_identifier,
      'payload', queued_command.command_payload
    )
  );

  return jsonb_build_object(
    'commandId', queued_command.id,
    'deviceId', target_device.id,
    'deviceKey', target_device.device_key,
    'deviceName', target_device.device_name,
    'accessPointId', resolved_access_point_id,
    'vendorProvider', queued_command.vendor_provider,
    'controllerIdentifier', queued_command.controller_identifier,
    'doorIdentifier', queued_command.door_identifier,
    'commandType', queued_command.command_type,
    'status', queued_command.command_status,
    'queuedAt', queued_command.created_at
  );
end;
$$;

revoke all on function public.queue_access_vendor_controller_command(uuid, uuid, text, text, jsonb) from public;
grant execute on function public.queue_access_vendor_controller_command(uuid, uuid, text, text, jsonb) to authenticated;

create or replace function public.claim_vendor_controller_commands(
  p_device_key text,
  p_limit integer default 10
)
returns table (
  id uuid,
  device_id uuid,
  access_point_id uuid,
  vendor_provider text,
  command_type text,
  controller_identifier text,
  door_identifier text,
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
    raise exception 'Vendor controller device not found.';
  end if;

  return query
  with picked as (
    select commands.id
    from public.access_vendor_controller_commands as commands
    where commands.device_id = target_device.id
      and commands.command_status = 'queued'
    order by commands.created_at asc
    limit row_limit
    for update skip locked
  ),
  updated as (
    update public.access_vendor_controller_commands as commands
    set
      command_status = 'dispatched',
      dispatched_at = timezone('utc', now())
    from picked
    where commands.id = picked.id
    returning
      commands.id,
      commands.device_id,
      commands.access_point_id,
      commands.vendor_provider,
      commands.command_type,
      commands.controller_identifier,
      commands.door_identifier,
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
        'commandFamily', 'vendor_controller',
        'commandId', updated.id,
        'commandType', updated.command_type,
        'vendorProvider', updated.vendor_provider,
        'controllerIdentifier', updated.controller_identifier,
        'doorIdentifier', updated.door_identifier,
        'payload', updated.command_payload
      )
    from updated
    returning id
  )
  select
    updated.id,
    updated.device_id,
    updated.access_point_id,
    updated.vendor_provider,
    updated.command_type,
    updated.controller_identifier,
    updated.door_identifier,
    updated.requested_reason,
    updated.command_payload,
    updated.created_at,
    updated.dispatched_at
  from updated;
end;
$$;

revoke all on function public.claim_vendor_controller_commands(text, integer) from public;
grant execute on function public.claim_vendor_controller_commands(text, integer) to authenticated;

create or replace function public.complete_vendor_controller_command(
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
  saved_command public.access_vendor_controller_commands;
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
    raise exception 'Vendor controller status must be completed, failed, or cancelled.';
  end if;

  select *
  into target_device
  from public.access_hardware_devices
  where device_key = cleaned_key;

  if target_device.id is null then
    raise exception 'Vendor controller device not found.';
  end if;

  update public.access_vendor_controller_commands
  set
    command_status = cleaned_status,
    result_payload = coalesce(p_result, '{}'::jsonb),
    completed_at = timezone('utc', now())
  where id = p_command_id
    and device_id = target_device.id
  returning * into saved_command;

  if saved_command.id is null then
    raise exception 'Vendor controller command not found for the selected device.';
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
      'commandFamily', 'vendor_controller',
      'commandId', saved_command.id,
      'commandType', saved_command.command_type,
      'vendorProvider', saved_command.vendor_provider,
      'controllerIdentifier', saved_command.controller_identifier,
      'doorIdentifier', saved_command.door_identifier,
      'result', saved_command.result_payload
    )
  );

  return jsonb_build_object(
    'commandId', saved_command.id,
    'status', saved_command.command_status,
    'completedAt', saved_command.completed_at,
    'deviceId', saved_command.device_id,
    'vendorProvider', saved_command.vendor_provider,
    'result', saved_command.result_payload
  );
end;
$$;

revoke all on function public.complete_vendor_controller_command(uuid, text, text, jsonb) from public;
grant execute on function public.complete_vendor_controller_command(uuid, text, text, jsonb) to authenticated;

create or replace function public.list_recent_vendor_controller_commands(p_limit integer default 20)
returns table (
  id uuid,
  created_at timestamp with time zone,
  command_status text,
  vendor_provider text,
  command_type text,
  controller_identifier text,
  door_identifier text,
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
    commands.vendor_provider,
    commands.command_type,
    commands.controller_identifier,
    commands.door_identifier,
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
  from public.access_vendor_controller_commands as commands
  join public.access_hardware_devices as devices on devices.id = commands.device_id
  left join public.access_points as points on points.id = commands.access_point_id
  where auth.uid() is not null
    and public.is_staff()
  order by commands.created_at desc
  limit greatest(coalesce(p_limit, 20), 1);
$$;

revoke all on function public.list_recent_vendor_controller_commands(integer) from public;
grant execute on function public.list_recent_vendor_controller_commands(integer) to authenticated;

alter table public.access_vendor_controller_commands enable row level security;

drop policy if exists "Staff can view vendor controller commands" on public.access_vendor_controller_commands;
create policy "Staff can view vendor controller commands"
on public.access_vendor_controller_commands
for select
to authenticated
using (public.is_staff());

drop policy if exists "Admins can manage vendor controller commands" on public.access_vendor_controller_commands;
create policy "Admins can manage vendor controller commands"
on public.access_vendor_controller_commands
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
