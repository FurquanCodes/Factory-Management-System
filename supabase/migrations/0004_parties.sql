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
