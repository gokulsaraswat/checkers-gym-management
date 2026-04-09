-- Patch 24: advanced analytics and AI insights

create or replace function public.handle_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.member_risk_scores (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid references public.gym_branches(id) on delete set null,
  risk_score numeric(5, 2) not null default 0 check (risk_score >= 0 and risk_score <= 100),
  risk_level text not null default 'low' check (risk_level in ('low', 'medium', 'high')),
  risk_signals jsonb not null default '{}'::jsonb,
  last_check_in_at timestamp with time zone,
  membership_end_date date,
  outstanding_due numeric(10, 2) not null default 0 check (outstanding_due >= 0),
  calculated_at timestamp with time zone not null default timezone('utc', now()),
  model_version text not null default 'heuristic-v1',
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint member_risk_scores_signals_is_object check (jsonb_typeof(risk_signals) = 'object')
);

create unique index if not exists member_risk_scores_member_model_uidx
  on public.member_risk_scores (member_id, model_version);

create index if not exists member_risk_scores_branch_risk_idx
  on public.member_risk_scores (branch_id, risk_level, risk_score desc, calculated_at desc);

create table if not exists public.revenue_forecasts (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.gym_branches(id) on delete cascade,
  forecast_period text not null default 'monthly' check (forecast_period in ('weekly', 'monthly', 'quarterly', 'yearly')),
  forecast_month date not null,
  projected_revenue numeric(12, 2) not null default 0 check (projected_revenue >= 0),
  confirmed_revenue numeric(12, 2) not null default 0 check (confirmed_revenue >= 0),
  confidence_score integer not null default 70 check (confidence_score between 0 and 100),
  assumptions jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users on delete set null,
  updated_by uuid references auth.users on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint revenue_forecasts_assumptions_object check (jsonb_typeof(assumptions) = 'object')
);

create unique index if not exists revenue_forecasts_branch_period_month_uidx
  on public.revenue_forecasts (branch_id, forecast_period, forecast_month);

create index if not exists revenue_forecasts_month_idx
  on public.revenue_forecasts (forecast_month desc, branch_id);

create table if not exists public.trainer_performance_snapshots (
  id uuid primary key default gen_random_uuid(),
  trainer_id uuid not null references public.profiles(id) on delete cascade,
  branch_id uuid not null references public.gym_branches(id) on delete cascade,
  snapshot_month date not null,
  sessions_completed integer not null default 0 check (sessions_completed >= 0),
  unique_members integer not null default 0 check (unique_members >= 0),
  avg_attendance numeric(5, 2) not null default 0 check (avg_attendance >= 0),
  member_retention_score numeric(5, 2) not null default 0 check (member_retention_score >= 0 and member_retention_score <= 100),
  pt_revenue numeric(12, 2) not null default 0 check (pt_revenue >= 0),
  commission_generated numeric(12, 2) not null default 0 check (commission_generated >= 0),
  notes text,
  created_by uuid references auth.users on delete set null,
  updated_by uuid references auth.users on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create unique index if not exists trainer_performance_branch_trainer_month_uidx
  on public.trainer_performance_snapshots (branch_id, trainer_id, snapshot_month);

create index if not exists trainer_performance_snapshot_month_idx
  on public.trainer_performance_snapshots (snapshot_month desc, branch_id, member_retention_score desc);

create table if not exists public.analytics_model_runs (
  id uuid primary key default gen_random_uuid(),
  model_key text not null,
  branch_id uuid references public.gym_branches(id) on delete set null,
  run_status text not null default 'completed' check (run_status in ('queued', 'running', 'completed', 'failed')),
  rows_processed integer not null default 0 check (rows_processed >= 0),
  summary jsonb not null default '{}'::jsonb,
  notes text,
  ran_by uuid references auth.users on delete set null,
  ran_at timestamp with time zone not null default timezone('utc', now()),
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint analytics_model_runs_summary_object check (jsonb_typeof(summary) = 'object')
);

create index if not exists analytics_model_runs_model_key_idx
  on public.analytics_model_runs (model_key, ran_at desc);

create index if not exists analytics_model_runs_branch_idx
  on public.analytics_model_runs (branch_id, ran_at desc);

drop trigger if exists set_member_risk_scores_updated_at on public.member_risk_scores;
create trigger set_member_risk_scores_updated_at
before update on public.member_risk_scores
for each row execute function public.set_updated_at();

drop trigger if exists set_revenue_forecasts_updated_at on public.revenue_forecasts;
create trigger set_revenue_forecasts_updated_at
before update on public.revenue_forecasts
for each row execute function public.set_updated_at();

drop trigger if exists set_trainer_performance_snapshots_updated_at on public.trainer_performance_snapshots;
create trigger set_trainer_performance_snapshots_updated_at
before update on public.trainer_performance_snapshots
for each row execute function public.set_updated_at();

drop trigger if exists set_analytics_model_runs_updated_at on public.analytics_model_runs;
create trigger set_analytics_model_runs_updated_at
before update on public.analytics_model_runs
for each row execute function public.set_updated_at();

alter table public.member_risk_scores enable row level security;
alter table public.revenue_forecasts enable row level security;
alter table public.trainer_performance_snapshots enable row level security;
alter table public.analytics_model_runs enable row level security;

drop policy if exists "Staff can read member risk scores" on public.member_risk_scores;
create policy "Staff can read member risk scores"
on public.member_risk_scores
for select
to authenticated
using (public.is_admin() or public.is_staff());

drop policy if exists "Admins can manage member risk scores" on public.member_risk_scores;
create policy "Admins can manage member risk scores"
on public.member_risk_scores
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Staff can read revenue forecasts" on public.revenue_forecasts;
create policy "Staff can read revenue forecasts"
on public.revenue_forecasts
for select
to authenticated
using (public.is_admin() or public.is_staff());

drop policy if exists "Admins can manage revenue forecasts" on public.revenue_forecasts;
create policy "Admins can manage revenue forecasts"
on public.revenue_forecasts
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Staff can read trainer performance snapshots" on public.trainer_performance_snapshots;
create policy "Staff can read trainer performance snapshots"
on public.trainer_performance_snapshots
for select
to authenticated
using (public.is_admin() or public.is_staff());

drop policy if exists "Admins can manage trainer performance snapshots" on public.trainer_performance_snapshots;
create policy "Admins can manage trainer performance snapshots"
on public.trainer_performance_snapshots
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Staff can read analytics model runs" on public.analytics_model_runs;
create policy "Staff can read analytics model runs"
on public.analytics_model_runs
for select
to authenticated
using (public.is_admin() or public.is_staff());

drop policy if exists "Admins can manage analytics model runs" on public.analytics_model_runs;
create policy "Admins can manage analytics model runs"
on public.analytics_model_runs
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create or replace function public.refresh_member_risk_scores(p_branch_id uuid default null)
returns table (
  processed_count bigint,
  high_risk_count bigint,
  medium_risk_count bigint,
  low_risk_count bigint,
  logged_run_id uuid
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_rows_processed bigint := 0;
  v_high bigint := 0;
  v_medium bigint := 0;
  v_low bigint := 0;
  v_run_id uuid;
begin
  if auth.uid() is null or not (public.is_admin() or public.is_staff()) then
    raise exception 'Staff or admin access required';
  end if;

  if p_branch_id is not null and not (public.is_admin() or public.user_can_access_branch(p_branch_id)) then
    raise exception 'Branch access denied';
  end if;

  with attendance_summary as (
    select
      visits.profile_id,
      max(visits.checked_in_at) as last_check_in_at,
      count(*) filter (where visits.visit_date >= current_date - 30) as visits_last_30d
    from public.attendance_visits visits
    group by visits.profile_id
  ),
  outstanding_invoices as (
    select
      invoices.member_id,
      coalesce(sum(invoices.balance_due), 0)::numeric(10, 2) as outstanding_due
    from public.billing_invoices invoices
    where invoices.status in ('open', 'partial', 'overdue')
    group by invoices.member_id
  ),
  member_metrics as (
    select
      profiles.id as member_id,
      profiles.home_branch_id as branch_id,
      profiles.membership_status,
      profiles.membership_end_date,
      attendance_summary.last_check_in_at,
      attendance_summary.visits_last_30d,
      case
        when attendance_summary.last_check_in_at is null then null
        else (current_date - (attendance_summary.last_check_in_at::date))
      end as days_since_visit,
      case
        when profiles.membership_end_date is null then null
        else (profiles.membership_end_date - current_date)
      end as days_to_expiry,
      coalesce(outstanding_invoices.outstanding_due, 0)::numeric(10, 2) as outstanding_due
    from public.profiles
    left join attendance_summary on attendance_summary.profile_id = profiles.id
    left join outstanding_invoices on outstanding_invoices.member_id = profiles.id
    where profiles.role = 'member'
      and (p_branch_id is null or profiles.home_branch_id = p_branch_id)
  ),
  scored_members as (
    select
      member_metrics.member_id,
      member_metrics.branch_id,
      least(
        100,
        (
          case
            when member_metrics.membership_status in ('expired', 'cancelled', 'suspended') then 45
            else 0
          end
          + case
              when member_metrics.days_to_expiry is null then 0
              when member_metrics.days_to_expiry < 0 then 30
              when member_metrics.days_to_expiry <= 7 then 18
              when member_metrics.days_to_expiry <= 15 then 10
              else 0
            end
          + case
              when member_metrics.days_since_visit is null then 20
              when member_metrics.days_since_visit >= 30 then 28
              when member_metrics.days_since_visit >= 14 then 18
              when member_metrics.days_since_visit >= 7 then 8
              else 0
            end
          + case
              when member_metrics.outstanding_due >= 10000 then 20
              when member_metrics.outstanding_due > 0 then 10
              else 0
            end
        )
      )::numeric(5, 2) as risk_score,
      case
        when (
          case
            when member_metrics.membership_status in ('expired', 'cancelled', 'suspended') then 45
            else 0
          end
          + case
              when member_metrics.days_to_expiry is null then 0
              when member_metrics.days_to_expiry < 0 then 30
              when member_metrics.days_to_expiry <= 7 then 18
              when member_metrics.days_to_expiry <= 15 then 10
              else 0
            end
          + case
              when member_metrics.days_since_visit is null then 20
              when member_metrics.days_since_visit >= 30 then 28
              when member_metrics.days_since_visit >= 14 then 18
              when member_metrics.days_since_visit >= 7 then 8
              else 0
            end
          + case
              when member_metrics.outstanding_due >= 10000 then 20
              when member_metrics.outstanding_due > 0 then 10
              else 0
            end
        ) >= 70 then 'high'
        when (
          case
            when member_metrics.membership_status in ('expired', 'cancelled', 'suspended') then 45
            else 0
          end
          + case
              when member_metrics.days_to_expiry is null then 0
              when member_metrics.days_to_expiry < 0 then 30
              when member_metrics.days_to_expiry <= 7 then 18
              when member_metrics.days_to_expiry <= 15 then 10
              else 0
            end
          + case
              when member_metrics.days_since_visit is null then 20
              when member_metrics.days_since_visit >= 30 then 28
              when member_metrics.days_since_visit >= 14 then 18
              when member_metrics.days_since_visit >= 7 then 8
              else 0
            end
          + case
              when member_metrics.outstanding_due >= 10000 then 20
              when member_metrics.outstanding_due > 0 then 10
              else 0
            end
        ) >= 35 then 'medium'
        else 'low'
      end as risk_level,
      jsonb_build_object(
        'membership_status', member_metrics.membership_status,
        'days_since_visit', member_metrics.days_since_visit,
        'days_to_expiry', member_metrics.days_to_expiry,
        'outstanding_due', member_metrics.outstanding_due,
        'visits_last_30d', coalesce(member_metrics.visits_last_30d, 0)
      ) as risk_signals,
      member_metrics.last_check_in_at,
      member_metrics.membership_end_date,
      member_metrics.outstanding_due
    from member_metrics
  )
  insert into public.member_risk_scores (
    member_id,
    branch_id,
    risk_score,
    risk_level,
    risk_signals,
    last_check_in_at,
    membership_end_date,
    outstanding_due,
    calculated_at,
    model_version
  )
  select
    scored_members.member_id,
    scored_members.branch_id,
    scored_members.risk_score,
    scored_members.risk_level,
    scored_members.risk_signals,
    scored_members.last_check_in_at,
    scored_members.membership_end_date,
    scored_members.outstanding_due,
    timezone('utc', now()),
    'heuristic-v1'
  from scored_members
  on conflict (member_id, model_version) do update
  set
    branch_id = excluded.branch_id,
    risk_score = excluded.risk_score,
    risk_level = excluded.risk_level,
    risk_signals = excluded.risk_signals,
    last_check_in_at = excluded.last_check_in_at,
    membership_end_date = excluded.membership_end_date,
    outstanding_due = excluded.outstanding_due,
    calculated_at = excluded.calculated_at,
    updated_at = timezone('utc', now());

  get diagnostics v_rows_processed = row_count;

  select
    count(*) filter (where scores.risk_level = 'high'),
    count(*) filter (where scores.risk_level = 'medium'),
    count(*) filter (where scores.risk_level = 'low')
  into v_high, v_medium, v_low
  from public.member_risk_scores scores
  where scores.model_version = 'heuristic-v1'
    and (p_branch_id is null or scores.branch_id = p_branch_id);

  insert into public.analytics_model_runs (
    model_key,
    branch_id,
    run_status,
    rows_processed,
    summary,
    ran_by,
    ran_at
  )
  values (
    'member-risk-heuristic-v1',
    p_branch_id,
    'completed',
    v_rows_processed,
    jsonb_build_object(
      'high_risk_count', v_high,
      'medium_risk_count', v_medium,
      'low_risk_count', v_low
    ),
    auth.uid(),
    timezone('utc', now())
  )
  returning id into v_run_id;

  return query
  select v_rows_processed, v_high, v_medium, v_low, v_run_id;
end;
$$;

revoke all on function public.refresh_member_risk_scores(uuid) from public;
grant execute on function public.refresh_member_risk_scores(uuid) to authenticated;

create or replace function public.get_advanced_analytics_snapshot(p_branch_id uuid default null)
returns table (
  branch_id uuid,
  branch_name text,
  active_members bigint,
  at_risk_members bigint,
  high_risk_members bigint,
  expiring_this_month bigint,
  current_month_revenue numeric,
  projected_month_revenue numeric,
  current_month_expenses numeric,
  outstanding_dues numeric,
  forecast_gap numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not (public.is_admin() or public.is_staff()) then
    raise exception 'Staff or admin access required';
  end if;

  if p_branch_id is not null and not (public.is_admin() or public.user_can_access_branch(p_branch_id)) then
    raise exception 'Branch access denied';
  end if;

  return query
  select
    p_branch_id,
    coalesce(branches.name, 'All branches') as branch_name,
    coalesce((
      select count(*)::bigint
      from public.profiles profiles
      where profiles.role = 'member'
        and profiles.membership_status in ('trial', 'active')
        and (p_branch_id is null or profiles.home_branch_id = p_branch_id)
    ), 0) as active_members,
    coalesce((
      select count(*)::bigint
      from public.member_risk_scores scores
      where scores.model_version = 'heuristic-v1'
        and scores.risk_level in ('medium', 'high')
        and (p_branch_id is null or scores.branch_id = p_branch_id)
    ), 0) as at_risk_members,
    coalesce((
      select count(*)::bigint
      from public.member_risk_scores scores
      where scores.model_version = 'heuristic-v1'
        and scores.risk_level = 'high'
        and (p_branch_id is null or scores.branch_id = p_branch_id)
    ), 0) as high_risk_members,
    coalesce((
      select count(*)::bigint
      from public.profiles profiles
      where profiles.role = 'member'
        and profiles.membership_end_date >= date_trunc('month', current_date)::date
        and profiles.membership_end_date < (date_trunc('month', current_date) + interval '1 month')::date
        and (p_branch_id is null or profiles.home_branch_id = p_branch_id)
    ), 0) as expiring_this_month,
    coalesce((
      select sum(payments.amount)
      from public.billing_payments payments
      inner join public.billing_invoices invoices on invoices.id = payments.invoice_id
      where payments.payment_status = 'completed'
        and payments.payment_date >= date_trunc('month', current_date)::date
        and payments.payment_date < (date_trunc('month', current_date) + interval '1 month')::date
        and (p_branch_id is null or invoices.branch_id = p_branch_id)
    ), 0)::numeric as current_month_revenue,
    coalesce((
      select sum(forecasts.projected_revenue)
      from public.revenue_forecasts forecasts
      where forecasts.forecast_period = 'monthly'
        and forecasts.forecast_month = date_trunc('month', current_date)::date
        and (p_branch_id is null or forecasts.branch_id = p_branch_id)
    ), 0)::numeric as projected_month_revenue,
    coalesce((
      select sum(expenses.amount)
      from public.operating_expenses expenses
      where expenses.expense_date >= date_trunc('month', current_date)::date
        and expenses.expense_date < (date_trunc('month', current_date) + interval '1 month')::date
        and (p_branch_id is null or expenses.branch_id = p_branch_id)
    ), 0)::numeric as current_month_expenses,
    coalesce((
      select sum(invoices.balance_due)
      from public.billing_invoices invoices
      where invoices.status in ('open', 'partial', 'overdue')
        and (p_branch_id is null or invoices.branch_id = p_branch_id)
    ), 0)::numeric as outstanding_dues,
    (
      coalesce((
        select sum(forecasts.projected_revenue)
        from public.revenue_forecasts forecasts
        where forecasts.forecast_period = 'monthly'
          and forecasts.forecast_month = date_trunc('month', current_date)::date
          and (p_branch_id is null or forecasts.branch_id = p_branch_id)
      ), 0)::numeric
      -
      coalesce((
        select sum(payments.amount)
        from public.billing_payments payments
        inner join public.billing_invoices invoices on invoices.id = payments.invoice_id
        where payments.payment_status = 'completed'
          and payments.payment_date >= date_trunc('month', current_date)::date
          and payments.payment_date < (date_trunc('month', current_date) + interval '1 month')::date
          and (p_branch_id is null or invoices.branch_id = p_branch_id)
      ), 0)::numeric
    ) as forecast_gap
  from (select p_branch_id as id) requested
  left join public.gym_branches branches on branches.id = requested.id;
end;
$$;

revoke all on function public.get_advanced_analytics_snapshot(uuid) from public;
grant execute on function public.get_advanced_analytics_snapshot(uuid) to authenticated;

create or replace function public.list_members_at_risk(
  p_branch_id uuid default null,
  p_limit integer default 15
)
returns table (
  member_id uuid,
  full_name text,
  email text,
  branch_id uuid,
  branch_name text,
  risk_score numeric,
  risk_level text,
  last_check_in_at timestamp with time zone,
  membership_end_date date,
  outstanding_due numeric,
  days_since_visit integer,
  days_to_expiry integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    scores.member_id,
    profiles.full_name,
    profiles.email,
    scores.branch_id,
    branches.name as branch_name,
    scores.risk_score,
    scores.risk_level,
    scores.last_check_in_at,
    scores.membership_end_date,
    scores.outstanding_due,
    case
      when scores.last_check_in_at is null then null
      else (current_date - (scores.last_check_in_at::date))
    end as days_since_visit,
    case
      when scores.membership_end_date is null then null
      else (scores.membership_end_date - current_date)
    end as days_to_expiry
  from public.member_risk_scores scores
  inner join public.profiles profiles on profiles.id = scores.member_id
  left join public.gym_branches branches on branches.id = scores.branch_id
  where (public.is_admin() or public.is_staff())
    and scores.model_version = 'heuristic-v1'
    and (p_branch_id is null or scores.branch_id = p_branch_id)
  order by
    case scores.risk_level
      when 'high' then 0
      when 'medium' then 1
      else 2
    end,
    scores.risk_score desc,
    profiles.full_name asc
  limit greatest(coalesce(p_limit, 15), 1);
$$;

revoke all on function public.list_members_at_risk(uuid, integer) from public;
grant execute on function public.list_members_at_risk(uuid, integer) to authenticated;

create or replace function public.list_revenue_forecasts(
  p_branch_id uuid default null,
  p_limit integer default 6
)
returns table (
  id uuid,
  branch_id uuid,
  branch_name text,
  forecast_period text,
  forecast_month date,
  projected_revenue numeric,
  confirmed_revenue numeric,
  confidence_score integer,
  assumptions jsonb,
  created_at timestamp with time zone,
  updated_at timestamp with time zone
)
language sql
stable
security definer
set search_path = public
as $$
  select
    forecasts.id,
    forecasts.branch_id,
    branches.name as branch_name,
    forecasts.forecast_period,
    forecasts.forecast_month,
    forecasts.projected_revenue,
    forecasts.confirmed_revenue,
    forecasts.confidence_score,
    forecasts.assumptions,
    forecasts.created_at,
    forecasts.updated_at
  from public.revenue_forecasts forecasts
  inner join public.gym_branches branches on branches.id = forecasts.branch_id
  where (public.is_admin() or public.is_staff())
    and (p_branch_id is null or forecasts.branch_id = p_branch_id)
  order by forecasts.forecast_month desc, branches.name asc
  limit greatest(coalesce(p_limit, 6), 1);
$$;

revoke all on function public.list_revenue_forecasts(uuid, integer) from public;
grant execute on function public.list_revenue_forecasts(uuid, integer) to authenticated;

create or replace function public.list_trainer_performance_rankings(
  p_branch_id uuid default null,
  p_snapshot_month date default date_trunc('month', current_date)::date,
  p_limit integer default 10
)
returns table (
  trainer_id uuid,
  trainer_name text,
  branch_id uuid,
  branch_name text,
  snapshot_month date,
  sessions_completed integer,
  unique_members integer,
  avg_attendance numeric,
  member_retention_score numeric,
  pt_revenue numeric,
  commission_generated numeric,
  notes text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    snapshots.trainer_id,
    profiles.full_name as trainer_name,
    snapshots.branch_id,
    branches.name as branch_name,
    snapshots.snapshot_month,
    snapshots.sessions_completed,
    snapshots.unique_members,
    snapshots.avg_attendance,
    snapshots.member_retention_score,
    snapshots.pt_revenue,
    snapshots.commission_generated,
    snapshots.notes
  from public.trainer_performance_snapshots snapshots
  inner join public.profiles on profiles.id = snapshots.trainer_id
  inner join public.gym_branches branches on branches.id = snapshots.branch_id
  where (public.is_admin() or public.is_staff())
    and snapshots.snapshot_month = coalesce(p_snapshot_month, date_trunc('month', current_date)::date)
    and (p_branch_id is null or snapshots.branch_id = p_branch_id)
  order by snapshots.member_retention_score desc, snapshots.pt_revenue desc, profiles.full_name asc
  limit greatest(coalesce(p_limit, 10), 1);
$$;

revoke all on function public.list_trainer_performance_rankings(uuid, date, integer) from public;
grant execute on function public.list_trainer_performance_rankings(uuid, date, integer) to authenticated;

create or replace function public.list_member_retention_cohorts(
  p_branch_id uuid default null,
  p_limit integer default 6
)
returns table (
  cohort_month date,
  branch_name text,
  cohort_size bigint,
  active_now bigint,
  retention_rate numeric
)
language sql
stable
security definer
set search_path = public
as $$
  with cohorts as (
    select
      date_trunc('month', profiles.member_since)::date as cohort_month,
      profiles.home_branch_id as branch_id,
      count(*)::bigint as cohort_size,
      count(*) filter (where profiles.membership_status in ('trial', 'active'))::bigint as active_now
    from public.profiles
    where profiles.role = 'member'
      and profiles.member_since is not null
      and (p_branch_id is null or profiles.home_branch_id = p_branch_id)
    group by date_trunc('month', profiles.member_since)::date, profiles.home_branch_id
  )
  select
    cohorts.cohort_month,
    branches.name as branch_name,
    cohorts.cohort_size,
    cohorts.active_now,
    case
      when cohorts.cohort_size = 0 then 0
      else round((cohorts.active_now::numeric / cohorts.cohort_size::numeric) * 100, 2)
    end as retention_rate
  from cohorts
  left join public.gym_branches branches on branches.id = cohorts.branch_id
  where (public.is_admin() or public.is_staff())
  order by cohorts.cohort_month desc, branches.name asc nulls last
  limit greatest(coalesce(p_limit, 6), 1);
$$;

revoke all on function public.list_member_retention_cohorts(uuid, integer) from public;
grant execute on function public.list_member_retention_cohorts(uuid, integer) to authenticated;

create or replace function public.list_recent_analytics_model_runs(
  p_branch_id uuid default null,
  p_limit integer default 8
)
returns table (
  id uuid,
  model_key text,
  branch_id uuid,
  branch_name text,
  run_status text,
  rows_processed integer,
  summary jsonb,
  notes text,
  ran_at timestamp with time zone
)
language sql
stable
security definer
set search_path = public
as $$
  select
    runs.id,
    runs.model_key,
    runs.branch_id,
    branches.name as branch_name,
    runs.run_status,
    runs.rows_processed,
    runs.summary,
    runs.notes,
    runs.ran_at
  from public.analytics_model_runs runs
  left join public.gym_branches branches on branches.id = runs.branch_id
  where (public.is_admin() or public.is_staff())
    and (p_branch_id is null or runs.branch_id = p_branch_id)
  order by runs.ran_at desc
  limit greatest(coalesce(p_limit, 8), 1);
$$;

revoke all on function public.list_recent_analytics_model_runs(uuid, integer) from public;
grant execute on function public.list_recent_analytics_model_runs(uuid, integer) to authenticated;

create or replace function public.upsert_revenue_forecast(
  p_branch_id uuid,
  p_forecast_month date,
  p_forecast_period text default 'monthly',
  p_projected_revenue numeric default 0,
  p_confirmed_revenue numeric default 0,
  p_confidence_score integer default 70,
  p_assumptions jsonb default '{}'::jsonb
)
returns public.revenue_forecasts
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_record public.revenue_forecasts;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_branch_id is null or p_forecast_month is null then
    raise exception 'Branch and forecast month are required';
  end if;

  insert into public.revenue_forecasts (
    branch_id,
    forecast_period,
    forecast_month,
    projected_revenue,
    confirmed_revenue,
    confidence_score,
    assumptions,
    created_by,
    updated_by
  )
  values (
    p_branch_id,
    coalesce(nullif(btrim(coalesce(p_forecast_period, '')), ''), 'monthly'),
    date_trunc('month', p_forecast_month)::date,
    coalesce(p_projected_revenue, 0),
    coalesce(p_confirmed_revenue, 0),
    coalesce(p_confidence_score, 70),
    coalesce(p_assumptions, '{}'::jsonb),
    auth.uid(),
    auth.uid()
  )
  on conflict (branch_id, forecast_period, forecast_month) do update
  set
    projected_revenue = excluded.projected_revenue,
    confirmed_revenue = excluded.confirmed_revenue,
    confidence_score = excluded.confidence_score,
    assumptions = excluded.assumptions,
    updated_by = auth.uid(),
    updated_at = timezone('utc', now())
  returning * into saved_record;

  return saved_record;
end;
$$;

revoke all on function public.upsert_revenue_forecast(uuid, date, text, numeric, numeric, integer, jsonb) from public;
grant execute on function public.upsert_revenue_forecast(uuid, date, text, numeric, numeric, integer, jsonb) to authenticated;

create or replace function public.upsert_trainer_performance_snapshot(
  p_trainer_id uuid,
  p_branch_id uuid,
  p_snapshot_month date,
  p_sessions_completed integer default 0,
  p_unique_members integer default 0,
  p_avg_attendance numeric default 0,
  p_member_retention_score numeric default 0,
  p_pt_revenue numeric default 0,
  p_commission_generated numeric default 0,
  p_notes text default null
)
returns public.trainer_performance_snapshots
language plpgsql
security definer
set search_path = public
as $$
declare
  saved_record public.trainer_performance_snapshots;
begin
  if auth.uid() is null or not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if p_trainer_id is null or p_branch_id is null or p_snapshot_month is null then
    raise exception 'Trainer, branch, and snapshot month are required';
  end if;

  insert into public.trainer_performance_snapshots (
    trainer_id,
    branch_id,
    snapshot_month,
    sessions_completed,
    unique_members,
    avg_attendance,
    member_retention_score,
    pt_revenue,
    commission_generated,
    notes,
    created_by,
    updated_by
  )
  values (
    p_trainer_id,
    p_branch_id,
    date_trunc('month', p_snapshot_month)::date,
    greatest(coalesce(p_sessions_completed, 0), 0),
    greatest(coalesce(p_unique_members, 0), 0),
    greatest(coalesce(p_avg_attendance, 0), 0),
    greatest(least(coalesce(p_member_retention_score, 0), 100), 0),
    greatest(coalesce(p_pt_revenue, 0), 0),
    greatest(coalesce(p_commission_generated, 0), 0),
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid(),
    auth.uid()
  )
  on conflict (branch_id, trainer_id, snapshot_month) do update
  set
    sessions_completed = excluded.sessions_completed,
    unique_members = excluded.unique_members,
    avg_attendance = excluded.avg_attendance,
    member_retention_score = excluded.member_retention_score,
    pt_revenue = excluded.pt_revenue,
    commission_generated = excluded.commission_generated,
    notes = excluded.notes,
    updated_by = auth.uid(),
    updated_at = timezone('utc', now())
  returning * into saved_record;

  return saved_record;
end;
$$;

revoke all on function public.upsert_trainer_performance_snapshot(uuid, uuid, date, integer, integer, numeric, numeric, numeric, numeric, text) from public;
grant execute on function public.upsert_trainer_performance_snapshot(uuid, uuid, date, integer, integer, numeric, numeric, numeric, numeric, text) to authenticated;
