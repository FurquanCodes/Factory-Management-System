# 06. Prompts for the AI Builder (owner pastes these)

## 0. Starter prompt (paste once at the beginning)
```
You are the lead engineer building a multi-tenant factory management web app for non-technical users in Pakistan.
Read EVERY file in this folder completely before writing code, in this order: README.md, 00-PROJECT-OVERVIEW.md, 01-TECH-AND-UI-RULES.md, 02-DATABASE.md, 03-BUILD-STEPS.md, 04-INVOICE-MODULE.md, 05-DATA-IMPORT.md, 07-SCREEN-SPECS.md, 08-TEST-PLAN.md, QUESTIONS.md. Open reference/invoice-example.html in a browser and match its look.
Rules: build ONE phase at a time, only when I name it. Follow the stack, folder structure, design system and SQL exactly as written. Do not ask me to explain things already in these files; if something is missing, use the default in QUESTIONS.md and record the assumption in DECISIONS.md. Never skip RLS, tests or the checklist. When a phase is finished, reply in the "Phase Report format" from README.md.
First, reply with: (1) a 10-line summary of the product, (2) the list of manual steps you need from me (README.md "Manual steps"), (3) any real conflict you found between the files. Do not write code yet.
```

## Phase 1
```
Build Phase 1 (Foundation) exactly as in 03-BUILD-STEPS.md, using 01 for setup and design system, 02 for migrations 0001 and 0002, and 07 for the Login, Dashboard and Settings screens. Do not start Phase 2. Finish with the Phase Report.
```

## Phase 2
```
Build Phase 2 (Products and Prices) exactly as in 03-BUILD-STEPS.md with migration 0003 from 02, screens from 07, and the CSV import from 05. After the screens work, import data/products-import.csv with the CSV import and check the counts (148 rows). The prices table has the columns Quality | Size | Price | Unit (Dozen/Piece) | Active, editable by admin only; use the look of reference/invoice-example.html (white, blue/grey/black). Only admin can change anything; employees see read-only. Add the unit tests listed. Finish with the Phase Report.
```

## Phase 3
```
Build Phase 3 (Customers) exactly as in 03-BUILD-STEPS.md with migration 0004 from 02, screens from 07, CSV import from 05, and the reusable createCustomer action (city is required; duplicates are name + city). After it works, import data/customers-import.csv (42 rows) with the CSV import. Finish with the Phase Report.
```

## Phase 4 (invoice)
```
Build Phase 4 (Invoice) exactly as in docs/04-INVOICE-MODULE.md, with migration 0005 from docs/02 and screens from docs/07. Order of work: (1) src/lib/money.ts with ALL unit tests from 04 section 12 passing first; (2) migration 0005 and the SQL-level tests from docs/08; (3) server actions and error mapping; (4) InvoicePaper component and print.css; (5) New Invoice form, list, view, cancel dialog.
Rules to respect: each variant has ONE price and ONE unit (Dozen or Piece) saved in Products; on the invoice the user picks Product, Quality, Size, sees the price with its unit (e.g. "375 / Dozen") read-only, and types a single Quantity; Amount = Quantity x Price, no conversion between dozen and piece. Prices and units are never sent by the browser; the server reads them. Customer selection: radio between Existing customer (City select -> that city's customers) and New customer (type city + name, optional Save to Customers button), exactly as in 04 section 6.1. Invoice number and date are system generated and read-only. Final invoices are not editable. Page background is plain white with solid blue/grey/black only (look reference: docs/reference/invoice-example.html, but follow 04 for behavior). Test printing a 40-line invoice. Finish with the Phase Report including the full 04 section 12 checklist.
```

## Phase 5
```
Build Phase 5 (Payments and Party Ledger) exactly as in 03-BUILD-STEPS.md with migration 0006 from 02 and screens from 07. The ledger must follow the client's sheet format (Date, Details, Received, Bill Amount, Due Amount running) and be printable on A4. Finish with the Phase Report.
```

## Phases 6 to 13 (template)
```
Build Phase N (<name>) exactly as in 03-BUILD-STEPS.md. First write the SQL migration for the tables listed for this phase in 02 (RLS, audit trigger, updated_at trigger, indexes, soft delete), then the screens (follow the layout rules in 01 and the style of the screens in 07), then tests. Dozen and piece are separate quantities everywhere (never converted). Finish with the Phase Report and the checklist of this phase.
```

## Bug-fix prompt
```
Bug: <what I did> -> <what I expected> -> <what happened>. First find the root cause and explain it in 2 lines. Fix it with the smallest change, without touching unrelated code. Add a test that would have caught it. Run typecheck, lint, test, build and report.
```

## Review prompt (after every phase)
```
Review the code of this phase against 01 (design system, code rules) and 02 (RLS, audit, money). Check: RLS on every table and tested with two organizations; no organization_id filtering only in app code; no float math on money; no hard-coded visible text (both en and ur present); no hard-coded products/sizes/business names; mobile layout at 375px; tap targets 44px; white background and solid colors only; every write audited. List each violation, fix all, re-run typecheck/lint/test/build.
```

## Before client demo prompt
```
Prepare the app for a client demo: seed realistic demo data in a SEPARATE demo organization (10 customers, 5 products with qualities, sizes and prices, 5 invoices), make sure the demo user is admin, test the full flow on a phone (login, set a price, create an invoice with dozens and pieces, print/PDF), and list anything that still looks unfinished.
```
