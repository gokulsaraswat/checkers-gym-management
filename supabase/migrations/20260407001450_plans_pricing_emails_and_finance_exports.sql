alter table public.membership_plans
  add column if not exists plan_code text,
  add column if not exists duration_months integer,
  add column if not exists currency_code text not null default 'INR',
  add column if not exists display_order integer not null default 0;

update public.membership_plans
set
  plan_code = coalesce(nullif(btrim(plan_code), ''), lower(regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g'))),
  duration_months = coalesce(duration_months, case billing_cycle
    when 'year' then 12
    when 'quarter' then 3
    when 'month' then greatest(round(duration_weeks / 4.0), 1)::integer
    else 1
  end),
  currency_code = coalesce(nullif(btrim(currency_code), ''), 'INR'),
  display_order = coalesce(display_order, 0);

alter table public.membership_plans
  alter column plan_code set not null;

drop index if exists public.membership_plans_plan_code_uidx;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.membership_plans'::regclass
      and conname = 'membership_plans_plan_code_key'
  ) then
    alter table public.membership_plans
      add constraint membership_plans_plan_code_key unique (plan_code);
  end if;
end;
$$;

create table if not exists public.membership_add_ons (
  id uuid primary key default gen_random_uuid(),
  add_on_code text not null unique,
  name text not null unique,
  description text,
  category text not null default 'general' check (category in ('personal_training', 'mma', 'boxing', 'yoga', 'general')),
  price numeric(10, 2) not null default 0 check (price >= 0),
  billing_frequency text not null default 'recurring' check (billing_frequency in ('one_time', 'recurring')),
  currency_code text not null default 'INR',
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.member_add_on_subscriptions (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  add_on_id uuid not null references public.membership_add_ons(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled', 'expired')),
  start_date date not null default current_date,
  end_date date,
  next_billing_date date,
  price_override numeric(10, 2),
  notes text,
  assigned_by uuid references auth.users on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create unique index if not exists member_add_on_subscriptions_active_uidx
  on public.member_add_on_subscriptions (member_id, add_on_id)
  where status = 'active';

create index if not exists member_add_on_subscriptions_member_idx
  on public.member_add_on_subscriptions (member_id, status, next_billing_date);

create index if not exists member_add_on_subscriptions_add_on_idx
  on public.member_add_on_subscriptions (add_on_id, status, next_billing_date);

create table if not exists public.operating_expenses (
  id uuid primary key default gen_random_uuid(),
  expense_date date not null default current_date,
  expense_category text not null default 'misc' check (expense_category in ('staff_salary', 'staff_commission', 'maintenance', 'rent', 'utilities', 'software', 'marketing', 'equipment', 'cleaning', 'misc')),
  description text not null,
  vendor_name text,
  amount numeric(10, 2) not null check (amount > 0),
  currency_code text not null default 'INR',
  payment_method text not null default 'upi' check (payment_method in ('cash', 'card', 'upi', 'bank_transfer', 'wallet', 'other')),
  branch_name text,
  notes text,
  recorded_by uuid references auth.users on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists operating_expenses_date_idx
  on public.operating_expenses (expense_date desc, created_at desc);

create index if not exists operating_expenses_category_idx
  on public.operating_expenses (expense_category, expense_date desc);

create table if not exists public.billing_email_log (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.billing_invoices(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  recipient_email text not null,
  trigger_source text not null default 'manual' check (trigger_source in ('manual', 'new_plan', 'renewal', 'resend', 'system')),
  delivery_status text not null default 'queued' check (delivery_status in ('queued', 'sent', 'failed', 'skipped')),
  provider_name text not null default 'resend',
  provider_message_id text,
  subject text,
  error_message text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists billing_email_log_invoice_idx
  on public.billing_email_log (invoice_id, created_at desc);

create index if not exists billing_email_log_member_idx
  on public.billing_email_log (member_id, created_at desc);

alter table public.billing_invoice_items
  add column if not exists linked_add_on_id uuid references public.membership_add_ons(id) on delete set null;

create index if not exists billing_invoice_items_linked_add_on_idx
  on public.billing_invoice_items (linked_add_on_id)
  where linked_add_on_id is not null;

create or replace function public.calculate_membership_period_end(
  p_start_date date,
  p_duration_months integer default null,
  p_duration_weeks integer default null
)
returns date
language plpgsql
immutable
as $$
declare
  resolved_end_date date;
begin
  if p_start_date is null then
    return null;
  end if;

  if coalesce(p_duration_months, 0) > 0 then
    resolved_end_date := ((p_start_date + make_interval(months => p_duration_months))::date - 1);
  else
    resolved_end_date := p_start_date + greatest(coalesce(p_duration_weeks, 4) * 7 - 1, 6);
  end if;

  return resolved_end_date;
end;
$$;

insert into public.membership_plans (
  name,
  plan_code,
  description,
  price,
  billing_cycle,
  duration_weeks,
  duration_months,
  currency_code,
  display_order,
  is_active
)
values
  ('1 Month Membership', 'membership_1m', 'Standard 1 month gym membership.', 2000, 'month', 4, 1, 'INR', 10, true),
  ('3 Month Membership', 'membership_3m', 'Quarterly gym membership.', 6000, 'quarter', 12, 3, 'INR', 20, true),
  ('6 Month Membership', 'membership_6m', 'Half-year gym membership.', 10000, 'quarter', 24, 6, 'INR', 30, true),
  ('1 Year Membership', 'membership_12m', 'Annual gym membership.', 15000, 'year', 52, 12, 'INR', 40, true)
on conflict (plan_code) do update
set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  billing_cycle = excluded.billing_cycle,
  duration_weeks = excluded.duration_weeks,
  duration_months = excluded.duration_months,
  currency_code = excluded.currency_code,
  display_order = excluded.display_order,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

insert into public.membership_add_ons (
  add_on_code,
  name,
  description,
  category,
  price,
  billing_frequency,
  currency_code,
  sort_order,
  is_active
)
values
  ('personal_training', 'Personal Training', 'Personal training package add-on.', 'personal_training', 10000, 'recurring', 'INR', 10, true),
  ('mma', 'MMA', 'Mixed martial arts specialty add-on.', 'mma', 8000, 'recurring', 'INR', 20, true),
  ('boxing', 'Boxing', 'Boxing specialty add-on.', 'boxing', 8000, 'recurring', 'INR', 30, true),
  ('yoga', 'Yoga', 'Yoga add-on for mind-body programming.', 'yoga', 6000, 'recurring', 'INR', 40, true)
on conflict (add_on_code) do update
set
  name = excluded.name,
  description = excluded.description,
  category = excluded.category,
  price = excluded.price,
  billing_frequency = excluded.billing_frequency,
  currency_code = excluded.currency_code,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active,
  updated_at = timezone('utc', now());

create or replace function public.issue_membership_bundle_invoice(
  p_member_id uuid,
  p_plan_id uuid,
  p_start_date date default current_date,
  p_add_on_ids uuid[] default array[]::uuid[],
  p_discount_amount numeric default 0,
  p_due_date date default current_date,
  p_notes text default null
)
returns public.billing_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  member_row public.profiles;
  billing_profile_row public.billing_profiles;
  plan_row public.membership_plans;
  selected_add_on public.membership_add_ons;
  created_invoice public.billing_invoices;
  previous_status text;
  previous_plan_id uuid;
  period_start date;
  period_end date;
  next_billing_date date;
  line_index integer := 1;
  sanitized_add_on_ids uuid[] := coalesce(p_add_on_ids, array[]::uuid[]);
begin
  if auth.uid() is null or not public.is_staff(auth.uid()) then
    raise exception 'Only staff can issue membership bundle invoices.';
  end if;

  if p_member_id is null or p_plan_id is null then
    raise exception 'Member and plan are required.';
  end if;

  select *
  into member_row
  from public.profiles
  where id = p_member_id
  for update;

  if not found then
    raise exception 'Member not found.';
  end if;

  select *
  into plan_row
  from public.membership_plans
  where id = p_plan_id
    and is_active = true;

  if not found then
    raise exception 'Membership plan not found or inactive.';
  end if;

  select *
  into billing_profile_row
  from public.billing_profiles
  where user_id = p_member_id;

  period_start := coalesce(p_start_date, current_date);
  period_end := public.calculate_membership_period_end(period_start, plan_row.duration_months, plan_row.duration_weeks);
  next_billing_date := period_end + 1;
  previous_status := member_row.membership_status;
  previous_plan_id := member_row.plan_id;

  insert into public.billing_invoices (
    member_id,
    plan_id,
    invoice_type,
    status,
    issue_date,
    due_date,
    billing_period_start,
    billing_period_end,
    currency_code,
    notes,
    created_by,
    discount_amount
  ) values (
    p_member_id,
    p_plan_id,
    'membership_renewal',
    'open',
    current_date,
    coalesce(p_due_date, current_date),
    period_start,
    period_end,
    coalesce(billing_profile_row.currency_code, plan_row.currency_code, 'INR'),
    coalesce(nullif(btrim(coalesce(p_notes, '')), ''), 'Issued from the pricing catalog.'),
    auth.uid(),
    greatest(coalesce(p_discount_amount, 0), 0)
  )
  returning * into created_invoice;

  insert into public.billing_invoice_items (
    invoice_id,
    line_index,
    item_type,
    description,
    quantity,
    unit_price,
    line_total,
    linked_plan_name
  ) values (
    created_invoice.id,
    line_index,
    'membership',
    coalesce(plan_row.name, 'Membership plan'),
    1,
    coalesce(plan_row.price, 0),
    coalesce(plan_row.price, 0),
    plan_row.name
  );

  line_index := line_index + 1;

  for selected_add_on in
    select *
    from public.membership_add_ons
    where is_active = true
      and id = any(sanitized_add_on_ids)
    order by sort_order asc, name asc
  loop
    insert into public.billing_invoice_items (
      invoice_id,
      line_index,
      item_type,
      description,
      quantity,
      unit_price,
      line_total,
      linked_plan_name,
      linked_add_on_id
    ) values (
      created_invoice.id,
      line_index,
      'fee',
      selected_add_on.name,
      1,
      coalesce(selected_add_on.price, 0),
      coalesce(selected_add_on.price, 0),
      plan_row.name,
      selected_add_on.id
    );

    insert into public.member_add_on_subscriptions (
      member_id,
      add_on_id,
      status,
      start_date,
      end_date,
      next_billing_date,
      price_override,
      notes,
      assigned_by
    ) values (
      p_member_id,
      selected_add_on.id,
      'active',
      period_start,
      period_end,
      next_billing_date,
      selected_add_on.price,
      'Bundled with membership renewal invoice.',
      auth.uid()
    )
    on conflict (member_id, add_on_id) where (status = 'active') do update
    set
      start_date = excluded.start_date,
      end_date = excluded.end_date,
      next_billing_date = excluded.next_billing_date,
      price_override = excluded.price_override,
      notes = excluded.notes,
      assigned_by = excluded.assigned_by,
      updated_at = timezone('utc', now());

    line_index := line_index + 1;
  end loop;

  update public.member_add_on_subscriptions
  set
    status = 'cancelled',
    end_date = least(coalesce(end_date, period_end), period_end),
    next_billing_date = null,
    updated_at = timezone('utc', now())
  where member_id = p_member_id
    and status = 'active'
    and add_on_id <> all(sanitized_add_on_ids);

  update public.profiles
  set
    plan_id = p_plan_id,
    membership_status = 'active',
    membership_start_date = period_start,
    membership_end_date = period_end,
    next_billing_date = next_billing_date,
    is_active = true
  where id = p_member_id;

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
  ) values (
    p_member_id,
    previous_status,
    'active',
    auth.uid(),
    'admin_panel',
    'Issued from the pricing catalog',
    period_start,
    coalesce(p_plan_id, previous_plan_id),
    period_start,
    period_end,
    next_billing_date
  );

  select *
  into created_invoice
  from public.recalculate_billing_invoice_totals(created_invoice.id);

  return created_invoice;
end;
$$;

revoke all on function public.issue_membership_bundle_invoice(uuid, uuid, date, uuid[], numeric, date, text) from public;
grant execute on function public.issue_membership_bundle_invoice(uuid, uuid, date, uuid[], numeric, date, text) to authenticated;

create or replace function public.record_billing_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_payment_method text default 'upi',
  p_payment_status text default 'completed',
  p_payment_date date default current_date,
  p_reference_code text default null,
  p_processor_name text default null,
  p_notes text default null
)
returns public.billing_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  invoice_row public.billing_invoices;
  plan_row public.membership_plans;
  updated_invoice public.billing_invoices;
  next_period_start date;
  next_period_end date;
begin
  if auth.uid() is null or not public.is_staff(auth.uid()) then
    raise exception 'Only staff can record billing payments.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Payment amount must be greater than 0.';
  end if;

  select *
  into invoice_row
  from public.billing_invoices
  where id = p_invoice_id;

  if not found then
    raise exception 'Invoice not found.';
  end if;

  insert into public.billing_payments (
    invoice_id,
    member_id,
    payment_date,
    payment_method,
    payment_status,
    amount,
    reference_code,
    processor_name,
    notes,
    recorded_by
  ) values (
    invoice_row.id,
    invoice_row.member_id,
    coalesce(p_payment_date, current_date),
    coalesce(p_payment_method, 'upi'),
    coalesce(p_payment_status, 'completed'),
    p_amount,
    p_reference_code,
    p_processor_name,
    p_notes,
    auth.uid()
  );

  select *
  into updated_invoice
  from public.recalculate_billing_invoice_totals(invoice_row.id);

  if coalesce(p_payment_status, 'completed') = 'completed'
    and updated_invoice.invoice_type = 'membership_renewal'
    and updated_invoice.balance_due <= 0 then
    select *
    into plan_row
    from public.membership_plans
    where id = coalesce(updated_invoice.plan_id, (select plan_id from public.profiles where id = updated_invoice.member_id));

    next_period_start := coalesce(updated_invoice.billing_period_start, current_date);

    if updated_invoice.billing_period_end is not null then
      next_period_end := updated_invoice.billing_period_end;
    elsif plan_row.id is not null then
      next_period_end := public.calculate_membership_period_end(next_period_start, plan_row.duration_months, plan_row.duration_weeks);
    else
      next_period_end := next_period_start + 27;
    end if;

    update public.profiles
    set
      membership_status = 'active',
      membership_start_date = coalesce(membership_start_date, next_period_start),
      membership_end_date = greatest(coalesce(membership_end_date, next_period_end), next_period_end),
      next_billing_date = next_period_end + 1,
      is_active = true
    where id = updated_invoice.member_id;

    update public.member_add_on_subscriptions as subscriptions
    set
      status = 'active',
      start_date = least(coalesce(subscriptions.start_date, next_period_start), next_period_start),
      end_date = greatest(coalesce(subscriptions.end_date, next_period_end), next_period_end),
      next_billing_date = next_period_end + 1,
      updated_at = timezone('utc', now())
    where subscriptions.member_id = updated_invoice.member_id
      and exists (
        select 1
        from public.billing_invoice_items items
        where items.invoice_id = updated_invoice.id
          and items.linked_add_on_id = subscriptions.add_on_id
      );
  end if;

  return updated_invoice;
end;
$$;

create or replace function public.generate_due_membership_invoices(
  p_due_date date default current_date,
  p_member_id uuid default null
)
returns setof public.billing_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  member_row public.profiles;
  plan_row public.membership_plans;
  billing_profile_row public.billing_profiles;
  add_on_row public.member_add_on_subscriptions;
  add_on_meta public.membership_add_ons;
  existing_invoice_id uuid;
  created_invoice public.billing_invoices;
  due_start date;
  due_end date;
  line_index integer;
begin
  if auth.uid() is null or not public.is_staff(auth.uid()) then
    raise exception 'Only staff can generate renewal invoices.';
  end if;

  for member_row in
    select *
    from public.profiles
    where role = 'member'
      and plan_id is not null
      and membership_status in ('trial', 'active', 'expired')
      and (p_member_id is null or id = p_member_id)
      and coalesce(next_billing_date, current_date) <= coalesce(p_due_date, current_date)
  loop
    select *
    into plan_row
    from public.membership_plans
    where id = member_row.plan_id
      and is_active = true;

    if not found then
      continue;
    end if;

    select id
    into existing_invoice_id
    from public.billing_invoices
    where member_id = member_row.id
      and invoice_type = 'membership_renewal'
      and status in ('draft', 'open', 'partial', 'overdue')
    order by created_at desc
    limit 1;

    if existing_invoice_id is not null then
      continue;
    end if;

    select *
    into billing_profile_row
    from public.billing_profiles
    where user_id = member_row.id;

    due_start := coalesce(member_row.next_billing_date, current_date);
    due_end := public.calculate_membership_period_end(due_start, plan_row.duration_months, plan_row.duration_weeks);

    insert into public.billing_invoices (
      member_id,
      plan_id,
      invoice_type,
      status,
      issue_date,
      due_date,
      billing_period_start,
      billing_period_end,
      currency_code,
      notes,
      created_by
    ) values (
      member_row.id,
      plan_row.id,
      'membership_renewal',
      'open',
      current_date,
      due_start,
      due_start,
      due_end,
      coalesce(billing_profile_row.currency_code, plan_row.currency_code, 'INR'),
      'Auto-generated renewal invoice.',
      auth.uid()
    )
    returning * into created_invoice;

    line_index := 1;

    insert into public.billing_invoice_items (
      invoice_id,
      line_index,
      item_type,
      description,
      quantity,
      unit_price,
      line_total,
      linked_plan_name
    ) values (
      created_invoice.id,
      line_index,
      'membership',
      coalesce(plan_row.name, 'Membership renewal'),
      1,
      coalesce(plan_row.price, 0),
      coalesce(plan_row.price, 0),
      plan_row.name
    );

    line_index := line_index + 1;

    for add_on_row in
      select *
      from public.member_add_on_subscriptions
      where member_id = member_row.id
        and status = 'active'
        and (next_billing_date is null or next_billing_date <= due_start)
        and (end_date is null or end_date >= due_start)
      order by created_at asc
    loop
      select *
      into add_on_meta
      from public.membership_add_ons
      where id = add_on_row.add_on_id
        and is_active = true;

      if add_on_meta.id is null then
        continue;
      end if;

      insert into public.billing_invoice_items (
        invoice_id,
        line_index,
        item_type,
        description,
        quantity,
        unit_price,
        line_total,
        linked_plan_name,
        linked_add_on_id
      ) values (
        created_invoice.id,
        line_index,
        'fee',
        add_on_meta.name,
        1,
        coalesce(add_on_row.price_override, add_on_meta.price, 0),
        coalesce(add_on_row.price_override, add_on_meta.price, 0),
        plan_row.name,
        add_on_meta.id
      );

      line_index := line_index + 1;
    end loop;

    select *
    into created_invoice
    from public.recalculate_billing_invoice_totals(created_invoice.id);

    return next created_invoice;
  end loop;

  return;
end;
$$;

drop trigger if exists set_membership_add_ons_updated_at on public.membership_add_ons;
create trigger set_membership_add_ons_updated_at
before update on public.membership_add_ons
for each row execute function public.set_updated_at();

drop trigger if exists set_member_add_on_subscriptions_updated_at on public.member_add_on_subscriptions;
create trigger set_member_add_on_subscriptions_updated_at
before update on public.member_add_on_subscriptions
for each row execute function public.set_updated_at();

drop trigger if exists set_operating_expenses_updated_at on public.operating_expenses;
create trigger set_operating_expenses_updated_at
before update on public.operating_expenses
for each row execute function public.set_updated_at();

drop trigger if exists set_billing_email_log_updated_at on public.billing_email_log;
create trigger set_billing_email_log_updated_at
before update on public.billing_email_log
for each row execute function public.set_updated_at();

alter table public.membership_add_ons enable row level security;
alter table public.member_add_on_subscriptions enable row level security;
alter table public.operating_expenses enable row level security;
alter table public.billing_email_log enable row level security;

drop policy if exists "Authenticated users can read active add-ons" on public.membership_add_ons;
create policy "Authenticated users can read active add-ons"
on public.membership_add_ons
for select
to authenticated
using (is_active = true or public.is_staff());

drop policy if exists "Staff can manage membership add-ons" on public.membership_add_ons;
create policy "Staff can manage membership add-ons"
on public.membership_add_ons
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Members can read own add-on subscriptions" on public.member_add_on_subscriptions;
create policy "Members can read own add-on subscriptions"
on public.member_add_on_subscriptions
for select
to authenticated
using (member_id = auth.uid() or public.is_staff());

drop policy if exists "Staff can manage add-on subscriptions" on public.member_add_on_subscriptions;
create policy "Staff can manage add-on subscriptions"
on public.member_add_on_subscriptions
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Staff can read operating expenses" on public.operating_expenses;
create policy "Staff can read operating expenses"
on public.operating_expenses
for select
to authenticated
using (public.is_staff());

drop policy if exists "Staff can manage operating expenses" on public.operating_expenses;
create policy "Staff can manage operating expenses"
on public.operating_expenses
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Users can read billing email logs" on public.billing_email_log;
create policy "Users can read billing email logs"
on public.billing_email_log
for select
to authenticated
using (member_id = auth.uid() or public.is_staff());
