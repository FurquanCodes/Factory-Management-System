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
