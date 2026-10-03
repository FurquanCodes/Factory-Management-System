# 05. CSV Import (Products with prices, and Customers)

The owner will provide his product list with prices and his customer list as spreadsheets. Build an **Import CSV** button on `/products` and `/customers` (admin only for products; admin and employee for customers). Spreadsheet users: Google Sheets/Excel -> File -> Download -> CSV.

## Behavior (both imports)
1. Button **Import CSV** opens a modal: file picker, link **Download template**.
2. Parse in the browser (own small parser or `papaparse`-free implementation; handle quotes, commas inside quotes, UTF-8 with or without BOM, CRLF/LF).
3. Show a **Preview** table of the first 20 rows and a summary: `N rows ok, M rows with errors`.
4. Errors table: **Row number | Column | Reason** (plain words). The user can fix the file and re-upload, or press **Import valid rows** to import only the good ones.
5. On import, the server action validates everything again (Zod), then inserts in one transaction per file (all good rows or none if a database error occurs).
6. **Idempotent**: importing the same file twice must not duplicate anything (match rules below). Existing rows are updated only where stated.
7. Limits: max 5000 rows, max 2 MB.
8. Result message: `Imported 118 rows: 12 new, 106 updated, 0 skipped.` Every import writes one summary row into `audit_log` (table `import`, who, when, counts) in addition to row-level audit.
9. Numbers: accept `1,080`, `1080`, `1080.50`, spaces; reject text. Empty means "not set".
10. Trim all text. Do not change letter case of names, labels or sizes. **Sizes stay text exactly as given** (`1*1/2*3/4`, `1"`).

## Products CSV
One row = one product + quality + size with its price and unit.
| Column | Required | Example | Rule |
|---|---|---|---|
| `product` | yes | `U Clump` | created if new (case-insensitive match) |
| `quality` | yes | `Light` | created under the product if new |
| `size` | yes | `1*1/2` | created under the product if new; kept as text |
| `price` | yes | `37` | number >= 0 |
| `unit` | yes | `dozen` | `dozen` or `piece` |

Example:
```
product,quality,size,price,unit
U Clump,Light,1/2,37,dozen
U Clump,Super Heavy,1/2,17,piece
Connection Clump,Medium Golden,1*1/2,1080,dozen
```
Algorithm per row: find or create product -> quality -> size (database triggers create the variants) -> find the variant -> if price or unit differs from the current rate, insert a new `rates` row (history kept); if equal, skip (counts as "unchanged").
Errors: missing required column, empty product/quality/size, non-numeric or negative price, unit not `dozen`/`piece`, duplicate (product, quality, size) inside the file (report the later row).

## Customers CSV
| Column | Required | Example | Rule |
|---|---|---|---|
| `name` | yes | `Ahmed Brothers` | with `city` forms the match key (case-insensitive) |
| `phone` | no | `0300xxxxxxx` | text |
| `city` | **yes** | `Rawalpindi` | needed so invoices can filter customers by city |
| `address` | no | | |
| `type` | no | `customer` | `customer` or `dealer`, default customer |
| `opening_balance` | no | `111792` | number, may be negative, default 0 |

Example:
```
name,phone,city,address,type,opening_balance
Ahmed Brothers,,Rawalpindi,,customer,111792
Mr. Mudassar Hassan,,Gujranwala,,dealer,0
```
Existing customer (same name AND same city): update phone/city/address/type; **do not change opening_balance** if the customer already has invoices or payments (report "balance unchanged: has transactions"); otherwise update it.
Errors: empty name, empty city, duplicate name + city inside the file, invalid type, non-numeric balance. Urdu names must import and display correctly.

## Templates
`Download template` returns the example CSV above for the screen being used (with header row and 2 sample rows).

## Tests
Unit tests for the parser (quotes, commas, BOM, `1,080`), validation (each error type) and idempotency (second import of the same file reports 0 new).

## Ready-made data files (real client data, in `data/`)
Import these after Phase 2 (products) and Phase 3 (customers), using the import screens, and verify counts.
| File | Rows | Notes |
|---|---|---|
| `data/products-import.csv` | 148 | U Clump, Naala Clump (same prices as U Clump), Connection Clump, Kili Clump. **Hanging Clump is NOT included** (its list is not final; owner adds it later in the app). |
| `data/customers-import.csv` | 42 | 19 Rawalpindi + 6 Peshawar + 11 Gujranwala customers (type `customer`) and 6 distributors (type `dealer`, cities Gujranwala, Rawalpindi, Mansehra). Phone/address empty; opening balances 0 (owner will provide). |

Rules applied when the files were made (also in `QUESTIONS.md`): each item has the unit the client wrote on the list (U/Naala Light, Common, Medium, Heavy per dozen, Super Heavy per piece; Connection Medium Golden per dozen, Heavy and Super Heavy per piece; Kili Medium and Heavy per dozen, Super Heavy per piece); no price is converted or derived; `1"` inch marks are inside the size text and are CSV-escaped. Columns: product, quality, size, price, unit.
