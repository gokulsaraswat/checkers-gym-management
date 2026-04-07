alter table public.class_sessions
  add column if not exists session_type text,
  add column if not exists trainer_id uuid references public.profiles on delete set null,
  add column if not exists trainer_name text,
  add column if not exists branch_name text,
  add column if not exists equipment_notes text,
  add column if not exists visibility text,
  add column if not exists schedule_status text,
  add column if not exists recurrence_group_id uuid,
  add column if not exists recurrence_rule text;

update public.class_sessions
set
  session_type = coalesce(nullif(session_type, ''), 'group_class'),
  trainer_name = coalesce(nullif(trainer_name, ''), coach_name),
  coach_name = coalesce(nullif(coach_name, ''), trainer_name),
  branch_name = coalesce(nullif(branch_name, ''), 'Main branch'),
  visibility = coalesce(nullif(visibility, ''), 'members'),
  schedule_status = coalesce(nullif(schedule_status, ''), 'scheduled');

alter table public.class_sessions
  alter column session_type set default 'group_class',
  alter column session_type set not null,
  alter column visibility set default 'members',
  alter column visibility set not null,
  alter column schedule_status set default 'scheduled',
  alter column schedule_status set not null;

alter table public.class_sessions
  drop constraint if exists class_sessions_session_type_check,
  drop constraint if exists class_sessions_visibility_check,
  drop constraint if exists class_sessions_schedule_status_check;

alter table public.class_sessions
  add constraint class_sessions_session_type_check
    check (session_type in ('group_class', 'personal_training', 'assessment', 'event', 'open_gym')),
  add constraint class_sessions_visibility_check
    check (visibility in ('members', 'staff_only')),
  add constraint class_sessions_schedule_status_check
    check (schedule_status in ('scheduled', 'cancelled', 'completed'));

create index if not exists class_sessions_trainer_id_idx
  on public.class_sessions (trainer_id, starts_at asc);

create index if not exists class_sessions_status_idx
  on public.class_sessions (schedule_status, starts_at asc);

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
