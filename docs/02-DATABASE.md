# 02. Database (PostgreSQL on Supabase)

Create these as migration files in `supabase/migrations/` in this order. **Phases 1-5 are given as complete SQL.** Later phases are given as column lists; write their SQL in the same style when you reach them (new migration file per phase).

## Global rules
- Every business table has: `id uuid pk default gen_random_uuid()`, `organization_id uuid not null default public.current_org_id()`, `created_at`, `created_by uuid default auth.uid()`, `updated_at`, `deleted_at` (soft delete).
- **RLS enabled on every table.** Tenant isolation via `organization_id = public.current_org_id()`.
- Writes to invoices are done ONLY through the `SECURITY DEFINER` functions below (clients get no direct insert/update on invoices).
- Money: `numeric(14,2)`. Quantities = whole numbers. Every variant has ONE price and ONE unit (`dozen` or `piece`, saved in `rates`). Amount = quantity x price. The unit is only a label; nothing is ever converted between dozen and piece.
- Soft delete: set `deleted_at`; app queries filter `deleted_at is null`.
- Never edit an applied migration; add a new one.

---
## `0001_core.sql`: organizations, profiles, helper functions
```sql
create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  phone text,
  logo_url text,
  invoice_footer_note text default 'Thank you for your business',
  status text not null default 'active' check (status in ('active','suspended')),
  subscription_ends_at date,
  enforce_stock boolean not null default false,
  timezone text not null default 'Asia/Karachi',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid references public.organizations(id),
  full_name text not null,
  role text not null check (role in ('super_admin','admin','employee')),
  language text not null default 'en' check (language in ('en','ur')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((role = 'super_admin' and organization_id is null) or (role <> 'super_admin' and organization_id is not null))
);

-- Organization of the logged-in user (null if inactive user or suspended organization)
create or replace function public.current_org_id() returns uuid
language sql stable security definer set search_path = public as $$
  select p.organization_id
  from public.profiles p
  join public.organizations o on o.id = p.organization_id
  where p.user_id = auth.uid() and p.is_active and o.status = 'active'
$$;

create or replace function public.current_role_name() returns text
language sql stable security definer set search_path = public as $$
  select p.role from public.profiles p where p.user_id = auth.uid() and p.is_active
$$;

create or replace function public.is_org_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_name() = 'admin', false) and public.current_org_id() is not null
$$;

create or replace function public.is_super_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.current_role_name() = 'super_admin', false)
$$;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;

create policy org_select on public.organizations for select to authenticated
  using (id = public.current_org_id() or public.is_super_admin());
create policy org_update on public.organizations for update to authenticated
  using ((id = public.current_org_id() and public.is_org_admin()) or public.is_super_admin())
  with check ((id = public.current_org_id() and public.is_org_admin()) or public.is_super_admin());
create policy org_insert on public.organizations for insert to authenticated
  with check (public.is_super_admin());

create policy profiles_select on public.profiles for select to authenticated
  using (user_id = auth.uid() or (organization_id = public.current_org_id() and public.is_org_admin()) or public.is_super_admin());
-- profiles are created/changed only by server code using the service role key.

create trigger organizations_updated before update on public.organizations
  for each row execute function public.set_updated_at();
```

## `0002_audit.sql`: audit log
```sql
create table public.audit_log (
  id bigint generated always as identity primary key,
  organization_id uuid,
  user_id uuid,
  table_name text not null,
  record_id text,
  action text not null check (action in ('insert','update','delete')),
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz not null default now()
);
create index on public.audit_log (organization_id, created_at desc);
create index on public.audit_log (table_name, record_id);
alter table public.audit_log enable row level security;
create policy audit_select on public.audit_log for select to authenticated
  using ((organization_id = public.current_org_id() and public.is_org_admin()) or public.is_super_admin());
-- no insert/update/delete policies: only the trigger below writes.

create or replace function public.audit_trigger() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_org uuid; v_id text; v_row jsonb;
begin
  v_row := case when tg_op = 'DELETE' then to_jsonb(old) else to_jsonb(new) end;
  v_org := coalesce((v_row->>'organization_id')::uuid, case when tg_table_name = 'organizations' then (v_row->>'id')::uuid end);
  v_id  := coalesce(v_row->>'id', v_row->>'user_id');
  insert into public.audit_log(organization_id, user_id, table_name, record_id, action, old_data, new_data)
  values (v_org, auth.uid(), tg_table_name, v_id, lower(tg_op),
          case when tg_op <> 'INSERT' then to_jsonb(old) end,
          case when tg_op <> 'DELETE' then to_jsonb(new) end);
  return null;
end $$;

-- attach to every table (re-run this block in later migrations for new tables)
do $$ declare t text; begin
  foreach t in array array['organizations','profiles'] loop
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_trigger()', t||'_audit', t);
  end loop;
end $$;
```

## `0003_products.sql`: products, qualities, sizes, variants, rates
```sql
create table public.products (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id),
  name text not null check (length(trim(name)) > 0),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz
);
create unique index products_name_uq on public.products (organization_id, lower(name)) where deleted_at is null;

create table public.grades (   -- "Quality" in the UI
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id),
  product_id uuid not null references public.products(id),
  name text not null check (length(trim(name)) > 0),
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz
);
create unique index grades_name_uq on public.grades (product_id, lower(name)) where deleted_at is null;

create table public.sizes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id),
  product_id uuid not null references public.products(id),
  label text not null check (length(trim(label)) > 0),     -- TEXT, e.g. '1*1/2*3/4'
  sort_order int not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz
);
create unique index sizes_label_uq on public.sizes (product_id, label) where deleted_at is null;

create table public.variants (  -- product + quality + size
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id),
  product_id uuid not null references public.products(id),
  grade_id uuid not null references public.grades(id),
  size_id uuid not null references public.sizes(id),
  is_active boolean not null default true,     -- false = this combination is not sold
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz,
  unique (grade_id, size_id)
);
create index on public.variants (organization_id, product_id);

create table public.rates (     -- immutable price history; latest row per variant is current
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id),
  variant_id uuid not null references public.variants(id),
  rate numeric(14,2) not null check (rate >= 0),                   -- the price
  rate_unit text not null check (rate_unit in ('dozen','piece')),  -- how this variant is sold: per Dozen or per Piece
  effective_from timestamptz not null default now(),
  created_at timestamptz not null default now(), created_by uuid default auth.uid()
);
create index on public.rates (variant_id, effective_from desc);

create view public.v_current_rates with (security_invoker = true) as
  select distinct on (variant_id) variant_id, organization_id, rate, rate_unit, effective_from
  from public.rates
  order by variant_id, effective_from desc, created_at desc;

-- auto-create variants when a quality or size is added
create or replace function public.trg_grade_variants() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.variants(organization_id, product_id, grade_id, size_id)
  select new.organization_id, new.product_id, new.id, s.id from public.sizes s
  where s.product_id = new.product_id and s.deleted_at is null
  on conflict do nothing;
  return null;
end $$;
create or replace function public.trg_size_variants() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.variants(organization_id, product_id, grade_id, size_id)
  select new.organization_id, new.product_id, g.id, new.id from public.grades g
  where g.product_id = new.product_id and g.deleted_at is null
  on conflict do nothing;
  return null;
end $$;
create trigger grades_variants after insert on public.grades for each row execute function public.trg_grade_variants();
create trigger sizes_variants  after insert on public.sizes  for each row execute function public.trg_size_variants();

-- batch price/unit update (admin only). p_rows = [{"variant_id":"...","rate":80,"rate_unit":"dozen"}, ...]
create or replace function public.set_rates(p_rows jsonb) returns int
language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.current_org_id(); r jsonb; n int := 0; v_rate numeric; v_unit text; v_vid uuid;
begin
  if v_org is null or not public.is_org_admin() then raise exception 'NOT_ALLOWED'; end if;
  for r in select * from jsonb_array_elements(p_rows) loop
    v_vid := (r->>'variant_id')::uuid;
    v_rate := nullif(r->>'rate','')::numeric;
    v_unit := r->>'rate_unit';
    if v_rate is null then continue; end if;          -- empty price = not set, nothing to save
    if v_rate < 0 or v_unit is null or v_unit not in ('dozen','piece') then raise exception 'BAD_PRICE'; end if;
    if not exists (select 1 from public.variants where id = v_vid and organization_id = v_org) then raise exception 'VARIANT_NOT_FOUND'; end if;
    insert into public.rates(organization_id, variant_id, rate, rate_unit) values (v_org, v_vid, v_rate, v_unit);
    n := n + 1;
  end loop;
  return n;
end $$;

-- RLS: everyone in the organization can read; only admin can write
do $$ declare t text; begin
  foreach t in array array['products','grades','sizes','variants'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy %I on public.%I for select to authenticated using (organization_id = public.current_org_id())', t||'_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (organization_id = public.current_org_id() and public.is_org_admin())', t||'_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (organization_id = public.current_org_id() and public.is_org_admin()) with check (organization_id = public.current_org_id() and public.is_org_admin())', t||'_update', t);
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()', t||'_updated', t);
    execute format('create trigger %I after insert or update or delete on public.%I for each row execute function public.audit_trigger()', t||'_audit', t);
  end loop;
end $$;
alter table public.rates enable row level security;
create policy rates_select on public.rates for select to authenticated using (organization_id = public.current_org_id());
create policy rates_insert on public.rates for insert to authenticated with check (organization_id = public.current_org_id() and public.is_org_admin());
create trigger rates_audit after insert on public.rates for each row execute function public.audit_trigger();
```

## `0004_parties.sql`: customers
```sql
create table public.parties (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id),
  name text not null check (length(trim(name)) > 0),
  phone text, city text, address text, notes text,
  type text not null default 'customer' check (type in ('customer','dealer')),
  opening_balance numeric(14,2) not null default 0,      -- BF
  whatsapp_opt_in boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz
);
-- same name is allowed in different cities; the app REQUIRES a city (used to filter customers on invoices)
create unique index parties_name_uq on public.parties (organization_id, lower(name), lower(coalesce(city, ''))) where deleted_at is null;
create index on public.parties (organization_id, lower(city));
create index on public.parties (organization_id, name);

alter table public.parties enable row level security;
create policy parties_select on public.parties for select to authenticated using (organization_id = public.current_org_id());
create policy parties_insert on public.parties for insert to authenticated with check (organization_id = public.current_org_id());
create policy parties_update on public.parties for update to authenticated using (organization_id = public.current_org_id()) with check (organization_id = public.current_org_id());
create trigger parties_updated before update on public.parties for each row execute function public.set_updated_at();
create trigger parties_audit after insert or update or delete on public.parties for each row execute function public.audit_trigger();
```

## `0005_invoices.sql`: invoices (all writes through functions)
```sql
create table public.invoice_counters (
  organization_id uuid primary key references public.organizations(id),
  last_no int not null default 0
);
alter table public.invoice_counters enable row level security;
create policy counters_select on public.invoice_counters for select to authenticated using (organization_id = public.current_org_id());

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  invoice_no int not null,
  party_id uuid references public.parties(id),   -- NULL = one-time customer typed on the invoice (not in Customers list)
  party_name_snapshot text not null,
  party_city_snapshot text,
  invoice_date date not null,
  total_amount numeric(14,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','final','cancelled')),
  notes text,
  finalized_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(),
  unique (organization_id, invoice_no)
);
create index on public.invoices (organization_id, invoice_date desc);
create index on public.invoices (organization_id, party_id);

create table public.invoice_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  sort_order int not null,
  variant_id uuid not null references public.variants(id),
  description text not null,                 -- snapshot e.g. 'Kili Clump 1/2 (Medium)'
  quantity int not null check (quantity > 0),
  unit text not null check (unit in ('dozen','piece')),   -- snapshot of the unit at the time of the invoice
  rate numeric(14,2) not null check (rate >= 0),          -- snapshot of the price
  amount numeric(14,2) not null                           -- quantity * rate
);
create index on public.invoice_items (invoice_id);

alter table public.invoices enable row level security;
alter table public.invoice_items enable row level security;
-- READ only for clients. No insert/update/delete policies on purpose.
create policy invoices_select on public.invoices for select to authenticated using (organization_id = public.current_org_id());
create policy invoice_items_select on public.invoice_items for select to authenticated using (organization_id = public.current_org_id());
create trigger invoices_audit after insert or update or delete on public.invoices for each row execute function public.audit_trigger();
create trigger invoice_items_audit after insert or update or delete on public.invoice_items for each row execute function public.audit_trigger();

-- next number: row lock on the counter row serializes concurrent callers (no duplicates, no gaps)
create or replace function public.next_invoice_no() returns int
language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.current_org_id(); v_no int;
begin
  if v_org is null then raise exception 'NO_ORG'; end if;
  insert into public.invoice_counters(organization_id, last_no) values (v_org, 0) on conflict do nothing;
  update public.invoice_counters set last_no = last_no + 1 where organization_id = v_org returning last_no into v_no;
  return v_no;
end $$;

-- create a new invoice (p_invoice_id null) or replace the lines of a DRAFT; optionally finalize.
-- Customer: EITHER p_party_id (existing customer) OR p_walkin_name + p_walkin_city (one-time customer typed on the invoice).
-- p_items = [{"variant_id":"uuid","quantity":33}, ...]
-- Prices are read HERE from current rates. The browser never sends prices.
create or replace function public.save_invoice(p_invoice_id uuid, p_party_id uuid, p_walkin_name text, p_walkin_city text, p_items jsonb, p_notes text, p_finalize boolean)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_org uuid := public.current_org_id();
  v_id uuid; v_no int; v_party_name text; v_party_city text; v_status text;
  v_item jsonb; v_sort int := 0; v_total numeric(14,2) := 0;
  v_q int; v_vid uuid; v_descr text; v_rate numeric; v_unit text; v_amt numeric(14,2);
begin
  if v_org is null then raise exception 'NO_ORG'; end if;
  if p_party_id is not null then
    select name, city into v_party_name, v_party_city from public.parties
      where id = p_party_id and organization_id = v_org and deleted_at is null and is_active;
  else
    v_party_name := nullif(trim(p_walkin_name), '');
    v_party_city := nullif(trim(p_walkin_city), '');
    if v_party_name is not null and length(v_party_name) < 2 then v_party_name := null; end if;
    if v_party_city is null then v_party_name := null; end if;   -- city is required for typed customers too
  end if;
  if v_party_name is null then raise exception 'CUSTOMER_REQUIRED'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then raise exception 'ITEMS_REQUIRED'; end if;

  if p_invoice_id is null then
    v_no := public.next_invoice_no();
    insert into public.invoices(organization_id, invoice_no, party_id, party_name_snapshot, party_city_snapshot, invoice_date, status, notes)
    values (v_org, v_no, p_party_id, v_party_name, v_party_city,
            (now() at time zone (select timezone from public.organizations where id = v_org))::date, 'draft', p_notes)
    returning id into v_id;
  else
    select status into v_status from public.invoices where id = p_invoice_id and organization_id = v_org for update;
    if v_status is null then raise exception 'NOT_FOUND'; end if;
    if v_status <> 'draft' then raise exception 'ONLY_DRAFT_EDITABLE'; end if;
    v_id := p_invoice_id;
    update public.invoices set party_id = p_party_id, party_name_snapshot = v_party_name, party_city_snapshot = v_party_city, notes = p_notes, updated_at = now() where id = v_id;
    delete from public.invoice_items where invoice_id = v_id;
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_q := coalesce((v_item->>'quantity')::int, 0);
    if v_q < 0 then raise exception 'BAD_QTY'; end if;
    continue when v_q = 0;

    v_vid := null; v_descr := null; v_rate := null; v_unit := null;
    select v.id, pr.name || ' ' || s.label || ' (' || g.name || ')' into v_vid, v_descr
      from public.variants v
      join public.products pr on pr.id = v.product_id
      join public.grades g on g.id = v.grade_id
      join public.sizes s on s.id = v.size_id
      where v.id = (v_item->>'variant_id')::uuid and v.organization_id = v_org and v.is_active and v.deleted_at is null;
    if v_vid is null then raise exception 'VARIANT_NOT_FOUND'; end if;

    select rate, rate_unit into v_rate, v_unit from public.v_current_rates where variant_id = v_vid;
    if v_rate is null then raise exception 'PRICE_MISSING:%', v_descr; end if;

    v_amt := v_q * v_rate;
    v_sort := v_sort + 1;
    insert into public.invoice_items(organization_id, invoice_id, sort_order, variant_id, description, quantity, unit, rate, amount)
    values (v_org, v_id, v_sort, v_vid, v_descr, v_q, v_unit, v_rate, v_amt);
    v_total := v_total + v_amt;
  end loop;

  if v_sort = 0 then raise exception 'ITEMS_REQUIRED'; end if;
  update public.invoices
     set total_amount = v_total,
         status = case when p_finalize then 'final' else 'draft' end,
         finalized_at = case when p_finalize then now() end,
         updated_at = now()
   where id = v_id;
  return v_id;
end $$;

create or replace function public.finalize_invoice(p_invoice_id uuid) returns void
language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.current_org_id(); v_status text;
begin
  if v_org is null then raise exception 'NO_ORG'; end if;
  select status into v_status from public.invoices where id = p_invoice_id and organization_id = v_org for update;
  if v_status is null then raise exception 'NOT_FOUND'; end if;
  if v_status <> 'draft' then raise exception 'ONLY_DRAFT_EDITABLE'; end if;
  update public.invoices set status = 'final', finalized_at = now(), updated_at = now() where id = p_invoice_id;
end $$;

create or replace function public.cancel_invoice(p_invoice_id uuid, p_reason text) returns void
language plpgsql security definer set search_path = public as $$
declare v_org uuid := public.current_org_id(); v_status text;
begin
  if v_org is null then raise exception 'NO_ORG'; end if;
  if not public.is_org_admin() then raise exception 'NOT_ALLOWED'; end if;
  if p_reason is null or length(trim(p_reason)) < 3 then raise exception 'REASON_REQUIRED'; end if;
  select status into v_status from public.invoices where id = p_invoice_id and organization_id = v_org for update;
  if v_status is null then raise exception 'NOT_FOUND'; end if;
  if v_status = 'cancelled' then raise exception 'ALREADY_CANCELLED'; end if;
  update public.invoices set status = 'cancelled', cancelled_at = now(), cancel_reason = trim(p_reason), updated_at = now() where id = p_invoice_id;
end $$;

grant execute on function public.save_invoice(uuid, uuid, text, text, jsonb, text, boolean) to authenticated;
grant execute on function public.finalize_invoice(uuid) to authenticated;
grant execute on function public.cancel_invoice(uuid, text) to authenticated;
grant execute on function public.set_rates(jsonb) to authenticated;
revoke execute on function public.next_invoice_no() from public, anon, authenticated;
```
Customer rule: an invoice is for an existing customer (`party_id`) or a one-time customer typed on the invoice (name + city stored as snapshots, `party_id` null). One-time invoices appear in the invoice list and reports but not in any party ledger. The user can save a typed customer to the Customers list with the "Save to Customers" button (server action `createCustomer`) BEFORE saving the invoice, which turns it into an existing customer.

Error codes raised by functions (map every one to an i18n message in `lib/errors.ts`):
`NO_ORG, NOT_ALLOWED, CUSTOMER_REQUIRED (no customer chosen, or typed customer without name/city), ITEMS_REQUIRED, BAD_QTY, BAD_PRICE, VARIANT_NOT_FOUND, PRICE_MISSING:<item>, NOT_FOUND, ONLY_DRAFT_EDITABLE, REASON_REQUIRED, ALREADY_CANCELLED`.

## `0006_payments_ledger.sql` (Phase 5)
```sql
create table public.party_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null default public.current_org_id() references public.organizations(id),
  party_id uuid not null references public.parties(id),
  payment_date date not null,
  amount numeric(14,2) not null check (amount > 0),
  method text not null default 'cash' check (method in ('cash','bank','other')),
  invoice_id uuid references public.invoices(id),   -- optional link
  notes text,
  created_at timestamptz not null default now(), created_by uuid default auth.uid(),
  updated_at timestamptz not null default now(), deleted_at timestamptz
);
create index on public.party_payments (organization_id, party_id, payment_date);
-- RLS: select/insert/update for the organization (same 3 policies as parties); audit trigger; updated_at trigger.

create view public.v_party_ledger with (security_invoker = true) as
with ev as (
  select p.organization_id, p.id as party_id, null::date as dt, p.created_at as ts, 'BF'::text as details,
         0::numeric as received, p.opening_balance as bill, null::uuid as ref_id, 'opening'::text as kind
  from public.parties p where p.deleted_at is null
  union all
  select organization_id, party_id, invoice_date, created_at, 'Bill ' || invoice_no, 0, total_amount, id, 'invoice'
  from public.invoices where status = 'final' and party_id is not null   -- one-time (typed) customers have no ledger
  union all
  select organization_id, party_id, payment_date, created_at,
         case method when 'cash' then 'Cash' when 'bank' then 'Bank' else 'Payment' end, amount, 0, id, 'payment'
  from public.party_payments where deleted_at is null
)
select ev.*, sum(bill - received) over (partition by party_id order by dt nulls first, ts, ref_id) as due_amount
from ev;

create view public.v_party_outstanding with (security_invoker = true) as
select organization_id, party_id, sum(bill - received) as due_amount from public.v_party_ledger group by organization_id, party_id;
```
(If a party's invoice is cancelled it disappears from the ledger automatically because only `final` invoices are included.)

## Seed: `supabase/seed.sql`
```sql
-- 1) Organization for the first client
insert into public.organizations (id, name, address, phone, invoice_footer_note)
values ('00000000-0000-0000-0000-0000000000a1', 'A One Sanitory Ware', 'Hafizabad Road, Gujranwala', '', 'Thank you for your business')
on conflict (id) do nothing;

-- 2) First invoice will be number 95 (client's last invoice was 94)
insert into public.invoice_counters (organization_id, last_no)
values ('00000000-0000-0000-0000-0000000000a1', 94) on conflict (organization_id) do update set last_no = excluded.last_no;

-- 3) Profile of the first admin: create the user in Supabase Auth first, then paste its UUID below
-- >>> PASTE USER UUID HERE <<<
insert into public.profiles (user_id, organization_id, full_name, role, language)
values ('PASTE-AUTH-USER-UUID', '00000000-0000-0000-0000-0000000000a1', 'A One Admin', 'admin', 'en');

-- 4) Super admin (software owner), same method:
-- insert into public.profiles (user_id, organization_id, full_name, role) values ('PASTE-UUID', null, 'Owner', 'super_admin');
```
Do NOT seed products or customers in SQL: they come from CSV import (`05`) or the screens.

---
## Later phases: tables (write SQL in the same style, with RLS, triggers, indexes)
**Phase 6 Workers and Production**
- `workers`: name, phone, pay_type (`per_piece`|`per_dozen`|`salary`), is_active
- `worker_rates`: worker_id, variant_id or product_id, rate, rate_unit (`dozen`|`piece`)
- `production_entries`: entry_date, worker_id, variant_id, quantity, unit, notes. Insert also creates a `stock_movements` row (type `production_in`) in the same transaction (via function).
- `worker_transactions`: worker_id, tx_date, type (`earning`|`advance`|`payment`), amount, notes. View `v_worker_balance` = earning - advance - payment.

**Phase 7 Stock**
- `stock_movements`: movement_date, variant_id, type (`production_in`|`sale_out`|`return_in`|`adjustment_in`|`adjustment_out`), quantity, unit, reference_type, reference_id, notes. View `v_finished_stock` = signed sum of `quantity` per variant, shown with the variant's unit (e.g. `120 Dozen`). A variant's unit can only be changed while it has no stock movements or production entries (otherwise create a new variant).
- `organizations.enforce_stock` (already created) turns on blocking of sales above stock. `save_invoice` final/finalize then also inserts `sale_out` rows; `cancel_invoice` inserts reversing rows.

**Phase 8 Raw material and costing**
- `raw_materials`: name, unit, low_stock_level
- `raw_purchases`: purchase_date, raw_material_id, supplier, quantity, rate, amount, paid_amount
- `raw_usage`: usage_date, raw_material_id, quantity, product_id (nullable), notes
- `expenses`: expense_date, category, amount, notes
- Views for current raw stock, product-wise cost, profit/loss (sales - raw material - labour - expenses).

**Phase 10 Security**
- `permissions`: profile_id, module, can_view, can_create, can_edit, can_delete (employee permissions). Policies and server actions check them.

**Phase 11 Super Admin**: uses existing `organizations` (`status`, `subscription_ends_at`). A cron/edge check can auto-suspend expired subscriptions.

**Phase 13 Marketing**: `party_followups` (party_id, followup_date, note, next_followup_date), WhatsApp list is a filtered export of parties with `whatsapp_opt_in`.

## Backup
Supabase daily backups (paid plan required before go-live) + weekly CSV/SQL export to a private storage bucket. Document tested restore steps in `RESTORE.md` (Phase 10).
