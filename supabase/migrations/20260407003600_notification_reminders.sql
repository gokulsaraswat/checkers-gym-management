-- Patch 36: Notifications and reminders

create table if not exists public.notification_reminder_rules (
  id uuid primary key default gen_random_uuid(),
  rule_key text not null unique,
  title text not null,
  description text,
  reminder_type text not null default 'billing_due' check (
    reminder_type in ('billing_due', 'class_booking', 'inactive_member', 'membership_expiry')
  ),
  target_role text not null default 'member' check (
    target_role in ('member', 'staff', 'admin', 'all')
  ),
  delivery_channel text not null default 'in_app' check (
    delivery_channel in ('in_app', 'email', 'sms', 'whatsapp', 'push', 'system')
  ),
  action_label text,
  action_path text,
  title_template text not null,
  message_template text not null,
  lead_value integer not null default 1 check (lead_value >= 0 and lead_value <= 90),
  lead_unit text not null default 'days' check (lead_unit in ('minutes', 'hours', 'days')),
  cooldown_hours integer not null default 24 check (cooldown_hours >= 0 and cooldown_hours <= 720),
  include_inactive boolean not null default false,
  respect_preferences boolean not null default true,
  enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  last_previewed_at timestamp with time zone,
  last_run_at timestamp with time zone,
  created_by uuid references public.profiles(id) on delete set null,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint notification_reminder_rules_rule_key_not_blank check (nullif(btrim(rule_key), '') is not null),
  constraint notification_reminder_rules_title_not_blank check (nullif(btrim(title), '') is not null)
);

create index if not exists notification_reminder_rules_enabled_idx
  on public.notification_reminder_rules (enabled, reminder_type, delivery_channel);

create index if not exists notification_reminder_rules_rule_key_idx
  on public.notification_reminder_rules (rule_key);

drop trigger if exists set_notification_reminder_rules_updated_at on public.notification_reminder_rules;
create trigger set_notification_reminder_rules_updated_at
before update on public.notification_reminder_rules
for each row execute function public.set_updated_at();

alter table public.notification_reminder_rules enable row level security;

drop policy if exists "Staff can read reminder rules" on public.notification_reminder_rules;
create policy "Staff can read reminder rules"
on public.notification_reminder_rules
for select
using (public.is_staff());

drop policy if exists "Staff can insert reminder rules" on public.notification_reminder_rules;
create policy "Staff can insert reminder rules"
on public.notification_reminder_rules
for insert
with check (public.is_staff());

drop policy if exists "Staff can update reminder rules" on public.notification_reminder_rules;
create policy "Staff can update reminder rules"
on public.notification_reminder_rules
for update
using (public.is_staff())
with check (public.is_staff());

grant select, insert, update on public.notification_reminder_rules to authenticated;

create or replace function public.build_notification_lead_interval(
  p_lead_value integer,
  p_lead_unit text
)
returns interval
language plpgsql
immutable
set search_path = public
as $$
begin
  if coalesce(p_lead_value, 0) <= 0 then
    return interval '0 minutes';
  end if;

  if p_lead_unit = 'minutes' then
    return make_interval(mins => p_lead_value);
  end if;

  if p_lead_unit = 'hours' then
    return make_interval(hours => p_lead_value);
  end if;

  return make_interval(days => p_lead_value);
end;
$$;

create or replace function public.is_reminder_delivery_enabled(
  p_delivery_channel text,
  p_email_enabled boolean,
  p_sms_enabled boolean,
  p_whatsapp_enabled boolean,
  p_push_enabled boolean
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select case
    when p_delivery_channel = 'email' then coalesce(p_email_enabled, true)
    when p_delivery_channel = 'sms' then coalesce(p_sms_enabled, false)
    when p_delivery_channel = 'whatsapp' then coalesce(p_whatsapp_enabled, false)
    when p_delivery_channel = 'push' then coalesce(p_push_enabled, true)
    else true
  end;
$$;

create or replace function public.render_notification_template(
  p_template text,
  p_context jsonb default '{}'::jsonb
)
returns text
language plpgsql
stable
set search_path = public
as $$
declare
  rendered text := coalesce(p_template, '');
  item record;
begin
  for item in
    select key, value
    from jsonb_each_text(coalesce(p_context, '{}'::jsonb))
  loop
    rendered := regexp_replace(rendered, '{{\s*' || item.key || '\s*}}', coalesce(item.value, ''), 'g');
  end loop;

  return regexp_replace(rendered, '{{\s*[a-zA-Z0-9_]+\s*}}', '—', 'g');
end;
$$;

create or replace function public.notification_type_for_reminder(
  p_reminder_type text
)
returns text
language sql
immutable
set search_path = public
as $$
  select case p_reminder_type
    when 'billing_due' then 'billing'
    when 'class_booking' then 'class'
    when 'inactive_member' then 'workout'
    when 'membership_expiry' then 'warning'
    else 'info'
  end;
$$;

insert into public.notification_reminder_rules (
  rule_key,
  title,
  description,
  reminder_type,
  target_role,
  delivery_channel,
  action_label,
  action_path,
  title_template,
  message_template,
  lead_value,
  lead_unit,
  cooldown_hours,
  include_inactive,
  respect_preferences,
  enabled,
  metadata
)
values
  (
    'billing-due-3-days',
    'Billing due · 3 days before',
    'Remind members about unpaid invoices before access is interrupted.',
    'billing_due',
    'member',
    'in_app',
    'Open billing',
    '/billing',
    'Membership payment due soon',
    'Hi {{full_name}}, your {{plan_name}} invoice {{invoice_number}} is due on {{due_date}}. Balance due: {{currency_code}} {{balance_due}}. Open billing to keep your access active.',
    3,
    'days',
    24,
    false,
    true,
    true,
    '{}'::jsonb
  ),
  (
    'class-reminder-6-hours',
    'Class reminder · 6 hours before',
    'Give members time to confirm arrival details before class starts.',
    'class_booking',
    'member',
    'push',
    'View bookings',
    '/bookings',
    'Upcoming class reminder',
    'Hi {{full_name}}, your class {{session_title}} starts at {{starts_at}}. Coach: {{coach_name}}. Open bookings if you need to review your slot or arrive a few minutes early.',
    6,
    'hours',
    6,
    false,
    true,
    true,
    '{}'::jsonb
  ),
  (
    'inactive-member-7-days',
    'Inactive member nudge · 7 days',
    'Re-engage members who have been away from the gym for a week or more.',
    'inactive_member',
    'member',
    'in_app',
    'Open workout plan',
    '/workout-plan',
    'We miss you at Checkers Gym',
    'Hi {{full_name}}, it has been {{days_since_visit}} days since your last visit. Your next workout block is ready whenever you are. Open your plan to get back on track.',
    7,
    'days',
    72,
    false,
    true,
    true,
    '{}'::jsonb
  ),
  (
    'membership-expiry-5-days',
    'Membership expiry · 5 days before',
    'Warn active members before their membership end date arrives.',
    'membership_expiry',
    'member',
    'email',
    'Review membership',
    '/membership',
    'Membership ending soon',
    'Hi {{full_name}}, your membership ends on {{membership_end_date}}. Open your membership page to review your plan and renew before your access is interrupted.',
    5,
    'days',
    24,
    false,
    true,
    true,
    '{}'::jsonb
  )
on conflict (rule_key) do nothing;

create or replace function public.preview_notification_reminder_rule(
  p_rule_id uuid,
  p_limit integer default 80
)
returns table (
  recipient_user_id uuid,
  recipient_name text,
  recipient_email text,
  recipient_role text,
  reminder_type text,
  title text,
  message text,
  action_label text,
  action_path text,
  delivery_channel text,
  due_at timestamp with time zone,
  source_record_id uuid,
  source_label text,
  context jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_rule public.notification_reminder_rules;
  lead_interval interval;
  safe_limit integer;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  if p_rule_id is null then
    raise exception 'Reminder rule is required';
  end if;

  select * into saved_rule
  from public.notification_reminder_rules
  where id = p_rule_id;

  if saved_rule.id is null then
    raise exception 'Reminder rule not found';
  end if;

  lead_interval := public.build_notification_lead_interval(saved_rule.lead_value, saved_rule.lead_unit);
  safe_limit := least(greatest(coalesce(p_limit, 80), 1), 250);

  update public.notification_reminder_rules
  set
    last_previewed_at = timezone('utc', now()),
    updated_by = auth.uid()
  where id = saved_rule.id;

  if saved_rule.reminder_type = 'billing_due' then
    return query
    with candidate_rows as (
      select
        profiles.id as recipient_user_id,
        coalesce(profiles.full_name, profiles.email, 'Member') as recipient_name,
        profiles.email as recipient_email,
        profiles.role as recipient_role,
        saved_rule.reminder_type as reminder_type,
        saved_rule.action_label as action_label,
        saved_rule.action_path as action_path,
        saved_rule.delivery_channel as delivery_channel,
        invoices.due_date::timestamp with time zone as due_at,
        invoices.id as source_record_id,
        coalesce(invoices.invoice_number, 'Billing invoice') as source_label,
        jsonb_strip_nulls(jsonb_build_object(
          'full_name', coalesce(profiles.full_name, profiles.email, 'Member'),
          'email', profiles.email,
          'plan_name', coalesce(plans.name, 'Membership'),
          'invoice_number', invoices.invoice_number,
          'due_date', to_char(invoices.due_date, 'DD Mon YYYY'),
          'balance_due', trim(to_char(coalesce(invoices.balance_due, 0), 'FM999999990.00')),
          'currency_code', invoices.currency_code,
          'membership_status', profiles.membership_status,
          'source_label', coalesce(invoices.invoice_number, 'Billing invoice')
        )) as context
      from public.billing_invoices invoices
      join public.profiles profiles
        on profiles.id = invoices.member_id
      left join public.membership_plans plans
        on plans.id = coalesce(invoices.plan_id, profiles.plan_id)
      left join public.notification_preferences preferences
        on preferences.user_id = profiles.id
      where invoices.status in ('open', 'partial', 'overdue')
        and coalesce(invoices.balance_due, 0) > 0
        and invoices.due_date <= (timezone('utc', now()) + lead_interval)::date
        and (saved_rule.target_role = 'all' or profiles.role = saved_rule.target_role)
        and (
          saved_rule.include_inactive
          or (profiles.is_active = true and profiles.membership_status in ('trial', 'active'))
        )
        and (
          saved_rule.respect_preferences = false
          or (
            coalesce(preferences.billing_reminders_enabled, true) = true
            and public.is_reminder_delivery_enabled(
              saved_rule.delivery_channel,
              preferences.email_enabled,
              preferences.sms_enabled,
              preferences.whatsapp_enabled,
              preferences.push_enabled
            ) = true
          )
        )
      order by invoices.due_date asc, invoices.created_at desc
      limit safe_limit
    )
    select
      candidate_rows.recipient_user_id,
      candidate_rows.recipient_name,
      candidate_rows.recipient_email,
      candidate_rows.recipient_role,
      candidate_rows.reminder_type,
      public.render_notification_template(saved_rule.title_template, candidate_rows.context) as title,
      public.render_notification_template(saved_rule.message_template, candidate_rows.context) as message,
      candidate_rows.action_label,
      candidate_rows.action_path,
      candidate_rows.delivery_channel,
      candidate_rows.due_at,
      candidate_rows.source_record_id,
      candidate_rows.source_label,
      candidate_rows.context
    from candidate_rows;

    return;
  end if;

  if saved_rule.reminder_type = 'class_booking' then
    return query
    with candidate_rows as (
      select
        profiles.id as recipient_user_id,
        coalesce(profiles.full_name, profiles.email, 'Member') as recipient_name,
        profiles.email as recipient_email,
        profiles.role as recipient_role,
        saved_rule.reminder_type as reminder_type,
        saved_rule.action_label as action_label,
        saved_rule.action_path as action_path,
        saved_rule.delivery_channel as delivery_channel,
        sessions.starts_at as due_at,
        sessions.id as source_record_id,
        coalesce(sessions.title, 'Class booking') as source_label,
        jsonb_strip_nulls(jsonb_build_object(
          'full_name', coalesce(profiles.full_name, profiles.email, 'Member'),
          'email', profiles.email,
          'session_title', sessions.title,
          'starts_at', to_char(sessions.starts_at at time zone 'UTC', 'DD Mon YYYY HH24:MI "UTC"'),
          'branch_name', sessions.branch_name,
          'coach_name', coalesce(sessions.trainer_name, sessions.coach_name, 'Front desk'),
          'source_label', sessions.title
        )) as context
      from public.class_bookings bookings
      join public.class_sessions sessions
        on sessions.id = bookings.class_session_id
      join public.profiles profiles
        on profiles.id = bookings.user_id
      left join public.notification_preferences preferences
        on preferences.user_id = profiles.id
      where bookings.booking_status in ('booked', 'waitlist')
        and sessions.is_active = true
        and sessions.schedule_status = 'scheduled'
        and sessions.starts_at >= timezone('utc', now())
        and sessions.starts_at <= timezone('utc', now()) + lead_interval
        and (saved_rule.target_role = 'all' or profiles.role = saved_rule.target_role)
        and (
          saved_rule.include_inactive
          or (profiles.is_active = true and profiles.membership_status in ('trial', 'active'))
        )
        and (
          saved_rule.respect_preferences = false
          or (
            coalesce(preferences.class_reminders_enabled, true) = true
            and public.is_reminder_delivery_enabled(
              saved_rule.delivery_channel,
              preferences.email_enabled,
              preferences.sms_enabled,
              preferences.whatsapp_enabled,
              preferences.push_enabled
            ) = true
          )
        )
      order by sessions.starts_at asc, bookings.created_at desc
      limit safe_limit
    )
    select
      candidate_rows.recipient_user_id,
      candidate_rows.recipient_name,
      candidate_rows.recipient_email,
      candidate_rows.recipient_role,
      candidate_rows.reminder_type,
      public.render_notification_template(saved_rule.title_template, candidate_rows.context) as title,
      public.render_notification_template(saved_rule.message_template, candidate_rows.context) as message,
      candidate_rows.action_label,
      candidate_rows.action_path,
      candidate_rows.delivery_channel,
      candidate_rows.due_at,
      candidate_rows.source_record_id,
      candidate_rows.source_label,
      candidate_rows.context
    from candidate_rows;

    return;
  end if;

  if saved_rule.reminder_type = 'inactive_member' then
    return query
    with last_visits as (
      select
        visits.profile_id,
        max(visits.checked_in_at) as last_visit_at
      from public.attendance_visits visits
      group by visits.profile_id
    ),
    candidate_rows as (
      select
        profiles.id as recipient_user_id,
        coalesce(profiles.full_name, profiles.email, 'Member') as recipient_name,
        profiles.email as recipient_email,
        profiles.role as recipient_role,
        saved_rule.reminder_type as reminder_type,
        saved_rule.action_label as action_label,
        saved_rule.action_path as action_path,
        saved_rule.delivery_channel as delivery_channel,
        coalesce(last_visits.last_visit_at, profiles.created_at) as due_at,
        null::uuid as source_record_id,
        'Activity follow-up' as source_label,
        jsonb_strip_nulls(jsonb_build_object(
          'full_name', coalesce(profiles.full_name, profiles.email, 'Member'),
          'email', profiles.email,
          'plan_name', coalesce(plans.name, 'Membership'),
          'days_since_visit', greatest(floor(extract(epoch from (timezone('utc', now()) - coalesce(last_visits.last_visit_at, profiles.created_at))) / 86400), 0)::integer,
          'last_visit_at', case
            when last_visits.last_visit_at is null then 'No visits recorded yet'
            else to_char(last_visits.last_visit_at at time zone 'UTC', 'DD Mon YYYY HH24:MI "UTC"')
          end,
          'source_label', 'Activity follow-up'
        )) as context
      from public.profiles profiles
      left join public.membership_plans plans
        on plans.id = profiles.plan_id
      left join last_visits
        on last_visits.profile_id = profiles.id
      left join public.notification_preferences preferences
        on preferences.user_id = profiles.id
      where (saved_rule.target_role = 'all' or profiles.role = saved_rule.target_role)
        and (
          saved_rule.include_inactive
          or (profiles.is_active = true and profiles.membership_status in ('trial', 'active'))
        )
        and (
          last_visits.last_visit_at <= timezone('utc', now()) - lead_interval
          or (
            last_visits.last_visit_at is null
            and coalesce(profiles.member_since, profiles.membership_start_date, profiles.created_at::date) <= (timezone('utc', now()) - lead_interval)::date
          )
        )
        and (
          saved_rule.respect_preferences = false
          or (
            coalesce(preferences.workout_reminders_enabled, true) = true
            and public.is_reminder_delivery_enabled(
              saved_rule.delivery_channel,
              preferences.email_enabled,
              preferences.sms_enabled,
              preferences.whatsapp_enabled,
              preferences.push_enabled
            ) = true
          )
        )
      order by coalesce(last_visits.last_visit_at, profiles.created_at) asc
      limit safe_limit
    )
    select
      candidate_rows.recipient_user_id,
      candidate_rows.recipient_name,
      candidate_rows.recipient_email,
      candidate_rows.recipient_role,
      candidate_rows.reminder_type,
      public.render_notification_template(saved_rule.title_template, candidate_rows.context) as title,
      public.render_notification_template(saved_rule.message_template, candidate_rows.context) as message,
      candidate_rows.action_label,
      candidate_rows.action_path,
      candidate_rows.delivery_channel,
      candidate_rows.due_at,
      candidate_rows.source_record_id,
      candidate_rows.source_label,
      candidate_rows.context
    from candidate_rows;

    return;
  end if;

  if saved_rule.reminder_type = 'membership_expiry' then
    return query
    with candidate_rows as (
      select
        profiles.id as recipient_user_id,
        coalesce(profiles.full_name, profiles.email, 'Member') as recipient_name,
        profiles.email as recipient_email,
        profiles.role as recipient_role,
        saved_rule.reminder_type as reminder_type,
        saved_rule.action_label as action_label,
        saved_rule.action_path as action_path,
        saved_rule.delivery_channel as delivery_channel,
        profiles.membership_end_date::timestamp with time zone as due_at,
        profiles.id as source_record_id,
        'Membership expiry' as source_label,
        jsonb_strip_nulls(jsonb_build_object(
          'full_name', coalesce(profiles.full_name, profiles.email, 'Member'),
          'email', profiles.email,
          'plan_name', coalesce(plans.name, 'Membership'),
          'membership_end_date', to_char(profiles.membership_end_date, 'DD Mon YYYY'),
          'source_label', 'Membership expiry'
        )) as context
      from public.profiles profiles
      left join public.membership_plans plans
        on plans.id = profiles.plan_id
      left join public.notification_preferences preferences
        on preferences.user_id = profiles.id
      where profiles.membership_end_date is not null
        and profiles.membership_end_date between current_date and (timezone('utc', now()) + lead_interval)::date
        and (saved_rule.target_role = 'all' or profiles.role = saved_rule.target_role)
        and (
          saved_rule.include_inactive
          or (profiles.is_active = true and profiles.membership_status in ('trial', 'active'))
        )
        and (
          saved_rule.respect_preferences = false
          or (
            coalesce(preferences.billing_reminders_enabled, true) = true
            and public.is_reminder_delivery_enabled(
              saved_rule.delivery_channel,
              preferences.email_enabled,
              preferences.sms_enabled,
              preferences.whatsapp_enabled,
              preferences.push_enabled
            ) = true
          )
        )
      order by profiles.membership_end_date asc, profiles.updated_at desc
      limit safe_limit
    )
    select
      candidate_rows.recipient_user_id,
      candidate_rows.recipient_name,
      candidate_rows.recipient_email,
      candidate_rows.recipient_role,
      candidate_rows.reminder_type,
      public.render_notification_template(saved_rule.title_template, candidate_rows.context) as title,
      public.render_notification_template(saved_rule.message_template, candidate_rows.context) as message,
      candidate_rows.action_label,
      candidate_rows.action_path,
      candidate_rows.delivery_channel,
      candidate_rows.due_at,
      candidate_rows.source_record_id,
      candidate_rows.source_label,
      candidate_rows.context
    from candidate_rows;

    return;
  end if;
end;
$$;

revoke all on function public.preview_notification_reminder_rule(uuid, integer) from public;
grant execute on function public.preview_notification_reminder_rule(uuid, integer) to authenticated;

create or replace function public.run_notification_reminder_rule(
  p_rule_id uuid,
  p_limit integer default 120
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_rule public.notification_reminder_rules;
  inserted_count integer := 0;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  if p_rule_id is null then
    raise exception 'Reminder rule is required';
  end if;

  select * into saved_rule
  from public.notification_reminder_rules
  where id = p_rule_id;

  if saved_rule.id is null then
    raise exception 'Reminder rule not found';
  end if;

  if saved_rule.enabled = false then
    return 0;
  end if;

  insert into public.member_notifications (
    user_id,
    notification_type,
    title,
    message,
    action_label,
    action_path,
    delivery_channel,
    source_module,
    source_record_id,
    metadata,
    created_by
  )
  select
    preview_rows.recipient_user_id,
    public.notification_type_for_reminder(saved_rule.reminder_type),
    preview_rows.title,
    preview_rows.message,
    coalesce(preview_rows.action_label, saved_rule.action_label),
    coalesce(preview_rows.action_path, saved_rule.action_path),
    preview_rows.delivery_channel,
    'reminder_rule',
    preview_rows.source_record_id,
    jsonb_strip_nulls(jsonb_build_object(
      'rule_id', saved_rule.id,
      'rule_key', saved_rule.rule_key,
      'reminder_type', saved_rule.reminder_type,
      'due_at', preview_rows.due_at,
      'source_label', preview_rows.source_label,
      'context', preview_rows.context
    )),
    auth.uid()
  from public.preview_notification_reminder_rule(saved_rule.id, p_limit) preview_rows
  where not exists (
    select 1
    from public.member_notifications existing
    where existing.user_id = preview_rows.recipient_user_id
      and existing.source_module = 'reminder_rule'
      and existing.metadata ->> 'rule_id' = saved_rule.id::text
      and coalesce(existing.source_record_id::text, '') = coalesce(preview_rows.source_record_id::text, '')
      and existing.created_at >= timezone('utc', now()) - make_interval(hours => greatest(saved_rule.cooldown_hours, 0))
  );

  get diagnostics inserted_count = row_count;

  update public.notification_reminder_rules
  set
    last_run_at = timezone('utc', now()),
    updated_by = auth.uid()
  where id = saved_rule.id;

  return inserted_count;
end;
$$;

revoke all on function public.run_notification_reminder_rule(uuid, integer) from public;
grant execute on function public.run_notification_reminder_rule(uuid, integer) to authenticated;
