create or replace function public.generate_pos_sale_number()
returns text
language plpgsql
volatile
set search_path = public
as $$
begin
  return concat(
    'POS-',
    to_char(timezone('utc', now()), 'YYYYMMDDHH24MISS'),
    '-',
    upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6))
  );
end;
$$;

create table if not exists public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  sku text unique,
  name text not null,
  category text not null default 'supplement' check (category in ('supplement', 'merchandise', 'beverage', 'service', 'accessory', 'other')),
  description text,
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  cost_price numeric(12, 2) not null default 0 check (cost_price >= 0),
  current_stock integer not null default 0 check (current_stock >= 0),
  reorder_level integer not null default 0 check (reorder_level >= 0),
  is_stock_tracked boolean not null default true,
  is_active boolean not null default true,
  created_by uuid references public.profiles (id) on delete set null,
  updated_by uuid references public.profiles (id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.pos_sales (
  id uuid primary key default gen_random_uuid(),
  sale_number text not null unique default public.generate_pos_sale_number(),
  customer_id uuid references public.profiles (id) on delete set null,
  customer_name text,
  customer_email text,
  sale_status text not null default 'completed' check (sale_status in ('draft', 'completed', 'voided', 'refunded')),
  payment_status text not null default 'paid' check (payment_status in ('pending', 'paid', 'partially_paid', 'refunded')),
  payment_method text not null default 'cash' check (payment_method in ('cash', 'upi', 'card', 'bank_transfer', 'wallet', 'other')),
  subtotal_amount numeric(12, 2) not null default 0 check (subtotal_amount >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  tax_amount numeric(12, 2) not null default 0 check (tax_amount >= 0),
  total_amount numeric(12, 2) not null default 0 check (total_amount >= 0),
  received_amount numeric(12, 2) not null default 0 check (received_amount >= 0),
  change_amount numeric(12, 2) not null default 0 check (change_amount >= 0),
  notes text,
  sold_by uuid references public.profiles (id) on delete set null,
  sold_at timestamp with time zone not null default timezone('utc', now()),
  created_at timestamp with time zone not null default timezone('utc', now()),
  updated_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.pos_sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.pos_sales (id) on delete cascade,
  inventory_item_id uuid references public.inventory_items (id) on delete set null,
  item_name text not null,
  item_category text,
  quantity integer not null default 1 check (quantity > 0),
  unit_price numeric(12, 2) not null default 0 check (unit_price >= 0),
  unit_cost numeric(12, 2) not null default 0 check (unit_cost >= 0),
  line_discount numeric(12, 2) not null default 0 check (line_discount >= 0),
  line_total numeric(12, 2) not null default 0 check (line_total >= 0),
  stock_impact integer not null default 0,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create table if not exists public.pos_stock_movements (
  id uuid primary key default gen_random_uuid(),
  inventory_item_id uuid not null references public.inventory_items (id) on delete cascade,
  movement_type text not null default 'adjustment' check (movement_type in ('purchase', 'sale', 'adjustment', 'return', 'damage', 'opening_stock', 'correction')),
  quantity_delta integer not null,
  previous_stock integer not null default 0,
  next_stock integer not null default 0,
  reference_sale_id uuid references public.pos_sales (id) on delete set null,
  reference_note text,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamp with time zone not null default timezone('utc', now())
);

create index if not exists inventory_items_category_active_idx
  on public.inventory_items (category, is_active, name);

create index if not exists inventory_items_low_stock_idx
  on public.inventory_items (is_active, is_stock_tracked, reorder_level, current_stock);

create index if not exists pos_sales_sold_at_idx
  on public.pos_sales (sold_at desc);

create index if not exists pos_sales_customer_id_idx
  on public.pos_sales (customer_id, sold_at desc);

create index if not exists pos_sale_items_sale_id_idx
  on public.pos_sale_items (sale_id);

create index if not exists pos_stock_movements_item_created_idx
  on public.pos_stock_movements (inventory_item_id, created_at desc);

alter table public.inventory_items enable row level security;
alter table public.pos_sales enable row level security;
alter table public.pos_sale_items enable row level security;
alter table public.pos_stock_movements enable row level security;

drop trigger if exists set_inventory_items_updated_at on public.inventory_items;
create trigger set_inventory_items_updated_at
before update on public.inventory_items
for each row execute function public.set_updated_at();

drop trigger if exists set_pos_sales_updated_at on public.pos_sales;
create trigger set_pos_sales_updated_at
before update on public.pos_sales
for each row execute function public.set_updated_at();

drop policy if exists "Staff can view inventory items" on public.inventory_items;
create policy "Staff can view inventory items"
on public.inventory_items
for select
using (public.is_staff());

drop policy if exists "Staff can manage inventory items" on public.inventory_items;
create policy "Staff can manage inventory items"
on public.inventory_items
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Staff can view POS sales" on public.pos_sales;
create policy "Staff can view POS sales"
on public.pos_sales
for select
to authenticated
using (public.is_staff());

drop policy if exists "Staff can manage POS sales" on public.pos_sales;
create policy "Staff can manage POS sales"
on public.pos_sales
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Staff can view POS sale items" on public.pos_sale_items;
create policy "Staff can view POS sale items"
on public.pos_sale_items
for select
to authenticated
using (public.is_staff());

drop policy if exists "Staff can manage POS sale items" on public.pos_sale_items;
create policy "Staff can manage POS sale items"
on public.pos_sale_items
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "Staff can view stock movements" on public.pos_stock_movements;
create policy "Staff can view stock movements"
on public.pos_stock_movements
for select
to authenticated
using (public.is_staff());

drop policy if exists "Staff can manage stock movements" on public.pos_stock_movements;
create policy "Staff can manage stock movements"
on public.pos_stock_movements
for all
to authenticated
using (public.is_staff())
with check (public.is_staff());

create or replace function public.adjust_inventory_stock(
  p_item_id uuid,
  p_quantity_delta integer,
  p_movement_type text default 'adjustment',
  p_reference_note text default null
)
returns public.inventory_items
language plpgsql
security definer
set search_path = public
as $$
declare
  target_item public.inventory_items;
  previous_stock integer;
  next_stock integer;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  if p_item_id is null then
    raise exception 'Inventory item is required';
  end if;

  if p_quantity_delta is null or p_quantity_delta = 0 then
    raise exception 'Quantity delta must be a non-zero integer.';
  end if;

  if coalesce(p_movement_type, 'adjustment') not in ('purchase', 'adjustment', 'return', 'damage', 'opening_stock', 'correction') then
    raise exception 'Unsupported stock movement type.';
  end if;

  select *
  into target_item
  from public.inventory_items
  where id = p_item_id
  for update;

  if target_item.id is null then
    raise exception 'Inventory item not found.';
  end if;

  if not coalesce(target_item.is_stock_tracked, false) then
    raise exception 'This item is configured as a service and does not track stock.';
  end if;

  previous_stock := coalesce(target_item.current_stock, 0);
  next_stock := previous_stock + p_quantity_delta;

  if next_stock < 0 then
    raise exception 'Stock cannot drop below zero.';
  end if;

  update public.inventory_items
  set
    current_stock = next_stock,
    updated_by = auth.uid(),
    updated_at = timezone('utc', now())
  where id = p_item_id
  returning * into target_item;

  insert into public.pos_stock_movements (
    inventory_item_id,
    movement_type,
    quantity_delta,
    previous_stock,
    next_stock,
    reference_note,
    created_by
  )
  values (
    p_item_id,
    coalesce(p_movement_type, 'adjustment'),
    p_quantity_delta,
    previous_stock,
    next_stock,
    nullif(btrim(coalesce(p_reference_note, '')), ''),
    auth.uid()
  );

  return target_item;
end;
$$;

revoke all on function public.adjust_inventory_stock(uuid, integer, text, text) from public;
grant execute on function public.adjust_inventory_stock(uuid, integer, text, text) to authenticated;

create or replace function public.record_pos_sale(
  p_customer_id uuid default null,
  p_customer_name text default null,
  p_customer_email text default null,
  p_payment_method text default 'cash',
  p_discount_amount numeric default 0,
  p_tax_amount numeric default 0,
  p_notes text default null,
  p_items jsonb default '[]'::jsonb
)
returns public.pos_sales
language plpgsql
security definer
set search_path = public
as $$
declare
  sale_record public.pos_sales;
  member_record public.profiles;
  item_entry jsonb;
  inventory_record public.inventory_items;
  line_quantity integer;
  line_total numeric(12, 2);
  subtotal_amount numeric(12, 2) := 0;
  discount_amount numeric(12, 2) := greatest(coalesce(p_discount_amount, 0), 0);
  tax_amount numeric(12, 2) := greatest(coalesce(p_tax_amount, 0), 0);
  total_amount numeric(12, 2);
  previous_stock integer;
  next_stock integer;
begin
  if auth.uid() is null or not public.is_staff() then
    raise exception 'Staff access required';
  end if;

  if jsonb_typeof(coalesce(p_items, '[]'::jsonb)) <> 'array' or jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Add at least one sale line item.';
  end if;

  if coalesce(p_payment_method, 'cash') not in ('cash', 'upi', 'card', 'bank_transfer', 'wallet', 'other') then
    raise exception 'Unsupported payment method.';
  end if;

  if p_customer_id is not null then
    select *
    into member_record
    from public.profiles
    where id = p_customer_id;
  end if;

  for item_entry in
    select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    if nullif(btrim(coalesce(item_entry ->> 'inventory_item_id', '')), '') is null then
      raise exception 'Each line item requires an inventory item id.';
    end if;

    line_quantity := greatest(coalesce((item_entry ->> 'quantity')::integer, 0), 0);
    if line_quantity <= 0 then
      raise exception 'Each line item quantity must be greater than zero.';
    end if;

    select *
    into inventory_record
    from public.inventory_items
    where id = (item_entry ->> 'inventory_item_id')::uuid
    for update;

    if inventory_record.id is null or not inventory_record.is_active then
      raise exception 'Selected inventory item is not available.';
    end if;

    if inventory_record.is_stock_tracked and coalesce(inventory_record.current_stock, 0) < line_quantity then
      raise exception 'Only % unit(s) of % remain in stock.', inventory_record.current_stock, inventory_record.name;
    end if;

    subtotal_amount := subtotal_amount + (coalesce(inventory_record.unit_price, 0) * line_quantity);
  end loop;

  total_amount := greatest(subtotal_amount + tax_amount - discount_amount, 0);

  insert into public.pos_sales (
    customer_id,
    customer_name,
    customer_email,
    sale_status,
    payment_status,
    payment_method,
    subtotal_amount,
    discount_amount,
    tax_amount,
    total_amount,
    received_amount,
    change_amount,
    notes,
    sold_by,
    sold_at
  )
  values (
    p_customer_id,
    coalesce(nullif(btrim(coalesce(p_customer_name, '')), ''), member_record.full_name, member_record.email, 'Walk-in'),
    coalesce(nullif(btrim(coalesce(p_customer_email, '')), ''), member_record.email),
    'completed',
    'paid',
    coalesce(p_payment_method, 'cash'),
    subtotal_amount,
    discount_amount,
    tax_amount,
    total_amount,
    total_amount,
    0,
    nullif(btrim(coalesce(p_notes, '')), ''),
    auth.uid(),
    timezone('utc', now())
  )
  returning * into sale_record;

  for item_entry in
    select value from jsonb_array_elements(coalesce(p_items, '[]'::jsonb))
  loop
    line_quantity := greatest(coalesce((item_entry ->> 'quantity')::integer, 0), 0);

    select *
    into inventory_record
    from public.inventory_items
    where id = (item_entry ->> 'inventory_item_id')::uuid
    for update;

    line_total := coalesce(inventory_record.unit_price, 0) * line_quantity;

    insert into public.pos_sale_items (
      sale_id,
      inventory_item_id,
      item_name,
      item_category,
      quantity,
      unit_price,
      unit_cost,
      line_discount,
      line_total,
      stock_impact
    )
    values (
      sale_record.id,
      inventory_record.id,
      inventory_record.name,
      inventory_record.category,
      line_quantity,
      coalesce(inventory_record.unit_price, 0),
      coalesce(inventory_record.cost_price, 0),
      0,
      line_total,
      case when inventory_record.is_stock_tracked then line_quantity else 0 end
    );

    if inventory_record.is_stock_tracked then
      previous_stock := coalesce(inventory_record.current_stock, 0);
      next_stock := greatest(previous_stock - line_quantity, 0);

      update public.inventory_items
      set
        current_stock = next_stock,
        updated_by = auth.uid(),
        updated_at = timezone('utc', now())
      where id = inventory_record.id
      returning * into inventory_record;

      insert into public.pos_stock_movements (
        inventory_item_id,
        movement_type,
        quantity_delta,
        previous_stock,
        next_stock,
        reference_sale_id,
        reference_note,
        created_by
      )
      values (
        inventory_record.id,
        'sale',
        line_quantity * -1,
        previous_stock,
        next_stock,
        sale_record.id,
        coalesce(nullif(btrim(coalesce(p_notes, '')), ''), concat('POS sale ', sale_record.sale_number)),
        auth.uid()
      );
    end if;
  end loop;

  return sale_record;
end;
$$;

revoke all on function public.record_pos_sale(uuid, text, text, text, numeric, numeric, text, jsonb) from public;
grant execute on function public.record_pos_sale(uuid, text, text, text, numeric, numeric, text, jsonb) to authenticated;
