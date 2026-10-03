# 07. Screen Specifications (Phases 1-5)

Conventions: all text from `messages/*.json` (en + ur). Mobile first (375px). Every screen has loading, empty and error states. "Admin" = role admin; "Staff" = admin or employee. Buttons and inputs follow `01` section 5. Titles are `h1` 20px bold.

## Common layout
Header: organization name (left), language switch `English | اردو`, **Logout** (right). Under the title on inner pages: a **Back** link to the dashboard. Toasts appear at the bottom for success ("Saved") and failures.

## /login (public)
- Fields: Email, Password. Button **Login**. No sign-up link, no "forgot password" in v1 (admin resets).
- Errors: "Email or password is incorrect." / "Your account is not active. Contact the software provider." Disable the button while submitting.

## /dashboard (Staff)
- Big buttons grid (2 cols phone, 4 cols desktop): **Invoices, Customers, Products, Settings (admin only)**. Disabled (grey, "Coming soon"): Payments*, Workers, Production, Stock, Raw Material, Reports. (*Payments becomes active in Phase 5, then Outstanding too.)
- Top line: "Welcome, <full name>".

## /settings (Admin)
- Card "Business": Name, Address, Phone, Logo (upload/replace/remove, preview), Invoice footer note. Button **Save**.
- Card "Invoice numbering": text "Next invoice number: 95" (read-only). Field **Set next number** (number, only allowed to be higher than current); button **Update**; message if lower: "The number must be higher than the current number."
- Card "Language": default language for new users (optional).
- Phase 5 adds toggle: "Show previous balance on invoice" (default off).

## /products (Staff view, Admin edit)
- Search box. Table: Product | Qualities | Sizes | Status. Row tap opens `/products/[id]`.
- Admin: **Add product** (modal: Name) and **Import CSV**. Products, qualities, sizes and prices are 100% managed by the user (add, rename, deactivate, edit prices at any time); nothing is hard-coded.
- Empty state: "No products yet. Add your first product or import a CSV."

## /products/[id]
- Title = product name; admin: **Rename**, **Deactivate**.
- Card **Qualities**: chips/list with name; **+ Add quality** (inline input + Add). Rename and deactivate per row (admin).
- Card **Sizes**: same, text label, kept as typed.
- Card **Prices**: table `Quality | Size | Price | Unit (Dozen/Piece) | Active`. Inputs only for admin (Unit is a select). Changed cells get a blue left border. Button **Save Prices** (primary, enabled when something changed). After save: "Prices saved. New invoices will use them." Rows without a price show a muted "Price not set".
- Employees see the same table read-only.

## /customers (Staff)
- Full CRUD: add, view, edit, deactivate (no hard delete). City filter dropdown (All cities + each city) and search (name/phone/city). Table Name | City | Type | Phone | Due (Phase 5). **Add customer** and **Import CSV**. Show the count ("42 customers").
- Form (modal or page): Name*, City* (text with suggestions from existing cities; required because invoices filter customers by city), Phone, Address, Type (Customer/Dealer), Opening balance (default 0), Notes. Duplicate (same name AND same city, any letter case) error: "This customer already exists in <city>." The same name in a different city is allowed.
- Deactivated customers hidden unless "Show inactive" is on.

## /invoices (Staff)
- Top: **New Invoice** (primary). Search (number/customer), Status filter (All/Draft/Final/Cancelled), date range.
- Table: Invoice No | Date | Customer | Total | Status. 25 per page with Next/Previous.
- Empty: "No invoices yet."

## /invoices/new and /invoices/[id]/edit (Staff)
Exactly as `04` section 6 ("New/Edit Invoice layout"). Additional details:
- Customer block exactly as `04` section 6.1: radio (Existing customer / New customer (type name)), City select -> Customer select, or City + Name inputs with the optional **Save to Customers** button.
- Invoice No field label: "Invoice No (auto)"; Date label: "Invoice Date (auto)". Read-only grey inputs.
- Product/Quality/Size are `<select>` elements (mobile friendly). If a product has no active variants: "No sizes available for this product."
- Each item line: Product, Quality, Size (selects), then a read-only **Price** box showing price and unit (e.g. `375 / Dozen`, `17 / Piece`) and one **Quantity** input labelled with the unit (`Quantity (Dozen)` / `Quantity (Pcs)`): `inputmode="numeric"`, min 0, whole numbers only; ignore decimals/negatives.
- Totals box under items: **Total Amount (PKR)** large, blue.
- Buttons: **Save and Print**, **Save as Draft**, **Cancel** (back to list with unsaved-changes confirm).
- Success: Save and Print -> navigate to `/invoices/[id]?print=1`; Save as Draft -> toast "Draft saved" and stay.

## /invoices/[id] (Staff)
- Top bar (hidden when printing): **Print**, **Edit** (draft), **Finalize** (draft), **Cancel Invoice** (admin, not cancelled), **Back**.
- Body: `InvoicePaper`.
- Cancel dialog: text area "Reason (required)", buttons **Cancel Invoice** (danger) and **Keep**.

## /customers/[id] (Phase 5)
Tabs: **Details | Ledger | Invoices | Payments**. Header shows name and **Current due**.
- Ledger tab: date range filter, table `Date | Details | Received | Bill Amount | Due Amount`, first row "BF" opening balance, buttons **Print** and **Add Payment**. Printable A4 layout with the organization header and customer name.
- Payments tab: list with date, amount, method, notes.

## /payments/new (Phase 5, Staff)
Fields: Customer (SearchSelect), Date (default today, editable), Amount (>0), Method (Cash/Bank/Other), Invoice (optional, only that customer's final invoices), Notes. Button **Save Payment**. Success toast and link "View ledger".

## /outstanding (Phase 5, Staff)
Table: Customer | Phone | Due Amount (descending), total at the bottom, **Print**. Tap a row opens the customer ledger.

## Error and empty message style
Plain words, no codes shown to users, e.g. "Please select a customer first.", "Something went wrong. Please try again." (log technical details to the server console only).
