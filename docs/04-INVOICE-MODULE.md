# 04. Invoice Module: Complete Specification (Phase 4)

This is the most important module. It must be **correct, simple, and printable**.

> **Quantity model (final, supersedes anything else you may see):** every variant (product + quality + size) is saved in Products with **ONE price and ONE unit (Dozen or Per Piece)**. On the invoice the user only types a **single Quantity**. There is no "dozen AND pieces" on one line.
> `reference/invoice-example.html` is a **LOOK reference only** (white page, blue/grey/black, card layout, print paper). Its quantity/price logic is outdated: follow this file for behavior.

## 1. What the user does (story)
1. Taps **Invoices**, then **New Invoice**.
2. Chooses the **customer**: **Existing customer** (pick a **City**, then pick from that city's customers) or the radio **New customer (type name)** to type city + name for a one-time buyer, with an optional **Save to Customers** button.
3. The page already shows **Invoice No** (next number) and **today's date**, both read-only.
4. For each item picks **Product**, **Quality**, **Size**. The page immediately shows the item's **Price with its unit**, read-only, for example `375 / Dozen` or `17 / Piece`. The quantity box is labelled with that unit: `Quantity (Dozen)` or `Quantity (Pcs)`.
5. Types the **Quantity**. Line **Amount** and **Total** update instantly.
6. Taps **Save and Print**. The invoice is saved as final and the print view opens; the user prints or saves as PDF.

## 2. Data used
`invoices`, `invoice_items`, `invoice_counters`, `save_invoice()`, `finalize_invoice()`, `cancel_invoice()` from `02-DATABASE.md` (migration `0005`). Price and unit come from `v_current_rates` (`rate`, `rate_unit`). Admin sets them on the Products screen (Phase 2): the prices table has columns **Quality | Size | Price | Unit (Dozen/Piece) | Active**.

## 3. Calculation rules (single source of truth: `src/lib/money.ts`)
- Price is decimal (2 digits); quantity is a **whole number >= 1**. Convert price to **integer paisa**: `Math.round(price * 100)`. Never add floats.
- `lineAmountMinor = quantity * rateMinor`. `totalMinor = sum(lineAmountMinor)`. Exact, no rounding needed.
- Dozen and piece are never converted into each other. The unit is only a label saved with the price.
- A line is **used** only if `quantity > 0`; empty lines are ignored.
- Missing price (variant has no current price): block with "Price is not set for <item>. Ask admin to set it in Products." In the item picker such variants are shown with "Price not set".
- Display: thousand separators, decimals only when not zero: `99,215`, `906.25`. Totals labelled PKR.
- The **server (`save_invoice`) re-reads price and unit** from the database and recomputes everything. The browser only previews and never sends price or unit.

Required exports of `money.ts` (with unit tests):
```ts
toMinor(value: number | string): number                 // '1,080.50' -> 108050
fromMinor(minor: number): number
lineAmountMinor(l: { quantity: number; rateMinor: number | null }): number
invoiceTotalMinor(lines: { quantity: number; rateMinor: number | null }[]): number
formatMoney(minor: number): string                       // 9921500 -> '99,215'; 90625 -> '906.25'
describeQty(quantity: number, unit: 'dozen' | 'piece'): string   // '33 Dozen', '100 Pcs'
describeRate(rate: number, unit: 'dozen' | 'piece'): string      // '375 / Dozen', '110 / Pc'
validateLine(l): { ok: true } | { ok: false; code: 'PRICE_MISSING' | 'BAD_QTY' }
```

## 4. Invoice numbering and date
- Number from `next_invoice_no()` inside `save_invoice()` (row lock = no duplicates; same transaction = no gaps). A One starts at **95** (seed sets counter to 94).
- The New Invoice screen **shows** the next number (`invoice_counters.last_no + 1`) as a hint; the real number is assigned atomically on save and then displayed. Two users saving at the same moment get different numbers.
- Date = server date in the organization's time zone (Asia/Karachi), set on creation. Not editable.
- Numbers are never reused, even for cancelled invoices.

## 5. Statuses
| Status | Meaning | Editable |
|---|---|---|
| `draft` | saved, not official | yes (lines, customer, notes) |
| `final` | official; counts in party ledger (Phase 5) and stock (Phase 7) | **no** |
| `cancelled` | kept for record, printed with CANCELLED, excluded from ledger | no |

- "Save and Print" = `save_invoice(..., finalize = true)` then open print view. "Save as Draft" = `finalize = false`.
- A draft can be edited, finalized or cancelled. A final invoice can only be cancelled (admin, reason required, min 3 characters). To correct a final invoice: cancel it and create a new one.
- Never hard-delete an invoice.
- Re-saving a draft re-reads current prices and units. At finalize they are frozen in `invoice_items`. Later price or unit changes never alter final invoices.

## 6. Screens (full detail in `07-SCREEN-SPECS.md`)
`/invoices` list | `/invoices/new` | `/invoices/[id]` view + print | `/invoices/[id]/edit` (draft only).

### 6.0 New/Edit Invoice layout (mobile first)
- **Card 1: Customer and invoice info**: customer selection (section 6.1), then Invoice No (read-only) and Invoice Date (read-only).
- **Card 2: Items.** One **line card** per item:
  - Row 1: Product (select)
  - Row 2: Quality (select), Size (select)
  - Row 3: **Price** (read-only grey box showing e.g. `375 / Dozen`), **Quantity (Dozen)** or **Quantity (Pcs)** (number input, whole numbers)
  - Footer: `Amount: 12,375` and a **Remove** button
  - Quality and Size lists contain only **active** variants of that product. Changing Product resets Quality and Size to the first. Fetch all active variants with current price+unit once when the page opens and keep them in memory.
  - Desktop (>= 640px): 4-column grid like the reference.
- **+ Add Item** button below the lines; a new page starts with one empty line.
- **Notes** (optional).
- Buttons: **Save and Print** (primary), **Save as Draft** (secondary).
- **Live Preview** below showing the paper exactly as it prints (same `InvoicePaper` component).
- Red error line above the buttons: "Please select a customer first.", "Please type customer name and city.", "Please enter a quantity for at least one item.", "Price is not set for <item>. Ask admin to set it in Products.", plus server codes mapped by `lib/errors.ts`.
- Warn before leaving with unsaved changes.

### 6.1 Customer selection (decided)
A radio group with two choices:
1. **Existing customer** (default)
   - **City** select: first option "All cities", then every distinct city of active customers (sorted).
   - **Customer** select: only customers of the selected city (with "All cities", all customers with their city in brackets), sorted by name. Distributors/dealers included.
   - Changing the city clears the customer if it does not belong to that city.
2. **New customer (type name)**, for one-time buyers or brand-new customers
   - **City** text input (suggestions from existing cities) and **Customer Name** text input. Both required (name min 2 characters).
   - Button **Save to Customers (optional)**: creates the customer in the Customers section (same action as the Customers screen; duplicate check on name + city). On success the form switches to "Existing customer" with this customer selected and shows "Customer saved in Customers list." If it exists already: "This customer already exists. Selected from list." and it is selected.
   - If the user does not press it, the invoice is saved with the typed name and city only (`party_id` null, name/city kept as snapshots). It prints normally but has no party ledger.
- The printed invoice shows Customer Name and City in both cases. Typed values are kept if the radio is toggled back and forth.

### 6.2 Invoice list
Columns: Invoice No, Date, Customer, Total, Status. Search by number or customer; filter by status and date range; sorted by number desc; 25 per page. Row tap opens the view. Status text colors: draft grey, final blue, cancelled red.

### 6.3 Invoice view
Shows `InvoicePaper`. Buttons: **Print**, **Edit** (draft only), **Finalize** (draft only), **Cancel Invoice** (admin; asks for a reason), **Back**.

## 7. Printing and PDF (must be perfect)
- `InvoicePaper` renders the invoice and is used by the live preview, the view page and printing, so all three always match.
- Print stylesheet `src/app/print.css`:
```css
@page { size: A4; margin: 10mm; }
@media print {
  .noprint { display: none !important; }       /* hide all app UI */
  .paper { border: none; max-width: none; margin: 0; }
  .ph, .paper th, .tot td { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  tr { break-inside: avoid; }
  thead { display: table-header-group; }      /* header row repeats on every page */
  tfoot, .foot { break-inside: avoid; }
}
```
- "Print" calls `window.print()`. "Save as PDF" = choose Save as PDF in the browser print dialog (works on Android Chrome and desktop). `/invoices/[id]?print=1` opens the view and triggers `window.print()` automatically (used by Save and Print).
- Paper is **always white with black text**. Header band solid blue `#1D4ED8` with white text.
- Layout, top to bottom:
  1. Blue band: **organization name** (large), address, phone (from settings), logo at left if present
  2. Title `INVOICE` (letter-spaced, bold, blue bottom border)
  3. Meta grid: Customer Name | Invoice No | City | Invoice Date
  4. Items table: Sr | Description of Goods | Qty | Price | Amount
     - Description: `Kili Clump 1/2 (Medium)` from the snapshot
     - Qty: `33 Dozen` or `100 Pcs`
     - Price: `375 / Dozen` or `110 / Pc`
     - Always at least 6 rows (empty rows keep it looking like a bill)
  5. **Total Amount** row (bold, grey `#F3F4F6`)
  6. Notes (if any)
  7. Signature lines: Customer Signature | Authorized Signature
  8. Footer note (from settings)
  9. If `cancelled`: a red **CANCELLED** line under the title (no rotation, no watermark) and the reason in small print
- Multi-page: header row repeats, rows never split, Total and signatures together on the last page (test 40 lines).
- Urdu names print correctly (Urdu font stack, `unicode-bidi: plaintext`). Labels on the paper are English. Western digits. Date `DD-MM-YYYY`.
- Test in Chrome on Android and on desktop, and Save as PDF.

## 8. Permissions
- Admin: everything. Employee: create invoices, view, print, edit own drafts; cannot cancel final invoices; cannot change prices/units.
- Enforced in server actions and SQL (`cancel_invoice` checks `is_org_admin()`).

## 9. Server actions (`src/app/(app)/invoices/actions.ts`)
```ts
saveInvoice(input: {
  invoiceId?: string;
  partyId?: string;                       // existing customer
  walkinName?: string; walkinCity?: string; // typed customer (when partyId is absent)
  items: { variantId: string; quantity: number }[];
  notes?: string;
  finalize: boolean;
}): Result<{ id: string; invoiceNo: number }>
finalizeInvoice(id: string): Result<void>
cancelInvoice(id: string, reason: string): Result<void>
createCustomer(input: { name: string; city: string; phone?: string; type?: 'customer' | 'dealer' }):
  Result<{ id: string; name: string; city: string; existed: boolean }>   // used by Save to Customers
```
- Zod: either `partyId` (uuid) OR `walkinName` (>= 2 chars) + `walkinCity` (required); `quantity` integer >= 0 (lines with 0 are dropped); at most 200 lines; notes max 500 chars.
- Call `supabase.rpc('save_invoice', ...)` with the user's session client (RLS context). Map errors with `lib/errors.ts`. Return `{ ok:false, error:{ code, message } }`; never throw raw DB errors to the UI. `revalidatePath('/invoices')` on success.

## 10. Data loading for the form
`getInvoiceFormData()` returns: customers (id, name, city, type), products with **active variants** (variantId, product, quality, size, `rate`, `rateUnit`) from `v_current_rates`, next invoice number, organization settings. Everything stays in memory on the client; only Save hits the server.

## 11. Out of scope in v1 (do NOT build)
Entering dozens and pieces on the same line; fractional quantities; discounts; tax; free-text "other items"; editing price/unit on the invoice; editing final invoices; linking a saved invoice to a customer afterwards (save the customer BEFORE saving the invoice); multi-currency; online payments; WhatsApp sharing; e-invoicing.

## 12. Acceptance checklist (all must pass)
Calculations (unit tests in `money.test.ts`)
- [ ] 33 Dozen x 375 = 12,375
- [ ] 96 Dozen x 375 = 36,000
- [ ] 96 Dozen x 415 = 39,840
- [ ] 100 Pcs x 110 = 11,000
- [ ] The four lines above total **99,215**
- [ ] 2 Dozen x 500 = 1,000; 12 Pcs x 45 = 540 (unit is only a label, no conversion)
- [ ] Quantity 0 / empty line is ignored; decimals and negatives are rejected
- [ ] Variant without a price -> `PRICE_MISSING` naming the item
- [ ] `formatMoney(90625)` = `906.25`; `formatMoney(9921500)` = `99,215`; `describeQty(33,'dozen')` = `33 Dozen`; `describeRate(110,'piece')` = `110 / Pc`

Behavior
- [ ] Selecting Product + Quality + Size shows the saved price and unit (`375 / Dozen` or `17 / Piece`) and labels the quantity box with that unit; neither can be typed
- [ ] A Light U Clump size shows Dozen; a Super Heavy size shows Piece (data from `data/products-import.csv`)
- [ ] Invoice No and Date cannot be edited; the number matches the next number
- [ ] Admin changes a price or a unit in Products: a new invoice shows the new one; an already final invoice keeps the old
- [ ] Two invoices saved at the same time (two tabs) get different consecutive numbers; a failed save does not consume a number
- [ ] A final invoice cannot be edited (UI hides Edit; direct RPC fails with `ONLY_DRAFT_EDITABLE`)
- [ ] Employee cannot cancel a final invoice; admin can with a reason
- [ ] Selecting a city shows only that city's customers; "All cities" shows all with the city in brackets
- [ ] "New customer": typed name + city works without saving and prints with that name and city
- [ ] "Save to Customers" creates the customer (visible in Customers list and city filter), selects it, and keeps entered item lines
- [ ] Saving a typed customer that already exists (same name + city, any case) selects the existing one, no duplicate
- [ ] Typed customer without city, or 1-letter name, is rejected with a clear message
- [ ] Invoice for a typed (unsaved) customer is absent from every party ledger and outstanding list
- [ ] Organization B cannot read organization A's invoices (SQL test)
- [ ] Audit log has rows for invoice create, finalize, cancel

Print
- [ ] On A4, print equals the on-screen preview; the blue header band prints
- [ ] Save as PDF produces the same page
- [ ] 40-line invoice: header repeats on every page, no split rows, Total and signatures on the last page
- [ ] A short invoice shows at least 6 rows
- [ ] Cancelled invoice prints CANCELLED and the reason
- [ ] Urdu customer name prints correctly
- [ ] Create, save and print/PDF works on a phone and on desktop
