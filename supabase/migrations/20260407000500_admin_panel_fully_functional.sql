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
