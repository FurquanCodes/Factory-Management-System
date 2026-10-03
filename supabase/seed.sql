-- 1) Organization for the first client
insert into public.organizations (id, name, address, phone, invoice_footer_note)
values ('00000000-0000-0000-0000-0000000000a1', 'A One Sanitory Ware', 'Hafizabad Road, Gujranwala', '', 'Thank you for your business')
on conflict (id) do nothing;

-- 2) First invoice will be number 95 (client's last invoice was 94)
-- We need the counter table which is created in 0005, but we can just comment this out for now or it will fail on Phase 1
-- insert into public.invoice_counters (organization_id, last_no)
-- values ('00000000-0000-0000-0000-0000000000a1', 94) on conflict (organization_id) do update set last_no = excluded.last_no;

-- 3) Profile of the first admin:
insert into public.profiles (user_id, organization_id, full_name, role, language)
values ('065741d1-488c-4403-8c3d-b42001ae896c', '00000000-0000-0000-0000-0000000000a1', 'A One Admin', 'admin', 'en');
