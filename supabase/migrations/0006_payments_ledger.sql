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

alter table public.party_payments enable row level security;
create policy party_payments_select on public.party_payments for select to authenticated using (organization_id = public.current_org_id());
create policy party_payments_insert on public.party_payments for insert to authenticated with check (organization_id = public.current_org_id());
create policy party_payments_update on public.party_payments for update to authenticated using (organization_id = public.current_org_id()) with check (organization_id = public.current_org_id());
create trigger party_payments_updated before update on public.party_payments for each row execute function public.set_updated_at();
create trigger party_payments_audit after insert or update or delete on public.party_payments for each row execute function public.audit_trigger();

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
