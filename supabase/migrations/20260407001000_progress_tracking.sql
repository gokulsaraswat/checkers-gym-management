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
