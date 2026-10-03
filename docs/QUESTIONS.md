# QUESTIONS (open items) and the DEFAULT to use until the owner answers

Do not stop work for these. Use the default, record it in `DECISIONS.md`, and keep going.

| # | Question | Default until answered |
|---|---|---|
| 1 | Should the invoice print the customer's previous balance? | No (setting exists in Phase 5, default OFF) |
| 2 | Do prices differ per customer (special rates)? | No. One price list per organization |
| 3 | Is a discount needed on invoices? | No (out of scope v1) |
| 4 | Should a customer be able to get an invoice for items with no price set? | No. The user is told to ask admin to set the price |
| 5 | Stock: how to count items sold per dozen vs per piece | Stock is kept in each variant's own unit (e.g. `120 Dozen`). Ask the owner before building Phase 7 if the unit of an item with stock needs to change |
| 6 | How are workers paid (per piece, per dozen, salary)? | Support all three as a setting per worker (Phase 6) |
| 7 | Raw material list and units? | Created by the user in the app (Phase 8) |
| 8 | Printed invoice language? | English labels; Urdu names print correctly |
| 9 | Can an employee create customers? | Yes |
| 10 | Can an employee create/edit invoices? | Yes: create, and edit own drafts. Cancel is admin-only |
| 11 | Taxes (GST/sales tax) on invoice? | Not in v1 |
| 12 | Invoice numbers per financial year restart? | No. Continuous numbering |
| 13 | Time zone and currency | Asia/Karachi, PKR |
| 14 | Hanging Clump prices | Not final. Left out of the CSV; owner adds it in the app later |
| 15 | The rate list header says "U Clump, Pernalla Clump". Is Pernalla = **Naala Clump** with the same prices as U Clump? | Yes: Naala Clump got the same rates as U Clump in the CSV. Confirm with the client |
| 16 | Unit of each item in the price list | Saved as the client wrote it: Light/Common/Medium/Heavy (U/Naala) per dozen, Super Heavy per piece, Connection Medium Golden per dozen, Connection Heavy/Super Heavy per piece, Kili Medium/Heavy per dozen, Kili Super Heavy per piece. No prices converted. Admin can change any item's unit in Products |
| 17 | Quantity on the invoice | One whole-number Quantity per line in the item's unit (no 'dozen + pieces' on one line, no fractions). If the client needs half dozens or mixed quantities later, add it as a new feature |
| 18 | Kili Clump Heavy (200..900) is cheaper than Kili Clump Medium (400..1300); 5" Heavy is blank | Imported as written; 5" Heavy skipped. Ask the client to verify these prices |
| 19 | Common 1*1/2 was overwritten on the paper (85 crossed, 82 kept) | 82 used (matches the client's spreadsheet) |
| 20 | Distributors in the customer list | Imported as type `dealer` with their city |
| 21 | Opening balances, phones, addresses of customers | Not provided; 0/empty. Owner adds later (or re-imports) |
| 22 | One-time typed customers on invoices | Allowed (name + city required). No ledger for them unless saved to Customers first |
