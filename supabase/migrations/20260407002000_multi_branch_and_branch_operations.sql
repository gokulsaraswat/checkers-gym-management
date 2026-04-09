create table if not exists public.gym_branches (
  id uuid primary key default gen_random_uuid(),
  branch_code text not null unique,
  name text not null,
  timezone text not null default 'Asia/Kolkata',
  phone text,
  email text,
  address_line_1 text,
  address_line_2 text,
  city text,
  state text,
  postal_code text,
  country text not null default 'India',
  capacity_limit integer,
  opened_on date,
  notes text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint gym_branches_branch_code_not_blank check (nullif(btrim(branch_code), '') is not null),
  constraint gym_branches_name_not_blank check (nullif(btrim(name), '') is not null),
  constraint gym_branches_capacity_limit_positive check (capacity_limit is null or capacity_limit > 0)
);

create table if not exists public.branch_operating_hours (
  branch_id uuid not null references public.gym_branches(id) on delete cascade,
  day_of_week integer not null,
  opens_at time,
  closes_at time,
  is_closed boolean not null default false,
  note text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  primary key (branch_id, day_of_week),
  constraint branch_operating_hours_day_of_week_check check (day_of_week between 0 and 6),
  constraint branch_operating_hours_window_check check (
    is_closed = true or opens_at is null or closes_at is null or closes_at > opens_at
  )
);

create table if not exists public.branch_amenities (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.gym_branches(id) on delete cascade,
  amenity_name text not null,
  description text,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint branch_amenities_name_not_blank check (nullif(btrim(amenity_name), '') is not null)
);

create table if not exists public.staff_branch_assignments (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.gym_branches(id) on delete cascade,
  staff_id uuid not null references public.profiles(id) on delete cascade,
  assignment_role text not null default 'support' check (assignment_role in ('branch_manager', 'trainer', 'front_desk', 'coach', 'support')),
  is_primary boolean not null default false,
  is_active boolean not null default true,
  starts_on date not null default current_date,
  ends_on date,
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint staff_branch_assignments_window_check check (ends_on is null or ends_on >= starts_on)
);

create table if not exists public.member_branch_affiliations (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.gym_branches(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  affiliation_type text not null default 'home_branch' check (affiliation_type in ('home_branch', 'training_branch', 'visiting_branch')),
  is_primary boolean not null default false,
  starts_on date not null default current_date,
  ends_on date,
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint member_branch_affiliations_window_check check (ends_on is null or ends_on >= starts_on)
);

create index if not exists gym_branches_is_active_idx
  on public.gym_branches (is_active, name);

create index if not exists branch_amenities_branch_id_idx
  on public.branch_amenities (branch_id, is_active, amenity_name);

create index if not exists staff_branch_assignments_branch_id_idx
  on public.staff_branch_assignments (branch_id, is_active, starts_on desc);

create index if not exists staff_branch_assignments_staff_id_idx
  on public.staff_branch_assignments (staff_id, is_active, starts_on desc);

create index if not exists member_branch_affiliations_branch_id_idx
  on public.member_branch_affiliations (branch_id, is_primary desc, starts_on desc);

create index if not exists member_branch_affiliations_member_id_idx
  on public.member_branch_affiliations (member_id, is_primary desc, starts_on desc);

create index if not exists member_branch_affiliations_active_home_idx
  on public.member_branch_affiliations (member_id, branch_id)
  where affiliation_type = 'home_branch';

drop trigger if exists set_gym_branches_updated_at on public.gym_branches;
create trigger set_gym_branches_updated_at
before update on public.gym_branches
for each row execute function public.handle_updated_at();

drop trigger if exists set_branch_operating_hours_updated_at on public.branch_operating_hours;
create trigger set_branch_operating_hours_updated_at
before update on public.branch_operating_hours
for each row execute function public.handle_updated_at();

drop trigger if exists set_branch_amenities_updated_at on public.branch_amenities;
create trigger set_branch_amenities_updated_at
before update on public.branch_amenities
for each row execute function public.handle_updated_at();

drop trigger if exists set_staff_branch_assignments_updated_at on public.staff_branch_assignments;
create trigger set_staff_branch_assignments_updated_at
before update on public.staff_branch_assignments
for each row execute function public.handle_updated_at();

drop trigger if exists set_member_branch_affiliations_updated_at on public.member_branch_affiliations;
create trigger set_member_branch_affiliations_updated_at
before update on public.member_branch_affiliations
for each row execute function public.handle_updated_at();

alter table if exists public.profiles
  add column if not exists home_branch_id uuid references public.gym_branches(id) on delete set null;

alter table if exists public.class_sessions
  add column if not exists branch_id uuid references public.gym_branches(id) on delete set null;

alter table if exists public.attendance_visits
  add column if not exists branch_id uuid references public.gym_branches(id) on delete set null;

alter table if exists public.billing_invoices
  add column if not exists branch_id uuid references public.gym_branches(id) on delete set null;

alter table if exists public.operating_expenses
  add column if not exists branch_id uuid references public.gym_branches(id) on delete set null;

alter table if exists public.crm_leads
  add column if not exists branch_id uuid references public.gym_branches(id) on delete set null;

alter table if exists public.pos_sales
  add column if not exists branch_id uuid references public.gym_branches(id) on delete set null;

alter table if exists public.inventory_items
  add column if not exists branch_id uuid references public.gym_branches(id) on delete set null;

alter table if exists public.access_points
  add column if not exists branch_id uuid references public.gym_branches(id) on delete set null;

create index if not exists profiles_home_branch_id_idx
  on public.profiles (home_branch_id, role, membership_status);

create index if not exists class_sessions_branch_id_idx
  on public.class_sessions (branch_id, starts_at desc);

create index if not exists attendance_visits_branch_id_idx
  on public.attendance_visits (branch_id, visit_date desc, checked_in_at desc);

create index if not exists billing_invoices_branch_id_idx
  on public.billing_invoices (branch_id, issue_date desc, created_at desc);

create index if not exists operating_expenses_branch_id_idx
  on public.operating_expenses (branch_id, expense_date desc, created_at desc);

create index if not exists crm_leads_branch_id_idx
  on public.crm_leads (branch_id, stage, created_at desc);

create index if not exists pos_sales_branch_id_idx
  on public.pos_sales (branch_id, sold_at desc, created_at desc);

create index if not exists inventory_items_branch_id_idx
  on public.inventory_items (branch_id, is_active, name);

create index if not exists access_points_branch_id_idx
  on public.access_points (branch_id, is_active, created_at desc);

insert into public.gym_branches (
  branch_code,
  name,
  timezone,
  city,
  state,
  country,
  address_line_1,
  is_active,
  notes
)
values (
  'main',
  'Main Branch',
  'Asia/Kolkata',
  'Update city',
  'Update state',
  'India',
  'Update branch address',
  true,
  'Seeded by Patch 19. Update this record with your actual primary branch details.'
)
on conflict (branch_code) do update
set
  name = excluded.name,
  timezone = excluded.timezone,
  country = excluded.country,
  is_active = excluded.is_active,
  notes = excluded.notes;

with main_branch as (
  select id
  from public.gym_branches
  where branch_code = 'main'
  limit 1
)
update public.profiles
set home_branch_id = main_branch.id
from main_branch
where public.profiles.home_branch_id is null;

with main_branch as (
  select id
  from public.gym_branches
  where branch_code = 'main'
  limit 1
)
update public.class_sessions
set branch_id = main_branch.id
from main_branch
where public.class_sessions.branch_id is null;

with main_branch as (
  select id
  from public.gym_branches
  where branch_code = 'main'
  limit 1
)
update public.attendance_visits
set branch_id = main_branch.id
from main_branch
where public.attendance_visits.branch_id is null;

with main_branch as (
  select id
  from public.gym_branches
  where branch_code = 'main'
  limit 1
)
update public.billing_invoices
set branch_id = main_branch.id
from main_branch
where public.billing_invoices.branch_id is null;

with main_branch as (
  select id
  from public.gym_branches
  where branch_code = 'main'
  limit 1
)
update public.operating_expenses
set branch_id = main_branch.id
from main_branch
where public.operating_expenses.branch_id is null;

with main_branch as (
  select id
  from public.gym_branches
  where branch_code = 'main'
  limit 1
)
update public.crm_leads
set branch_id = main_branch.id
from main_branch
where public.crm_leads.branch_id is null;

with main_branch as (
  select id
  from public.gym_branches
  where branch_code = 'main'
  limit 1
)
update public.pos_sales
set branch_id = main_branch.id
from main_branch
where public.pos_sales.branch_id is null;

with main_branch as (
  select id
  from public.gym_branches
  where branch_code = 'main'
  limit 1
)
update public.inventory_items
set branch_id = main_branch.id
from main_branch
where public.inventory_items.branch_id is null;

with main_branch as (
  select id
  from public.gym_branches
  where branch_code = 'main'
  limit 1
)
update public.access_points
set branch_id = main_branch.id
from main_branch
where public.access_points.branch_id is null;

with main_branch as (
  select id
  from public.gym_branches
  where branch_code = 'main'
  limit 1
)
insert into public.branch_operating_hours (
  branch_id,
  day_of_week,
  opens_at,
  closes_at,
  is_closed,
  note
)
select
  main_branch.id,
  schedule.day_of_week,
  schedule.opens_at,
  schedule.closes_at,
  schedule.is_closed,
  schedule.note
from main_branch
cross join (
  values
    (0, time '08:00', time '14:00', false, 'Sunday reduced hours'),
    (1, time '06:00', time '22:00', false, 'Standard weekday hours'),
    (2, time '06:00', time '22:00', false, 'Standard weekday hours'),
    (3, time '06:00', time '22:00', false, 'Standard weekday hours'),
    (4, time '06:00', time '22:00', false, 'Standard weekday hours'),
    (5, time '06:00', time '22:00', false, 'Standard weekday hours'),
    (6, time '06:00', time '20:00', false, 'Saturday evening close')
) as schedule(day_of_week, opens_at, closes_at, is_closed, note)
on conflict (branch_id, day_of_week) do nothing;

with main_branch as (
  select id
  from public.gym_branches
  where branch_code = 'main'
  limit 1
)
insert into public.staff_branch_assignments (
  branch_id,
  staff_id,
  assignment_role,
  is_primary,
  is_active,
  starts_on,
  notes
)
select
  main_branch.id,
  profiles.id,
  case
    when profiles.role = 'admin' then 'branch_manager'
    else 'support'
  end,
  true,
  true,
  current_date,
  'Seeded by Patch 19 for existing staff/admin users.'
from main_branch
join public.profiles on profiles.role in ('admin', 'staff')
where not exists (
  select 1
  from public.staff_branch_assignments assignments
  where assignments.staff_id = profiles.id
    and assignments.branch_id = main_branch.id
    and assignments.is_active = true
);

with main_branch as (
  select id
  from public.gym_branches
  where branch_code = 'main'
  limit 1
)
insert into public.member_branch_affiliations (
  branch_id,
  member_id,
  affiliation_type,
  is_primary,
  starts_on,
  notes
)
select
  main_branch.id,
  profiles.id,
  'home_branch',
  true,
  coalesce(profiles.member_since, current_date),
  'Seeded by Patch 19 from profiles.home_branch_id.'
from main_branch
join public.profiles on profiles.role = 'member'
where not exists (
  select 1
  from public.member_branch_affiliations affiliations
  where affiliations.member_id = profiles.id
    and affiliations.branch_id = main_branch.id
    and affiliations.affiliation_type = 'home_branch'
);

create or replace function public.user_can_access_branch(p_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when auth.uid() is null or p_branch_id is null then false
      when public.is_admin() then true
      when exists (
        select 1
        from public.staff_branch_assignments assignments
        where assignments.branch_id = p_branch_id
          and assignments.staff_id = auth.uid()
          and assignments.is_active = true
          and (assignments.ends_on is null or assignments.ends_on >= current_date)
      ) then true
      when exists (
        select 1
        from public.member_branch_affiliations affiliations
        where affiliations.branch_id = p_branch_id
          and affiliations.member_id = auth.uid()
          and (affiliations.ends_on is null or affiliations.ends_on >= current_date)
      ) then true
      else false
    end;
$$;

create or replace function public.list_accessible_branches()
returns table (
  id uuid,
  branch_code text,
  name text,
  city text,
  state text,
  timezone text,
  is_active boolean,
  member_count bigint,
  active_staff_count bigint,
  is_primary boolean,
  access_role text
)
language sql
stable
security definer
set search_path = public
as $$
  with accessible as (
    select
      branches.*,
      exists (
        select 1
        from public.staff_branch_assignments assignments
        where assignments.branch_id = branches.id
          and assignments.staff_id = auth.uid()
          and assignments.is_primary = true
          and assignments.is_active = true
          and (assignments.ends_on is null or assignments.ends_on >= current_date)
      ) or exists (
        select 1
        from public.member_branch_affiliations affiliations
        where affiliations.branch_id = branches.id
          and affiliations.member_id = auth.uid()
          and affiliations.is_primary = true
          and (affiliations.ends_on is null or affiliations.ends_on >= current_date)
      ) as is_primary,
      case
        when public.is_admin() then 'admin'
        when exists (
          select 1
          from public.staff_branch_assignments assignments
          where assignments.branch_id = branches.id
            and assignments.staff_id = auth.uid()
            and assignments.is_active = true
            and (assignments.ends_on is null or assignments.ends_on >= current_date)
        ) then coalesce((
          select assignments.assignment_role
          from public.staff_branch_assignments assignments
          where assignments.branch_id = branches.id
            and assignments.staff_id = auth.uid()
            and assignments.is_active = true
            and (assignments.ends_on is null or assignments.ends_on >= current_date)
          order by assignments.is_primary desc, assignments.created_at desc
          limit 1
        ), 'staff')
        else 'member'
      end as access_role
    from public.gym_branches branches
    where public.is_admin() or public.user_can_access_branch(branches.id)
  )
  select
    accessible.id,
    accessible.branch_code,
    accessible.name,
    accessible.city,
    accessible.state,
    accessible.timezone,
    accessible.is_active,
    (
      select count(*)::bigint
      from public.profiles profiles
      where profiles.home_branch_id = accessible.id
        and profiles.role = 'member'
        and profiles.is_active = true
    ) as member_count,
    (
      select count(*)::bigint
      from public.staff_branch_assignments assignments
      where assignments.branch_id = accessible.id
        and assignments.is_active = true
        and (assignments.ends_on is null or assignments.ends_on >= current_date)
    ) as active_staff_count,
    accessible.is_primary,
    accessible.access_role
  from accessible
  order by accessible.name asc;
$$;

revoke all on function public.list_accessible_branches() from public;
grant execute on function public.list_accessible_branches() to authenticated;

create or replace function public.get_branch_dashboard_snapshot(p_branch_id uuid default null)
returns table (
  branch_id uuid,
  branch_name text,
  timezone text,
  active_members bigint,
  expiring_soon bigint,
  active_staff bigint,
  month_revenue numeric,
  month_expenses numeric,
  open_leads bigint,
  todays_checkins bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  resolved_branch_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  select coalesce(
    p_branch_id,
    (
      select profiles.home_branch_id
      from public.profiles profiles
      where profiles.id = auth.uid()
      limit 1
    ),
    (
      select branches.id
      from public.gym_branches branches
      where branches.branch_code = 'main'
      order by branches.created_at asc
      limit 1
    )
  )
  into resolved_branch_id;

  if resolved_branch_id is null then
    raise exception 'No branch is available yet.';
  end if;

  if not public.user_can_access_branch(resolved_branch_id) and not public.is_admin() then
    raise exception 'Branch access denied.';
  end if;

  return query
  select
    branches.id,
    branches.name,
    branches.timezone,
    (
      select count(*)::bigint
      from public.profiles profiles
      where profiles.home_branch_id = branches.id
        and profiles.role = 'member'
        and profiles.is_active = true
        and coalesce(profiles.membership_status, 'trial') in ('trial', 'active', 'suspended')
    ) as active_members,
    (
      select count(*)::bigint
      from public.profiles profiles
      where profiles.home_branch_id = branches.id
        and profiles.role = 'member'
        and profiles.membership_end_date between current_date and current_date + 30
    ) as expiring_soon,
    (
      select count(*)::bigint
      from public.staff_branch_assignments assignments
      where assignments.branch_id = branches.id
        and assignments.is_active = true
        and (assignments.ends_on is null or assignments.ends_on >= current_date)
    ) as active_staff,
    coalesce((
      select sum(payments.amount)
      from public.billing_payments payments
      inner join public.billing_invoices invoices on invoices.id = payments.invoice_id
      where invoices.branch_id = branches.id
        and payments.payment_status = 'completed'
        and date_trunc('month', payments.payment_date::timestamp) = date_trunc('month', timezone('utc', now()))
    ), 0)::numeric as month_revenue,
    coalesce((
      select sum(expenses.amount)
      from public.operating_expenses expenses
      where expenses.branch_id = branches.id
        and date_trunc('month', expenses.expense_date::timestamp) = date_trunc('month', timezone('utc', now()))
    ), 0)::numeric as month_expenses,
    coalesce((
      select count(*)::bigint
      from public.crm_leads leads
      where leads.branch_id = branches.id
        and leads.stage not in ('won', 'lost', 'dormant')
    ), 0)::bigint as open_leads,
    coalesce((
      select count(*)::bigint
      from public.attendance_visits visits
      where visits.branch_id = branches.id
        and visits.visit_date = current_date
    ), 0)::bigint as todays_checkins
  from public.gym_branches branches
  where branches.id = resolved_branch_id
  limit 1;
end;
$$;

revoke all on function public.get_branch_dashboard_snapshot(uuid) from public;
grant execute on function public.get_branch_dashboard_snapshot(uuid) to authenticated;

create or replace function public.list_branch_staff_assignments(p_branch_id uuid default null)
returns table (
  assignment_id uuid,
  branch_id uuid,
  branch_name text,
  staff_id uuid,
  full_name text,
  email text,
  assignment_role text,
  is_primary boolean,
  is_active boolean,
  starts_on date,
  ends_on date
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
    assignments.id,
    assignments.branch_id,
    branches.name,
    assignments.staff_id,
    profiles.full_name,
    profiles.email,
    assignments.assignment_role,
    assignments.is_primary,
    assignments.is_active,
    assignments.starts_on,
    assignments.ends_on
  from public.staff_branch_assignments assignments
  inner join public.gym_branches branches on branches.id = assignments.branch_id
  inner join public.profiles profiles on profiles.id = assignments.staff_id
  where (p_branch_id is null or assignments.branch_id = p_branch_id)
    and (
      public.is_admin()
      or public.user_can_access_branch(assignments.branch_id)
    )
  order by branches.name asc, assignments.is_primary desc, profiles.full_name asc;
end;
$$;

revoke all on function public.list_branch_staff_assignments(uuid) from public;
grant execute on function public.list_branch_staff_assignments(uuid) to authenticated;

create or replace function public.assign_staff_to_branch(
  p_branch_id uuid,
  p_staff_id uuid,
  p_assignment_role text default 'support',
  p_is_primary boolean default false
)
returns public.staff_branch_assignments
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_assignment public.staff_branch_assignments;
  saved_assignment public.staff_branch_assignments;
  next_role text;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_branch_id is null or p_staff_id is null then
    raise exception 'Branch id and staff id are required';
  end if;

  next_role := coalesce(nullif(btrim(coalesce(p_assignment_role, '')), ''), 'support');

  if next_role not in ('branch_manager', 'trainer', 'front_desk', 'coach', 'support') then
    raise exception 'Unsupported staff assignment role.';
  end if;

  if coalesce(p_is_primary, false) then
    update public.staff_branch_assignments
    set is_primary = false
    where staff_id = p_staff_id
      and is_active = true;
  end if;

  select *
  into existing_assignment
  from public.staff_branch_assignments
  where branch_id = p_branch_id
    and staff_id = p_staff_id
    and is_active = true
  order by is_primary desc, created_at desc
  limit 1
  for update;

  if existing_assignment.id is null then
    insert into public.staff_branch_assignments (
      branch_id,
      staff_id,
      assignment_role,
      is_primary,
      is_active,
      starts_on
    )
    values (
      p_branch_id,
      p_staff_id,
      next_role,
      coalesce(p_is_primary, false),
      true,
      current_date
    )
    returning * into saved_assignment;
  else
    update public.staff_branch_assignments
    set
      assignment_role = next_role,
      is_primary = coalesce(p_is_primary, false),
      is_active = true,
      ends_on = null
    where id = existing_assignment.id
    returning * into saved_assignment;
  end if;

  return saved_assignment;
end;
$$;

revoke all on function public.assign_staff_to_branch(uuid, uuid, text, boolean) from public;
grant execute on function public.assign_staff_to_branch(uuid, uuid, text, boolean) to authenticated;

create or replace function public.assign_member_to_branch(
  p_branch_id uuid,
  p_member_id uuid,
  p_affiliation_type text default 'home_branch',
  p_is_primary boolean default true
)
returns public.member_branch_affiliations
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_affiliation public.member_branch_affiliations;
  saved_affiliation public.member_branch_affiliations;
  next_affiliation_type text;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  if p_branch_id is null or p_member_id is null then
    raise exception 'Branch id and member id are required';
  end if;

  next_affiliation_type := coalesce(nullif(btrim(coalesce(p_affiliation_type, '')), ''), 'home_branch');

  if next_affiliation_type not in ('home_branch', 'training_branch', 'visiting_branch') then
    raise exception 'Unsupported member affiliation type.';
  end if;

  if coalesce(p_is_primary, false) then
    update public.member_branch_affiliations
    set is_primary = false
    where member_id = p_member_id
      and affiliation_type = next_affiliation_type;
  end if;

  select *
  into existing_affiliation
  from public.member_branch_affiliations
  where branch_id = p_branch_id
    and member_id = p_member_id
    and affiliation_type = next_affiliation_type
  order by is_primary desc, created_at desc
  limit 1
  for update;

  if existing_affiliation.id is null then
    insert into public.member_branch_affiliations (
      branch_id,
      member_id,
      affiliation_type,
      is_primary,
      starts_on
    )
    values (
      p_branch_id,
      p_member_id,
      next_affiliation_type,
      coalesce(p_is_primary, false),
      current_date
    )
    returning * into saved_affiliation;
  else
    update public.member_branch_affiliations
    set
      is_primary = coalesce(p_is_primary, false),
      ends_on = null
    where id = existing_affiliation.id
    returning * into saved_affiliation;
  end if;

  if next_affiliation_type = 'home_branch' then
    update public.profiles
    set home_branch_id = p_branch_id
    where id = p_member_id;
  end if;

  return saved_affiliation;
end;
$$;

revoke all on function public.assign_member_to_branch(uuid, uuid, text, boolean) from public;
grant execute on function public.assign_member_to_branch(uuid, uuid, text, boolean) to authenticated;

alter table public.gym_branches enable row level security;
alter table public.branch_operating_hours enable row level security;
alter table public.branch_amenities enable row level security;
alter table public.staff_branch_assignments enable row level security;
alter table public.member_branch_affiliations enable row level security;

drop policy if exists "Authenticated users can read accessible branches" on public.gym_branches;
create policy "Authenticated users can read accessible branches"
on public.gym_branches
for select
to authenticated
using (is_active = true or public.user_can_access_branch(id) or public.is_admin());

drop policy if exists "Admins can manage branches" on public.gym_branches;
create policy "Admins can manage branches"
on public.gym_branches
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read branch hours" on public.branch_operating_hours;
create policy "Authenticated users can read branch hours"
on public.branch_operating_hours
for select
to authenticated
using (public.user_can_access_branch(branch_id) or public.is_admin() or exists (
  select 1
  from public.gym_branches branches
  where branches.id = branch_operating_hours.branch_id
    and branches.is_active = true
));

drop policy if exists "Admins can manage branch hours" on public.branch_operating_hours;
create policy "Admins can manage branch hours"
on public.branch_operating_hours
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Authenticated users can read branch amenities" on public.branch_amenities;
create policy "Authenticated users can read branch amenities"
on public.branch_amenities
for select
to authenticated
using (public.user_can_access_branch(branch_id) or public.is_admin() or exists (
  select 1
  from public.gym_branches branches
  where branches.id = branch_amenities.branch_id
    and branches.is_active = true
));

drop policy if exists "Admins can manage branch amenities" on public.branch_amenities;
create policy "Admins can manage branch amenities"
on public.branch_amenities
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Staff can read staff branch assignments" on public.staff_branch_assignments;
create policy "Staff can read staff branch assignments"
on public.staff_branch_assignments
for select
to authenticated
using (
  staff_id = auth.uid()
  or public.is_staff()
  or public.is_admin()
  or public.user_can_access_branch(branch_id)
);

drop policy if exists "Admins can manage staff branch assignments" on public.staff_branch_assignments;
create policy "Admins can manage staff branch assignments"
on public.staff_branch_assignments
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members can read own branch affiliations" on public.member_branch_affiliations;
create policy "Members can read own branch affiliations"
on public.member_branch_affiliations
for select
to authenticated
using (
  member_id = auth.uid()
  or public.is_staff()
  or public.is_admin()
);

drop policy if exists "Staff can manage member branch affiliations" on public.member_branch_affiliations;
create policy "Staff can manage member branch affiliations"
on public.member_branch_affiliations
for all
to authenticated
using (public.is_staff() or public.is_admin())
with check (public.is_staff() or public.is_admin());
