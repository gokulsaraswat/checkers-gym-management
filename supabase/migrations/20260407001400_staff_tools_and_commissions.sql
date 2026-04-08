-- Phase 13: staff tools, coach client assignments, shift reports, and compensation ledger.

create table if not exists public.staff_member_assignments (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  assignment_role text not null default 'coach' check (assignment_role in ('coach', 'trainer', 'nutritionist', 'account_manager', 'front_desk', 'support')),
  focus_area text,
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'cancelled')),
  starts_on date not null default current_date,
  ends_on date,
  notes text,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.staff_shift_reports (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id) on delete cascade,
  shift_date date not null default current_date,
  shift_type text not null default 'general' check (shift_type in ('opening', 'mid', 'closing', 'personal_training', 'group_classes', 'front_desk', 'general')),
  hours_worked numeric(5, 2) check (hours_worked is null or hours_worked >= 0),
  member_check_ins integer not null default 0 check (member_check_ins >= 0),
  pt_sessions_completed integer not null default 0 check (pt_sessions_completed >= 0),
  classes_coached integer not null default 0 check (classes_coached >= 0),
  lead_follow_ups integer not null default 0 check (lead_follow_ups >= 0),
  summary text,
  follow_up text,
  energy_score integer check (energy_score is null or energy_score between 1 and 10),
  needs_manager_review boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.staff_compensation_profiles (
  staff_id uuid primary key references public.profiles(id) on delete cascade,
  monthly_retainer numeric(10, 2) not null default 0 check (monthly_retainer >= 0),
  commission_rate_membership numeric(5, 2) not null default 0 check (commission_rate_membership >= 0 and commission_rate_membership <= 100),
  commission_rate_pt numeric(5, 2) not null default 0 check (commission_rate_pt >= 0 and commission_rate_pt <= 100),
  per_session_bonus numeric(10, 2) not null default 0 check (per_session_bonus >= 0),
  payout_cycle text not null default 'monthly' check (payout_cycle in ('weekly', 'biweekly', 'monthly', 'manual')),
  is_active boolean not null default true,
  notes text,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.staff_commission_entries (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references public.profiles(id) on delete cascade,
  source_module text not null default 'manual' check (source_module in ('manual', 'membership', 'billing', 'attendance', 'class', 'workout', 'nutrition', 'lead')),
  source_reference text,
  description text not null,
  amount numeric(10, 2) not null default 0,
  currency_code text not null default 'INR',
  status text not null default 'pending' check (status in ('pending', 'approved', 'paid', 'void')),
  earned_on date not null default current_date,
  payout_due_on date,
  paid_on date,
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

alter table public.staff_member_assignments
  drop constraint if exists staff_member_assignments_distinct_profiles;

alter table public.staff_member_assignments
  add constraint staff_member_assignments_distinct_profiles
  check (staff_id <> member_id);

create unique index if not exists staff_member_assignments_unique_active_key
  on public.staff_member_assignments (staff_id, member_id, assignment_role, starts_on);

create index if not exists staff_member_assignments_staff_id_idx
  on public.staff_member_assignments (staff_id, status, starts_on desc);

create index if not exists staff_member_assignments_member_id_idx
  on public.staff_member_assignments (member_id, status, starts_on desc);

create index if not exists staff_shift_reports_staff_date_idx
  on public.staff_shift_reports (staff_id, shift_date desc);

create index if not exists staff_commission_entries_staff_status_idx
  on public.staff_commission_entries (staff_id, status, earned_on desc);

create index if not exists staff_commission_entries_payout_due_idx
  on public.staff_commission_entries (payout_due_on, status);

create or replace function public.validate_staff_member_assignment_roles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  resolved_staff_role text;
  resolved_member_role text;
begin
  select role
  into resolved_staff_role
  from public.profiles
  where id = new.staff_id;

  if resolved_staff_role is null or resolved_staff_role not in ('staff', 'admin') then
    raise exception 'Assigned staff profile must have staff or admin role.';
  end if;

  select role
  into resolved_member_role
  from public.profiles
  where id = new.member_id;

  if resolved_member_role is null or resolved_member_role <> 'member' then
    raise exception 'Assigned member profile must have member role.';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_staff_member_assignments_roles on public.staff_member_assignments;
create trigger validate_staff_member_assignments_roles
before insert or update on public.staff_member_assignments
for each row execute function public.validate_staff_member_assignment_roles();

drop trigger if exists set_staff_member_assignments_updated_at on public.staff_member_assignments;
create trigger set_staff_member_assignments_updated_at
before update on public.staff_member_assignments
for each row execute function public.set_updated_at();

drop trigger if exists set_staff_shift_reports_updated_at on public.staff_shift_reports;
create trigger set_staff_shift_reports_updated_at
before update on public.staff_shift_reports
for each row execute function public.set_updated_at();

drop trigger if exists set_staff_compensation_profiles_updated_at on public.staff_compensation_profiles;
create trigger set_staff_compensation_profiles_updated_at
before update on public.staff_compensation_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_staff_commission_entries_updated_at on public.staff_commission_entries;
create trigger set_staff_commission_entries_updated_at
before update on public.staff_commission_entries
for each row execute function public.set_updated_at();

alter table public.staff_member_assignments enable row level security;
alter table public.staff_shift_reports enable row level security;
alter table public.staff_compensation_profiles enable row level security;
alter table public.staff_commission_entries enable row level security;

drop policy if exists "Authenticated users can read plans" on public.membership_plans;
create policy "Authenticated users can read plans"
on public.membership_plans
for select
to authenticated
using (is_active = true or public.is_staff());

drop policy if exists "Staff can read all profiles" on public.profiles;
create policy "Staff can read all profiles"
on public.profiles
for select
to authenticated
using (public.is_staff());

drop policy if exists "Staff can read relevant staff assignments" on public.staff_member_assignments;
create policy "Staff can read relevant staff assignments"
on public.staff_member_assignments
for select
to authenticated
using (
  public.is_admin()
  or staff_id = auth.uid()
  or member_id = auth.uid()
);

drop policy if exists "Admins can manage staff assignments" on public.staff_member_assignments;
create policy "Admins can manage staff assignments"
on public.staff_member_assignments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Staff can read own shift reports" on public.staff_shift_reports;
create policy "Staff can read own shift reports"
on public.staff_shift_reports
for select
to authenticated
using (public.is_admin() or staff_id = auth.uid());

drop policy if exists "Staff can insert own shift reports" on public.staff_shift_reports;
create policy "Staff can insert own shift reports"
on public.staff_shift_reports
for insert
to authenticated
with check (public.is_admin() or staff_id = auth.uid());

drop policy if exists "Staff can update own shift reports" on public.staff_shift_reports;
create policy "Staff can update own shift reports"
on public.staff_shift_reports
for update
to authenticated
using (public.is_admin() or staff_id = auth.uid())
with check (public.is_admin() or staff_id = auth.uid());

drop policy if exists "Admins can delete shift reports" on public.staff_shift_reports;
create policy "Admins can delete shift reports"
on public.staff_shift_reports
for delete
to authenticated
using (public.is_admin());

drop policy if exists "Staff can read own compensation profile" on public.staff_compensation_profiles;
create policy "Staff can read own compensation profile"
on public.staff_compensation_profiles
for select
to authenticated
using (public.is_admin() or staff_id = auth.uid());

drop policy if exists "Admins can manage compensation profiles" on public.staff_compensation_profiles;
create policy "Admins can manage compensation profiles"
on public.staff_compensation_profiles
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Staff can read own commission entries" on public.staff_commission_entries;
create policy "Staff can read own commission entries"
on public.staff_commission_entries
for select
to authenticated
using (public.is_admin() or staff_id = auth.uid());

drop policy if exists "Admins can manage commission entries" on public.staff_commission_entries;
create policy "Admins can manage commission entries"
on public.staff_commission_entries
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
