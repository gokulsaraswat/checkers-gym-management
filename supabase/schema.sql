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
  role text not null default 'member' check (role in ('member', 'staff', 'admin')),
  plan_id uuid references public.membership_plans on delete set null,
  is_active boolean not null default true,
  member_since date not null default current_date,
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

create index if not exists workouts_user_id_idx on public.workouts (user_id);
create index if not exists workouts_workout_date_idx on public.workouts (workout_date);

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

alter table public.membership_plans enable row level security;
alter table public.profiles enable row level security;
alter table public.workouts enable row level security;

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

insert into public.membership_plans (name, description, price, billing_cycle, duration_weeks, is_active)
values
  ('Starter', 'General gym access with self-guided workout logging.', 29.00, 'month', 4, true),
  ('Strength', 'Structured strength plan with progressive overload tracking.', 59.00, 'month', 4, true),
  ('Elite Coaching', 'Premium plan with higher-touch coaching and programming.', 99.00, 'month', 4, true)
on conflict (name) do nothing;
