create or replace function public.normalize_access_hardware_credential_type(p_type text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when lower(coalesce(nullif(btrim(coalesce(p_type, '')), ''), 'card_uid')) in ('qr', 'qr_token', 'access_token') then 'qr'
    when lower(coalesce(nullif(btrim(coalesce(p_type, '')), ''), 'card_uid')) in ('rfid', 'rfid_uid', 'nfc', 'nfc_uid', 'card_uid', 'tag_uid', 'uid') then 'card_uid'
    else lower(coalesce(nullif(btrim(coalesce(p_type, '')), ''), 'card_uid'))
  end;
$$;

revoke all on function public.normalize_access_hardware_credential_type(text) from public;
grant execute on function public.normalize_access_hardware_credential_type(text) to authenticated;

create or replace function public.normalize_access_hardware_credential_value(p_value text)
returns text
language sql
immutable
set search_path = public
as $$
  select regexp_replace(upper(coalesce(p_value, '')), '[^0-9A-Z]', '', 'g');
$$;

revoke all on function public.normalize_access_hardware_credential_value(text) from public;
grant execute on function public.normalize_access_hardware_credential_value(text) to authenticated;

create table if not exists public.member_access_hardware_credentials (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  access_point_id uuid references public.access_points(id) on delete set null,
  credential_type text not null default 'card_uid',
  credential_hash text not null,
  credential_suffix text not null,
  credential_label text,
  status text not null default 'active',
  metadata jsonb not null default '{}'::jsonb,
  issued_by uuid references public.profiles(id) on delete set null,
  last_verified_at timestamp with time zone,
  last_seen_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint member_access_hardware_credentials_type_check check (
    credential_type in ('card_uid')
  ),
  constraint member_access_hardware_credentials_status_check check (
    status in ('active', 'revoked', 'lost', 'expired', 'inactive')
  ),
  constraint member_access_hardware_credentials_unique_hash unique (credential_type, credential_hash)
);

create index if not exists member_access_hardware_credentials_user_status_idx
  on public.member_access_hardware_credentials (user_id, status, updated_at desc);

create index if not exists member_access_hardware_credentials_access_point_status_idx
  on public.member_access_hardware_credentials (access_point_id, status, updated_at desc);

create index if not exists member_access_hardware_credentials_last_seen_idx
  on public.member_access_hardware_credentials (last_seen_at desc);

drop trigger if exists member_access_hardware_credentials_touch_updated_at on public.member_access_hardware_credentials;
create trigger member_access_hardware_credentials_touch_updated_at
before update on public.member_access_hardware_credentials
for each row
execute function public.touch_access_updated_at();

create or replace function public.upsert_member_access_hardware_credential(
  p_user_id uuid,
  p_access_point_id uuid default null,
  p_credential_type text default 'card_uid',
  p_credential_value text default null,
  p_credential_label text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_type text;
  normalized_value text;
  credential_hash text;
  credential_suffix text;
  saved_credential public.member_access_hardware_credentials;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_user_id is null then
    raise exception 'Member profile id is required.';
  end if;

  normalized_type := public.normalize_access_hardware_credential_type(p_credential_type);

  if normalized_type <> 'card_uid' then
    raise exception 'Only RFID / NFC UID credentials are supported in this patch.';
  end if;

  normalized_value := public.normalize_access_hardware_credential_value(p_credential_value);

  if normalized_value is null or normalized_value = '' then
    raise exception 'Credential value is required.';
  end if;

  if char_length(normalized_value) < 4 then
    raise exception 'Credential value must contain at least 4 alphanumeric characters.';
  end if;

  credential_hash := encode(digest(normalized_value, 'sha256'), 'hex');
  credential_suffix := right(normalized_value, least(char_length(normalized_value), 8));

  insert into public.member_access_hardware_credentials (
    user_id,
    access_point_id,
    credential_type,
    credential_hash,
    credential_suffix,
    credential_label,
    status,
    metadata,
    issued_by
  )
  values (
    p_user_id,
    p_access_point_id,
    normalized_type,
    credential_hash,
    credential_suffix,
    nullif(btrim(coalesce(p_credential_label, '')), ''),
    'active',
    coalesce(p_metadata, '{}'::jsonb),
    auth.uid()
  )
  on conflict (credential_type, credential_hash)
  do update
  set
    user_id = excluded.user_id,
    access_point_id = excluded.access_point_id,
    credential_label = excluded.credential_label,
    status = 'active',
    metadata = excluded.metadata,
    issued_by = auth.uid(),
    updated_at = timezone('utc', now())
  returning * into saved_credential;

  return jsonb_build_object(
    'id', saved_credential.id,
    'userId', saved_credential.user_id,
    'accessPointId', saved_credential.access_point_id,
    'credentialType', saved_credential.credential_type,
    'credentialSuffix', saved_credential.credential_suffix,
    'credentialLabel', saved_credential.credential_label,
    'status', saved_credential.status
  );
end;
$$;

revoke all on function public.upsert_member_access_hardware_credential(uuid, uuid, text, text, text, jsonb) from public;
grant execute on function public.upsert_member_access_hardware_credential(uuid, uuid, text, text, text, jsonb) to authenticated;

create or replace function public.revoke_member_access_hardware_credential(
  p_credential_id uuid,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_credential public.member_access_hardware_credentials;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_credential_id is null then
    raise exception 'Credential id is required.';
  end if;

  update public.member_access_hardware_credentials
  set
    status = 'revoked',
    metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object(
      'revokedAt', timezone('utc', now()),
      'revokedReason', nullif(btrim(coalesce(p_reason, '')), '')
    ),
    updated_at = timezone('utc', now())
  where id = p_credential_id
  returning * into saved_credential;

  if saved_credential.id is null then
    raise exception 'RFID / NFC credential not found.';
  end if;

  return jsonb_build_object(
    'id', saved_credential.id,
    'credentialType', saved_credential.credential_type,
    'credentialSuffix', saved_credential.credential_suffix,
    'status', saved_credential.status
  );
end;
$$;

revoke all on function public.revoke_member_access_hardware_credential(uuid, text) from public;
grant execute on function public.revoke_member_access_hardware_credential(uuid, text) to authenticated;

create or replace function public.list_recent_member_access_hardware_credentials(p_limit integer default 20)
returns table (
  id uuid,
  user_id uuid,
  full_name text,
  email text,
  access_point_id uuid,
  access_point_name text,
  branch_name text,
  credential_type text,
  credential_suffix text,
  credential_label text,
  status text,
  metadata jsonb,
  last_verified_at timestamp with time zone,
  last_seen_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language sql
stable
security definer
set search_path = public
as $$
  select
    credentials.id,
    credentials.user_id,
    profiles.full_name,
    profiles.email,
    credentials.access_point_id,
    points.name as access_point_name,
    coalesce(points.branch_name, 'Main Branch') as branch_name,
    credentials.credential_type,
    credentials.credential_suffix,
    credentials.credential_label,
    credentials.status,
    credentials.metadata,
    credentials.last_verified_at,
    credentials.last_seen_at,
    credentials.created_at,
    credentials.updated_at
  from public.member_access_hardware_credentials as credentials
  left join public.profiles on profiles.id = credentials.user_id
  left join public.access_points as points on points.id = credentials.access_point_id
  where auth.uid() is not null
    and public.is_staff()
  order by credentials.updated_at desc, credentials.created_at desc
  limit greatest(coalesce(p_limit, 20), 1);
$$;

revoke all on function public.list_recent_member_access_hardware_credentials(integer) from public;
grant execute on function public.list_recent_member_access_hardware_credentials(integer) to authenticated;

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
  normalized_type text;
  cleaned_value text;
  normalized_value text;
  cleaned_entry_method text;
  target_device public.access_hardware_devices;
  target_access_point_id uuid;
  decision_result jsonb := '{}'::jsonb;
  access_event_id uuid;
  target_credential public.member_access_hardware_credentials;
  member_profile public.profiles;
  member_plan_name text;
  has_valid_membership boolean;
  has_valid_waiver boolean;
  decision text := 'deny';
  reason text;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  cleaned_type := lower(coalesce(nullif(btrim(coalesce(p_credential_type, '')), ''), 'access_token'));
  normalized_type := public.normalize_access_hardware_credential_type(cleaned_type);
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

  if normalized_type = 'qr' then
    decision_result := public.verify_member_access_pass(
      cleaned_value,
      target_access_point_id,
      cleaned_entry_method
    );
  elsif normalized_type = 'card_uid' then
    normalized_value := public.normalize_access_hardware_credential_value(cleaned_value);

    if normalized_value is null or normalized_value = '' then
      raise exception 'Credential value is required.';
    end if;

    select *
    into target_credential
    from public.member_access_hardware_credentials as credentials
    where credentials.credential_type = 'card_uid'
      and credentials.credential_hash = encode(digest(normalized_value, 'sha256'), 'hex')
      and credentials.status = 'active'
      and (
        target_access_point_id is null
        or credentials.access_point_id is null
        or credentials.access_point_id = target_access_point_id
      )
    order by
      case when credentials.access_point_id = target_access_point_id then 0 else 1 end,
      credentials.updated_at desc
    limit 1
    for update;

    if target_credential.id is null then
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
        'RFID / NFC credential not recognized.',
        'unknown',
        jsonb_build_object(
          'credentialType', normalized_type,
          'tokenMatched', false,
          'credentialSuffix', right(normalized_value, least(char_length(normalized_value), 8)),
          'deviceId', p_device_id,
          'payload', coalesce(p_payload, '{}'::jsonb)
        )
      )
      returning id into access_event_id;

      decision_result := jsonb_build_object(
        'decision', 'deny',
        'reason', 'RFID / NFC credential not recognized.',
        'accessEventId', access_event_id
      );
    else
      select *
      into member_profile
      from public.profiles
      where id = target_credential.user_id;

      select plans.name
      into member_plan_name
      from public.membership_plans as plans
      where plans.id = member_profile.plan_id;

      has_valid_membership := public.is_active_member(target_credential.user_id);
      has_valid_waiver := public.member_has_valid_waiver(target_credential.user_id);

      if member_profile.id is null then
        reason := 'Member profile not found for this credential.';
      elsif target_credential.status <> 'active' then
        reason := 'Credential is not active.';
      elsif not has_valid_membership then
        reason := 'Membership is not active.';
      elsif not has_valid_waiver then
        reason := 'Active waiver acceptance is required.';
      else
        decision := 'allow';
        reason := null;
      end if;

      update public.member_access_hardware_credentials
      set
        last_verified_at = timezone('utc', now()),
        last_seen_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
      where id = target_credential.id;

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
        target_credential.user_id,
        target_access_point_id,
        null,
        cleaned_entry_method,
        decision,
        reason,
        member_profile.membership_status,
        member_plan_name,
        case when has_valid_waiver then 'valid' else 'missing' end,
        jsonb_build_object(
          'credentialType', normalized_type,
          'credentialId', target_credential.id,
          'credentialSuffix', target_credential.credential_suffix,
          'credentialLabel', target_credential.credential_label,
          'deviceId', p_device_id,
          'payload', coalesce(p_payload, '{}'::jsonb)
        )
      )
      returning id into access_event_id;

      decision_result := jsonb_build_object(
        'decision', decision,
        'reason', reason,
        'accessEventId', access_event_id,
        'userId', target_credential.user_id,
        'fullName', member_profile.full_name,
        'email', member_profile.email,
        'membershipStatus', member_profile.membership_status,
        'planName', member_plan_name,
        'waiverValid', has_valid_waiver,
        'credentialId', target_credential.id,
        'credentialLabel', target_credential.credential_label,
        'credentialSuffix', target_credential.credential_suffix
      );
    end if;
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
      format('Credential type %s is not supported yet.', normalized_type),
      'unknown',
      jsonb_build_object(
        'credentialType', normalized_type,
        'deviceId', p_device_id,
        'payload', coalesce(p_payload, '{}'::jsonb)
      )
    )
    returning id into access_event_id;

    decision_result := jsonb_build_object(
      'decision', 'deny',
      'reason', format('Credential type %s is not supported yet.', normalized_type),
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
        'credentialType', normalized_type,
        'entryMethod', cleaned_entry_method,
        'result', decision_result,
        'payload', coalesce(p_payload, '{}'::jsonb)
      )
    );
  end if;

  return coalesce(decision_result, '{}'::jsonb) || jsonb_build_object(
    'credentialType', normalized_type,
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
    'rfidCredentialCount', (
      select count(*)
      from public.member_access_hardware_credentials
      where status = 'active'
    ),
    'rfidReadyDeviceCount', (
      select count(*)
      from public.access_hardware_devices
      where is_active = true
        and credential_types && array['rfid', 'rfid_uid', 'nfc', 'nfc_uid', 'card_uid', 'tag_uid']::text[]
    )
  )
  into snapshot;

  return coalesce(snapshot, '{}'::jsonb);
end;
$$;

revoke all on function public.get_access_hardware_snapshot(integer) from public;
grant execute on function public.get_access_hardware_snapshot(integer) to authenticated;

alter table public.member_access_hardware_credentials enable row level security;

drop policy if exists "Staff can view member hardware credentials" on public.member_access_hardware_credentials;
create policy "Staff can view member hardware credentials"
on public.member_access_hardware_credentials
for select
to authenticated
using (public.is_staff());

drop policy if exists "Admins can manage member hardware credentials" on public.member_access_hardware_credentials;
create policy "Admins can manage member hardware credentials"
on public.member_access_hardware_credentials
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
