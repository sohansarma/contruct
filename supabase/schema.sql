-- BuildRun database schema for Supabase (Postgres).
-- Run once in Supabase → SQL Editor, then run `npm run seed` to load the catalog.
-- Every table has Row Level Security: customers only ever see their own rows,
-- and anything money-related goes through SECURITY DEFINER functions that
-- re-validate on the server.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- catalog
create table if not exists categories (
  id text primary key,
  sort int not null default 0,
  data jsonb not null
);

create table if not exists products (
  id text primary key,
  category_id text not null references categories(id),
  data jsonb not null,             -- { name, brand, unit, variants:[{id,label,price,mrp}], specs, returnable, heavy, tag, image }
  in_stock boolean not null default true,
  active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists pincodes (
  pincode text primary key,
  cod boolean not null default true,
  active boolean not null default true
);

create table if not exists coupons (
  code text primary key,
  type text not null check (type in ('percent','flat','freeDelivery')),
  value numeric not null default 0,
  max_discount numeric,
  min_cart numeric not null default 0,
  first_order_only boolean not null default false,
  active boolean not null default true
);

create table if not exists settings (
  id int primary key default 1 check (id = 1),
  free_delivery_above numeric not null default 999,
  delivery_fee numeric not null default 49,
  handling_fee numeric not null default 9,
  heavy_item_fee numeric not null default 10,
  cancel_window_min int not null default 10,
  return_window_hours int not null default 24
);
insert into settings (id) values (1) on conflict do nothing;

-- ---------------------------------------------------------------- people
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text,
  name text,
  email text,
  gstin text,
  business_name text,
  is_admin boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- orders & money
create table if not exists payments (
  id text primary key,                 -- gateway payment id
  gateway_order_id text not null,
  user_id uuid references auth.users(id),
  amount numeric not null,             -- rupees
  verified boolean not null default false,
  used_by_order text,
  created_at timestamptz not null default now()
);

create table if not exists orders (
  id text primary key,
  user_id uuid not null references auth.users(id),
  status text not null default 'placed'
    check (status in ('placed','confirmed','packed','out_for_delivery','delivered','cancelled','return_requested','returned')),
  data jsonb not null,                 -- items, address, bill, payment, slot, note, history, refund…
  total numeric not null,
  delivered_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists orders_user_idx on orders(user_id, created_at desc);
create index if not exists orders_status_idx on orders(status);

create table if not exists wallet_txns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  amount numeric not null,
  note text,
  order_id text,
  created_at timestamptz not null default now()
);

create table if not exists refunds (
  id uuid primary key default gen_random_uuid(),
  order_id text not null references orders(id),
  amount numeric not null,
  destination text not null check (destination in ('source','wallet')),
  payment_id text,
  status text not null default 'pending' check (status in ('pending','processed','failed')),
  created_at timestamptz not null default now()
);

create table if not exists quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  data jsonb not null,
  status text not null default 'new',
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------- helpers
create or replace function is_admin() returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$;

-- create profile row on signup
create or replace function handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, phone) values (new.id, new.phone) on conflict do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function handle_new_user();

-- ---------------------------------------------------------------- RLS
alter table categories enable row level security;
alter table products enable row level security;
alter table pincodes enable row level security;
alter table coupons enable row level security;
alter table settings enable row level security;
alter table profiles enable row level security;
alter table addresses enable row level security;
alter table payments enable row level security;
alter table orders enable row level security;
alter table wallet_txns enable row level security;
alter table refunds enable row level security;
alter table quotes enable row level security;

drop policy if exists "read catalog" on categories;      create policy "read catalog" on categories for select using (true);
drop policy if exists "read products" on products;       create policy "read products" on products for select using (true);
drop policy if exists "read pincodes" on pincodes;       create policy "read pincodes" on pincodes for select using (true);
drop policy if exists "read coupons" on coupons;         create policy "read coupons" on coupons for select using (active);
drop policy if exists "read settings" on settings;       create policy "read settings" on settings for select using (true);
drop policy if exists "admin catalog" on products;       create policy "admin catalog" on products for all using (is_admin()) with check (is_admin());
drop policy if exists "admin cats" on categories;        create policy "admin cats" on categories for all using (is_admin()) with check (is_admin());

drop policy if exists "own profile" on profiles;
create policy "own profile" on profiles for select using (id = auth.uid() or is_admin());
drop policy if exists "update own profile" on profiles;
create policy "update own profile" on profiles for insert with check (id = auth.uid());
drop policy if exists "update own profile2" on profiles;
create policy "update own profile2" on profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- customers can't make themselves admin; only the service role / SQL editor can
create or replace function protect_admin_flag() returns trigger language plpgsql as $$
begin
  if new.is_admin is distinct from old.is_admin and coalesce(auth.role(), '') <> 'service_role' and auth.uid() is not null then
    new.is_admin := old.is_admin;
  end if;
  return new;
end $$;
drop trigger if exists protect_admin on profiles;
create trigger protect_admin before update on profiles for each row execute function protect_admin_flag();

drop policy if exists "own addresses" on addresses;
create policy "own addresses" on addresses for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own orders" on orders;
create policy "own orders" on orders for select using (user_id = auth.uid() or is_admin());
-- no insert/update policies: orders change only through the functions below

drop policy if exists "own wallet" on wallet_txns;
create policy "own wallet" on wallet_txns for select using (user_id = auth.uid() or is_admin());

drop policy if exists "admin refunds" on refunds;
create policy "admin refunds" on refunds for all using (is_admin()) with check (is_admin());

drop policy if exists "insert quotes" on quotes;
create policy "insert quotes" on quotes for insert with check (user_id is null or user_id = auth.uid());
drop policy if exists "admin quotes" on quotes;
create policy "admin quotes" on quotes for select using (is_admin());

-- ---------------------------------------------------------------- order functions
create or replace function wallet_balance(uid uuid) returns numeric language sql stable security definer set search_path = public as $$
  select coalesce(sum(amount), 0) from wallet_txns where user_id = uid;
$$;

create or replace function place_order(payload jsonb) returns orders
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s settings;
  item jsonb;
  v jsonb;
  items jsonb := '[]'::jsonb;
  item_total numeric := 0;
  heavy_units int := 0;
  delivery numeric; handling numeric; loading numeric;
  discount numeric := 0;
  c coupons;
  prior int;
  wallet_use numeric := 0;
  total numeric;
  pay jsonb := payload->'payment';
  pin text := payload->'address'->>'pincode';
  oid text := 'BR' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  o orders;
  history jsonb;
begin
  if uid is null then raise exception 'Not signed in'; end if;
  select * into s from settings where id = 1;
  if not exists (select 1 from pincodes where pincode = pin and active) then raise exception 'We do not deliver to % yet', pin; end if;

  -- re-price every line from the catalog; never trust client prices
  for item in select * from jsonb_array_elements(payload->'items') loop
    select vv into v from products p, jsonb_array_elements(p.data->'variants') vv
      where p.id = item->>'productId' and vv->>'id' = item->>'variantId' and p.active and p.in_stock;
    if v is null then raise exception 'An item in your cart is unavailable'; end if;
    if (item->>'qty')::int < 1 or (item->>'qty')::int > 999 then raise exception 'Invalid quantity'; end if;
    item_total := item_total + (v->>'price')::numeric * (item->>'qty')::int;
    if (item->>'heavy')::boolean then heavy_units := heavy_units + (item->>'qty')::int; end if;
    items := items || jsonb_set(jsonb_set(item, '{price}', v->'price'), '{mrp}', v->'mrp');
  end loop;
  if jsonb_array_length(items) = 0 then raise exception 'Cart is empty'; end if;

  delivery := case when item_total >= s.free_delivery_above then 0 else s.delivery_fee end;
  handling := s.handling_fee;
  loading := heavy_units * s.heavy_item_fee;

  if coalesce(payload->'bill'->>'coupon', '') <> '' then
    select * into c from coupons where code = upper(payload->'bill'->>'coupon') and active;
    select count(*) into prior from orders where user_id = uid and status <> 'cancelled';
    if c.code is not null and item_total >= c.min_cart and (not c.first_order_only or prior = 0) then
      if c.type = 'percent' then discount := least(round(item_total * c.value / 100), coalesce(c.max_discount, 1e12)); end if;
      if c.type = 'flat' then discount := least(c.value, item_total); end if;
      if c.type = 'freeDelivery' then delivery := 0; end if;
    end if;
  end if;

  total := greatest(0, item_total + delivery + handling + loading - discount);
  if coalesce((payload->'bill'->>'wallet')::numeric, 0) > 0 then
    wallet_use := least((payload->'bill'->>'wallet')::numeric, wallet_balance(uid), total);
  end if;
  total := total - wallet_use;

  -- payment checks
  if pay->>'method' = 'cod' then
    if not exists (select 1 from pincodes where pincode = pin and cod) then raise exception 'Pay on delivery not available here'; end if;
    pay := jsonb_set(pay, '{status}', '"pending"');
  elsif total = 0 then
    pay := jsonb_build_object('method', 'wallet_credit', 'status', 'paid');
  else
    perform 1 from payments where id = pay->>'ref' and verified and used_by_order is null and user_id = uid and amount >= total for update;
    if not found then raise exception 'Payment not verified'; end if;
    update payments set used_by_order = oid where id = pay->>'ref';
    pay := jsonb_set(pay, '{status}', '"paid"');
  end if;

  history := jsonb_build_array(jsonb_build_object('status', 'placed', 'at', (extract(epoch from now()) * 1000)::bigint));
  insert into orders (id, user_id, status, total, data) values (
    oid, uid, 'placed', total,
    jsonb_build_object(
      'items', items, 'address', payload->'address', 'slot', payload->'slot', 'etaMinutes', payload->'etaMinutes',
      'note', payload->'note', 'gstin', payload->'gstin', 'businessName', payload->'businessName',
      'payment', pay, 'history', history,
      'bill', jsonb_build_object('itemTotal', item_total, 'mrpTotal', payload->'bill'->'mrpTotal', 'delivery', delivery, 'handling', handling,
        'loading', loading, 'discount', discount, 'coupon', case when discount > 0 or (c.code is not null and c.type = 'freeDelivery') then c.code end,
        'wallet', wallet_use, 'total', total, 'savings', payload->'bill'->'savings')
    )
  ) returning * into o;

  if wallet_use > 0 then insert into wallet_txns (user_id, amount, note, order_id) values (uid, -wallet_use, 'Used on order ' || oid, oid); end if;
  return o;
end $$;

create or replace function _push_history(o orders, st text) returns jsonb language sql immutable as $$
  select jsonb_set(o.data, '{history}', coalesce(o.data->'history', '[]'::jsonb) || jsonb_build_object('status', st, 'at', (extract(epoch from now()) * 1000)::bigint));
$$;

create or replace function _issue_refund(o orders, amount numeric) returns orders language plpgsql security definer set search_path = public as $$
declare dest text := case when o.data->'payment'->>'method' in ('cod','wallet_credit') then 'wallet' else 'source' end;
begin
  if amount <= 0 then return o; end if;
  insert into refunds (order_id, amount, destination, payment_id, status)
    values (o.id, amount, dest, o.data->'payment'->>'ref', case when dest = 'wallet' then 'processed' else 'pending' end);
  if dest = 'wallet' then insert into wallet_txns (user_id, amount, note, order_id) values (o.user_id, amount, 'Refund · ' || o.id, o.id); end if;
  update orders set data = jsonb_set(data, '{refund}', jsonb_build_object('amount', amount, 'to', dest, 'at', (extract(epoch from now()) * 1000)::bigint))
    where id = o.id returning * into o;
  return o;
end $$;

create or replace function cancel_order(order_id text, reason text) returns orders
language plpgsql security definer set search_path = public as $$
declare o orders; s settings; w numeric;
begin
  select * into s from settings where id = 1;
  select * into o from orders where id = order_id for update;
  if o.id is null or (o.user_id <> auth.uid() and not is_admin()) then raise exception 'Order not found'; end if;
  if not is_admin() and (o.status not in ('placed','confirmed') or now() - o.created_at > make_interval(mins => s.cancel_window_min)) then
    raise exception 'This order can no longer be cancelled';
  end if;
  update orders set status = 'cancelled', data = jsonb_set(_push_history(o, 'cancelled'), '{cancelReason}', to_jsonb(reason)) where id = order_id returning * into o;
  w := coalesce((o.data->'bill'->>'wallet')::numeric, 0);
  if w > 0 then insert into wallet_txns (user_id, amount, note, order_id) values (o.user_id, w, 'Credit restored · ' || o.id, o.id); end if;
  if o.data->'payment'->>'status' = 'paid' then o := _issue_refund(o, o.total); end if;
  return o;
end $$;

create or replace function request_return(order_id text, req jsonb) returns orders
language plpgsql security definer set search_path = public as $$
declare o orders; s settings;
begin
  select * into s from settings where id = 1;
  select * into o from orders where id = order_id for update;
  if o.id is null or o.user_id <> auth.uid() then raise exception 'Order not found'; end if;
  if o.status <> 'delivered' or o.delivered_at is null or now() - o.delivered_at > make_interval(hours => s.return_window_hours) then
    raise exception 'The return window has closed';
  end if;
  update orders set status = 'return_requested',
    data = jsonb_set(_push_history(o, 'return_requested'), '{returnRequest}', req || jsonb_build_object('at', (extract(epoch from now()) * 1000)::bigint))
    where id = order_id returning * into o;
  return o;
end $$;

create or replace function admin_set_status(order_id text, new_status text) returns orders
language plpgsql security definer set search_path = public as $$
declare o orders; amt numeric;
begin
  if not is_admin() then raise exception 'Admins only'; end if;
  if new_status = 'cancelled' then return cancel_order(order_id, 'Cancelled by store'); end if;
  select * into o from orders where id = order_id for update;
  update orders set status = new_status, data = _push_history(o, new_status),
    delivered_at = case when new_status = 'delivered' then coalesce(delivered_at, now()) else delivered_at end
    where id = order_id returning * into o;
  if new_status = 'delivered' and o.data->'payment'->>'method' = 'cod' then
    update orders set data = jsonb_set(data, '{payment,status}', '"paid"') where id = order_id returning * into o;
  end if;
  if new_status = 'returned' then
    select coalesce(sum((i->>'price')::numeric * (i->>'qty')::int), 0) into amt
      from jsonb_array_elements(o.data->'items') i
      where i->>'key' in (select jsonb_array_elements_text(o.data->'returnRequest'->'itemIds'));
    o := _issue_refund(o, amt);
  end if;
  return o;
end $$;

-- Realtime: let the app subscribe to its own order updates (optional)
do $$ begin
  alter publication supabase_realtime add table orders;
exception when others then null; end $$;
