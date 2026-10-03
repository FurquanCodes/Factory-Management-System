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
