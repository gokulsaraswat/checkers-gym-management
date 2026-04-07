create table if not exists public.attendance_visits (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  visit_date date not null default (timezone('utc', now())::date),
  checked_in_at timestamp with time zone not null default timezone('utc', now()),
  checked_out_at timestamp with time zone,
  attendance_status text not null default 'checked_in' check (attendance_status in ('checked_in', 'checked_out', 'missed_checkout')),
  check_in_source text not null default 'self_service' check (check_in_source in ('self_service', 'staff_desk', 'admin_panel', 'manual_import', 'system')),
  check_out_source text check (check_out_source in ('self_service', 'staff_desk', 'admin_panel', 'manual_import', 'system')),
  location_label text,
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint attendance_visits_checkout_after_checkin check (checked_out_at is null or checked_out_at >= checked_in_at),
  constraint attendance_visits_location_not_blank check (location_label is null or nullif(btrim(location_label), '') is not null),
  constraint attendance_visits_notes_not_blank check (notes is null or nullif(btrim(notes), '') is not null)
);

create index if not exists attendance_visits_profile_id_idx
  on public.attendance_visits (profile_id, checked_in_at desc);

create index if not exists attendance_visits_visit_date_idx
  on public.attendance_visits (visit_date desc, checked_in_at desc);

create unique index if not exists attendance_visits_open_visit_unique
  on public.attendance_visits (profile_id)
  where checked_out_at is null;

drop trigger if exists set_attendance_visits_updated_at on public.attendance_visits;
create trigger set_attendance_visits_updated_at
before update on public.attendance_visits
for each row execute function public.set_updated_at();

alter table public.attendance_visits enable row level security;

create or replace function public.can_check_into_facility(check_user uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user
      and is_active = true
      and (
        role in ('staff', 'admin')
        or membership_status in ('active', 'trial')
      )
  );
$$;

revoke all on function public.can_check_into_facility(uuid) from public;
grant execute on function public.can_check_into_facility(uuid) to authenticated;

create or replace function public.record_self_check_in(
  p_location_label text default null,
  p_notes text default null
)
returns public.attendance_visits
language plpgsql
security definer
set search_path = public
as $$
declare
  open_visit public.attendance_visits;
  saved_visit public.attendance_visits;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  if not public.can_check_into_facility(auth.uid()) then
    raise exception 'Your account is not eligible for gym check-in right now.';
  end if;

  select *
  into open_visit
  from public.attendance_visits
  where profile_id = auth.uid()
    and checked_out_at is null
  order by checked_in_at desc
  limit 1;

  if open_visit.id is not null then
    raise exception 'You are already checked in.';
  end if;

  insert into public.attendance_visits (
    profile_id,
    visit_date,
    checked_in_at,
    attendance_status,
    check_in_source,
    location_label,
    notes,
    created_by
  )
  values (
    auth.uid(),
    timezone('utc', now())::date,
    timezone('utc', now()),
    'checked_in',
    'self_service',
    nullif(btrim(coalesce(p_location_label, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  returning * into saved_visit;

  return saved_visit;
end;
$$;

revoke all on function public.record_self_check_in(text, text) from public;
grant execute on function public.record_self_check_in(text, text) to authenticated;

create or replace function public.record_self_check_out(
  p_notes text default null
)
returns public.attendance_visits
language plpgsql
security definer
set search_path = public
as $$
declare
  open_visit public.attendance_visits;
  saved_visit public.attendance_visits;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  select *
  into open_visit
  from public.attendance_visits
  where profile_id = auth.uid()
    and checked_out_at is null
  order by checked_in_at desc
  limit 1;

  if open_visit.id is null then
    raise exception 'No active check-in was found.';
  end if;

  update public.attendance_visits
  set
    checked_out_at = timezone('utc', now()),
    attendance_status = 'checked_out',
    check_out_source = 'self_service',
    notes = case
      when nullif(btrim(coalesce(p_notes, '')), '') is null then notes
      when nullif(btrim(coalesce(notes, '')), '') is null then btrim(p_notes)
      else notes || E'\nCheckout: ' || btrim(p_notes)
    end
  where id = open_visit.id
  returning * into saved_visit;

  return saved_visit;
end;
$$;

revoke all on function public.record_self_check_out(text) from public;
grant execute on function public.record_self_check_out(text) to authenticated;

create or replace function public.record_staff_check_in(
  p_member_id uuid,
  p_location_label text default null,
  p_notes text default null,
  p_source text default 'staff_desk'
)
returns public.attendance_visits
language plpgsql
security definer
set search_path = public
as $$
declare
  target_profile public.profiles;
  open_visit public.attendance_visits;
  saved_visit public.attendance_visits;
  next_source text;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  if p_member_id is null then
    raise exception 'Member id is required';
  end if;

  select *
  into target_profile
  from public.profiles
  where id = p_member_id;

  if target_profile.id is null then
    raise exception 'Member profile not found';
  end if;

  if not public.can_check_into_facility(target_profile.id) then
    raise exception 'This member is not eligible for check-in.';
  end if;

  select *
  into open_visit
  from public.attendance_visits
  where profile_id = p_member_id
    and checked_out_at is null
  order by checked_in_at desc
  limit 1;

  if open_visit.id is not null then
    raise exception 'This member is already checked in.';
  end if;

  next_source := case
    when p_source = 'admin_panel' and public.is_admin() then 'admin_panel'
    else 'staff_desk'
  end;

  insert into public.attendance_visits (
    profile_id,
    visit_date,
    checked_in_at,
    attendance_status,
    check_in_source,
    location_label,
    notes,
    created_by
  )
  values (
    target_profile.id,
    timezone('utc', now())::date,
    timezone('utc', now()),
    'checked_in',
    next_source,
    nullif(btrim(coalesce(p_location_label, '')), ''),
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid()
  )
  returning * into saved_visit;

  if public.is_admin() then
    perform public.log_admin_activity(
      target_profile.id,
      'attendance.check_in',
      'Checked in member from the front desk',
      jsonb_build_object(
        'visit_id', saved_visit.id,
        'source', saved_visit.check_in_source,
        'location_label', saved_visit.location_label
      )
    );
  end if;

  return saved_visit;
end;
$$;

revoke all on function public.record_staff_check_in(uuid, text, text, text) from public;
grant execute on function public.record_staff_check_in(uuid, text, text, text) to authenticated;

create or replace function public.record_staff_check_out(
  p_member_id uuid default null,
  p_visit_id uuid default null,
  p_notes text default null,
  p_source text default 'staff_desk'
)
returns public.attendance_visits
language plpgsql
security definer
set search_path = public
as $$
declare
  open_visit public.attendance_visits;
  saved_visit public.attendance_visits;
  next_source text;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  if p_member_id is null and p_visit_id is null then
    raise exception 'A visit id or member id is required';
  end if;

  if p_visit_id is not null then
    select *
    into open_visit
    from public.attendance_visits
    where id = p_visit_id
      and checked_out_at is null;
  else
    select *
    into open_visit
    from public.attendance_visits
    where profile_id = p_member_id
      and checked_out_at is null
    order by checked_in_at desc
    limit 1;
  end if;

  if open_visit.id is null then
    raise exception 'No active check-in was found for this member.';
  end if;

  next_source := case
    when p_source = 'admin_panel' and public.is_admin() then 'admin_panel'
    else 'staff_desk'
  end;

  update public.attendance_visits
  set
    checked_out_at = timezone('utc', now()),
    attendance_status = 'checked_out',
    check_out_source = next_source,
    notes = case
      when nullif(btrim(coalesce(p_notes, '')), '') is null then notes
      when nullif(btrim(coalesce(notes, '')), '') is null then btrim(p_notes)
      else notes || E'\nCheckout: ' || btrim(p_notes)
    end
  where id = open_visit.id
  returning * into saved_visit;

  if public.is_admin() then
    perform public.log_admin_activity(
      saved_visit.profile_id,
      'attendance.check_out',
      'Checked out member from the front desk',
      jsonb_build_object(
        'visit_id', saved_visit.id,
        'source', saved_visit.check_out_source
      )
    );
  end if;

  return saved_visit;
end;
$$;

revoke all on function public.record_staff_check_out(uuid, uuid, text, text) from public;
grant execute on function public.record_staff_check_out(uuid, uuid, text, text) to authenticated;

create or replace function public.search_members_for_attendance(
  p_query text default null,
  p_limit integer default 25
)
returns table (
  id uuid,
  full_name text,
  email text,
  phone text,
  role text,
  membership_status text,
  is_active boolean,
  plan_name text,
  has_open_visit boolean,
  open_visit_id uuid,
  open_checked_in_at timestamp with time zone
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.full_name,
    p.email,
    p.phone,
    p.role,
    p.membership_status,
    p.is_active,
    mp.name as plan_name,
    open_visit.id is not null as has_open_visit,
    open_visit.id as open_visit_id,
    open_visit.checked_in_at as open_checked_in_at
  from public.profiles p
  left join public.membership_plans mp
    on mp.id = p.plan_id
  left join lateral (
    select av.id, av.checked_in_at
    from public.attendance_visits av
    where av.profile_id = p.id
      and av.checked_out_at is null
    order by av.checked_in_at desc
    limit 1
  ) open_visit on true
  where auth.uid() is not null
    and public.is_staff()
    and (
      nullif(btrim(coalesce(p_query, '')), '') is null
      or p.full_name ilike '%' || btrim(p_query) || '%'
      or p.email ilike '%' || btrim(p_query) || '%'
      or coalesce(p.phone, '') ilike '%' || btrim(p_query) || '%'
    )
  order by coalesce(p.full_name, p.email), p.created_at desc
  limit least(greatest(coalesce(p_limit, 25), 1), 100);
$$;

revoke all on function public.search_members_for_attendance(text, integer) from public;
grant execute on function public.search_members_for_attendance(text, integer) to authenticated;

create or replace function public.list_staff_attendance_visits(
  p_visit_date date default null,
  p_open_only boolean default false,
  p_limit integer default 50,
  p_member_id uuid default null
)
returns table (
  id uuid,
  profile_id uuid,
  member_name text,
  member_email text,
  member_role text,
  membership_status text,
  is_member_active boolean,
  visit_date date,
  checked_in_at timestamp with time zone,
  checked_out_at timestamp with time zone,
  attendance_status text,
  check_in_source text,
  check_out_source text,
  location_label text,
  notes text,
  created_at timestamp with time zone
)
language sql
security definer
set search_path = public
as $$
  select
    av.id,
    av.profile_id,
    coalesce(p.full_name, p.email, 'Member') as member_name,
    p.email as member_email,
    p.role as member_role,
    p.membership_status,
    p.is_active as is_member_active,
    av.visit_date,
    av.checked_in_at,
    av.checked_out_at,
    av.attendance_status,
    av.check_in_source,
    av.check_out_source,
    av.location_label,
    av.notes,
    av.created_at
  from public.attendance_visits av
  join public.profiles p
    on p.id = av.profile_id
  where auth.uid() is not null
    and public.is_staff()
    and (p_member_id is null or av.profile_id = p_member_id)
    and (p_visit_date is null or av.visit_date = p_visit_date)
    and (not coalesce(p_open_only, false) or av.checked_out_at is null)
  order by av.checked_in_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 200);
$$;

revoke all on function public.list_staff_attendance_visits(date, boolean, integer, uuid) from public;
grant execute on function public.list_staff_attendance_visits(date, boolean, integer, uuid) to authenticated;

drop policy if exists "Users can read own attendance visits" on public.attendance_visits;
create policy "Users can read own attendance visits"
on public.attendance_visits
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "Admins can manage attendance visits" on public.attendance_visits;
create policy "Admins can manage attendance visits"
on public.attendance_visits
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
