-- Patch 14: reports, analytics, targets, and saved presets

create table if not exists public.finance_targets (
  id uuid primary key default gen_random_uuid(),
  target_month date not null,
  collections_target numeric(10, 2) not null default 0 check (collections_target >= 0),
  expense_cap numeric(10, 2) not null default 0 check (expense_cap >= 0),
  active_members_target integer not null default 0 check (active_members_target >= 0),
  renewals_target integer not null default 0 check (renewals_target >= 0),
  notes text,
  created_by uuid references auth.users on delete set null,
  updated_by uuid references auth.users on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create unique index if not exists finance_targets_target_month_uidx
  on public.finance_targets (target_month);

create table if not exists public.report_presets (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  scope text not null default 'admin_reports' check (scope in ('admin_reports', 'admin_finance', 'exports')),
  filters jsonb not null default '{}'::jsonb,
  export_sections jsonb not null default '[]'::jsonb,
  created_by uuid references auth.users on delete set null,
  updated_by uuid references auth.users on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now()),
  constraint report_presets_filters_object check (jsonb_typeof(filters) = 'object'),
  constraint report_presets_sections_array check (jsonb_typeof(export_sections) = 'array')
);

create unique index if not exists report_presets_scope_name_uidx
  on public.report_presets (scope, lower(name));

drop trigger if exists set_finance_targets_updated_at on public.finance_targets;
create trigger set_finance_targets_updated_at
before update on public.finance_targets
for each row execute function public.set_updated_at();

drop trigger if exists set_report_presets_updated_at on public.report_presets;
create trigger set_report_presets_updated_at
before update on public.report_presets
for each row execute function public.set_updated_at();

alter table public.finance_targets enable row level security;
alter table public.report_presets enable row level security;

drop policy if exists "Admins can manage finance targets" on public.finance_targets;
create policy "Admins can manage finance targets"
on public.finance_targets
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "Admins can manage report presets" on public.report_presets;
create policy "Admins can manage report presets"
on public.report_presets
for all
to authenticated
using (public.is_admin())
with check (public.is_admin());
