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
