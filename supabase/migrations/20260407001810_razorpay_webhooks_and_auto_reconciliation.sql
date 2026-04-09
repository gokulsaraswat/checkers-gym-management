create extension if not exists pgcrypto;

alter table public.invoice_payment_links
  add column if not exists external_payment_id text,
  add column if not exists external_order_id text,
  add column if not exists amount_paid numeric(12, 2) not null default 0,
  add column if not exists last_webhook_event text,
  add column if not exists last_webhook_at timestamp with time zone,
  add column if not exists webhook_payload jsonb not null default '{}'::jsonb;

alter table public.invoice_payment_links
  drop constraint if exists invoice_payment_links_external_payment_id_unique;

alter table public.invoice_payment_links
  add constraint invoice_payment_links_external_payment_id_unique unique (external_payment_id);

drop index if exists public.billing_payments_external_payment_id_uniq;

with duplicate_payments as (
  select ctid
  from (
    select
      ctid,
      row_number() over (
        partition by external_payment_id
        order by updated_at desc nulls last, created_at desc nulls last, id desc
      ) as duplicate_rank
    from public.billing_payments
    where external_payment_id is not null
  ) ranked
  where ranked.duplicate_rank > 1
)
delete from public.billing_payments as payments
using duplicate_payments
where payments.ctid = duplicate_payments.ctid;

alter table public.billing_payments
  drop constraint if exists billing_payments_external_payment_id_unique;

alter table public.billing_payments
  add constraint billing_payments_external_payment_id_unique unique (external_payment_id);

create table if not exists public.payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_type text not null,
  payload_sha256 text not null unique,
  signature text,
  is_signature_valid boolean not null default false,
  processing_status text not null default 'received',
  processing_error text,
  invoice_id uuid references public.billing_invoices(id) on delete set null,
  invoice_payment_link_id uuid references public.invoice_payment_links(id) on delete set null,
  external_link_id text,
  external_payment_id text,
  payload jsonb not null default '{}'::jsonb,
  notes jsonb not null default '{}'::jsonb,
  received_at timestamp with time zone not null default timezone('utc', now()),
  processed_at timestamp with time zone
);

alter table public.payment_webhook_events
  drop constraint if exists payment_webhook_events_provider_check;

alter table public.payment_webhook_events
  add constraint payment_webhook_events_provider_check
  check (provider in ('razorpay'));

alter table public.payment_webhook_events
  drop constraint if exists payment_webhook_events_processing_status_check;

alter table public.payment_webhook_events
  add constraint payment_webhook_events_processing_status_check
  check (processing_status in ('received', 'processed', 'ignored', 'rejected', 'failed'));

create index if not exists payment_webhook_events_received_at_idx
  on public.payment_webhook_events (received_at desc);

create index if not exists payment_webhook_events_provider_event_idx
  on public.payment_webhook_events (provider, event_type, received_at desc);

create index if not exists payment_webhook_events_invoice_id_idx
  on public.payment_webhook_events (invoice_id, received_at desc);

alter table public.payment_webhook_events enable row level security;

drop policy if exists "Admins can read payment webhook events" on public.payment_webhook_events;
create policy "Admins can read payment webhook events"
on public.payment_webhook_events
for select
to authenticated
using (public.is_admin());

grant select on public.payment_webhook_events to authenticated;
grant all on public.payment_webhook_events to service_role;

create or replace function public.ingest_payment_gateway_webhook(
  p_provider text,
  p_event_type text,
  p_signature text,
  p_signature_valid boolean,
  p_payload_sha256 text,
  p_payload jsonb
)
returns public.payment_webhook_events
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_event public.payment_webhook_events;
  target_link public.invoice_payment_links;
  target_invoice public.billing_invoices;
  webhook_external_link_id text;
  webhook_external_payment_id text;
  webhook_external_order_id text;
  mapped_payment_method text := 'other';
  mapped_payment_status text := 'pending';
  next_link_status text;
  payment_amount numeric(12, 2) := 0;
  link_amount_paid numeric(12, 2) := 0;
  payment_created_at timestamp with time zone;
  event_notes jsonb := '{}'::jsonb;
  scope_supported boolean := false;
  link_paid_at timestamp with time zone;
  current_notes text;
begin
  if coalesce(nullif(btrim(p_provider), ''), '') = '' then
    raise exception 'Provider is required';
  end if;

  if coalesce(nullif(btrim(p_event_type), ''), '') = '' then
    raise exception 'Event type is required';
  end if;

  if coalesce(nullif(btrim(p_payload_sha256), ''), '') = '' then
    raise exception 'Payload sha256 is required';
  end if;

  insert into public.payment_webhook_events (
    provider,
    event_type,
    payload_sha256,
    signature,
    is_signature_valid,
    payload,
    received_at
  )
  values (
    lower(btrim(p_provider)),
    lower(btrim(p_event_type)),
    p_payload_sha256,
    nullif(p_signature, ''),
    coalesce(p_signature_valid, false),
    coalesce(p_payload, '{}'::jsonb),
    timezone('utc', now())
  )
  on conflict (payload_sha256)
  do update
  set
    provider = excluded.provider,
    event_type = excluded.event_type,
    signature = excluded.signature,
    is_signature_valid = excluded.is_signature_valid,
    payload = excluded.payload,
    received_at = timezone('utc', now())
  returning * into saved_event;

  if not coalesce(p_signature_valid, false) then
    update public.payment_webhook_events
    set
      processing_status = 'rejected',
      processing_error = 'Invalid Razorpay webhook signature.',
      processed_at = timezone('utc', now())
    where id = saved_event.id
    returning * into saved_event;

    return saved_event;
  end if;

  scope_supported := lower(btrim(p_event_type)) in (
    'payment_link.paid',
    'payment_link.partially_paid',
    'payment_link.cancelled'
  );

  if not scope_supported then
    update public.payment_webhook_events
    set
      processing_status = 'ignored',
      processing_error = 'Webhook event stored but not mapped to automatic reconciliation in Patch 17.1.',
      processed_at = timezone('utc', now())
    where id = saved_event.id
    returning * into saved_event;

    return saved_event;
  end if;

  webhook_external_link_id := nullif(coalesce(
    p_payload #>> '{payload,payment_link,entity,id}',
    p_payload #>> '{payload,payment_link,id}',
    ''
  ), '');

  webhook_external_payment_id := nullif(coalesce(
    p_payload #>> '{payload,payment,entity,id}',
    p_payload #>> '{payload,payment,id}',
    ''
  ), '');

  webhook_external_order_id := nullif(coalesce(
    p_payload #>> '{payload,order,entity,id}',
    p_payload #>> '{payload,payment_link,entity,order_id}',
    p_payload #>> '{payload,payment,entity,order_id}',
    ''
  ), '');

  if webhook_external_link_id is null then
    update public.payment_webhook_events
    set
      processing_status = 'ignored',
      processing_error = 'No payment link id was present in the webhook payload.',
      processed_at = timezone('utc', now())
    where id = saved_event.id
    returning * into saved_event;

    return saved_event;
  end if;

  select *
  into target_link
  from public.invoice_payment_links
  where external_link_id = webhook_external_link_id
  limit 1
  for update;

  if not found then
    update public.payment_webhook_events
    set
      processing_status = 'ignored',
      processing_error = 'No invoice_payment_links row matched the Razorpay payment link id.',
      external_link_id = webhook_external_link_id,
      processed_at = timezone('utc', now())
    where id = saved_event.id
    returning * into saved_event;

    return saved_event;
  end if;

  select *
  into target_invoice
  from public.billing_invoices
  where id = target_link.invoice_id
  for update;

  if not found then
    update public.payment_webhook_events
    set
      processing_status = 'failed',
      processing_error = 'Linked invoice was not found for the payment link record.',
      invoice_payment_link_id = target_link.id,
      external_link_id = webhook_external_link_id,
      processed_at = timezone('utc', now())
    where id = saved_event.id
    returning * into saved_event;

    return saved_event;
  end if;

  next_link_status := lower(coalesce(
    nullif(p_payload #>> '{payload,payment_link,entity,status}', ''),
    case lower(btrim(p_event_type))
      when 'payment_link.paid' then 'paid'
      when 'payment_link.partially_paid' then 'partially_paid'
      when 'payment_link.cancelled' then 'cancelled'
      else target_link.link_status
    end,
    target_link.link_status,
    'created'
  ));

  payment_amount := round(coalesce(nullif(p_payload #>> '{payload,payment,entity,amount}', '')::numeric / 100, 0), 2);
  link_amount_paid := round(coalesce(nullif(p_payload #>> '{payload,payment_link,entity,amount_paid}', '')::numeric / 100, target_link.amount_paid, 0), 2);
  payment_created_at := coalesce(
    to_timestamp(nullif(p_payload #>> '{payload,payment,entity,created_at}', '')::bigint),
    timezone('utc', now())
  );
  link_paid_at := case when next_link_status = 'paid' then payment_created_at else target_link.paid_at end;

  mapped_payment_method := case lower(coalesce(p_payload #>> '{payload,payment,entity,method}', ''))
    when 'upi' then 'upi'
    when 'card' then 'card'
    when 'netbanking' then 'bank_transfer'
    when 'wallet' then 'wallet'
    else 'other'
  end;

  mapped_payment_status := case lower(coalesce(p_payload #>> '{payload,payment,entity,status}', ''))
    when 'captured' then 'completed'
    when 'authorized' then 'pending'
    when 'failed' then 'failed'
    else case lower(btrim(p_event_type))
      when 'payment_link.paid' then 'completed'
      when 'payment_link.partially_paid' then 'completed'
      when 'payment_link.cancelled' then 'cancelled'
      else 'pending'
    end
  end;

  current_notes := concat_ws(' • ',
    nullif(target_link.description, ''),
    'Webhook: ' || lower(btrim(p_event_type))
  );

  update public.invoice_payment_links
  set
    link_status = next_link_status,
    external_payment_id = coalesce(webhook_external_payment_id, invoice_payment_links.external_payment_id),
    external_order_id = coalesce(webhook_external_order_id, invoice_payment_links.external_order_id),
    amount_paid = greatest(coalesce(link_amount_paid, 0), coalesce(invoice_payment_links.amount_paid, 0)),
    paid_at = link_paid_at,
    last_webhook_event = lower(btrim(p_event_type)),
    last_webhook_at = timezone('utc', now()),
    webhook_payload = coalesce(p_payload, '{}'::jsonb),
    raw_response = coalesce(p_payload, invoice_payment_links.raw_response, '{}'::jsonb),
    updated_at = timezone('utc', now())
  where id = target_link.id
  returning * into target_link;

  if webhook_external_payment_id is not null and payment_amount > 0 then
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
      gateway_provider,
      external_payment_id,
      external_reference,
      gateway_status,
      gateway_payload,
      invoice_payment_link_id,
      created_at,
      updated_at
    )
    values (
      target_invoice.id,
      target_invoice.member_id,
      payment_created_at::date,
      mapped_payment_method,
      mapped_payment_status,
      payment_amount,
      webhook_external_payment_id,
      'razorpay',
      current_notes,
      'razorpay',
      webhook_external_payment_id,
      coalesce(webhook_external_order_id, webhook_external_link_id),
      lower(coalesce(nullif(p_payload #>> '{payload,payment,entity,status}', ''), next_link_status)),
      coalesce(p_payload, '{}'::jsonb),
      target_link.id,
      timezone('utc', now()),
      timezone('utc', now())
    )
    on conflict (external_payment_id)
    do update
    set
      invoice_id = excluded.invoice_id,
      member_id = excluded.member_id,
      payment_date = excluded.payment_date,
      payment_method = excluded.payment_method,
      payment_status = excluded.payment_status,
      amount = excluded.amount,
      reference_code = excluded.reference_code,
      processor_name = excluded.processor_name,
      notes = excluded.notes,
      gateway_provider = excluded.gateway_provider,
      external_reference = excluded.external_reference,
      gateway_status = excluded.gateway_status,
      gateway_payload = excluded.gateway_payload,
      invoice_payment_link_id = excluded.invoice_payment_link_id,
      updated_at = timezone('utc', now());
  end if;

  perform public.recalculate_billing_invoice_totals(target_invoice.id);

  event_notes := jsonb_build_object(
    'invoice_number', target_invoice.invoice_number,
    'invoice_status', (select status from public.billing_invoices where id = target_invoice.id),
    'link_status', target_link.link_status,
    'amount_paid', target_link.amount_paid
  );

  update public.payment_webhook_events
  set
    processing_status = 'processed',
    processing_error = null,
    invoice_id = target_invoice.id,
    invoice_payment_link_id = target_link.id,
    external_link_id = target_link.external_link_id,
    external_payment_id = coalesce(webhook_external_payment_id, payment_webhook_events.external_payment_id),
    notes = event_notes,
    processed_at = timezone('utc', now())
  where id = saved_event.id
  returning * into saved_event;

  return saved_event;
exception
  when others then
    update public.payment_webhook_events
    set
      processing_status = 'failed',
      processing_error = sqlerrm,
      processed_at = timezone('utc', now())
    where id = saved_event.id
    returning * into saved_event;

    return saved_event;
end;
$$;

revoke all on function public.ingest_payment_gateway_webhook(text, text, text, boolean, text, jsonb) from public;
grant execute on function public.ingest_payment_gateway_webhook(text, text, text, boolean, text, jsonb) to service_role;
