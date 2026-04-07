create table if not exists public.billing_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  preferred_payment_method text not null default 'upi' check (preferred_payment_method in ('cash', 'card', 'upi', 'bank_transfer', 'wallet', 'other')),
  autopay_enabled boolean not null default false,
  wallet_provider text,
  billing_email text,
  billing_phone text,
  tax_id text,
  billing_notes text,
  currency_code text not null default 'INR',
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.billing_invoices (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid references public.membership_plans(id) on delete set null,
  invoice_number text unique,
  invoice_type text not null default 'membership_renewal' check (invoice_type in ('membership_renewal', 'drop_in', 'class_pack', 'pt_package', 'retail', 'adjustment', 'manual')),
  status text not null default 'open' check (status in ('draft', 'open', 'paid', 'partial', 'overdue', 'void', 'refunded')),
  issue_date date not null default current_date,
  due_date date not null default current_date,
  billing_period_start date,
  billing_period_end date,
  currency_code text not null default 'INR',
  subtotal_amount numeric(10, 2) not null default 0 check (subtotal_amount >= 0),
  tax_amount numeric(10, 2) not null default 0,
  discount_amount numeric(10, 2) not null default 0,
  total_amount numeric(10, 2) not null default 0 check (total_amount >= 0),
  amount_paid numeric(10, 2) not null default 0 check (amount_paid >= 0),
  balance_due numeric(10, 2) not null default 0,
  notes text,
  created_by uuid references auth.users on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.billing_invoice_items (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.billing_invoices(id) on delete cascade,
  line_index integer not null default 1 check (line_index >= 1),
  item_type text not null default 'membership' check (item_type in ('membership', 'session', 'product', 'discount', 'fee', 'adjustment', 'other')),
  description text not null,
  quantity numeric(10, 2) not null default 1 check (quantity > 0),
  unit_price numeric(10, 2) not null default 0,
  line_total numeric(10, 2) not null default 0,
  linked_plan_name text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.billing_payments (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.billing_invoices(id) on delete cascade,
  member_id uuid not null references public.profiles(id) on delete cascade,
  payment_date date not null default current_date,
  payment_method text not null default 'upi' check (payment_method in ('cash', 'card', 'upi', 'bank_transfer', 'wallet', 'other')),
  payment_status text not null default 'completed' check (payment_status in ('pending', 'completed', 'failed', 'refunded', 'cancelled')),
  amount numeric(10, 2) not null check (amount > 0),
  reference_code text,
  processor_name text,
  notes text,
  recorded_by uuid references auth.users on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists billing_invoices_member_id_idx
  on public.billing_invoices (member_id, due_date desc, created_at desc);

create index if not exists billing_invoices_status_idx
  on public.billing_invoices (status, due_date desc, created_at desc);

create index if not exists billing_invoice_items_invoice_id_idx
  on public.billing_invoice_items (invoice_id, line_index);

create index if not exists billing_payments_invoice_id_idx
  on public.billing_payments (invoice_id, payment_date desc, created_at desc);

create index if not exists billing_payments_member_id_idx
  on public.billing_payments (member_id, payment_date desc, created_at desc);

insert into public.billing_profiles (user_id, billing_email, billing_phone)
select p.id, p.email, p.phone
from public.profiles p
on conflict (user_id) do update
set
  billing_email = coalesce(public.billing_profiles.billing_email, excluded.billing_email),
  billing_phone = coalesce(public.billing_profiles.billing_phone, excluded.billing_phone);

create or replace function public.generate_invoice_number()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'INV-' || to_char(current_date, 'YYYYMMDD') || '-' || upper(substr(gen_random_uuid()::text, 1, 6));
    exit when not exists (
      select 1
      from public.billing_invoices
      where invoice_number = candidate
    );
  end loop;

  return candidate;
end;
$$;

create or replace function public.set_billing_invoice_number()
returns trigger
language plpgsql
as $$
begin
  if new.invoice_number is null or length(trim(new.invoice_number)) = 0 then
    new.invoice_number := public.generate_invoice_number();
  end if;

  return new;
end;
$$;

create or replace function public.set_billing_invoice_item_total()
returns trigger
language plpgsql
as $$
begin
  new.line_total := round(coalesce(new.quantity, 0) * coalesce(new.unit_price, 0), 2);
  return new;
end;
$$;

create or replace function public.recalculate_billing_invoice_totals(p_invoice_id uuid)
returns public.billing_invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  current_invoice public.billing_invoices;
  item_subtotal numeric(10, 2) := 0;
  payment_net_total numeric(10, 2) := 0;
  next_total numeric(10, 2) := 0;
  next_balance numeric(10, 2) := 0;
  next_status text;
  updated_invoice public.billing_invoices;
begin
  select *
  into current_invoice
  from public.billing_invoices
  where id = p_invoice_id
  for update;

  if not found then
    return null;
  end if;

  select coalesce(sum(line_total), 0)
  into item_subtotal
  from public.billing_invoice_items
  where invoice_id = p_invoice_id;

  select coalesce(sum(
    case
      when payment_status = 'completed' then amount
      when payment_status = 'refunded' then amount * -1
      else 0
    end
  ), 0)
  into payment_net_total
  from public.billing_payments
  where invoice_id = p_invoice_id;

  next_total := greatest(0, round(item_subtotal + coalesce(current_invoice.tax_amount, 0) - coalesce(current_invoice.discount_amount, 0), 2));
  payment_net_total := greatest(0, round(payment_net_total, 2));
  next_balance := greatest(0, round(next_total - payment_net_total, 2));

  next_status := case
    when current_invoice.status = 'void' then 'void'
    when current_invoice.status = 'refunded' then 'refunded'
    when current_invoice.status = 'draft' and payment_net_total = 0 then 'draft'
    when next_total > 0 and next_balance = 0 and payment_net_total > 0 then 'paid'
    when payment_net_total > 0 and next_balance > 0 then 'partial'
    when coalesce(current_invoice.due_date, current_date) < current_date and next_balance > 0 then 'overdue'
    else 'open'
  end;

  update public.billing_invoices
  set
    subtotal_amount = item_subtotal,
    total_amount = next_total,
    amount_paid = payment_net_total,
    balance_due = next_balance,
    status = next_status,
    updated_at = timezone('utc', now())
  where id = p_invoice_id
  returning *
  into updated_invoice;

  return updated_invoice;
end;
$$;

create or replace function public.handle_billing_invoice_recalc()
returns trigger
language plpgsql
as $$
begin
  perform public.recalculate_billing_invoice_totals(coalesce(new.invoice_id, old.invoice_id));
  return coalesce(new, old);
end;
$$;

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
      next_period_end := next_period_start + greatest(coalesce(plan_row.duration_weeks, 4) * 7 - 1, 6);
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
  existing_invoice_id uuid;
  created_invoice public.billing_invoices;
  due_start date;
  due_end date;
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
    due_end := due_start + greatest(coalesce(plan_row.duration_weeks, 4) * 7 - 1, 6);

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
      coalesce(billing_profile_row.currency_code, 'INR'),
      'Auto-generated renewal invoice.',
      auth.uid()
    )
    returning *
    into created_invoice;

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
      1,
      'membership',
      coalesce(plan_row.name, 'Membership renewal'),
      1,
      coalesce(plan_row.price, 0),
      coalesce(plan_row.price, 0),
      plan_row.name
    );

    select *
    into created_invoice
    from public.recalculate_billing_invoice_totals(created_invoice.id);

    return next created_invoice;
  end loop;

  return;
end;
$$;

drop trigger if exists set_billing_profiles_updated_at on public.billing_profiles;
create trigger set_billing_profiles_updated_at
before update on public.billing_profiles
for each row execute function public.set_updated_at();

drop trigger if exists set_billing_invoices_updated_at on public.billing_invoices;
create trigger set_billing_invoices_updated_at
before update on public.billing_invoices
for each row execute function public.set_updated_at();

drop trigger if exists set_billing_invoice_items_updated_at on public.billing_invoice_items;
create trigger set_billing_invoice_items_updated_at
before update on public.billing_invoice_items
for each row execute function public.set_updated_at();

drop trigger if exists set_billing_payments_updated_at on public.billing_payments;
create trigger set_billing_payments_updated_at
before update on public.billing_payments
for each row execute function public.set_updated_at();

drop trigger if exists billing_invoices_set_invoice_number on public.billing_invoices;
create trigger billing_invoices_set_invoice_number
before insert on public.billing_invoices
for each row execute function public.set_billing_invoice_number();

drop trigger if exists billing_invoice_items_set_line_total on public.billing_invoice_items;
create trigger billing_invoice_items_set_line_total
before insert or update on public.billing_invoice_items
for each row execute function public.set_billing_invoice_item_total();

drop trigger if exists billing_invoice_items_recalculate_invoice on public.billing_invoice_items;
create trigger billing_invoice_items_recalculate_invoice
after insert or update or delete on public.billing_invoice_items
for each row execute function public.handle_billing_invoice_recalc();

drop trigger if exists billing_payments_recalculate_invoice on public.billing_payments;
create trigger billing_payments_recalculate_invoice
after insert or update or delete on public.billing_payments
for each row execute function public.handle_billing_invoice_recalc();

alter table public.billing_profiles enable row level security;
alter table public.billing_invoices enable row level security;
alter table public.billing_invoice_items enable row level security;
alter table public.billing_payments enable row level security;

drop policy if exists "Users can read own billing profile" on public.billing_profiles;
create policy "Users can read own billing profile"
on public.billing_profiles
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "Users can upsert own billing profile" on public.billing_profiles;
create policy "Users can upsert own billing profile"
on public.billing_profiles
for insert
to authenticated
with check (user_id = auth.uid() or public.is_staff());

drop policy if exists "Users can update own billing profile" on public.billing_profiles;
create policy "Users can update own billing profile"
on public.billing_profiles
for update
to authenticated
using (user_id = auth.uid() or public.is_staff())
with check (user_id = auth.uid() or public.is_staff());

drop policy if exists "Staff can delete billing profiles" on public.billing_profiles;
create policy "Staff can delete billing profiles"
on public.billing_profiles
for delete
to authenticated
using (public.is_staff());

drop policy if exists "Users can read own invoices" on public.billing_invoices;
create policy "Users can read own invoices"
on public.billing_invoices
for select
to authenticated
using (member_id = auth.uid() or public.is_staff());

drop policy if exists "Staff can manage invoices" on public.billing_invoices;
create policy "Staff can manage invoices"
on public.billing_invoices
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Users can read own invoice items" on public.billing_invoice_items;
create policy "Users can read own invoice items"
on public.billing_invoice_items
for select
to authenticated
using (
  public.is_staff()
  or exists (
    select 1
    from public.billing_invoices invoice
    where invoice.id = billing_invoice_items.invoice_id
      and invoice.member_id = auth.uid()
  )
);

drop policy if exists "Staff can manage invoice items" on public.billing_invoice_items;
create policy "Staff can manage invoice items"
on public.billing_invoice_items
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Users can read own billing payments" on public.billing_payments;
create policy "Users can read own billing payments"
on public.billing_payments
for select
to authenticated
using (member_id = auth.uid() or public.is_staff());

drop policy if exists "Staff can manage billing payments" on public.billing_payments;
create policy "Staff can manage billing payments"
on public.billing_payments
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());
