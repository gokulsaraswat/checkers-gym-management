create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.marketing_campaigns (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.gym_branches(id) on delete set null,
  created_by uuid references public.profiles(id) on delete set null,
  title text not null,
  channel text not null default 'email',
  campaign_type text not null default 'broadcast',
  audience_filter jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  scheduled_for timestamp with time zone,
  sent_count integer not null default 0,
  delivered_count integer not null default 0,
  opened_count integer not null default 0,
  clicked_count integer not null default 0,
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint marketing_campaigns_channel_check
    check (channel in ('email', 'sms', 'whatsapp', 'push', 'manual')),
  constraint marketing_campaigns_type_check
    check (campaign_type in ('broadcast', 'renewal', 'winback', 'lead_nurture', 'referral', 'promo')),
  constraint marketing_campaigns_status_check
    check (status in ('draft', 'scheduled', 'running', 'completed', 'paused', 'cancelled'))
);

create table if not exists public.referral_programs (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.gym_branches(id) on delete set null,
  name text not null,
  code_prefix text not null,
  reward_type text not null default 'flat_discount',
  referrer_reward_value numeric(10, 2) not null default 0,
  referee_reward_value numeric(10, 2) not null default 0,
  is_active boolean not null default true,
  start_date date,
  end_date date,
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint referral_programs_code_prefix_unique unique (code_prefix),
  constraint referral_programs_reward_type_check
    check (reward_type in ('flat_discount', 'percentage_discount', 'credits', 'free_addon'))
);

create table if not exists public.referral_invites (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.gym_branches(id) on delete set null,
  program_id uuid references public.referral_programs(id) on delete set null,
  referrer_user_id uuid references public.profiles(id) on delete set null default auth.uid(),
  joined_member_id uuid references public.profiles(id) on delete set null,
  referred_name text not null,
  referred_email text,
  referred_phone text,
  invite_code text not null,
  status text not null default 'invited',
  reward_status text not null default 'pending',
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint referral_invites_code_unique unique (invite_code),
  constraint referral_invites_status_check
    check (status in ('invited', 'contacted', 'trial_booked', 'joined', 'expired')),
  constraint referral_invites_reward_status_check
    check (reward_status in ('pending', 'earned', 'paid', 'void'))
);

create table if not exists public.promo_codes (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.gym_branches(id) on delete set null,
  code text not null,
  label text not null,
  discount_type text not null default 'percentage',
  discount_value numeric(10, 2) not null default 0,
  applies_to text not null default 'all',
  valid_from date,
  valid_to date,
  max_redemptions integer,
  redemptions_count integer not null default 0,
  is_active boolean not null default true,
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint promo_codes_code_unique unique (code),
  constraint promo_codes_discount_type_check
    check (discount_type in ('flat', 'percentage')),
  constraint promo_codes_applies_to_check
    check (applies_to in ('all', 'membership', 'addon', 'trial', 'pos')),
  constraint promo_codes_discount_value_check
    check (discount_value >= 0),
  constraint promo_codes_redemptions_check
    check (redemptions_count >= 0)
);

create table if not exists public.promo_redemptions (
  id uuid primary key default gen_random_uuid(),
  promo_code_id uuid not null references public.promo_codes(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  invoice_id uuid references public.billing_invoices(id) on delete set null,
  lead_id uuid references public.crm_leads(id) on delete set null,
  redeemed_amount numeric(10, 2) not null default 0,
  redemption_source text not null default 'manual',
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  constraint promo_redemptions_source_check
    check (redemption_source in ('manual', 'billing', 'trial', 'pos', 'crm'))
);

create table if not exists public.trial_passes (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid references public.gym_branches(id) on delete set null,
  lead_id uuid references public.crm_leads(id) on delete set null,
  converted_member_id uuid references public.profiles(id) on delete set null,
  issued_by uuid references public.profiles(id) on delete set null default auth.uid(),
  full_name text not null,
  email text,
  phone text,
  source text not null default 'walk_in',
  status text not null default 'issued',
  issued_on date not null default current_date,
  expires_on date not null,
  notes text,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint trial_passes_source_check
    check (source in ('walk_in', 'instagram', 'referral', 'website', 'whatsapp', 'staff')),
  constraint trial_passes_status_check
    check (status in ('issued', 'booked', 'attended', 'converted', 'expired', 'cancelled'))
);

create index if not exists marketing_campaigns_branch_status_idx
  on public.marketing_campaigns (branch_id, status, scheduled_for desc);

create index if not exists referral_invites_branch_status_idx
  on public.referral_invites (branch_id, status, created_at desc);

create index if not exists promo_codes_branch_active_idx
  on public.promo_codes (branch_id, is_active, valid_to);

create index if not exists promo_redemptions_promo_code_idx
  on public.promo_redemptions (promo_code_id, created_at desc);

create index if not exists trial_passes_branch_status_idx
  on public.trial_passes (branch_id, status, expires_on);

insert into public.referral_programs (
  branch_id,
  name,
  code_prefix,
  reward_type,
  referrer_reward_value,
  referee_reward_value,
  is_active,
  notes
)
select
  null,
  'Bring a Friend',
  'REFER',
  'flat_discount',
  500,
  500,
  true,
  'Default referral incentive created by Patch 25.'
where not exists (
  select 1
  from public.referral_programs
  where code_prefix = 'REFER'
);

insert into public.promo_codes (
  branch_id,
  code,
  label,
  discount_type,
  discount_value,
  applies_to,
  is_active,
  notes
)
select
  null,
  'WELCOME10',
  'New member welcome offer',
  'percentage',
  10,
  'membership',
  true,
  'Default onboarding promo created by Patch 25.'
where not exists (
  select 1
  from public.promo_codes
  where code = 'WELCOME10'
);

alter table public.marketing_campaigns enable row level security;
alter table public.referral_programs enable row level security;
alter table public.referral_invites enable row level security;
alter table public.promo_codes enable row level security;
alter table public.promo_redemptions enable row level security;
alter table public.trial_passes enable row level security;

drop policy if exists "Staff can read marketing campaigns" on public.marketing_campaigns;
create policy "Staff can read marketing campaigns"
on public.marketing_campaigns
for select to authenticated
using (public.is_staff());

drop policy if exists "Admins manage marketing campaigns" on public.marketing_campaigns;
create policy "Admins manage marketing campaigns"
on public.marketing_campaigns
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Staff can read referral programs" on public.referral_programs;
create policy "Staff can read referral programs"
on public.referral_programs
for select to authenticated
using (public.is_staff());

drop policy if exists "Admins manage referral programs" on public.referral_programs;
create policy "Admins manage referral programs"
on public.referral_programs
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Members and staff can read referral invites" on public.referral_invites;
create policy "Members and staff can read referral invites"
on public.referral_invites
for select to authenticated
using (
  public.is_staff()
  or referrer_user_id = auth.uid()
  or joined_member_id = auth.uid()
);

drop policy if exists "Staff can manage referral invites" on public.referral_invites;
create policy "Staff can manage referral invites"
on public.referral_invites
for all to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Staff can read promo codes" on public.promo_codes;
create policy "Staff can read promo codes"
on public.promo_codes
for select to authenticated
using (public.is_staff());

drop policy if exists "Admins manage promo codes" on public.promo_codes;
create policy "Admins manage promo codes"
on public.promo_codes
for all to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Staff can read promo redemptions" on public.promo_redemptions;
create policy "Staff can read promo redemptions"
on public.promo_redemptions
for select to authenticated
using (public.is_staff() or user_id = auth.uid());

drop policy if exists "Staff can manage promo redemptions" on public.promo_redemptions;
create policy "Staff can manage promo redemptions"
on public.promo_redemptions
for all to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Staff can read trial passes" on public.trial_passes;
create policy "Staff can read trial passes"
on public.trial_passes
for select to authenticated
using (public.is_staff());

drop policy if exists "Staff can manage trial passes" on public.trial_passes;
create policy "Staff can manage trial passes"
on public.trial_passes
for all to authenticated
using (public.is_staff())
with check (public.is_staff());

drop trigger if exists set_marketing_campaigns_updated_at on public.marketing_campaigns;
create trigger set_marketing_campaigns_updated_at
before update on public.marketing_campaigns
for each row execute function public.handle_updated_at();

drop trigger if exists set_referral_programs_updated_at on public.referral_programs;
create trigger set_referral_programs_updated_at
before update on public.referral_programs
for each row execute function public.handle_updated_at();

drop trigger if exists set_referral_invites_updated_at on public.referral_invites;
create trigger set_referral_invites_updated_at
before update on public.referral_invites
for each row execute function public.handle_updated_at();

drop trigger if exists set_promo_codes_updated_at on public.promo_codes;
create trigger set_promo_codes_updated_at
before update on public.promo_codes
for each row execute function public.handle_updated_at();

drop trigger if exists set_trial_passes_updated_at on public.trial_passes;
create trigger set_trial_passes_updated_at
before update on public.trial_passes
for each row execute function public.handle_updated_at();

create or replace function public.get_marketing_dashboard_snapshot(p_branch_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  campaign_delivered bigint := 0;
  campaign_opened bigint := 0;
  campaign_clicked bigint := 0;
  total_trials bigint := 0;
  converted_trials bigint := 0;
  promo_revenue numeric(12, 2) := 0;
  referral_revenue numeric(12, 2) := 0;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  select coalesce(sum(delivered_count), 0), coalesce(sum(opened_count), 0), coalesce(sum(clicked_count), 0)
  into campaign_delivered, campaign_opened, campaign_clicked
  from public.marketing_campaigns
  where (p_branch_id is null or branch_id = p_branch_id);

  select count(*), count(*) filter (where status = 'converted')
  into total_trials, converted_trials
  from public.trial_passes
  where (p_branch_id is null or branch_id = p_branch_id);

  select coalesce(sum(redeemed_amount), 0)
  into promo_revenue
  from public.promo_redemptions
  where exists (
    select 1
    from public.promo_codes codes
    where codes.id = promo_redemptions.promo_code_id
      and (p_branch_id is null or codes.branch_id = p_branch_id)
  );

  select coalesce(sum(invoices.total_amount), 0)
  into referral_revenue
  from public.billing_invoices invoices
  where invoices.profile_id in (
    select joined_member_id
    from public.referral_invites invites
    where invites.status = 'joined'
      and invites.joined_member_id is not null
      and (p_branch_id is null or invites.branch_id = p_branch_id)
  );

  select jsonb_build_object(
    'active_campaigns', (
      select count(*)::bigint
      from public.marketing_campaigns
      where status in ('draft', 'scheduled', 'running')
        and (p_branch_id is null or branch_id = p_branch_id)
    ),
    'scheduled_campaigns', (
      select count(*)::bigint
      from public.marketing_campaigns
      where status = 'scheduled'
        and (p_branch_id is null or branch_id = p_branch_id)
    ),
    'paused_campaigns', (
      select count(*)::bigint
      from public.marketing_campaigns
      where status in ('paused', 'cancelled')
        and (p_branch_id is null or branch_id = p_branch_id)
    ),
    'open_referrals', (
      select count(*)::bigint
      from public.referral_invites
      where status in ('invited', 'contacted', 'trial_booked')
        and (p_branch_id is null or branch_id = p_branch_id)
    ),
    'referral_conversions', (
      select count(*)::bigint
      from public.referral_invites
      where status = 'joined'
        and (p_branch_id is null or branch_id = p_branch_id)
    ),
    'stale_referrals', (
      select count(*)::bigint
      from public.referral_invites
      where status in ('invited', 'contacted')
        and created_at < timezone('utc', now()) - interval '7 days'
        and (p_branch_id is null or branch_id = p_branch_id)
    ),
    'active_promo_codes', (
      select count(*)::bigint
      from public.promo_codes
      where is_active = true
        and (valid_to is null or valid_to >= current_date)
        and (p_branch_id is null or branch_id = p_branch_id)
    ),
    'promo_redemptions', (
      select count(*)::bigint
      from public.promo_redemptions redemptions
      where exists (
        select 1
        from public.promo_codes codes
        where codes.id = redemptions.promo_code_id
          and (p_branch_id is null or codes.branch_id = p_branch_id)
      )
    ),
    'promo_revenue', promo_revenue,
    'referral_revenue', referral_revenue,
    'trial_converted', converted_trials,
    'inactive_trials', (
      select count(*)::bigint
      from public.trial_passes
      where status in ('issued', 'booked')
        and expires_on <= current_date + 2
        and (p_branch_id is null or branch_id = p_branch_id)
    ),
    'trial_conversion_rate', case
      when total_trials = 0 then 0
      else round((converted_trials::numeric / total_trials::numeric) * 100, 1)
    end,
    'delivery_rate', case
      when campaign_delivered = 0 then 0
      else 100
    end,
    'open_rate', case
      when campaign_delivered = 0 then 0
      else round((campaign_opened::numeric / campaign_delivered::numeric) * 100, 1)
    end,
    'click_rate', case
      when campaign_delivered = 0 then 0
      else round((campaign_clicked::numeric / campaign_delivered::numeric) * 100, 1)
    end,
    'expiring_soon_members', (
      select count(*)::bigint
      from public.profiles
      where membership_end_date between current_date and current_date + 14
        and (p_branch_id is null or home_branch_id = p_branch_id)
    )
  ) into result;

  return coalesce(result, '{}'::jsonb);
end;
$$;

revoke all on function public.get_marketing_dashboard_snapshot(uuid) from public;
grant execute on function public.get_marketing_dashboard_snapshot(uuid) to authenticated;
