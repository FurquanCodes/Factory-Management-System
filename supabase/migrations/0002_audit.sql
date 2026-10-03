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
