# 03. Build Steps (INVOICE FIRST)

Rules: one phase at a time; finish the phase; run `typecheck`, `lint`, `test`, `build`; go through the checklist; answer with the Phase Report (format in `README.md`); wait for the owner before the next phase. Before each phase re-read `00`, `01`, `02` and, for screens, `07`. For Phase 4 also read `04` fully.

Milestones for the client: **after Phase 4** (invoice) and **after Phase 5** (ledger).

---
## Phase 1: Foundation (multi-client ready from day 1)
**Goal:** a deployed, secure, bilingual shell with login, dashboard and organization settings.

Tasks
1. Create the project with the commands in `01` section 2. Configure Tailwind tokens from `01` section 5 (`blue`, `line`, `grey`, ...). Set `<meta name="color-scheme" content="light">`, white background.
2. Supabase clients: `src/lib/supabase/{server,client,middleware,admin}.ts` using `@supabase/ssr`. `middleware.ts` refreshes session and redirects to `/login` when logged out.
3. Migrations `0001_core.sql` and `0002_audit.sql` exactly as in `02`. Generate `src/types/database.ts`.
4. i18n with next-intl (cookie locale, `en` and `ur`, RTL for `ur`). `LanguageSwitch` component in header. Urdu fonts via `next/font/google`. Start `messages/en.json` and `ur.json` (both complete for every key you use).
5. UI kit in `src/components/ui`: Button, Input, Select, SearchSelect (type-to-filter dropdown used for customers), Field (label + error), Card, Table, Modal, ConfirmDialog, Toast. Follow `01` section 5 exactly.
6. `/login` page: email, password, "Login" button. Wrong credentials: "Email or password is incorrect." Suspended/inactive: message from `01` section 8.
7. `(app)/layout.tsx`: header with organization name, language switch, Logout. Redirect rules from `01` section 8.
8. `/dashboard`: grid of big buttons: Invoices, Customers, Products, Settings now; the other modules appear as disabled buttons labelled "Coming soon" (disabled grey, not hidden) so the owner sees the final structure: Payments, Workers, Production, Stock, Raw Material, Reports.
9. `/settings` (admin only): edit organization name, address, phone, logo upload (Supabase Storage bucket `logos`, public read, admin write, 1 file per org, max 1 MB, png/jpg), invoice footer note, **next invoice number** (read-only display of `last_no + 1`; admin may raise it once via a server action that refuses to go lower).
10. `DECISIONS.md` created. `.env.example` created. README of the app: how to run locally.
11. Deploy to Vercel (owner does the manual steps from `README.md`).

Checklist
- [ ] Login works; wrong password shows the message; logged-out user cannot open any page by URL
- [ ] Language switch works and persists after refresh; Urdu is RTL with a readable font
- [ ] Usable at 375px width; all tap targets >= 44px
- [ ] Two test organizations: user of A cannot read B's `organizations`, `profiles`, `audit_log` rows (test with SQL as that user)
- [ ] Employee cannot open `/settings` (redirected with message)
- [ ] Changing org name writes a row in `audit_log`
- [ ] Suspended organization user is signed out with the correct message
- [ ] `typecheck`, `lint`, `build` pass; deployed on Vercel

---
## Phase 2: Products and Prices
**Goal:** admin defines products, qualities, sizes and sets dozen/piece prices. Employees can view. Everything is full CRUD by the user (add, rename, deactivate, edit prices); nothing is hard-coded. After building, import the client's real price list from `data/products-import.csv` (see `05`).

Tasks
1. Migration `0003_products.sql` exactly as in `02` (includes variant auto-creation triggers, `v_current_rates`, `set_rates`).
2. `/products`: list of products with count of qualities/sizes; **Add product** (name) modal; rename; deactivate. Admin only for changes.
3. `/products/[id]`: three cards:
   - **Qualities**: list + "Add quality" (name). Rename, deactivate.
   - **Sizes**: list + "Add size" (text label, kept exactly as typed, e.g. `1*1/2*3/4`). Rename, deactivate.
   - **Prices** (the main card): table of every Quality x Size with columns Quality | Size | **Price** | **Unit (Dozen / Piece)** | Active (checkbox = this combination is sold). Price is a number input (empty = not set); Unit is a select (Dozen or Piece), so the admin decides which items are sold per dozen and which per piece. One **Save Prices** button sends only changed rows to `set_rates`. Success message: "Prices saved. New invoices will use them." Product filter at top when needed.
   - Same look and behavior as the "Products and Prices (Admin)" tab in `reference/invoice-example.html`.
4. Employees: same pages read-only (inputs disabled, no buttons).
5. CSV import button (spec in `05`): preview, error report, template download.
6. Unit tests: price parsing (`"1,080"` -> 1080), size label kept as text.

Checklist
- [ ] Add a product with 2 qualities and 3 sizes -> 6 variants appear automatically
- [ ] Size `1*1/2*3/4` saves and displays exactly
- [ ] Change a price or a unit (Dozen/Piece): previous values remain in `rates` (2 rows), `v_current_rates` returns the new one
- [ ] Employee cannot change a price even by calling the API directly (RLS/`set_rates` reject)
- [ ] Duplicate product name (any letter case) is rejected with a clear message
- [ ] Deactivated variant disappears from the invoice product pickers (check in Phase 4)
- [ ] CSV import: 20 rows with 2 bad rows -> 18 saved, 2 listed with row number and reason; importing the same file again creates no duplicates
- [ ] Edits and imports appear in `audit_log`

---
## Phase 3: Customers (parties)
Tasks
1. Migration `0004_parties.sql`.
2. `/customers`: full CRUD. Searchable list (name, phone, city) with a **city filter**, Add customer, edit, deactivate. Columns on phone: name + city; tap to open.
3. Form fields: Name (required), **City (required)**, Phone, Address, Type (Customer/Dealer; distributors are Dealer), Opening balance (default 0, can be negative), Notes.
4. Server action `createCustomer` (name + city + optional phone/type, duplicate check on name + city) reused by the invoice screen's **Save to Customers** button.
5. CSV import (`05`). After building, import the client's list from `data/customers-import.csv` (42 rows: 36 customers, 6 distributors).

Checklist
- [ ] Add, edit, deactivate work; duplicate name + city (any case) blocked with message; same name in another city allowed; city is required
- [ ] Search matches name, phone, city while typing
- [ ] Opening balance accepts decimals and negative numbers
- [ ] Employee can add and edit customers, cannot hard-delete (no delete exists)
- [ ] Import with errors reports them; Urdu names import and display correctly

---
## Phase 4: INVOICE (complete and printable)  <-- first client deliverable
Build **exactly** as `04-INVOICE-MODULE.md` and `07-SCREEN-SPECS.md` (Invoices section). In short:
- Migration `0005_invoices.sql` as in `02` (customers can be existing or typed).
- `lib/money.ts` + unit tests first, then the screens.
- New Invoice: choose customer (**City -> that city's customers**, or radio **New customer (type name)** with optional **Save to Customers**), add lines (Product -> Quality -> Size; the price and its unit appear read-only, e.g. `375 / Dozen` or `17 / Piece`; the user types one Quantity), live totals, **Save and Print**, **Save as Draft**.
- Invoice list with search and status; invoice view page; cancel with reason (admin).
- Print/PDF: perfect A4.
- Stock is NOT enforced yet.

Checklist: use the full list in `04` section 12 and `08-TEST-PLAN.md`.

---
## Phase 5: Payments and Party Ledger
Tasks
1. Migration `0006_payments_ledger.sql`.
2. `/payments/new` (customer, date default today but editable, amount, method cash/bank/other, optional invoice, notes) and payments list per customer.
3. `/customers/[id]` gets tabs: Details | Ledger | Invoices | Payments.
4. **Ledger page** (also printable A4/PDF): columns Date | Details (BF / Bill 94 / Cash) | Received | Bill Amount | Due Amount (running), exactly the client's sheet format. Date range filter. Header shows customer name and current due.
5. `/ledger` or `/outstanding`: all customers with due amount, sorted by highest, total at bottom, printable.
6. Optional invoice block (setting in `/settings`, default OFF): on the printed invoice show Previous Balance, This Invoice, Received, Balance Due.

Checklist
- [ ] Ledger of a test customer matches a hand calculation (opening 111,792 + Bill 62 19,008 - Cash 22,000 ...)
- [ ] Running balance correct when payments are added out of date order
- [ ] Cancelling an invoice removes it from the ledger and outstanding
- [ ] Outstanding total = sum of all customer dues
- [ ] Ledger prints on A4 with repeated header on multiple pages
- [ ] Payment edits/deletes (soft) are audited

---
## Phase 6: Workers and Production
Workers CRUD with pay type; worker rates; daily production entry (date, worker, product/quality/size, dozens, pieces); production list filtered by date/worker/product with date-wise totals; worker transactions (earning auto-calculated from production x rates, advance, payment); worker ledger and remaining balance.
Checklist: worker balance = earnings - advances - payments | filters work | every change audited | mobile entry in under 6 taps for a repeat entry.

## Phase 7: Finished goods stock
`stock_movements`, `v_finished_stock`, stock screen by product/quality/size (shown with the unit, e.g. `120 Dozen`), movement history, admin adjustments with mandatory reason. Production adds stock. Turn on `enforce_stock`: final invoices add `sale_out`; cancel adds reversing rows; sale above stock blocked with message naming the item and available quantity.
Checklist: production increases stock | final invoice decreases | cancel restores | oversell blocked | adjustment audited.

## Phase 8: Raw material and Costing/Profit-Loss
Raw materials, purchases, usage, current stock, low-stock alert on dashboard. Costing: product-wise cost, labour cost, sales, profit/loss daily/monthly/yearly.
Checklist: raw stock = purchases - usage | alert below level | profit verified by hand for one sample month.

## Phase 9: Reports
Nine reports (`00` section 6), each with date range, on-screen table, print, and Excel (CSV) export: daily production, raw material stock, finished goods stock, sales, party ledger, worker report, profit/loss, monthly summary, yearly summary.
Checklist: every figure equals the source screens.

## Phase 10: Security hardening and backup
Employee permissions per module (`permissions` table + UI), user management for admins (create employee through service-role server action, reset password, deactivate), audit log viewer (filter by table/user/date; shows old vs new), weekly export to storage, `RESTORE.md` tested on a copy, RLS re-test with two organizations and every role.
Checklist: employee cannot open admin URLs | every edit/delete visible in audit viewer | restore tested.

## Phase 11: Super Admin and multi-client
`/admin` (super admin only): clients list, create client (organization + admin user), edit, suspend/activate, subscription end date, per-client invoice counter start. Subdomain per client and custom domain setup on Vercel (wildcard domain).
Checklist: suspended client blocked at login | client A cannot see client B | new client onboarded in under 10 minutes.

## Phase 12: Launch for A One
Import real products/prices and customers (`05`), real opening balances, set invoice start number, logo; test on real phones and a real printer; Urdu review; one-page user guide with screenshots; production Supabase (paid plan, daily backups ON); domain connected.

## Phase 13 (later): Marketing
Customer database extras, dealer management, WhatsApp marketing list export, follow-up records.
