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
