-- Patch 26: Full Payment Automation
-- Adds renewal settings, payment retry jobs, refund requests, and admin RPCs.

create extension if not exists pgcrypto;

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.member_payment_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  auto_renew_enabled boolean not null default false,
  preferred_collection_channel text not null default 'payment_link',
  mandate_reference text,
  saved_method_metadata jsonb not null default '{}'::jsonb,
  last_opt_in_at timestamp with time zone,
  last_opt_out_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint member_payment_preferences_channel_check
    check (preferred_collection_channel in ('payment_link', 'manual', 'saved_method', 'bank_transfer')),
  constraint member_payment_preferences_user_unique unique (user_id)
);

create table if not exists public.membership_renewal_queue (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references public.member_memberships(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  invoice_id uuid references public.billing_invoices(id) on delete set null,
  renewal_amount numeric(12, 2) not null default 0,
  queue_status text not null default 'pending',
  renewal_reason text not null default 'scheduled',
  scheduled_for timestamp with time zone not null default timezone('utc', now()),
  processed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint membership_renewal_queue_status_check
    check (queue_status in ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'manual_review'))
);

create table if not exists public.payment_retry_jobs (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.billing_invoices(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  payment_link_id uuid references public.invoice_payment_links(id) on delete set null,
  retry_status text not null default 'pending',
  dunning_stage text not null default 'stage_1',
  attempt_number integer not null default 1,
  max_attempts integer not null default 3,
  next_retry_at timestamp with time zone not null default timezone('utc', now()),
  last_attempt_at timestamp with time zone,
  last_error text,
  amount_due numeric(12, 2) not null default 0,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint payment_retry_jobs_status_check
    check (retry_status in ('pending', 'processing', 'succeeded', 'failed', 'cancelled', 'manual_review')),
  constraint payment_retry_jobs_dunning_stage_check
    check (dunning_stage in ('stage_1', 'stage_2', 'stage_3', 'final_notice'))
);

create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.billing_invoices(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  requested_amount numeric(12, 2),
  request_reason text,
  request_status text not null default 'requested',
  admin_note text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint refund_requests_status_check
    check (request_status in ('requested', 'under_review', 'approved', 'rejected', 'processed', 'cancelled'))
);

create table if not exists public.refund_transactions (
  id uuid primary key default gen_random_uuid(),
  refund_request_id uuid references public.refund_requests(id) on delete set null,
  invoice_id uuid not null references public.billing_invoices(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  refund_status text not null default 'initiated',
  refund_amount numeric(12, 2) not null default 0,
  gateway_name text not null default 'manual',
  external_refund_id text,
  processed_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint refund_transactions_status_check
    check (refund_status in ('initiated', 'processing', 'succeeded', 'failed', 'cancelled'))
);

create index if not exists membership_renewal_queue_status_idx
  on public.membership_renewal_queue (queue_status, scheduled_for);
create index if not exists payment_retry_jobs_status_idx
  on public.payment_retry_jobs (retry_status, next_retry_at);
create index if not exists refund_requests_status_idx
  on public.refund_requests (request_status, created_at desc);

drop trigger if exists trg_member_payment_preferences_updated_at on public.member_payment_preferences;
create trigger trg_member_payment_preferences_updated_at
before update on public.member_payment_preferences
for each row execute function public.handle_updated_at();

drop trigger if exists trg_membership_renewal_queue_updated_at on public.membership_renewal_queue;
create trigger trg_membership_renewal_queue_updated_at
before update on public.membership_renewal_queue
for each row execute function public.handle_updated_at();

drop trigger if exists trg_payment_retry_jobs_updated_at on public.payment_retry_jobs;
create trigger trg_payment_retry_jobs_updated_at
before update on public.payment_retry_jobs
for each row execute function public.handle_updated_at();

drop trigger if exists trg_refund_requests_updated_at on public.refund_requests;
create trigger trg_refund_requests_updated_at
before update on public.refund_requests
for each row execute function public.handle_updated_at();

drop trigger if exists trg_refund_transactions_updated_at on public.refund_transactions;
create trigger trg_refund_transactions_updated_at
before update on public.refund_transactions
for each row execute function public.handle_updated_at();

alter table public.member_payment_preferences enable row level security;
alter table public.membership_renewal_queue enable row level security;
alter table public.payment_retry_jobs enable row level security;
alter table public.refund_requests enable row level security;
alter table public.refund_transactions enable row level security;

drop policy if exists "Users manage own payment preferences" on public.member_payment_preferences;
create policy "Users manage own payment preferences"
on public.member_payment_preferences
for all
to authenticated
using (user_id = auth.uid() or public.is_staff())
with check (user_id = auth.uid() or public.is_staff());

drop policy if exists "Staff read renewal queue" on public.membership_renewal_queue;
create policy "Staff read renewal queue"
on public.membership_renewal_queue
for select
to authenticated
using (public.is_staff());

drop policy if exists "Staff manage retry jobs" on public.payment_retry_jobs;
create policy "Staff manage retry jobs"
on public.payment_retry_jobs
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Users read own refund requests" on public.refund_requests;
create policy "Users read own refund requests"
on public.refund_requests
for select
to authenticated
using (user_id = auth.uid() or public.is_staff());

drop policy if exists "Users create own refund requests" on public.refund_requests;
create policy "Users create own refund requests"
on public.refund_requests
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "Staff manage refund requests" on public.refund_requests;
create policy "Staff manage refund requests"
on public.refund_requests
for update
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Staff read refund transactions" on public.refund_transactions;
create policy "Staff read refund transactions"
on public.refund_transactions
for select
to authenticated
using (public.is_staff());

create or replace function public.set_my_auto_renew_preference(p_enabled boolean)
returns public.member_payment_preferences
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_row public.member_payment_preferences;
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  insert into public.member_payment_preferences (
    user_id,
    auto_renew_enabled,
    last_opt_in_at,
    last_opt_out_at
  )
  values (
    auth.uid(),
    coalesce(p_enabled, false),
    case when coalesce(p_enabled, false) then timezone('utc', now()) else null end,
    case when not coalesce(p_enabled, false) then timezone('utc', now()) else null end
  )
  on conflict (user_id)
  do update set
    auto_renew_enabled = excluded.auto_renew_enabled,
    last_opt_in_at = case when excluded.auto_renew_enabled then timezone('utc', now()) else public.member_payment_preferences.last_opt_in_at end,
    last_opt_out_at = case when not excluded.auto_renew_enabled then timezone('utc', now()) else public.member_payment_preferences.last_opt_out_at end
  returning * into saved_row;

  return saved_row;
end;
$$;

create or replace function public.request_invoice_refund(p_invoice_id uuid, p_reason text default null)
returns public.refund_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target_invoice public.billing_invoices;
  saved_request public.refund_requests;
  total_paid numeric(12, 2);
begin
  if auth.uid() is null then
    raise exception 'Authenticated user required';
  end if;

  if p_invoice_id is null then
    raise exception 'Invoice id is required';
  end if;

  select *
  into target_invoice
  from public.billing_invoices
  where id = p_invoice_id
  for update;

  if target_invoice.id is null then
    raise exception 'Invoice not found.';
  end if;

  if target_invoice.user_id <> auth.uid() and not public.is_staff() then
    raise exception 'Not allowed to request refund for this invoice.';
  end if;

  select coalesce(sum(amount_paid), 0)
  into total_paid
  from public.billing_payments
  where invoice_id = target_invoice.id
    and payment_status in ('paid', 'captured', 'settled');

  insert into public.refund_requests (
    invoice_id,
    user_id,
    requested_amount,
    request_reason,
    request_status
  )
  values (
    target_invoice.id,
    target_invoice.user_id,
    total_paid,
    nullif(btrim(coalesce(p_reason, '')), ''),
    'requested'
  )
  returning * into saved_request;

  return saved_request;
end;
$$;

create or replace function public.resolve_refund_request(
  p_refund_request_id uuid,
  p_action text,
  p_note text default null
)
returns public.refund_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  target_request public.refund_requests;
  saved_request public.refund_requests;
  next_status text;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  next_status := lower(nullif(btrim(coalesce(p_action, '')), ''));

  if next_status not in ('approve', 'reject', 'review') then
    raise exception 'Unsupported refund action.';
  end if;

  select *
  into target_request
  from public.refund_requests
  where id = p_refund_request_id
  for update;

  if target_request.id is null then
    raise exception 'Refund request not found.';
  end if;

  update public.refund_requests
  set
    request_status = case
      when next_status = 'approve' then 'approved'
      when next_status = 'reject' then 'rejected'
      else 'under_review'
    end,
    admin_note = nullif(btrim(coalesce(p_note, '')), ''),
    resolved_by = case when next_status in ('approve', 'reject') then auth.uid() else null end,
    resolved_at = case when next_status in ('approve', 'reject') then timezone('utc', now()) else null end
  where id = target_request.id
  returning * into saved_request;

  return saved_request;
end;
$$;

create or replace function public.get_payment_automation_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  select jsonb_build_object(
    'renewals_due_count',
    (
      select count(*)::bigint
      from public.membership_renewal_queue
      where queue_status in ('pending', 'manual_review')
    ),
    'retry_jobs_open_count',
    (
      select count(*)::bigint
      from public.payment_retry_jobs
      where retry_status in ('pending', 'manual_review', 'processing')
    ),
    'refunds_pending_count',
    (
      select count(*)::bigint
      from public.refund_requests
      where request_status in ('requested', 'under_review')
    ),
    'projected_revenue_due',
    (
      select coalesce(sum(renewal_amount), 0)
      from public.membership_renewal_queue
      where queue_status in ('pending', 'manual_review')
    )
  )
  into result;

  return coalesce(result, '{}'::jsonb);
end;
$$;

create or replace function public.list_membership_renewal_queue()
returns table (
  id uuid,
  membership_id uuid,
  member_id uuid,
  member_name text,
  member_email text,
  plan_name text,
  current_period_end date,
  invoice_id uuid,
  renewal_amount numeric,
  queue_status text,
  scheduled_for timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  return query
  select
    q.id,
    q.membership_id,
    q.user_id as member_id,
    p.full_name as member_name,
    p.email as member_email,
    mp.name as plan_name,
    mm.end_date as current_period_end,
    q.invoice_id,
    q.renewal_amount,
    q.queue_status,
    q.scheduled_for
  from public.membership_renewal_queue q
  left join public.profiles p on p.id = q.user_id
  left join public.member_memberships mm on mm.id = q.membership_id
  left join public.membership_plans mp on mp.id = mm.plan_id
  order by q.scheduled_for asc, q.created_at asc;
end;
$$;

create or replace function public.list_payment_retry_queue()
returns table (
  id uuid,
  invoice_id uuid,
  user_id uuid,
  member_name text,
  member_email text,
  retry_status text,
  dunning_stage text,
  attempt_number integer,
  max_attempts integer,
  next_retry_at timestamp with time zone,
  amount_due numeric
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  return query
  select
    r.id,
    r.invoice_id,
    r.user_id,
    p.full_name as member_name,
    p.email as member_email,
    r.retry_status,
    r.dunning_stage,
    r.attempt_number,
    r.max_attempts,
    r.next_retry_at,
    r.amount_due
  from public.payment_retry_jobs r
  left join public.profiles p on p.id = r.user_id
  order by r.next_retry_at asc, r.created_at asc;
end;
$$;

create or replace function public.list_refund_requests_admin()
returns table (
  id uuid,
  invoice_id uuid,
  invoice_number text,
  user_id uuid,
  member_name text,
  member_email text,
  requested_amount numeric,
  request_reason text,
  request_status text,
  admin_note text,
  created_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  return query
  select
    rr.id,
    rr.invoice_id,
    bi.invoice_number,
    rr.user_id,
    p.full_name as member_name,
    p.email as member_email,
    rr.requested_amount,
    rr.request_reason,
    rr.request_status,
    rr.admin_note,
    rr.created_at
  from public.refund_requests rr
  left join public.profiles p on p.id = rr.user_id
  left join public.billing_invoices bi on bi.id = rr.invoice_id
  order by rr.created_at desc;
end;
$$;

revoke all on function public.set_my_auto_renew_preference(boolean) from public;
revoke all on function public.request_invoice_refund(uuid, text) from public;
revoke all on function public.resolve_refund_request(uuid, text, text) from public;
revoke all on function public.get_payment_automation_snapshot() from public;
revoke all on function public.list_membership_renewal_queue() from public;
revoke all on function public.list_payment_retry_queue() from public;
revoke all on function public.list_refund_requests_admin() from public;

grant execute on function public.set_my_auto_renew_preference(boolean) to authenticated;
grant execute on function public.request_invoice_refund(uuid, text) to authenticated;
grant execute on function public.resolve_refund_request(uuid, text, text) to authenticated;
grant execute on function public.get_payment_automation_snapshot() to authenticated;
grant execute on function public.list_membership_renewal_queue() to authenticated;
grant execute on function public.list_payment_retry_queue() to authenticated;
grant execute on function public.list_refund_requests_admin() to authenticated;
