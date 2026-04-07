alter table public.class_bookings
  add column if not exists waitlist_position integer,
  add column if not exists booking_source text not null default 'member_app',
  add column if not exists cancelled_at timestamp with time zone,
  add column if not exists cancel_reason text,
  add column if not exists status_changed_at timestamp with time zone not null default timezone('utc', now());

alter table public.class_bookings
  drop constraint if exists class_bookings_booking_source_check;

alter table public.class_bookings
  add constraint class_bookings_booking_source_check
  check (booking_source in ('member_app', 'staff_desk', 'admin_panel', 'system'));

alter table public.class_bookings
  drop constraint if exists class_bookings_waitlist_position_positive;

alter table public.class_bookings
  add constraint class_bookings_waitlist_position_positive
  check (waitlist_position is null or waitlist_position > 0);

update public.class_bookings
set
  status_changed_at = coalesce(status_changed_at, updated_at, created_at, timezone('utc', now())),
  booking_source = coalesce(nullif(btrim(booking_source), ''), 'member_app');

with ranked_waitlist as (
  select
    id,
    row_number() over (
      partition by class_session_id
      order by created_at asc, id asc
    ) as next_position
  from public.class_bookings
  where booking_status = 'waitlist'
)
update public.class_bookings as target
set waitlist_position = ranked_waitlist.next_position
from ranked_waitlist
where target.id = ranked_waitlist.id
  and target.waitlist_position is distinct from ranked_waitlist.next_position;

update public.class_bookings
set waitlist_position = null
where booking_status <> 'waitlist'
  and waitlist_position is not null;

create index if not exists class_bookings_waitlist_position_idx
  on public.class_bookings (class_session_id, waitlist_position)
  where booking_status = 'waitlist';

create index if not exists class_bookings_status_changed_at_idx
  on public.class_bookings (status_changed_at desc);

create or replace function public.resequence_class_waitlist(p_session_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_session_id is null then
    return;
  end if;

  with ranked_waitlist as (
    select
      id,
      row_number() over (
        order by created_at asc, id asc
      ) as next_position
    from public.class_bookings
    where class_session_id = p_session_id
      and booking_status = 'waitlist'
  )
  update public.class_bookings as target
  set waitlist_position = ranked_waitlist.next_position
  from ranked_waitlist
  where target.id = ranked_waitlist.id
    and target.waitlist_position is distinct from ranked_waitlist.next_position;

  update public.class_bookings
  set waitlist_position = null
  where class_session_id = p_session_id
    and booking_status <> 'waitlist'
    and waitlist_position is not null;
end;
$$;

create or replace function public.promote_next_waitlisted_booking(p_session_id uuid)
returns public.class_bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  target_session public.class_sessions;
  next_waitlisted_booking public.class_bookings;
  promoted_booking public.class_bookings;
  booked_count integer;
begin
  if p_session_id is null then
    return null;
  end if;

  select *
  into target_session
  from public.class_sessions
  where id = p_session_id
  for update;

  if target_session.id is null then
    return null;
  end if;

  perform public.resequence_class_waitlist(p_session_id);

  select count(*)
  into booked_count
  from public.class_bookings
  where class_session_id = p_session_id
    and booking_status = 'booked';

  if booked_count >= coalesce(target_session.capacity, 0) then
    return null;
  end if;

  select *
  into next_waitlisted_booking
  from public.class_bookings
  where class_session_id = p_session_id
    and booking_status = 'waitlist'
  order by waitlist_position asc nulls last, created_at asc, id asc
  limit 1
  for update;

  if next_waitlisted_booking.id is null then
    return null;
  end if;

  update public.class_bookings
  set
    booking_status = 'booked',
    waitlist_position = null,
    cancelled_at = null,
    cancel_reason = null,
    status_changed_at = timezone('utc', now()),
    booking_source = 'system'
  where id = next_waitlisted_booking.id
  returning * into promoted_booking;

  perform public.resequence_class_waitlist(p_session_id);

  return promoted_booking;
end;
$$;

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
      max(case when bookings.user_id = auth.uid() then bookings.id else null end) as my_booking_id,
      max(case when bookings.user_id = auth.uid() then bookings.booking_status else null end) as my_booking_status,
      max(case when bookings.user_id = auth.uid() then bookings.waitlist_position else null end) as my_waitlist_position
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
