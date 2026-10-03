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
