-- Repair for Patch 13.1: make membership_plans.plan_code use a real unique constraint

alter table public.membership_plans
  add column if not exists plan_code text;

update public.membership_plans
set plan_code = coalesce(
  nullif(btrim(plan_code), ''),
  lower(regexp_replace(name, '[^a-zA-Z0-9]+', '_', 'g'))
)
where plan_code is null
   or nullif(btrim(plan_code), '') is null;

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
