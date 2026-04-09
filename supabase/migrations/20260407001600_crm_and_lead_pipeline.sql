-- Patch 15: CRM and lead pipeline

create table if not exists public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  source text not null default 'walk_in' check (source in (
    'walk_in',
    'referral',
    'instagram',
    'whatsapp',
    'website',
    'google_ads',
    'meta_ads',
    'flyer',
    'other'
  )),
  stage text not null default 'new' check (stage in (
    'new',
    'contacted',
    'trial_scheduled',
    'trial_completed',
    'qualified',
    'won',
    'lost',
    'dormant'
  )),
  assigned_to uuid,
  preferred_contact_method text not null default 'phone' check (preferred_contact_method in (
    'phone',
    'whatsapp',
    'email',
    'walk_in',
    'instagram'
  )),
  interested_plan_id uuid,
  interested_add_on_codes text[] not null default '{}'::text[],
  estimated_value numeric(10, 2) not null default 0 check (estimated_value >= 0),
  expected_close_date date,
  next_follow_up_at timestamp with time zone,
  last_contacted_at timestamp with time zone,
  trial_scheduled_at timestamp with time zone,
  branch_name text,
  notes text,
  tags text[] not null default '{}'::text[],
  converted_member_id uuid,
  won_at timestamp with time zone,
  lost_at timestamp with time zone,
  lost_reason text,
  is_archived boolean not null default false,
  created_by uuid,
  updated_by uuid,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint crm_leads_assigned_to_fkey
    foreign key (assigned_to) references public.profiles (id) on delete set null,
  constraint crm_leads_interested_plan_id_fkey
    foreign key (interested_plan_id) references public.membership_plans (id) on delete set null,
  constraint crm_leads_converted_member_id_fkey
    foreign key (converted_member_id) references public.profiles (id) on delete set null,
  constraint crm_leads_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null,
  constraint crm_leads_updated_by_fkey
    foreign key (updated_by) references public.profiles (id) on delete set null
);

create table if not exists public.crm_lead_interactions (
  id uuid primary key default gen_random_uuid(),
  lead_id uuid not null,
  interaction_type text not null default 'note' check (interaction_type in (
    'note',
    'call',
    'whatsapp',
    'email',
    'visit',
    'trial'
  )),
  summary text not null,
  outcome text,
  interaction_at timestamp with time zone not null default timezone('utc', now()),
  next_follow_up_at timestamp with time zone,
  created_by uuid,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint crm_lead_interactions_lead_id_fkey
    foreign key (lead_id) references public.crm_leads (id) on delete cascade,
  constraint crm_lead_interactions_created_by_fkey
    foreign key (created_by) references public.profiles (id) on delete set null
);

create index if not exists crm_leads_stage_idx
  on public.crm_leads (stage, is_archived, next_follow_up_at);

create index if not exists crm_leads_source_idx
  on public.crm_leads (source, created_at desc);

create index if not exists crm_leads_assigned_to_idx
  on public.crm_leads (assigned_to, stage, next_follow_up_at);

create index if not exists crm_leads_expected_close_idx
  on public.crm_leads (expected_close_date);

create index if not exists crm_lead_interactions_lead_id_idx
  on public.crm_lead_interactions (lead_id, interaction_at desc);

create or replace function public.sync_crm_lead_from_interaction()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.crm_leads
  set
    last_contacted_at = new.interaction_at,
    next_follow_up_at = coalesce(new.next_follow_up_at, next_follow_up_at),
    updated_at = timezone('utc', now())
  where id = new.lead_id;

  return new;
end;
$$;

drop trigger if exists set_crm_leads_updated_at on public.crm_leads;
create trigger set_crm_leads_updated_at
before update on public.crm_leads
for each row execute function public.set_updated_at();

drop trigger if exists set_crm_lead_interactions_updated_at on public.crm_lead_interactions;
create trigger set_crm_lead_interactions_updated_at
before update on public.crm_lead_interactions
for each row execute function public.set_updated_at();

drop trigger if exists sync_crm_lead_after_interaction on public.crm_lead_interactions;
create trigger sync_crm_lead_after_interaction
after insert on public.crm_lead_interactions
for each row execute function public.sync_crm_lead_from_interaction();

alter table public.crm_leads enable row level security;
alter table public.crm_lead_interactions enable row level security;

drop policy if exists "Staff can manage CRM leads" on public.crm_leads;
create policy "Staff can manage CRM leads"
on public.crm_leads
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Staff can manage CRM lead interactions" on public.crm_lead_interactions;
create policy "Staff can manage CRM lead interactions"
on public.crm_lead_interactions
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());
