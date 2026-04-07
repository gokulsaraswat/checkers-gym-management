
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
