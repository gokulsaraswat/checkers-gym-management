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

create index if not exists progress_checkpoints_user_id_idx on public.progress_checkpoints (user_id, recorded_on desc, created_at desc);
create index if not exists class_sessions_starts_at_idx on public.class_sessions (starts_at asc) where is_active = true;
create index if not exists class_bookings_user_id_idx on public.class_bookings (user_id, created_at desc);
create index if not exists class_bookings_session_id_idx on public.class_bookings (class_session_id, booking_status);

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

alter table public.progress_checkpoints enable row level security;
alter table public.class_sessions enable row level security;
alter table public.class_bookings enable row level security;

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
