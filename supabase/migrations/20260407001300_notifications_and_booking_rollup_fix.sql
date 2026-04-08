-- Phase 12 repair: finish the tail of bookings_and_waitlists with the corrected uuid aggregation,
-- then add the notifications workspace.

create or replace function public.list_bookable_class_sessions(
  p_start_date date default current_date,
  p_end_date date default null,
  p_session_type text default null,
  p_trainer_id uuid default null,
  p_room_name text default null,
  p_status text default 'scheduled',
  p_visibility text default 'members',
  p_include_inactive boolean default false,
  p_limit integer default 120
)
returns table (
  id uuid,
  title text,
  description text,
  session_type text,
  coach_name text,
  trainer_id uuid,
  trainer_name text,
  room_name text,
  branch_name text,
  equipment_notes text,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  capacity integer,
  is_active boolean,
  visibility text,
  schedule_status text,
  recurrence_group_id uuid,
  recurrence_rule text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  booked_count bigint,
  waitlist_count bigint,
  remaining_spots integer,
  my_booking_id uuid,
  my_booking_status text,
  my_waitlist_position integer
)
language sql
stable
security definer
set search_path = public
as $$
  with filtered_sessions as (
    select sessions.*
    from public.class_sessions as sessions
    where (p_start_date is null or sessions.starts_at >= p_start_date::timestamp)
      and (p_end_date is null or sessions.starts_at <= (p_end_date::timestamp + interval '1 day' - interval '1 millisecond'))
      and (p_session_type is null or sessions.session_type = p_session_type)
      and (p_trainer_id is null or sessions.trainer_id = p_trainer_id)
      and (p_room_name is null or sessions.room_name = p_room_name)
      and (p_status is null or sessions.schedule_status = p_status)
      and (p_visibility is null or sessions.visibility = p_visibility)
      and (p_include_inactive or sessions.is_active = true)
      and (
        public.is_staff()
        or (
          sessions.is_active = true
          and sessions.schedule_status = 'scheduled'
          and sessions.visibility = 'members'
        )
      )
    order by sessions.starts_at asc
    limit greatest(coalesce(p_limit, 120), 1)
  ),
  booking_rollup as (
    select
      bookings.class_session_id,
      count(*) filter (where bookings.booking_status = 'booked')::bigint as booked_count,
      count(*) filter (where bookings.booking_status = 'waitlist')::bigint as waitlist_count,
      (
        array_agg(
          bookings.id
          order by coalesce(bookings.status_changed_at, bookings.updated_at, bookings.created_at) desc,
                   bookings.created_at desc,
                   bookings.id::text desc
        ) filter (where bookings.user_id = auth.uid())
      )[1] as my_booking_id,
      (
        array_agg(
          bookings.booking_status
          order by coalesce(bookings.status_changed_at, bookings.updated_at, bookings.created_at) desc,
                   bookings.created_at desc,
                   bookings.id::text desc
        ) filter (where bookings.user_id = auth.uid())
      )[1] as my_booking_status,
      (
        array_agg(
          bookings.waitlist_position
          order by coalesce(bookings.status_changed_at, bookings.updated_at, bookings.created_at) desc,
                   bookings.created_at desc,
                   bookings.id::text desc
        ) filter (where bookings.user_id = auth.uid())
      )[1] as my_waitlist_position
    from public.class_bookings as bookings
    inner join filtered_sessions on filtered_sessions.id = bookings.class_session_id
    group by bookings.class_session_id
  )
  select
    filtered_sessions.id,
    filtered_sessions.title,
    filtered_sessions.description,
    filtered_sessions.session_type,
    filtered_sessions.coach_name,
    filtered_sessions.trainer_id,
    filtered_sessions.trainer_name,
    filtered_sessions.room_name,
    filtered_sessions.branch_name,
    filtered_sessions.equipment_notes,
    filtered_sessions.starts_at,
    filtered_sessions.ends_at,
    filtered_sessions.capacity,
    filtered_sessions.is_active,
    filtered_sessions.visibility,
    filtered_sessions.schedule_status,
    filtered_sessions.recurrence_group_id,
    filtered_sessions.recurrence_rule,
    filtered_sessions.created_at,
    filtered_sessions.updated_at,
    coalesce(booking_rollup.booked_count, 0) as booked_count,
    coalesce(booking_rollup.waitlist_count, 0) as waitlist_count,
    greatest(filtered_sessions.capacity - coalesce(booking_rollup.booked_count, 0)::integer, 0) as remaining_spots,
    booking_rollup.my_booking_id,
    coalesce(booking_rollup.my_booking_status, 'none') as my_booking_status,
    booking_rollup.my_waitlist_position
  from filtered_sessions
  left join booking_rollup on booking_rollup.class_session_id = filtered_sessions.id
  order by filtered_sessions.starts_at asc;
$$;

revoke all on function public.list_bookable_class_sessions(date, date, text, uuid, text, text, text, boolean, integer) from public;
grant execute on function public.list_bookable_class_sessions(date, date, text, uuid, text, text, text, boolean, integer) to authenticated;

create or replace function public.book_class_session(
  p_session_id uuid,
  p_notes text default null,
  p_source text default 'member_app'
)
returns public.class_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.class_sessions;
  existing_booking public.class_bookings;
  saved_booking public.class_bookings;
  booked_count integer;
  next_waitlist_position integer;
  cleaned_notes text;
  cleaned_source text;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  if not public.is_active_member(auth.uid()) then
    raise exception 'Your membership is not eligible for class bookings right now.';
  end if;

  if p_session_id is null then
    raise exception 'Class session is required';
  end if;

  cleaned_notes := nullif(btrim(coalesce(p_notes, '')), '');
  cleaned_source := coalesce(nullif(btrim(coalesce(p_source, '')), ''), 'member_app');

  select *
  into target_session
  from public.class_sessions
  where id = p_session_id
  for update;

  if target_session.id is null then
    raise exception 'Class session not found.';
  end if;

  if target_session.starts_at <= timezone('utc', now()) then
    raise exception 'This class session has already started.';
  end if;

  if not target_session.is_active or target_session.schedule_status <> 'scheduled' then
    raise exception 'This class session is not currently accepting bookings.';
  end if;

  if target_session.visibility <> 'members' and not public.is_staff() then
    raise exception 'This class session is not available in the member timetable.';
  end if;

  perform public.resequence_class_waitlist(p_session_id);

  select *
  into existing_booking
  from public.class_bookings
  where class_session_id = p_session_id
    and user_id = auth.uid()
  for update;

  if existing_booking.id is not null
    and existing_booking.booking_status in ('booked', 'waitlist') then
    raise exception 'You already have an active reservation for this class.';
  end if;

  select count(*)
  into booked_count
  from public.class_bookings
  where class_session_id = p_session_id
    and booking_status = 'booked';

  if booked_count < coalesce(target_session.capacity, 0) then
    if existing_booking.id is null then
      insert into public.class_bookings (
        class_session_id,
        user_id,
        booking_status,
        waitlist_position,
        booking_source,
        notes,
        cancelled_at,
        cancel_reason,
        status_changed_at
      )
      values (
        p_session_id,
        auth.uid(),
        'booked',
        null,
        cleaned_source,
        cleaned_notes,
        null,
        null,
        timezone('utc', now())
      )
      returning * into saved_booking;
    else
      update public.class_bookings
      set
        booking_status = 'booked',
        waitlist_position = null,
        booking_source = cleaned_source,
        notes = coalesce(cleaned_notes, notes),
        cancelled_at = null,
        cancel_reason = null,
        status_changed_at = timezone('utc', now())
      where id = existing_booking.id
      returning * into saved_booking;
    end if;
  else
    select coalesce(max(waitlist_position), 0) + 1
    into next_waitlist_position
    from public.class_bookings
    where class_session_id = p_session_id
      and booking_status = 'waitlist';

    if existing_booking.id is null then
      insert into public.class_bookings (
        class_session_id,
        user_id,
        booking_status,
        waitlist_position,
        booking_source,
        notes,
        cancelled_at,
        cancel_reason,
        status_changed_at
      )
      values (
        p_session_id,
        auth.uid(),
        'waitlist',
        next_waitlist_position,
        cleaned_source,
        cleaned_notes,
        null,
        null,
        timezone('utc', now())
      )
      returning * into saved_booking;
    else
      update public.class_bookings
      set
        booking_status = 'waitlist',
        waitlist_position = next_waitlist_position,
        booking_source = cleaned_source,
        notes = coalesce(cleaned_notes, notes),
        cancelled_at = null,
        cancel_reason = null,
        status_changed_at = timezone('utc', now())
      where id = existing_booking.id
      returning * into saved_booking;
    end if;
  end if;

  perform public.resequence_class_waitlist(p_session_id);

  return saved_booking;
end;
$$;

revoke all on function public.book_class_session(uuid, text, text) from public;
grant execute on function public.book_class_session(uuid, text, text) to authenticated;

create or replace function public.cancel_class_booking(
  p_session_id uuid,
  p_reason text default null,
  p_promote_waitlist boolean default true
)
returns public.class_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  target_booking public.class_bookings;
  previous_status text;
  saved_booking public.class_bookings;
  cleaned_reason text;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  if p_session_id is null then
    raise exception 'Class session is required';
  end if;

  cleaned_reason := nullif(btrim(coalesce(p_reason, '')), '');

  select *
  into target_booking
  from public.class_bookings
  where class_session_id = p_session_id
    and user_id = auth.uid()
  for update;

  if target_booking.id is null then
    raise exception 'No booking was found for this class.';
  end if;

  if target_booking.booking_status not in ('booked', 'waitlist') then
    raise exception 'Only active booked or waitlisted entries can be cancelled.';
  end if;

  previous_status := target_booking.booking_status;

  update public.class_bookings
  set
    booking_status = 'cancelled',
    waitlist_position = null,
    booking_source = 'member_app',
    cancel_reason = cleaned_reason,
    cancelled_at = timezone('utc', now()),
    status_changed_at = timezone('utc', now())
  where id = target_booking.id
  returning * into saved_booking;

  perform public.resequence_class_waitlist(p_session_id);

  if previous_status = 'booked' and coalesce(p_promote_waitlist, true) then
    perform public.promote_next_waitlisted_booking(p_session_id);
  end if;

  return saved_booking;
end;
$$;

revoke all on function public.cancel_class_booking(uuid, text, boolean) from public;
grant execute on function public.cancel_class_booking(uuid, text, boolean) to authenticated;

create or replace function public.list_session_booking_roster(p_session_id uuid)
returns table (
  id uuid,
  class_session_id uuid,
  user_id uuid,
  booking_status text,
  waitlist_position integer,
  booking_source text,
  notes text,
  cancel_reason text,
  cancelled_at timestamp with time zone,
  status_changed_at timestamp with time zone,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  user_full_name text,
  user_email text,
  user_phone text,
  membership_status text,
  plan_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  return query
  select
    bookings.id,
    bookings.class_session_id,
    bookings.user_id,
    bookings.booking_status,
    bookings.waitlist_position,
    bookings.booking_source,
    bookings.notes,
    bookings.cancel_reason,
    bookings.cancelled_at,
    bookings.status_changed_at,
    bookings.created_at,
    bookings.updated_at,
    profiles.full_name as user_full_name,
    profiles.email as user_email,
    profiles.phone as user_phone,
    profiles.membership_status,
    membership_plans.name as plan_name
  from public.class_bookings as bookings
  left join public.profiles on profiles.id = bookings.user_id
  left join public.membership_plans on membership_plans.id = profiles.plan_id
  where bookings.class_session_id = p_session_id
  order by
    case bookings.booking_status
      when 'booked' then 0
      when 'waitlist' then 1
      when 'attended' then 2
      when 'missed' then 3
      else 4
    end asc,
    bookings.waitlist_position asc nulls last,
    bookings.created_at asc;
end;
$$;

revoke all on function public.list_session_booking_roster(uuid) from public;
grant execute on function public.list_session_booking_roster(uuid) to authenticated;

create or replace function public.staff_promote_next_waitlisted_booking(p_session_id uuid)
returns public.class_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  promoted_booking public.class_bookings;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  promoted_booking := public.promote_next_waitlisted_booking(p_session_id);

  if promoted_booking.id is null then
    raise exception 'No waitlisted booking can be promoted right now.';
  end if;

  return promoted_booking;
end;
$$;

revoke all on function public.staff_promote_next_waitlisted_booking(uuid) from public;
grant execute on function public.staff_promote_next_waitlisted_booking(uuid) to authenticated;

create or replace function public.staff_update_class_booking(
  p_booking_id uuid,
  p_booking_status text,
  p_notes text default null,
  p_cancel_reason text default null
)
returns public.class_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  target_booking public.class_bookings;
  target_session public.class_sessions;
  saved_booking public.class_bookings;
  next_status text;
  cleaned_notes text;
  cleaned_reason text;
  next_waitlist_position integer;
  booked_count integer;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  if p_booking_id is null then
    raise exception 'Booking id is required';
  end if;

  next_status := nullif(btrim(coalesce(p_booking_status, '')), '');

  if next_status is null then
    raise exception 'Booking status is required';
  end if;

  if next_status not in ('booked', 'waitlist', 'cancelled', 'attended', 'missed') then
    raise exception 'Unsupported booking status.';
  end if;

  select *
  into target_booking
  from public.class_bookings
  where id = p_booking_id
  for update;

  if target_booking.id is null then
    raise exception 'Booking not found.';
  end if;

  select *
  into target_session
  from public.class_sessions
  where id = target_booking.class_session_id
  for update;

  if target_session.id is null then
    raise exception 'Class session not found.';
  end if;

  if next_status in ('attended', 'missed')
    and target_booking.booking_status not in ('booked', 'attended', 'missed') then
    raise exception 'Only booked members can be marked attended or missed.';
  end if;

  perform public.resequence_class_waitlist(target_session.id);

  if next_status = 'booked'
    and target_booking.booking_status <> 'booked' then
    select count(*)
    into booked_count
    from public.class_bookings
    where class_session_id = target_session.id
      and booking_status = 'booked'
      and id <> target_booking.id;

    if booked_count >= coalesce(target_session.capacity, 0) then
      raise exception 'No booked spot is currently available. Promote later or increase capacity first.';
    end if;
  end if;

  if next_status = 'waitlist' and target_booking.booking_status <> 'waitlist' then
    select coalesce(max(waitlist_position), 0) + 1
    into next_waitlist_position
    from public.class_bookings
    where class_session_id = target_session.id
      and booking_status = 'waitlist';
  else
    next_waitlist_position := target_booking.waitlist_position;
  end if;

  cleaned_notes := nullif(btrim(coalesce(p_notes, target_booking.notes, '')), '');
  cleaned_reason := nullif(btrim(coalesce(p_cancel_reason, '')), '');

  update public.class_bookings
  set
    booking_status = next_status,
    waitlist_position = case
      when next_status = 'waitlist' then next_waitlist_position
      else null
    end,
    booking_source = case
      when public.is_admin() then 'admin_panel'
      else 'staff_desk'
    end,
    notes = cleaned_notes,
    cancel_reason = case
      when next_status = 'cancelled' then cleaned_reason
      else null
    end,
    cancelled_at = case
      when next_status = 'cancelled' then timezone('utc', now())
      else null
    end,
    status_changed_at = timezone('utc', now())
  where id = target_booking.id
  returning * into saved_booking;

  perform public.resequence_class_waitlist(target_session.id);

  if target_booking.booking_status = 'booked' and next_status = 'cancelled' then
    perform public.promote_next_waitlisted_booking(target_session.id);
  end if;

  return saved_booking;
end;
$$;

revoke all on function public.staff_update_class_booking(uuid, text, text, text) from public;
grant execute on function public.staff_update_class_booking(uuid, text, text, text) to authenticated;

drop policy if exists "Admins can manage class bookings" on public.class_bookings;
drop policy if exists "Staff can manage class bookings" on public.class_bookings;

create policy "Staff can manage class bookings"
on public.class_bookings
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

-- Phase 12: notifications and communication
create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email_enabled boolean not null default true,
  sms_enabled boolean not null default false,
  whatsapp_enabled boolean not null default false,
  push_enabled boolean not null default true,
  class_reminders_enabled boolean not null default true,
  billing_reminders_enabled boolean not null default true,
  workout_reminders_enabled boolean not null default true,
  marketing_enabled boolean not null default false,
  quiet_hours_start time,
  quiet_hours_end time,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.member_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  notification_type text not null default 'info',
  title text not null,
  message text not null,
  action_label text,
  action_path text,
  delivery_channel text not null default 'in_app',
  source_module text not null default 'manual',
  source_record_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  is_read boolean not null default false,
  read_at timestamp with time zone,
  expires_at timestamp with time zone,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint member_notifications_type_check check (
    notification_type in (
      'info',
      'success',
      'warning',
      'error',
      'billing',
      'class',
      'workout',
      'progress',
      'nutrition',
      'attendance',
      'system',
      'marketing'
    )
  ),
  constraint member_notifications_delivery_channel_check check (
    delivery_channel in ('in_app', 'email', 'sms', 'whatsapp', 'push', 'system')
  )
);

insert into public.notification_preferences (user_id)
select p.id
from public.profiles p
on conflict (user_id) do nothing;

create index if not exists member_notifications_user_created_at_idx
  on public.member_notifications (user_id, created_at desc);

create index if not exists member_notifications_user_unread_idx
  on public.member_notifications (user_id, created_at desc)
  where is_read = false;

drop trigger if exists set_notification_preferences_updated_at on public.notification_preferences;
create trigger set_notification_preferences_updated_at
before update on public.notification_preferences
for each row execute function public.set_updated_at();

drop trigger if exists set_member_notifications_updated_at on public.member_notifications;
create trigger set_member_notifications_updated_at
before update on public.member_notifications
for each row execute function public.set_updated_at();

alter table public.notification_preferences enable row level security;
alter table public.member_notifications enable row level security;

create or replace function public.list_notification_targets(
  p_query text default null,
  p_limit integer default 30
)
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  role text,
  membership_status text,
  is_active boolean,
  plan_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  return query
  select
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.role,
    p.membership_status,
    p.is_active,
    mp.name as plan_name
  from public.profiles p
  left join public.membership_plans mp
    on mp.id = p.plan_id
  where (
    nullif(btrim(coalesce(p_query, '')), '') is null
    or p.full_name ilike '%' || btrim(p_query) || '%'
    or p.email ilike '%' || btrim(p_query) || '%'
    or coalesce(p.phone, '') ilike '%' || btrim(p_query) || '%'
  )
  order by coalesce(p.full_name, p.email), p.created_at desc
  limit least(greatest(coalesce(p_limit, 30), 1), 100);
end;
$$;

revoke all on function public.list_notification_targets(text, integer) from public;
grant execute on function public.list_notification_targets(text, integer) to authenticated;

create or replace function public.list_staff_notifications(
  p_query text default null,
  p_status text default 'all',
  p_type text default null,
  p_limit integer default 120
)
returns table (
  id uuid,
  user_id uuid,
  recipient_name text,
  recipient_email text,
  recipient_role text,
  membership_status text,
  notification_type text,
  title text,
  message text,
  action_label text,
  action_path text,
  delivery_channel text,
  source_module text,
  metadata jsonb,
  is_read boolean,
  read_at timestamp with time zone,
  created_by uuid,
  created_by_name text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  return query
  select
    notifications.id,
    notifications.user_id,
    coalesce(recipient.full_name, recipient.email, 'Member') as recipient_name,
    recipient.email as recipient_email,
    recipient.role as recipient_role,
    recipient.membership_status,
    notifications.notification_type,
    notifications.title,
    notifications.message,
    notifications.action_label,
    notifications.action_path,
    notifications.delivery_channel,
    notifications.source_module,
    notifications.metadata,
    notifications.is_read,
    notifications.read_at,
    notifications.created_by,
    coalesce(creator.full_name, creator.email) as created_by_name,
    notifications.created_at,
    notifications.updated_at
  from public.member_notifications notifications
  join public.profiles recipient
    on recipient.id = notifications.user_id
  left join public.profiles creator
    on creator.id = notifications.created_by
  where (
    nullif(btrim(coalesce(p_query, '')), '') is null
    or recipient.full_name ilike '%' || btrim(p_query) || '%'
    or recipient.email ilike '%' || btrim(p_query) || '%'
    or notifications.title ilike '%' || btrim(p_query) || '%'
    or notifications.message ilike '%' || btrim(p_query) || '%'
  )
    and (
      p_status is null
      or p_status = 'all'
      or (p_status = 'unread' and notifications.is_read = false)
      or (p_status = 'read' and notifications.is_read = true)
    )
    and (p_type is null or notifications.notification_type = p_type)
  order by notifications.created_at desc
  limit least(greatest(coalesce(p_limit, 120), 1), 300);
end;
$$;

revoke all on function public.list_staff_notifications(text, text, text, integer) from public;
grant execute on function public.list_staff_notifications(text, text, text, integer) to authenticated;

create or replace function public.staff_send_notification(
  p_target_user_id uuid default null,
  p_target_role text default 'member',
  p_title text default null,
  p_message text default null,
  p_notification_type text default 'info',
  p_action_label text default null,
  p_action_path text default null,
  p_delivery_channel text default 'in_app',
  p_source_module text default 'manual',
  p_include_inactive boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_role text;
  cleaned_title text;
  cleaned_message text;
  cleaned_type text;
  cleaned_action_label text;
  cleaned_action_path text;
  cleaned_delivery_channel text;
  cleaned_source_module text;
  inserted_count integer := 0;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  cleaned_role := coalesce(nullif(btrim(coalesce(p_target_role, '')), ''), 'member');
  cleaned_title := nullif(btrim(coalesce(p_title, '')), '');
  cleaned_message := nullif(btrim(coalesce(p_message, '')), '');
  cleaned_type := coalesce(nullif(btrim(coalesce(p_notification_type, '')), ''), 'info');
  cleaned_action_label := nullif(btrim(coalesce(p_action_label, '')), '');
  cleaned_action_path := nullif(btrim(coalesce(p_action_path, '')), '');
  cleaned_delivery_channel := coalesce(nullif(btrim(coalesce(p_delivery_channel, '')), ''), 'in_app');
  cleaned_source_module := coalesce(nullif(btrim(coalesce(p_source_module, '')), ''), 'manual');

  if cleaned_title is null then
    raise exception 'Notification title is required.';
  end if;

  if cleaned_message is null then
    raise exception 'Notification message is required.';
  end if;

  if cleaned_role not in ('member', 'staff', 'admin', 'all') then
    raise exception 'Unsupported notification audience.';
  end if;

  if p_target_user_id is not null then
    insert into public.member_notifications (
      user_id,
      notification_type,
      title,
      message,
      action_label,
      action_path,
      delivery_channel,
      source_module,
      created_by
    )
    select
      recipient.id,
      cleaned_type,
      cleaned_title,
      cleaned_message,
      cleaned_action_label,
      cleaned_action_path,
      cleaned_delivery_channel,
      cleaned_source_module,
      auth.uid()
    from public.profiles recipient
    where recipient.id = p_target_user_id
      and (p_include_inactive or recipient.is_active);

    get diagnostics inserted_count = row_count;
    return inserted_count;
  end if;

  insert into public.member_notifications (
    user_id,
    notification_type,
    title,
    message,
    action_label,
    action_path,
    delivery_channel,
    source_module,
    created_by
  )
  select
    recipient.id,
    cleaned_type,
    cleaned_title,
    cleaned_message,
    cleaned_action_label,
    cleaned_action_path,
    cleaned_delivery_channel,
    cleaned_source_module,
    auth.uid()
  from public.profiles recipient
  where (p_include_inactive or recipient.is_active)
    and (cleaned_role = 'all' or recipient.role = cleaned_role);

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$;

revoke all on function public.staff_send_notification(uuid, text, text, text, text, text, text, text, text, boolean) from public;
grant execute on function public.staff_send_notification(uuid, text, text, text, text, text, text, text, text, boolean) to authenticated;

create or replace function public.mark_my_notification_read(
  p_notification_id uuid,
  p_is_read boolean default true
)
returns public.member_notifications
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_notification public.member_notifications;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  if p_notification_id is null then
    raise exception 'Notification id is required';
  end if;

  update public.member_notifications
  set
    is_read = coalesce(p_is_read, true),
    read_at = case
      when coalesce(p_is_read, true) then timezone('utc', now())
      else null
    end,
    updated_at = timezone('utc', now())
  where id = p_notification_id
    and user_id = auth.uid()
  returning * into saved_notification;

  if saved_notification.id is null then
    raise exception 'Notification not found.';
  end if;

  return saved_notification;
end;
$$;

revoke all on function public.mark_my_notification_read(uuid, boolean) from public;
grant execute on function public.mark_my_notification_read(uuid, boolean) to authenticated;

create or replace function public.mark_all_my_notifications_read()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  update public.member_notifications
  set
    is_read = true,
    read_at = coalesce(read_at, timezone('utc', now())),
    updated_at = timezone('utc', now())
  where user_id = auth.uid()
    and is_read = false;

  get diagnostics updated_count = row_count;
  return updated_count;
end;
$$;

revoke all on function public.mark_all_my_notifications_read() from public;
grant execute on function public.mark_all_my_notifications_read() to authenticated;

drop policy if exists "Users can read own notification preferences" on public.notification_preferences;
create policy "Users can read own notification preferences"
on public.notification_preferences
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can insert own notification preferences" on public.notification_preferences;
create policy "Users can insert own notification preferences"
on public.notification_preferences
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users can update own notification preferences" on public.notification_preferences;
create policy "Users can update own notification preferences"
on public.notification_preferences
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Users can read own member notifications" on public.member_notifications;
create policy "Users can read own member notifications"
on public.member_notifications
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can update own member notifications" on public.member_notifications;
create policy "Users can update own member notifications"
on public.member_notifications
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "Staff can insert member notifications" on public.member_notifications;
create policy "Staff can insert member notifications"
on public.member_notifications
for insert
to authenticated
with check (public.is_staff());

drop policy if exists "Staff can read member notifications" on public.member_notifications;
create policy "Staff can read member notifications"
on public.member_notifications
for select
to authenticated
using (public.is_staff());
