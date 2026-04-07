
alter table public.profiles
add column if not exists phone text;

alter table public.profiles
add column if not exists date_of_birth date;

alter table public.profiles
add column if not exists address text;

alter table public.profiles
add column if not exists emergency_contact_name text;

alter table public.profiles
add column if not exists emergency_contact_phone text;

alter table public.profiles
add column if not exists fitness_goal text;

alter table public.profiles
add column if not exists membership_status text not null default 'trial';

alter table public.profiles
add column if not exists membership_start_date date;

alter table public.profiles
add column if not exists membership_end_date date;

alter table public.profiles
add column if not exists next_billing_date date;

alter table public.profiles
add column if not exists current_waiver_version text;

alter table public.profiles
add column if not exists waiver_signed_at timestamp with time zone;

alter table public.profiles
drop constraint if exists profiles_membership_status_check;

alter table public.profiles
add constraint profiles_membership_status_check
check (membership_status in ('trial', 'active', 'suspended', 'expired', 'cancelled'));

update public.profiles
set membership_start_date = coalesce(membership_start_date, member_since, current_date)
where membership_start_date is null;

update public.profiles
set membership_status = case
  when is_active = false then 'suspended'
  when plan_id is not null then 'active'
  else coalesce(membership_status, 'trial')
end
where membership_status is null or membership_status = 'trial';

update public.profiles p
set membership_end_date = coalesce(
  p.membership_end_date,
  (coalesce(p.membership_start_date, p.member_since, current_date) + (plan.duration_weeks * interval '7 days'))::date
),
next_billing_date = coalesce(
  p.next_billing_date,
  (coalesce(p.membership_start_date, p.member_since, current_date) + (plan.duration_weeks * interval '7 days'))::date
)
from public.membership_plans plan
where p.plan_id = plan.id
  and (p.membership_end_date is null or p.next_billing_date is null);

update public.profiles
set membership_end_date = coalesce(
  membership_end_date,
  (coalesce(membership_start_date, member_since, current_date) + interval '7 days')::date
)
where plan_id is null
  and membership_status = 'trial'
  and membership_end_date is null;

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

create index if not exists membership_status_history_profile_id_idx
on public.membership_status_history (profile_id, effective_on desc, created_at desc);

create index if not exists member_waivers_profile_id_idx
on public.member_waivers (profile_id, accepted_at desc);

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

alter table public.member_waivers enable row level security;
alter table public.membership_status_history enable row level security;

drop trigger if exists set_member_waivers_updated_at on public.member_waivers;
create trigger set_member_waivers_updated_at
before update on public.member_waivers
for each row execute function public.set_updated_at();

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
select
  p.id,
  null,
  p.membership_status,
  null,
  'system',
  'Initial lifecycle snapshot for existing member',
  coalesce(p.membership_start_date, p.member_since, current_date),
  p.plan_id,
  p.membership_start_date,
  p.membership_end_date,
  p.next_billing_date
from public.profiles p
where not exists (
  select 1
  from public.membership_status_history history
  where history.profile_id = p.id
);
