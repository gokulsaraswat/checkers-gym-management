create extension if not exists pgcrypto;

create table if not exists public.payment_gateway_configs (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  config_name text not null,
  is_active boolean not null default true,
  public_metadata jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

alter table public.payment_gateway_configs
  add constraint payment_gateway_configs_provider_unique unique (provider);

create table if not exists public.invoice_payment_links (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null,
  gateway_provider text not null default 'razorpay',
  external_link_id text,
  short_url text,
  amount numeric(12,2) not null,
  currency text not null default 'INR',
  link_status text not null default 'created',
  customer_name text,
  customer_email text,
  customer_contact text,
  description text,
  notes jsonb not null default '{}'::jsonb,
  raw_response jsonb not null default '{}'::jsonb,
  created_by uuid,
  expires_at timestamp with time zone,
  paid_at timestamp with time zone,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

alter table public.invoice_payment_links
  add constraint invoice_payment_links_external_link_id_unique unique (external_link_id);

alter table public.invoice_payment_links
  drop constraint if exists invoice_payment_links_link_status_check;

alter table public.invoice_payment_links
  add constraint invoice_payment_links_link_status_check
  check (
    link_status in (
      'created',
      'issued',
      'cancelled',
      'paid',
      'expired',
      'partially_paid',
      'failed'
    )
  );

create index if not exists invoice_payment_links_invoice_id_idx
  on public.invoice_payment_links (invoice_id);

create index if not exists invoice_payment_links_status_idx
  on public.invoice_payment_links (link_status, created_at desc);

create index if not exists invoice_payment_links_gateway_provider_idx
  on public.invoice_payment_links (gateway_provider, created_at desc);

alter table if exists public.billing_payments
  add column if not exists gateway_provider text,
  add column if not exists external_payment_id text,
  add column if not exists external_reference text,
  add column if not exists gateway_status text,
  add column if not exists gateway_payload jsonb not null default '{}'::jsonb,
  add column if not exists invoice_payment_link_id uuid;

create unique index if not exists billing_payments_external_payment_id_uniq
  on public.billing_payments (external_payment_id)
  where external_payment_id is not null;

alter table public.payment_gateway_configs enable row level security;
alter table public.invoice_payment_links enable row level security;

create policy "Admins can manage payment gateway configs"
on public.payment_gateway_configs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Admins and staff can read payment links"
on public.invoice_payment_links
for select
to authenticated
using (public.is_staff());

create policy "Admins can manage payment links"
on public.invoice_payment_links
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
