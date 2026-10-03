# 08. Test Plan

## 1. Automated unit tests (Vitest)
- `money.test.ts`: every item of the Calculations list in `04` section 12 plus `toMinor('1,080.50')`, `formatMoney`, `describeQty`, `describeRate`, `validateLine` (all error codes), totals with many lines (no float drift: 1000 lines of 0.10 sums to exactly 100.00).
- `import.test.ts` (Phase 2/3): CSV parser (quotes, commas inside quotes, BOM, CRLF), number parsing (`1,080`), each validation error, idempotent second import.
- `errors.test.ts`: every DB error code maps to an i18n key that exists in both `en.json` and `ur.json`.
- i18n parity test: `en.json` and `ur.json` have identical key sets.

## 2. SQL / RLS tests (run against a local or test Supabase; script in `supabase/tests/`)
Create organizations A and B, an admin and an employee in each.
1. A-admin selects from every table: sees only A rows. B rows never appear.
2. A-user tries `insert` with `organization_id` of B: rejected.
3. Employee tries to insert/update `products`, `grades`, `sizes`, `variants`, `rates`: rejected. Employee calling `set_rates`: `NOT_ALLOWED`.
4. Any authenticated user tries direct `insert/update/delete` on `invoices` or `invoice_items`: rejected (only RPC works).
5. `save_invoice`:
   - existing customer, or typed customer (`p_party_id` null with `p_walkin_name` + `p_walkin_city`); typed customer without city or name -> `CUSTOMER_REQUIRED`; typed invoice has null `party_id` and keeps the name/city snapshots
   - missing customer -> `CUSTOMER_REQUIRED`; no items -> `ITEMS_REQUIRED`
   - item with dozen > 0 but no dozen price -> `PRICE_MISSING_DOZEN:<item>` and the invoice counter is unchanged (no number consumed)
   - variant of organization B -> `VARIANT_NOT_FOUND`
   - correct amounts: lines (33 x 375 dozen), (96 x 375 dozen), (96 x 415 dozen), (100 x 110 piece) -> total 99215.00; item snapshot `unit` and `rate` are stored on `invoice_items`
   - editing a `final` invoice -> `ONLY_DRAFT_EDITABLE`
6. Concurrency: run 20 parallel `save_invoice` calls for one organization: 20 distinct consecutive invoice numbers, no duplicates.
7. `cancel_invoice`: employee -> `NOT_ALLOWED`; admin without reason -> `REASON_REQUIRED`; admin with reason -> status `cancelled`; second cancel -> `ALREADY_CANCELLED`.
8. Price history: set price twice -> 2 `rates` rows, `v_current_rates` returns the latest; a final invoice made before keeps the old price.
9. Suspended organization: set `status='suspended'` -> `current_org_id()` is null -> all selects return nothing.
10. `audit_log` has rows for each insert/update on products, rates, parties, invoices, invoice_items.
11. Ledger (Phase 5): opening 111,792; Bill 62 = 19,008; Cash 22,000 -> due 108,800; cancelled invoices excluded.

## 3. Manual test script: "A One" scenario (do after Phase 4, on a real phone and on desktop)
1. Login as admin. Settings: set business name/address; confirm "Next invoice number: 95".
2. Products: add Kili Clump with quality Medium and sizes `1/2`, `3/4`, `1"`; set dozen prices 375, 375, 415 and piece prices of your choice. Add Hanging Clump with piece prices only.
3. Customers: add "MAT".
4. New Invoice: choose city Rawalpindi, confirm only Rawalpindi customers are listed, pick M.A.T. Traders; lines: Kili Clump 1/2 (33 Dozen), Kili 3/4 (96 Dozen), Kili 1" (96 Dozen), plus any item with 100 Pcs at piece price 110. Check total = 99,215 (if you set the piece price to 110).
4b. Switch to "New customer (type name)", type city `Lahore` and name `Test Store`, press Save to Customers: it appears in Customers and the Lahore city filter. Try typing the same again: no duplicate. Also make one invoice for a typed customer WITHOUT saving: it prints with that name and city.
5. Invoice No shows 95 and today's date; neither can be edited. Prices cannot be typed.
6. Change the unit of one size in Products from Dozen to Piece and set a price; create a new invoice: it shows `<price> / Piece` and the quantity box says `Quantity (Pcs)`. Invoice 95 is unchanged.
7. Save and Print: number 95 assigned, print dialog opens. Compare print preview with screen. Save as PDF and open it.
8. Create a 40-line invoice (add the same item repeatedly). Print: header repeats, no split rows, total on last page.
9. As admin change a price in Products; create a new invoice: new price shown; open invoice 95: old price unchanged.
10. Create a draft, close the browser, reopen from the list, edit and finalize.
11. Cancel an invoice as admin with a reason; open it: CANCELLED shown on screen and print.
12. Login as employee: cannot edit prices, cannot see Settings, cannot cancel a final invoice.
13. Switch to Urdu: layout flips to RTL, text readable; print an invoice for a customer with an Urdu name.
14. Open the app on a second phone as another user and save invoices at the same time: numbers differ.

## 4. Performance and quality gates
- Lighthouse mobile: Performance >= 80, Accessibility >= 90 on `/invoices/new`.
- No console errors. No TypeScript errors. `npm run build` passes.
- Invoice form usable with 100 lines without lag.
