
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
  session_type text not null default 'group_class' check (session_type in ('group_class', 'personal_training', 'assessment', 'event', 'open_gym')),
  coach_name text,
  trainer_id uuid references public.profiles on delete set null,
  trainer_name text,
  room_name text,
  branch_name text,
  equipment_notes text,
  starts_at timestamp with time zone not null,
  ends_at timestamp with time zone,
  capacity integer not null default 20,
  visibility text not null default 'members' check (visibility in ('members', 'staff_only')),
  schedule_status text not null default 'scheduled' check (schedule_status in ('scheduled', 'cancelled', 'completed')),
  recurrence_group_id uuid,
  recurrence_rule text,
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
create index if not exists class_sessions_trainer_id_idx on public.class_sessions (trainer_id, starts_at asc);
create index if not exists class_sessions_status_idx on public.class_sessions (schedule_status, starts_at asc);
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
drop policy if exists "Authenticated users can read visible class sessions" on public.class_sessions;
create policy "Authenticated users can read visible class sessions"
on public.class_sessions
for select
to authenticated
using (
  public.is_staff()
  or (
    is_active = true
    and schedule_status = 'scheduled'
    and visibility = 'members'
  )
);

drop policy if exists "Admins can manage class sessions" on public.class_sessions;
drop policy if exists "Staff can manage class sessions" on public.class_sessions;
create policy "Staff can manage class sessions"
on public.class_sessions
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

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

create table if not exists public.member_notes (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles on delete cascade,
  author_id uuid references auth.users on delete set null,
  author_name text,
  note text not null,
  is_pinned boolean not null default false,
  visibility text not null default 'staff' check (visibility in ('staff', 'admin')),
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint member_notes_note_not_blank check (nullif(btrim(note), '') is not null)
);

create table if not exists public.admin_activity_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users on delete set null,
  actor_name text,
  target_profile_id uuid references public.profiles on delete set null,
  target_member_name text,
  action_type text not null,
  action_summary text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc', now()),
  constraint admin_activity_log_metadata_object check (jsonb_typeof(metadata) = 'object')
);

create index if not exists member_notes_profile_id_idx
  on public.member_notes (profile_id, is_pinned desc, created_at desc);

create index if not exists admin_activity_log_target_profile_id_idx
  on public.admin_activity_log (target_profile_id, created_at desc);

create index if not exists admin_activity_log_created_at_idx
  on public.admin_activity_log (created_at desc);

drop trigger if exists set_member_notes_updated_at on public.member_notes;
create trigger set_member_notes_updated_at
before update on public.member_notes
for each row execute function public.set_updated_at();

alter table public.member_notes enable row level security;
alter table public.admin_activity_log enable row level security;

create or replace function public.log_admin_activity(
  p_target_profile_id uuid,
  p_action_type text,
  p_action_summary text,
  p_metadata jsonb default '{}'::jsonb
)
returns public.admin_activity_log
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_row public.admin_activity_log;
  actor_label text;
  target_label text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if nullif(btrim(coalesce(p_action_type, '')), '') is null then
    raise exception 'Action type is required';
  end if;

  if nullif(btrim(coalesce(p_action_summary, '')), '') is null then
    raise exception 'Action summary is required';
  end if;

  select coalesce(full_name, email, 'Admin')
  into actor_label
  from public.profiles
  where id = auth.uid();

  select coalesce(full_name, email)
  into target_label
  from public.profiles
  where id = p_target_profile_id;

  insert into public.admin_activity_log (
    actor_id,
    actor_name,
    target_profile_id,
    target_member_name,
    action_type,
    action_summary,
    metadata
  )
  values (
    auth.uid(),
    actor_label,
    p_target_profile_id,
    target_label,
    btrim(p_action_type),
    btrim(p_action_summary),
    coalesce(p_metadata, '{}'::jsonb)
  )
  returning * into saved_row;

  return saved_row;
end;
$$;

revoke all on function public.log_admin_activity(uuid, text, text, jsonb) from public;
grant execute on function public.log_admin_activity(uuid, text, text, jsonb) to authenticated;

create or replace function public.admin_update_member_record(
  p_member_id uuid,
  p_changes jsonb default '{}'::jsonb,
  p_change_reason text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_profile public.profiles;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_member_id is null then
    raise exception 'Member id is required';
  end if;

  if p_changes is null or jsonb_typeof(p_changes) <> 'object' then
    raise exception 'Changes payload must be a JSON object';
  end if;

  update public.profiles
  set
    full_name = case
      when p_changes ? 'full_name' then coalesce(nullif(btrim(coalesce(p_changes->>'full_name', '')), ''), full_name)
      else full_name
    end,
    phone = case
      when p_changes ? 'phone' then nullif(btrim(coalesce(p_changes->>'phone', '')), '')
      else phone
    end,
    date_of_birth = case
      when p_changes ? 'date_of_birth' then nullif(p_changes->>'date_of_birth', '')::date
      else date_of_birth
    end,
    address = case
      when p_changes ? 'address' then nullif(btrim(coalesce(p_changes->>'address', '')), '')
      else address
    end,
    emergency_contact_name = case
      when p_changes ? 'emergency_contact_name' then nullif(btrim(coalesce(p_changes->>'emergency_contact_name', '')), '')
      else emergency_contact_name
    end,
    emergency_contact_phone = case
      when p_changes ? 'emergency_contact_phone' then nullif(btrim(coalesce(p_changes->>'emergency_contact_phone', '')), '')
      else emergency_contact_phone
    end,
    fitness_goal = case
      when p_changes ? 'fitness_goal' then nullif(btrim(coalesce(p_changes->>'fitness_goal', '')), '')
      else fitness_goal
    end,
    role = case
      when p_changes ? 'role' then coalesce(nullif(btrim(coalesce(p_changes->>'role', '')), ''), role)
      else role
    end,
    plan_id = case
      when p_changes ? 'plan_id' then nullif(p_changes->>'plan_id', '')::uuid
      else plan_id
    end,
    is_active = case
      when p_changes ? 'is_active' then coalesce((p_changes->>'is_active')::boolean, is_active)
      else is_active
    end,
    membership_status = case
      when p_changes ? 'membership_status' then coalesce(nullif(btrim(coalesce(p_changes->>'membership_status', '')), ''), membership_status)
      else membership_status
    end,
    membership_start_date = case
      when p_changes ? 'membership_start_date' then nullif(p_changes->>'membership_start_date', '')::date
      else membership_start_date
    end,
    membership_end_date = case
      when p_changes ? 'membership_end_date' then nullif(p_changes->>'membership_end_date', '')::date
      else membership_end_date
    end,
    next_billing_date = case
      when p_changes ? 'next_billing_date' then nullif(p_changes->>'next_billing_date', '')::date
      else next_billing_date
    end
  where id = p_member_id
  returning * into updated_profile;

  if updated_profile.id is null then
    raise exception 'Member not found';
  end if;

  perform public.log_admin_activity(
    updated_profile.id,
    'member.updated',
    coalesce(nullif(btrim(coalesce(p_change_reason, '')), ''), 'Updated member record'),
    jsonb_build_object(
      'member_id', p_member_id,
      'changes', p_changes
    )
  );

  return updated_profile;
end;
$$;

revoke all on function public.admin_update_member_record(uuid, jsonb, text) from public;
grant execute on function public.admin_update_member_record(uuid, jsonb, text) to authenticated;

create or replace function public.add_member_note(
  p_member_id uuid,
  p_note text,
  p_is_pinned boolean default false,
  p_visibility text default 'staff'
)
returns public.member_notes
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_note public.member_notes;
  actor_label text;
  next_visibility text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if nullif(btrim(coalesce(p_note, '')), '') is null then
    raise exception 'Note is required';
  end if;

  next_visibility := case
    when p_visibility in ('staff', 'admin') then p_visibility
    else 'staff'
  end;

  select coalesce(full_name, email, 'Admin')
  into actor_label
  from public.profiles
  where id = auth.uid();

  insert into public.member_notes (
    profile_id,
    author_id,
    author_name,
    note,
    is_pinned,
    visibility
  )
  values (
    p_member_id,
    auth.uid(),
    actor_label,
    btrim(p_note),
    coalesce(p_is_pinned, false),
    next_visibility
  )
  returning * into saved_note;

  perform public.log_admin_activity(
    p_member_id,
    'member.note_added',
    'Added internal member note',
    jsonb_build_object(
      'note_id', saved_note.id,
      'visibility', saved_note.visibility,
      'is_pinned', saved_note.is_pinned
    )
  );

  return saved_note;
end;
$$;

revoke all on function public.add_member_note(uuid, text, boolean, text) from public;
grant execute on function public.add_member_note(uuid, text, boolean, text) to authenticated;

create or replace function public.delete_member_note(
  p_note_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_note public.member_notes;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select *
  into existing_note
  from public.member_notes
  where id = p_note_id;

  if existing_note.id is null then
    raise exception 'Note not found';
  end if;

  delete from public.member_notes
  where id = p_note_id;

  perform public.log_admin_activity(
    existing_note.profile_id,
    'member.note_deleted',
    'Deleted internal member note',
    jsonb_build_object(
      'note_id', existing_note.id,
      'visibility', existing_note.visibility
    )
  );
end;
$$;

revoke all on function public.delete_member_note(uuid) from public;
grant execute on function public.delete_member_note(uuid) to authenticated;

drop policy if exists "Staff can read member notes" on public.member_notes;
create policy "Staff can read member notes"
on public.member_notes
for select
to authenticated
using (
  public.is_staff()
  and (
    visibility = 'staff'
    or public.is_admin()
  )
);

drop policy if exists "Admins can manage member notes" on public.member_notes;
create policy "Admins can manage member notes"
on public.member_notes
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Staff can read admin activity log" on public.admin_activity_log;
create policy "Staff can read admin activity log"
on public.admin_activity_log
for select
to authenticated
using (public.is_staff());

drop policy if exists "Admins can manage admin activity log" on public.admin_activity_log;
create policy "Admins can manage admin activity log"
on public.admin_activity_log
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

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

create or replace function public.list_schedule_trainers()
returns table (
  id uuid,
  full_name text,
  email text,
  role text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    profiles.id,
    profiles.full_name,
    profiles.email,
    profiles.role
  from public.profiles
  where profiles.role in ('staff', 'admin')
    and profiles.is_active = true
  order by coalesce(nullif(btrim(profiles.full_name), ''), profiles.email);
$$;

revoke all on function public.list_schedule_trainers() from public;
grant execute on function public.list_schedule_trainers() to authenticated;

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


-- Patch 07: bookings and waitlists

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

-- Phase 08: trainer workout programming

create table if not exists public.exercise_library (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  muscle_group text,
  equipment text,
  movement_pattern text,
  difficulty text not null default 'all_levels' check (difficulty in ('all_levels', 'beginner', 'intermediate', 'advanced')),
  instructions text,
  video_url text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.workout_programs (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text,
  goal text,
  difficulty text not null default 'all_levels' check (difficulty in ('all_levels', 'beginner', 'intermediate', 'advanced')),
  duration_weeks integer not null default 4 check (duration_weeks > 0 and duration_weeks <= 52),
  sessions_per_week integer not null default 3 check (sessions_per_week > 0 and sessions_per_week <= 14),
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  created_by uuid references public.profiles on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.workout_program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.workout_programs on delete cascade,
  day_index integer not null,
  title text not null,
  focus_area text,
  notes text,
  target_duration_minutes integer check (target_duration_minutes is null or target_duration_minutes > 0),
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  unique (program_id, day_index)
);

create table if not exists public.workout_program_day_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.workout_program_days on delete cascade,
  exercise_library_id uuid references public.exercise_library on delete set null,
  order_index integer not null,
  exercise_name text not null,
  prescribed_sets integer check (prescribed_sets is null or prescribed_sets > 0),
  prescribed_reps text,
  prescribed_weight text,
  rest_seconds integer check (rest_seconds is null or rest_seconds >= 0),
  tempo text,
  trainer_notes text,
  is_optional boolean not null default false,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  unique (program_day_id, order_index)
);

create table if not exists public.member_workout_assignments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles on delete cascade,
  program_id uuid not null references public.workout_programs on delete cascade,
  assigned_by uuid references public.profiles on delete set null,
  assignment_status text not null default 'active' check (assignment_status in ('planned', 'active', 'paused', 'completed', 'cancelled')),
  start_date date not null default current_date,
  end_date date,
  focus_goal text,
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint member_workout_assignments_end_after_start check (end_date is null or end_date >= start_date)
);

alter table public.workouts
  add column if not exists program_assignment_id uuid references public.member_workout_assignments on delete set null,
  add column if not exists program_day_id uuid references public.workout_program_days on delete set null,
  add column if not exists completed_by_trainer boolean not null default false;

create index if not exists idx_workout_program_days_program_id on public.workout_program_days(program_id);
create index if not exists idx_workout_program_day_exercises_program_day_id on public.workout_program_day_exercises(program_day_id);
create index if not exists idx_member_workout_assignments_member_id on public.member_workout_assignments(member_id);
create index if not exists idx_member_workout_assignments_program_id on public.member_workout_assignments(program_id);
create index if not exists idx_workouts_program_assignment_id on public.workouts(program_assignment_id);
create index if not exists idx_workouts_program_day_id on public.workouts(program_day_id);

drop trigger if exists set_exercise_library_updated_at on public.exercise_library;
create trigger set_exercise_library_updated_at
before update on public.exercise_library
for each row execute function public.set_updated_at();

drop trigger if exists set_workout_programs_updated_at on public.workout_programs;
create trigger set_workout_programs_updated_at
before update on public.workout_programs
for each row execute function public.set_updated_at();

drop trigger if exists set_workout_program_days_updated_at on public.workout_program_days;
create trigger set_workout_program_days_updated_at
before update on public.workout_program_days
for each row execute function public.set_updated_at();

drop trigger if exists set_workout_program_day_exercises_updated_at on public.workout_program_day_exercises;
create trigger set_workout_program_day_exercises_updated_at
before update on public.workout_program_day_exercises
for each row execute function public.set_updated_at();

drop trigger if exists set_member_workout_assignments_updated_at on public.member_workout_assignments;
create trigger set_member_workout_assignments_updated_at
before update on public.member_workout_assignments
for each row execute function public.set_updated_at();

alter table public.exercise_library enable row level security;
alter table public.workout_programs enable row level security;
alter table public.workout_program_days enable row level security;
alter table public.workout_program_day_exercises enable row level security;
alter table public.member_workout_assignments enable row level security;

drop policy if exists "Authenticated users can read active exercise library" on public.exercise_library;
create policy "Authenticated users can read active exercise library"
on public.exercise_library
for select
to authenticated
using (is_active = true or public.is_staff());

drop policy if exists "Staff can manage exercise library" on public.exercise_library;
create policy "Staff can manage exercise library"
on public.exercise_library
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Authenticated users can read workout programs" on public.workout_programs;
create policy "Authenticated users can read workout programs"
on public.workout_programs
for select
to authenticated
using (status = 'active' or public.is_staff());

drop policy if exists "Staff can manage workout programs" on public.workout_programs;
create policy "Staff can manage workout programs"
on public.workout_programs
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Authenticated users can read workout program days" on public.workout_program_days;
create policy "Authenticated users can read workout program days"
on public.workout_program_days
for select
to authenticated
using (
  exists (
    select 1
    from public.workout_programs programs
    where programs.id = workout_program_days.program_id
      and (programs.status = 'active' or public.is_staff())
  )
);

drop policy if exists "Staff can manage workout program days" on public.workout_program_days;
create policy "Staff can manage workout program days"
on public.workout_program_days
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Authenticated users can read workout program exercises" on public.workout_program_day_exercises;
create policy "Authenticated users can read workout program exercises"
on public.workout_program_day_exercises
for select
to authenticated
using (
  exists (
    select 1
    from public.workout_program_days days
    join public.workout_programs programs on programs.id = days.program_id
    where days.id = workout_program_day_exercises.program_day_id
      and (programs.status = 'active' or public.is_staff())
  )
);

drop policy if exists "Staff can manage workout program exercises" on public.workout_program_day_exercises;
create policy "Staff can manage workout program exercises"
on public.workout_program_day_exercises
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Members can read own workout assignments" on public.member_workout_assignments;
create policy "Members can read own workout assignments"
on public.member_workout_assignments
for select
to authenticated
using (member_id = auth.uid());

drop policy if exists "Staff can read all workout assignments" on public.member_workout_assignments;
create policy "Staff can read all workout assignments"
on public.member_workout_assignments
for select
to authenticated
using (public.is_staff());

drop policy if exists "Staff can manage workout assignments" on public.member_workout_assignments;
create policy "Staff can manage workout assignments"
on public.member_workout_assignments
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Staff can manage all workouts" on public.workouts;
create policy "Staff can manage all workouts"
on public.workouts
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

insert into public.exercise_library (
  name,
  muscle_group,
  equipment,
  movement_pattern,
  difficulty,
  instructions,
  is_active
)
values
  ('Back Squat', 'Lower body', 'Barbell', 'Squat', 'intermediate', 'Brace the core, sit between the hips, and drive through the floor.', true),
  ('Romanian Deadlift', 'Posterior chain', 'Barbell or dumbbells', 'Hinge', 'intermediate', 'Keep a soft knee bend and push the hips back while maintaining a neutral spine.', true),
  ('Bench Press', 'Chest', 'Barbell', 'Horizontal press', 'intermediate', 'Pin the shoulder blades down and press the bar over the midline.', true),
  ('Seated Cable Row', 'Back', 'Cable machine', 'Horizontal pull', 'beginner', 'Drive elbows back and keep the ribcage stacked over the pelvis.', true),
  ('Lat Pulldown', 'Back', 'Cable machine', 'Vertical pull', 'beginner', 'Pull toward the upper chest while keeping the shoulders away from the ears.', true),
  ('Walking Lunge', 'Lower body', 'Dumbbells', 'Single-leg', 'beginner', 'Take controlled steps and keep the front knee tracking over the middle toes.', true),
  ('Hip Thrust', 'Glutes', 'Barbell or machine', 'Hip extension', 'beginner', 'Pause at the top and avoid overextending the lower back.', true),
  ('Plank', 'Core', 'Bodyweight', 'Core stability', 'all_levels', 'Create a straight line from shoulders to heels and breathe behind the brace.', true),
  ('Dumbbell Shoulder Press', 'Shoulders', 'Dumbbells', 'Vertical press', 'beginner', 'Keep the ribcage down and press in a slight arc overhead.', true),
  ('Assault Bike Intervals', 'Conditioning', 'Assault bike', 'Conditioning', 'all_levels', 'Work in short controlled bursts and maintain output consistency.', true)
on conflict (name) do nothing;


-- Phase 09: progress tracking

alter table public.progress_checkpoints
  add column if not exists recorded_by uuid references auth.users on delete set null,
  add column if not exists entry_source text;

update public.progress_checkpoints
set
  recorded_by = coalesce(recorded_by, user_id),
  entry_source = coalesce(entry_source, 'member_app')
where recorded_by is null
   or entry_source is null;

alter table public.progress_checkpoints
  alter column entry_source set default 'member_app',
  alter column entry_source set not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'progress_checkpoints_entry_source_check'
  ) then
    alter table public.progress_checkpoints
      add constraint progress_checkpoints_entry_source_check
      check (entry_source in ('member_app', 'staff_console', 'admin_panel', 'import'));
  end if;
end
$$;

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  recorded_on date not null default current_date,
  height_cm numeric(6, 2),
  chest_cm numeric(6, 2),
  waist_cm numeric(6, 2),
  hips_cm numeric(6, 2),
  left_arm_cm numeric(6, 2),
  right_arm_cm numeric(6, 2),
  left_thigh_cm numeric(6, 2),
  right_thigh_cm numeric(6, 2),
  notes text,
  recorded_by uuid references auth.users on delete set null,
  entry_source text not null default 'member_app' check (entry_source in ('member_app', 'staff_console', 'admin_panel', 'import')),
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint body_measurements_has_value check (
    height_cm is not null
    or chest_cm is not null
    or waist_cm is not null
    or hips_cm is not null
    or left_arm_cm is not null
    or right_arm_cm is not null
    or left_thigh_cm is not null
    or right_thigh_cm is not null
    or nullif(btrim(coalesce(notes, '')), '') is not null
  )
);

create table if not exists public.personal_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  exercise_name text not null,
  record_type text not null default 'weight' check (record_type in ('weight', 'reps', 'distance', 'time', 'volume', 'custom')),
  record_value numeric(10, 2) not null check (record_value >= 0),
  unit text not null default 'units',
  achieved_on date not null default current_date,
  notes text,
  related_workout_id uuid references public.workouts on delete set null,
  recorded_by uuid references auth.users on delete set null,
  entry_source text not null default 'member_app' check (entry_source in ('member_app', 'staff_console', 'admin_panel', 'import')),
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint personal_records_exercise_name_not_blank check (nullif(btrim(exercise_name), '') is not null)
);

create index if not exists body_measurements_user_id_idx
  on public.body_measurements (user_id, recorded_on desc, created_at desc);

create index if not exists personal_records_user_id_idx
  on public.personal_records (user_id, achieved_on desc, created_at desc);

create index if not exists personal_records_exercise_name_idx
  on public.personal_records (exercise_name);

drop trigger if exists set_body_measurements_updated_at on public.body_measurements;
create trigger set_body_measurements_updated_at
before update on public.body_measurements
for each row execute function public.set_updated_at();

drop trigger if exists set_personal_records_updated_at on public.personal_records;
create trigger set_personal_records_updated_at
before update on public.personal_records
for each row execute function public.set_updated_at();

alter table public.body_measurements enable row level security;
alter table public.personal_records enable row level security;

drop policy if exists "Staff can manage all progress checkpoints" on public.progress_checkpoints;
create policy "Staff can manage all progress checkpoints"
on public.progress_checkpoints
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Users can read own body measurements" on public.body_measurements;
create policy "Users can read own body measurements"
on public.body_measurements
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create own body measurements" on public.body_measurements;
create policy "Users can create own body measurements"
on public.body_measurements
for insert
to authenticated
with check (user_id = auth.uid() and public.is_active_member());

drop policy if exists "Users can update own body measurements" on public.body_measurements;
create policy "Users can update own body measurements"
on public.body_measurements
for update
to authenticated
using (user_id = auth.uid() and public.is_active_member())
with check (user_id = auth.uid() and public.is_active_member());

drop policy if exists "Users can delete own body measurements" on public.body_measurements;
create policy "Users can delete own body measurements"
on public.body_measurements
for delete
to authenticated
using (user_id = auth.uid() and public.is_active_member());

drop policy if exists "Staff can manage all body measurements" on public.body_measurements;
create policy "Staff can manage all body measurements"
on public.body_measurements
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Users can read own personal records" on public.personal_records;
create policy "Users can read own personal records"
on public.personal_records
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "Users can create own personal records" on public.personal_records;
create policy "Users can create own personal records"
on public.personal_records
for insert
to authenticated
with check (user_id = auth.uid() and public.is_active_member());

drop policy if exists "Users can update own personal records" on public.personal_records;
create policy "Users can update own personal records"
on public.personal_records
for update
to authenticated
using (user_id = auth.uid() and public.is_active_member())
with check (user_id = auth.uid() and public.is_active_member());

drop policy if exists "Users can delete own personal records" on public.personal_records;
create policy "Users can delete own personal records"
on public.personal_records
for delete
to authenticated
using (user_id = auth.uid() and public.is_active_member());

drop policy if exists "Staff can manage all personal records" on public.personal_records;
create policy "Staff can manage all personal records"
on public.personal_records
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

create table if not exists public.nutrition_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  goal text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  default_calories integer,
  default_protein_g numeric(8, 2),
  default_carbs_g numeric(8, 2),
  default_fat_g numeric(8, 2),
  default_fiber_g numeric(8, 2),
  hydration_target_liters numeric(6, 2),
  created_by uuid references auth.users on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint nutrition_templates_name_not_blank check (nullif(btrim(name), '') is not null)
);

create table if not exists public.nutrition_template_days (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.nutrition_templates on delete cascade,
  day_index integer not null default 1,
  title text not null,
  meal_guidance text,
  calorie_target integer,
  protein_target_g numeric(8, 2),
  carbs_target_g numeric(8, 2),
  fat_target_g numeric(8, 2),
  fiber_target_g numeric(8, 2),
  hydration_target_liters numeric(6, 2),
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  unique (template_id, day_index),
  constraint nutrition_template_days_title_not_blank check (nullif(btrim(title), '') is not null)
);

create table if not exists public.member_nutrition_assignments (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles on delete cascade,
  template_id uuid not null references public.nutrition_templates on delete restrict,
  assigned_by uuid references auth.users on delete set null,
  assignment_status text not null default 'active' check (assignment_status in ('planned', 'active', 'paused', 'completed', 'cancelled')),
  start_date date not null default current_date,
  end_date date,
  goal_note text,
  coach_notes text,
  calorie_target_override integer,
  protein_target_override numeric(8, 2),
  carbs_target_override numeric(8, 2),
  fat_target_override numeric(8, 2),
  fiber_target_override numeric(8, 2),
  hydration_target_override numeric(6, 2),
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.meal_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  assignment_id uuid references public.member_nutrition_assignments on delete set null,
  template_day_id uuid references public.nutrition_template_days on delete set null,
  logged_on date not null default current_date,
  meal_slot text not null default 'breakfast' check (meal_slot in ('breakfast', 'lunch', 'dinner', 'snack', 'pre_workout', 'post_workout')),
  meal_title text,
  calories integer,
  protein_g numeric(8, 2),
  carbs_g numeric(8, 2),
  fat_g numeric(8, 2),
  fiber_g numeric(8, 2),
  water_liters numeric(6, 2),
  adherence_score integer check (adherence_score between 1 and 5),
  hunger_score integer check (hunger_score between 1 and 5),
  energy_score integer check (energy_score between 1 and 5),
  notes text,
  logged_at timestamp with time zone,
  recorded_by uuid references auth.users on delete set null,
  entry_source text not null default 'member_app' check (entry_source in ('member_app', 'staff_console', 'import')),
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.nutrition_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  assignment_id uuid references public.member_nutrition_assignments on delete set null,
  checked_in_on date not null default current_date,
  body_weight numeric(8, 2),
  adherence_score integer check (adherence_score between 1 and 5),
  hunger_score integer check (hunger_score between 1 and 5),
  energy_score integer check (energy_score between 1 and 5),
  digestion_notes text,
  coach_feedback text,
  next_focus text,
  notes text,
  recorded_by uuid references auth.users on delete set null,
  entry_source text not null default 'member_app' check (entry_source in ('member_app', 'staff_console', 'import')),
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists nutrition_templates_status_idx
  on public.nutrition_templates (status, updated_at desc);

create index if not exists nutrition_template_days_template_id_idx
  on public.nutrition_template_days (template_id, day_index);

create index if not exists member_nutrition_assignments_member_id_idx
  on public.member_nutrition_assignments (member_id, start_date desc, created_at desc);

create index if not exists member_nutrition_assignments_status_idx
  on public.member_nutrition_assignments (assignment_status, start_date desc);

create index if not exists meal_logs_user_id_idx
  on public.meal_logs (user_id, logged_on desc, created_at desc);

create index if not exists meal_logs_assignment_id_idx
  on public.meal_logs (assignment_id, logged_on desc);

create index if not exists nutrition_checkins_user_id_idx
  on public.nutrition_checkins (user_id, checked_in_on desc, created_at desc);

create index if not exists nutrition_checkins_assignment_id_idx
  on public.nutrition_checkins (assignment_id, checked_in_on desc);

drop trigger if exists set_nutrition_templates_updated_at on public.nutrition_templates;
create trigger set_nutrition_templates_updated_at
before update on public.nutrition_templates
for each row execute function public.set_updated_at();

drop trigger if exists set_nutrition_template_days_updated_at on public.nutrition_template_days;
create trigger set_nutrition_template_days_updated_at
before update on public.nutrition_template_days
for each row execute function public.set_updated_at();

drop trigger if exists set_member_nutrition_assignments_updated_at on public.member_nutrition_assignments;
create trigger set_member_nutrition_assignments_updated_at
before update on public.member_nutrition_assignments
for each row execute function public.set_updated_at();

drop trigger if exists set_meal_logs_updated_at on public.meal_logs;
create trigger set_meal_logs_updated_at
before update on public.meal_logs
for each row execute function public.set_updated_at();

drop trigger if exists set_nutrition_checkins_updated_at on public.nutrition_checkins;
create trigger set_nutrition_checkins_updated_at
before update on public.nutrition_checkins
for each row execute function public.set_updated_at();

alter table public.nutrition_templates enable row level security;
alter table public.nutrition_template_days enable row level security;
alter table public.member_nutrition_assignments enable row level security;
alter table public.meal_logs enable row level security;
alter table public.nutrition_checkins enable row level security;

drop policy if exists "Users can read visible nutrition templates" on public.nutrition_templates;
create policy "Users can read visible nutrition templates"
on public.nutrition_templates
for select
to authenticated
using (
  public.is_staff()
  or status = 'active'
  or exists (
    select 1
    from public.member_nutrition_assignments assignment
    where assignment.template_id = nutrition_templates.id
      and assignment.member_id = auth.uid()
  )
);

drop policy if exists "Staff can manage nutrition templates" on public.nutrition_templates;
create policy "Staff can manage nutrition templates"
on public.nutrition_templates
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Users can read visible nutrition template days" on public.nutrition_template_days;
create policy "Users can read visible nutrition template days"
on public.nutrition_template_days
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.nutrition_templates template
    where template.id = nutrition_template_days.template_id
      and (
        template.status = 'active'
        or exists (
          select 1
          from public.member_nutrition_assignments assignment
          where assignment.template_id = template.id
            and assignment.member_id = auth.uid()
        )
      )
  )
);

drop policy if exists "Staff can manage nutrition template days" on public.nutrition_template_days;
create policy "Staff can manage nutrition template days"
on public.nutrition_template_days
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Users can read own nutrition assignments" on public.member_nutrition_assignments;
create policy "Users can read own nutrition assignments"
on public.member_nutrition_assignments
for select
to authenticated
using (member_id = auth.uid() or public.is_staff());

drop policy if exists "Staff can manage nutrition assignments" on public.member_nutrition_assignments;
create policy "Staff can manage nutrition assignments"
on public.member_nutrition_assignments
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Users can read own meal logs" on public.meal_logs;
create policy "Users can read own meal logs"
on public.meal_logs
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "Users can create own meal logs" on public.meal_logs;
create policy "Users can create own meal logs"
on public.meal_logs
for insert
to authenticated
with check (
  (user_id = auth.uid() and public.is_active_member())
  or public.is_staff()
);

drop policy if exists "Users can update own meal logs" on public.meal_logs;
create policy "Users can update own meal logs"
on public.meal_logs
for update
to authenticated
using (
  (user_id = auth.uid() and public.is_active_member())
  or public.is_staff()
)
with check (
  (user_id = auth.uid() and public.is_active_member())
  or public.is_staff()
);

drop policy if exists "Users can delete own meal logs" on public.meal_logs;
create policy "Users can delete own meal logs"
on public.meal_logs
for delete
to authenticated
using (
  (user_id = auth.uid() and public.is_active_member())
  or public.is_staff()
);

drop policy if exists "Users can read own nutrition checkins" on public.nutrition_checkins;
create policy "Users can read own nutrition checkins"
on public.nutrition_checkins
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "Users can create own nutrition checkins" on public.nutrition_checkins;
create policy "Users can create own nutrition checkins"
on public.nutrition_checkins
for insert
to authenticated
with check (
  (user_id = auth.uid() and public.is_active_member())
  or public.is_staff()
);

drop policy if exists "Users can update own nutrition checkins" on public.nutrition_checkins;
create policy "Users can update own nutrition checkins"
on public.nutrition_checkins
for update
to authenticated
using (
  (user_id = auth.uid() and public.is_active_member())
  or public.is_staff()
)
with check (
  (user_id = auth.uid() and public.is_active_member())
  or public.is_staff()
);

drop policy if exists "Users can delete own nutrition checkins" on public.nutrition_checkins;
create policy "Users can delete own nutrition checkins"
on public.nutrition_checkins
for delete
to authenticated
using (
  (user_id = auth.uid() and public.is_active_member())
  or public.is_staff()
);

create table if not exists public.billing_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_payment_method text not null default 'upi' check (preferred_payment_method in ('cash', 'card', 'upi', 'bank_transfer', 'wallet', 'other')),
  autopay_enabled boolean not null default false,
  wallet_provider text,
  billing_email text,
  billing_phone text,
  tax_id text,
  billing_notes text,
  currency_code text not null default 'INR',
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid references public.membership_plans(id) on delete set null,
  invoice_number text unique,
  invoice_type text not null default 'membership_renewal' check (invoice_type in ('membership_renewal', 'drop_in', 'class_pack', 'pt_package', 'retail', 'adjustment', 'manual')),
  status text not null default 'open' check (status in ('draft', 'open', 'paid', 'partial', 'overdue', 'void', 'refunded')),
  issue_date date not null default current_date,
  due_date date not null default current_date,
  billing_period_start date,
  billing_period_end date,
  currency_code text not null default 'INR',
  subtotal_amount numeric(10, 2) not null default 0 check (subtotal_amount >= 0),
  tax_amount numeric(10, 2) not null default 0,
  discount_amount numeric(10, 2) not null default 0,
  total_amount numeric(10, 2) not null default 0 check (total_amount >= 0),
  amount_paid numeric(10, 2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(10, 2) not null default 0,
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.billing_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.billing_invoices(id) on delete cascade,
  line_index integer not null default 1 check (line_index >= 1),
  item_type text not null default 'membership' check (item_type in ('membership', 'session', 'product', 'discount', 'fee', 'adjustment', 'other')),
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null default 0,
  line_total numeric(10, 2) not null default 0,
  linked_plan_name text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.billing_invoices(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  payment_date date not null default current_date,
  payment_method text not null default 'upi' check (payment_method in ('cash', 'card', 'upi', 'bank_transfer', 'wallet', 'other')),
  payment_status text not null default 'completed' check (payment_status in ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  amount numeric(10, 2) not null check (amount > 0),
  reference_code text,
  processor_name text,
  notes text,
  recorded_by uuid references auth.users on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists billing_invoices_member_id_idx
  on public.billing_invoices (member_id, due_date desc, created_at desc);

create index if not exists billing_invoices_status_idx
  on public.billing_invoices (status, due_date desc, created_at desc);

create index if not exists billing_invoice_items_invoice_id_idx
  on public.billing_invoice_items (invoice_id, line_index);

create index if not exists billing_payments_invoice_id_idx
  on public.billing_payments (invoice_id, payment_date desc, created_at desc);

create index if not exists billing_payments_member_id_idx
  on public.billing_payments (member_id, payment_date desc, created_at desc);

insert into public.billing_profiles (user_id, billing_email, billing_phone)
select p.id, p.email, p.phone
from public.profiles p
on conflict (user_id) do update
set
  billing_email = coalesce(public.billing_profiles.billing_email, excluded.billing_email),
  billing_phone = coalesce(public.billing_profiles.billing_phone, excluded.billing_phone);

create or replace function public.generate_invoice_number()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'INV-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6));
    exit when not exists (
      select 1
      from public.billing_invoices
      where invoice_number = candidate
    );
  end loop;

  return candidate;
end;
$$;

create or replace function public.set_billing_invoice_number()
returns trigger
language plpgsql
as $$
begin
  if new.invoice_number is null or length(trim(new.invoice_number)) = 0 then
    new.invoice_number := public.generate_invoice_number();
  end if;

  return new;
end;
$$;

create or replace function public.set_billing_invoice_item_total()
returns trigger
language plpgsql
as $$
begin
  new.line_total := round(coalesce(new.quantity, 0) * coalesce(new.unit_price, 0), 2);
  return new;
end;
$$;

create or replace function public.recalculate_billing_invoice_totals(p_invoice_id uuid)
returns public.billing_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  current_invoice public.billing_invoices;
  item_subtotal numeric(10, 2) := 0;
  payment_net_total numeric(10, 2) := 0;
  next_total numeric(10, 2) := 0;
  next_balance numeric(10, 2) := 0;
  next_status text;
  updated_invoice public.billing_invoices;
begin
  select *
  into current_invoice
  from public.billing_invoices
  where id = p_invoice_id
  for update;

  if not found then
    return null;
  end if;

  select coalesce(sum(line_total), 0)
  into item_subtotal
  from public.billing_invoice_items
  where invoice_id = p_invoice_id;

  select coalesce(sum(
    case
      when payment_status = 'completed' then amount
      when payment_status = 'refunded' then amount * -1
      else 0
    end
  ), 0)
  into payment_net_total
  from public.billing_payments
  where invoice_id = p_invoice_id;

  next_total := greatest(0, round(item_subtotal + coalesce(current_invoice.tax_amount, 0) - coalesce(current_invoice.discount_amount, 0), 2));
  payment_net_total := greatest(0, round(payment_net_total, 2));
  next_balance := greatest(0, round(next_total - payment_net_total, 2));

  next_status := case
    when current_invoice.status = 'void' then 'void'
    when current_invoice.status = 'refunded' then 'refunded'
    when current_invoice.status = 'draft' and payment_net_total = 0 then 'draft'
    when next_total > 0 and next_balance = 0 and payment_net_total > 0 then 'paid'
    when payment_net_total > 0 and next_balance > 0 then 'partial'
    when coalesce(current_invoice.due_date, current_date) < current_date and next_balance > 0 then 'overdue'
    else 'open'
  end;

  update public.billing_invoices
  set
    subtotal_amount = item_subtotal,
    total_amount = next_total,
    amount_paid = payment_net_total,
    balance_due = next_balance,
    status = next_status,
    updated_at = timezone('utc', now())
  where id = p_invoice_id
  returning *
  into updated_invoice;

  return updated_invoice;
end;
$$;

create or replace function public.handle_billing_invoice_recalc()
returns trigger
language plpgsql
as $$
begin
  perform public.recalculate_billing_invoice_totals(coalesce(new.invoice_id, old.invoice_id));
  return coalesce(new, old);
end;
$$;

create or replace function public.record_billing_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_method text default 'upi',
  p_payment_status text default 'completed',
  p_payment_date date default current_date,
  p_reference_code text default null,
  p_processor_name text default null,
  p_notes text default null
)
returns public.billing_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_row public.billing_invoices;
  plan_row public.membership_plans;
  updated_invoice public.billing_invoices;
  next_period_start date;
  next_period_end date;
begin
  if auth.uid() is null or not public.is_staff(auth.uid()) then
    raise exception 'Only staff can record billing payments.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than 0.';
  end if;

  select *
  into invoice_row
  from public.billing_invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'Invoice not found.';
  end if;

  insert into public.billing_payments (
    invoice_id,
    member_id,
    payment_date,
    payment_method,
    payment_status,
    amount,
    reference_code,
    processor_name,
    notes,
    recorded_by
  ) values (
    invoice_row.id,
    invoice_row.member_id,
    coalesce(p_payment_date, current_date),
    coalesce(p_payment_method, 'upi'),
    coalesce(p_payment_status, 'completed'),
    p_amount,
    p_reference_code,
    p_processor_name,
    p_notes,
    auth.uid()
  );

  select *
  into updated_invoice
  from public.recalculate_billing_invoice_totals(invoice_row.id);

  if coalesce(p_payment_status, 'completed') = 'completed'
    and updated_invoice.invoice_type = 'membership_renewal'
    and updated_invoice.balance_due <= 0 then
    select *
    into plan_row
    from public.membership_plans
    where id = coalesce(updated_invoice.plan_id, (select plan_id from public.profiles where id = updated_invoice.member_id));

    next_period_start := coalesce(updated_invoice.billing_period_start, current_date);

    if updated_invoice.billing_period_end is not null then
      next_period_end := updated_invoice.billing_period_end;
    elsif plan_row.id is not null then
      next_period_end := next_period_start + greatest(coalesce(plan_row.duration_weeks, 4) * 7 - 1, 6);
    else
      next_period_end := next_period_start + 27;
    end if;

    update public.profiles
    set
      membership_status = 'active',
      membership_start_date = coalesce(membership_start_date, next_period_start),
      membership_end_date = greatest(coalesce(membership_end_date, next_period_end), next_period_end),
      next_billing_date = next_period_end + 1,
      is_active = true
    where id = updated_invoice.member_id;
  end if;

  return updated_invoice;
end;
$$;

create or replace function public.generate_due_membership_invoices(
  p_due_date date default current_date,
  p_member_id uuid default null
)
returns setof public.billing_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  member_row public.profiles;
  plan_row public.membership_plans;
  billing_profile_row public.billing_profiles;
  existing_invoice_id uuid;
  created_invoice public.billing_invoices;
  due_start date;
  due_end date;
begin
  if auth.uid() is null or not public.is_staff(auth.uid()) then
    raise exception 'Only staff can generate renewal invoices.';
  end if;

  for member_row in
    select *
    from public.profiles
    where role = 'member'
      and plan_id is not null
      and membership_status in ('trial', 'active', 'expired')
      and (p_member_id is null or id = p_member_id)
      and coalesce(next_billing_date, current_date) <= coalesce(p_due_date, current_date)
  loop
    select *
    into plan_row
    from public.membership_plans
    where id = member_row.plan_id
      and is_active = true;

    if not found then
      continue;
    end if;

    select id
    into existing_invoice_id
    from public.billing_invoices
    where member_id = member_row.id
      and invoice_type = 'membership_renewal'
      and status in ('draft', 'open', 'partial', 'overdue')
    order by created_at desc
    limit 1;

    if existing_invoice_id is not null then
      continue;
    end if;

    select *
    into billing_profile_row
    from public.billing_profiles
    where user_id = member_row.id;

    due_start := coalesce(member_row.next_billing_date, current_date);
    due_end := due_start + greatest(coalesce(plan_row.duration_weeks, 4) * 7 - 1, 6);

    insert into public.billing_invoices (
      member_id,
      plan_id,
      invoice_type,
      status,
      issue_date,
      due_date,
      billing_period_start,
      billing_period_end,
      currency_code,
      notes,
      created_by
    ) values (
      member_row.id,
      plan_row.id,
      'membership_renewal',
      'open',
      current_date,
      due_start,
      due_start,
      due_end,
      coalesce(billing_profile_row.currency_code, 'INR'),
      'Auto-generated renewal invoice.',
      auth.uid()
    )
    returning *
    into created_invoice;

    insert into public.billing_invoice_items (
      invoice_id,
      line_index,
      item_type,
      description,
      quantity,
      unit_price,
      line_total,
      linked_plan_name
    ) values (
      created_invoice.id,
      1,
      'membership',
      coalesce(plan_row.name, 'Membership renewal'),
      1,
      coalesce(plan_row.price, 0),
      coalesce(plan_row.price, 0),
      plan_row.name
    );

    select *
    into created_invoice
    from public.recalculate_billing_invoice_totals(created_invoice.id);

    return next created_invoice;
  end loop;

  return;
end;
$$;

drop trigger if exists set_billing_profiles_updated_at on public.billing_profiles;
create trigger set_billing_profiles_updated_at
before update on public.billing_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_billing_invoices_updated_at on public.billing_invoices;
create trigger set_billing_invoices_updated_at
before update on public.billing_invoices
for each row execute function public.set_updated_at();

drop trigger if exists set_billing_invoice_items_updated_at on public.billing_invoice_items;
create trigger set_billing_invoice_items_updated_at
before update on public.billing_invoice_items
for each row execute function public.set_updated_at();

drop trigger if exists set_billing_payments_updated_at on public.billing_payments;
create trigger set_billing_payments_updated_at
before update on public.billing_payments
for each row execute function public.set_updated_at();

drop trigger if exists billing_invoices_set_invoice_number on public.billing_invoices;
create trigger billing_invoices_set_invoice_number
before insert on public.billing_invoices
for each row execute function public.set_billing_invoice_number();

drop trigger if exists billing_invoice_items_set_line_total on public.billing_invoice_items;
create trigger billing_invoice_items_set_line_total
before insert or update on public.billing_invoice_items
for each row execute function public.set_billing_invoice_item_total();

drop trigger if exists billing_invoice_items_recalculate_invoice on public.billing_invoice_items;
create trigger billing_invoice_items_recalculate_invoice
after insert or update or delete on public.billing_invoice_items
for each row execute function public.handle_billing_invoice_recalc();

drop trigger if exists billing_payments_recalculate_invoice on public.billing_payments;
create trigger billing_payments_recalculate_invoice
after insert or update or delete on public.billing_payments
for each row execute function public.handle_billing_invoice_recalc();

alter table public.billing_profiles enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.billing_invoice_items enable row level security;
alter table public.billing_payments enable row level security;

drop policy if exists "Users can read own billing profile" on public.billing_profiles;
create policy "Users can read own billing profile"
on public.billing_profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "Users can upsert own billing profile" on public.billing_profiles;
create policy "Users can upsert own billing profile"
on public.billing_profiles
for insert
to authenticated
with check (user_id = auth.uid() or public.is_staff());

drop policy if exists "Users can update own billing profile" on public.billing_profiles;
create policy "Users can update own billing profile"
on public.billing_profiles
for update
to authenticated
using (user_id = auth.uid() or public.is_staff())
with check (user_id = auth.uid() or public.is_staff());

drop policy if exists "Staff can delete billing profiles" on public.billing_profiles;
create policy "Staff can delete billing profiles"
on public.billing_profiles
for delete
to authenticated
using (public.is_staff());

drop policy if exists "Users can read own invoices" on public.billing_invoices;
create policy "Users can read own invoices"
on public.billing_invoices
for select
to authenticated
using (member_id = auth.uid() or public.is_staff());

drop policy if exists "Staff can manage invoices" on public.billing_invoices;
create policy "Staff can manage invoices"
on public.billing_invoices
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Users can read own invoice items" on public.billing_invoice_items;
create policy "Users can read own invoice items"
on public.billing_invoice_items
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.billing_invoices invoice
    where invoice.id = billing_invoice_items.invoice_id
      and invoice.member_id = auth.uid()
  )
);

drop policy if exists "Staff can manage invoice items" on public.billing_invoice_items;
create policy "Staff can manage invoice items"
on public.billing_invoice_items
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Users can read own billing payments" on public.billing_payments;
create policy "Users can read own billing payments"
on public.billing_payments
for select
to authenticated
using (member_id = auth.uid() or public.is_staff());

drop policy if exists "Staff can manage billing payments" on public.billing_payments;
create policy "Staff can manage billing payments"
on public.billing_payments
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

