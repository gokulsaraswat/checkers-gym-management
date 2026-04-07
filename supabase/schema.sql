
create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.membership_plans (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  price numeric(10, 2) not null default 0,
  billing_cycle text not null default 'month' check (billing_cycle in ('week', 'month', 'quarter', 'year')),
  duration_weeks integer not null default 4,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  email text unique,
  full_name text,
  phone text,
  date_of_birth date,
  address text,
  emergency_contact_name text,
  emergency_contact_phone text,
  fitness_goal text,
  role text not null default 'member' check (role in ('member', 'staff', 'admin')),
  plan_id uuid references public.membership_plans on delete set null,
  is_active boolean not null default true,
  member_since date not null default current_date,
  membership_status text not null default 'trial' check (membership_status in ('trial', 'active', 'suspended', 'expired', 'cancelled')),
  membership_start_date date not null default current_date,
  membership_end_date date,
  next_billing_date date,
  current_waiver_version text,
  waiver_signed_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  title text not null,
  workout_date date not null default current_date,
  status text not null default 'completed' check (status in ('planned', 'completed')),
  notes text,
  entries jsonb not null default '[]'::jsonb,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint workouts_entries_is_array check (jsonb_typeof(entries) = 'array')
);

create table if not exists public.membership_status_history (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  previous_status text,
  next_status text not null check (next_status in ('trial', 'active', 'suspended', 'expired', 'cancelled')),
  changed_by uuid references auth.users on delete set null,
  change_source text not null default 'profile_update' check (change_source in ('profile_update', 'admin_panel', 'system')),
  change_reason text,
  effective_on date not null default current_date,
  plan_id uuid references public.membership_plans on delete set null,
  membership_start_date date,
  membership_end_date date,
  next_billing_date date,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.member_waivers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  waiver_type text not null default 'liability',
  version text not null,
  accepted_at timestamp with time zone not null default timezone('utc', now()),
  accepted_by uuid references auth.users on delete set null,
  recorded_source text not null default 'member_app' check (recorded_source in ('member_app', 'admin_panel', 'import')),
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  unique (profile_id, waiver_type, version)
);


create table if not exists public.progress_checkpoints (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  recorded_on date not null default current_date,
  weight_kg numeric(6, 2),
  body_fat_percent numeric(5, 2),
  skeletal_muscle_percent numeric(5, 2),
  resting_heart_rate integer,
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint progress_checkpoints_has_value check (
    weight_kg is not null
    or body_fat_percent is not null
    or skeletal_muscle_percent is not null
    or resting_heart_rate is not null
    or nullif(btrim(coalesce(notes, '')), '') is not null
  )
);

create table if not exists public.class_sessions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  coach_name text,
  room_name text,
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone,
  capacity integer not null default 20,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint class_sessions_capacity_positive check (capacity > 0),
  constraint class_sessions_end_after_start check (ends_at is null or ends_at > starts_at)
);

create table if not exists public.class_bookings (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references public.class_sessions on delete cascade,
  user_id uuid not null references auth.users on delete cascade,
  booking_status text not null default 'booked' check (booking_status in ('booked', 'waitlist', 'cancelled', 'attended', 'missed')),
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  unique (class_session_id, user_id)
);

create index if not exists workouts_user_id_idx on public.workouts (user_id);
create index if not exists workouts_workout_date_idx on public.workouts (workout_date);
create index if not exists membership_status_history_profile_id_idx on public.membership_status_history (profile_id, effective_on desc, created_at desc);
create index if not exists member_waivers_profile_id_idx on public.member_waivers (profile_id, accepted_at desc);
create index if not exists progress_checkpoints_user_id_idx on public.progress_checkpoints (user_id, recorded_on desc, created_at desc);
create index if not exists class_sessions_starts_at_idx on public.class_sessions (starts_at asc) where is_active = true;
create index if not exists class_bookings_user_id_idx on public.class_bookings (user_id, created_at desc);
create index if not exists class_bookings_session_id_idx on public.class_bookings (class_session_id, booking_status);

drop trigger if exists set_membership_plans_updated_at on public.membership_plans;
create trigger set_membership_plans_updated_at
before update on public.membership_plans
for each row execute function public.set_updated_at();

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_workouts_updated_at on public.workouts;
create trigger set_workouts_updated_at
before update on public.workouts
for each row execute function public.set_updated_at();

drop trigger if exists set_member_waivers_updated_at on public.member_waivers;
create trigger set_member_waivers_updated_at
before update on public.member_waivers
for each row execute function public.set_updated_at();


drop trigger if exists set_progress_checkpoints_updated_at on public.progress_checkpoints;
create trigger set_progress_checkpoints_updated_at
before update on public.progress_checkpoints
for each row execute function public.set_updated_at();

drop trigger if exists set_class_sessions_updated_at on public.class_sessions;
create trigger set_class_sessions_updated_at
before update on public.class_sessions
for each row execute function public.set_updated_at();

drop trigger if exists set_class_bookings_updated_at on public.class_bookings;
create trigger set_class_bookings_updated_at
before update on public.class_bookings
for each row execute function public.set_updated_at();

create or replace function public.is_admin(check_user uuid default auth.uid())
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
      and role = 'admin'
      and is_active = true
  );
$$;

create or replace function public.is_staff(check_user uuid default auth.uid())
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
      and role in ('staff', 'admin')
      and is_active = true
  );
$$;

create or replace function public.is_active_member(check_user uuid default auth.uid())
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
  );
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  )
  on conflict (id) do update
  set
    email = excluded.email,
    full_name = coalesce(excluded.full_name, public.profiles.full_name);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.update_my_profile(p_full_name text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  if btrim(coalesce(p_full_name, '')) = '' then
    raise exception 'Full name is required';
  end if;

  update public.profiles
  set full_name = btrim(p_full_name)
  where id = auth.uid()
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

revoke all on function public.update_my_profile(text) from public;
grant execute on function public.update_my_profile(text) to authenticated;

create or replace function public.update_my_member_profile(
  p_full_name text,
  p_phone text default null,
  p_date_of_birth date default null,
  p_address text default null,
  p_emergency_contact_name text default null,
  p_emergency_contact_phone text default null,
  p_fitness_goal text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  if btrim(coalesce(p_full_name, '')) = '' then
    raise exception 'Full name is required';
  end if;

  update public.profiles
  set
    full_name = btrim(p_full_name),
    phone = nullif(btrim(coalesce(p_phone, '')), ''),
    date_of_birth = p_date_of_birth,
    address = nullif(btrim(coalesce(p_address, '')), ''),
    emergency_contact_name = nullif(btrim(coalesce(p_emergency_contact_name, '')), ''),
    emergency_contact_phone = nullif(btrim(coalesce(p_emergency_contact_phone, '')), ''),
    fitness_goal = nullif(btrim(coalesce(p_fitness_goal, '')), '')
  where id = auth.uid()
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Profile not found';
  end if;

  return updated_profile;
end;
$$;

revoke all on function public.update_my_member_profile(text, text, date, text, text, text, text) from public;
grant execute on function public.update_my_member_profile(text, text, date, text, text, text, text) to authenticated;

create or replace function public.sign_current_liability_waiver(
  p_version text default 'liability-v1'
)
returns public.member_waivers
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_waiver public.member_waivers;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  if btrim(coalesce(p_version, '')) = '' then
    raise exception 'Waiver version is required';
  end if;

  insert into public.member_waivers (
    profile_id,
    waiver_type,
    version,
    accepted_at,
    accepted_by,
    recorded_source
  )
  values (
    auth.uid(),
    'liability',
    btrim(p_version),
    timezone('utc', now()),
    auth.uid(),
    'member_app'
  )
  on conflict (profile_id, waiver_type, version) do update
  set
    accepted_at = excluded.accepted_at,
    accepted_by = excluded.accepted_by,
    recorded_source = excluded.recorded_source,
    updated_at = timezone('utc', now())
  returning * into saved_waiver;

  return saved_waiver;
end;
$$;

revoke all on function public.sign_current_liability_waiver(text) from public;
grant execute on function public.sign_current_liability_waiver(text) to authenticated;

create or replace function public.sync_profile_waiver_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    waiver_signed_at = new.accepted_at,
    current_waiver_version = new.version
  where id = new.profile_id
    and (waiver_signed_at is null or new.accepted_at >= waiver_signed_at);

  return new;
end;
$$;

create or replace function public.insert_membership_snapshot()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.membership_status_history (
    profile_id,
    previous_status,
    next_status,
    changed_by,
    change_source,
    change_reason,
    effective_on,
    plan_id,
    membership_start_date,
    membership_end_date,
    next_billing_date
  )
  values (
    new.id,
    null,
    new.membership_status,
    auth.uid(),
    'system',
    'Initial member profile snapshot',
    coalesce(new.membership_start_date, new.member_since, current_date),
    new.plan_id,
    new.membership_start_date,
    new.membership_end_date,
    new.next_billing_date
  );

  return new;
end;
$$;

create or replace function public.log_membership_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    new.membership_status is distinct from old.membership_status
    or new.plan_id is distinct from old.plan_id
    or new.membership_start_date is distinct from old.membership_start_date
    or new.membership_end_date is distinct from old.membership_end_date
    or new.next_billing_date is distinct from old.next_billing_date
    or new.is_active is distinct from old.is_active
  ) then
    insert into public.membership_status_history (
      profile_id,
      previous_status,
      next_status,
      changed_by,
      change_source,
      change_reason,
      effective_on,
      plan_id,
      membership_start_date,
      membership_end_date,
      next_billing_date
    )
    values (
      new.id,
      old.membership_status,
      new.membership_status,
      auth.uid(),
      case when public.is_admin() then 'admin_panel' else 'profile_update' end,
      case
        when new.is_active is distinct from old.is_active and new.is_active = false then 'Account access disabled'
        when new.is_active is distinct from old.is_active and new.is_active = true then 'Account access re-enabled'
        else null
      end,
      coalesce(new.membership_start_date, current_date),
      new.plan_id,
      new.membership_start_date,
      new.membership_end_date,
      new.next_billing_date
    );
  end if;

  return new;
end;
$$;

drop trigger if exists sync_profile_waiver_snapshot on public.member_waivers;
create trigger sync_profile_waiver_snapshot
after insert or update on public.member_waivers
for each row execute function public.sync_profile_waiver_snapshot();

drop trigger if exists insert_membership_snapshot on public.profiles;
create trigger insert_membership_snapshot
after insert on public.profiles
for each row execute function public.insert_membership_snapshot();

drop trigger if exists log_membership_status_change on public.profiles;
create trigger log_membership_status_change
after update on public.profiles
for each row execute function public.log_membership_status_change();

alter table public.membership_plans enable row level security;
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;
alter table public.membership_status_history enable row level security;
alter table public.member_waivers enable row level security;
alter table public.progress_checkpoints enable row level security;
alter table public.class_sessions enable row level security;
alter table public.class_bookings enable row level security;

drop policy if exists "Authenticated users can read plans" on public.membership_plans;
create policy "Authenticated users can read plans"
on public.membership_plans
for select
to authenticated
using (is_active = true or public.is_admin());

drop policy if exists "Admins can manage plans" on public.membership_plans;
create policy "Admins can manage plans"
on public.membership_plans
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (id = auth.uid());

drop policy if exists "Admins can read all profiles" on public.profiles;
create policy "Admins can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can manage profiles" on public.profiles;
create policy "Admins can manage profiles"
on public.profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read own workouts" on public.workouts;
create policy "Users can read own workouts"
on public.workouts
for select
to authenticated
using (user_id = auth.uid() and public.is_active_member());

drop policy if exists "Users can create own workouts" on public.workouts;
create policy "Users can create own workouts"
on public.workouts
for insert
to authenticated
with check (user_id = auth.uid() and public.is_active_member());

drop policy if exists "Users can update own workouts" on public.workouts;
create policy "Users can update own workouts"
on public.workouts
for update
to authenticated
using (user_id = auth.uid() and public.is_active_member())
with check (user_id = auth.uid() and public.is_active_member());

drop policy if exists "Users can delete own workouts" on public.workouts;
create policy "Users can delete own workouts"
on public.workouts
for delete
to authenticated
using (user_id = auth.uid() and public.is_active_member());

drop policy if exists "Admins can manage all workouts" on public.workouts;
create policy "Admins can manage all workouts"
on public.workouts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read own membership history" on public.membership_status_history;
create policy "Users can read own membership history"
on public.membership_status_history
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "Admins can read all membership history" on public.membership_status_history;
create policy "Admins can read all membership history"
on public.membership_status_history
for select
to authenticated
using (public.is_admin());

drop policy if exists "Admins can manage membership history" on public.membership_status_history;
create policy "Admins can manage membership history"
on public.membership_status_history
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read own waivers" on public.member_waivers;
create policy "Users can read own waivers"
on public.member_waivers
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "Admins can read all waivers" on public.member_waivers;
create policy "Admins can read all waivers"
on public.member_waivers
for select
to authenticated
using (public.is_admin());

drop policy if exists "Users can insert own waivers" on public.member_waivers;
create policy "Users can insert own waivers"
on public.member_waivers
for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "Users can update own waivers" on public.member_waivers;
create policy "Users can update own waivers"
on public.member_waivers
for update
to authenticated
using (profile_id = auth.uid())
with check (profile_id = auth.uid());

drop policy if exists "Admins can manage waivers" on public.member_waivers;
create policy "Admins can manage waivers"
on public.member_waivers
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());


drop policy if exists "Users can read own progress checkpoints" on public.progress_checkpoints;
create policy "Users can read own progress checkpoints"
on public.progress_checkpoints
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create own progress checkpoints" on public.progress_checkpoints;
create policy "Users can create own progress checkpoints"
on public.progress_checkpoints
for insert
to authenticated
with check (user_id = auth.uid() and public.is_active_member());

drop policy if exists "Users can update own progress checkpoints" on public.progress_checkpoints;
create policy "Users can update own progress checkpoints"
on public.progress_checkpoints
for update
to authenticated
using (user_id = auth.uid() and public.is_active_member())
with check (user_id = auth.uid() and public.is_active_member());

drop policy if exists "Users can delete own progress checkpoints" on public.progress_checkpoints;
create policy "Users can delete own progress checkpoints"
on public.progress_checkpoints
for delete
to authenticated
using (user_id = auth.uid() and public.is_active_member());

drop policy if exists "Admins can manage all progress checkpoints" on public.progress_checkpoints;
create policy "Admins can manage all progress checkpoints"
on public.progress_checkpoints
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read active class sessions" on public.class_sessions;
create policy "Authenticated users can read active class sessions"
on public.class_sessions
for select
to authenticated
using (is_active = true or public.is_admin());

drop policy if exists "Admins can manage class sessions" on public.class_sessions;
create policy "Admins can manage class sessions"
on public.class_sessions
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Users can read own class bookings" on public.class_bookings;
create policy "Users can read own class bookings"
on public.class_bookings
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Admins can manage class bookings" on public.class_bookings;
create policy "Admins can manage class bookings"
on public.class_bookings
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());


insert into public.membership_plans (name, description, price, billing_cycle, duration_weeks, is_active)
values
  ('Starter', 'General gym access with self-guided workout logging.', 29.00, 'month', 4, true),
  ('Strength', 'Structured strength plan with progressive overload tracking.', 59.00, 'month', 4, true),
  ('Elite Coaching', 'Premium plan with higher-touch coaching and programming.', 99.00, 'month', 4, true)
on conflict (name) do nothing;
