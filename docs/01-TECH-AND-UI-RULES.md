# 01. Tech Stack, Setup, Design System and Code Rules

## 1. Stack (fixed)
| Layer | Choice |
|---|---|
| Framework | **Next.js (latest stable, App Router)**, React, **TypeScript strict** |
| Backend | Next.js **Server Actions** and Route Handlers. No separate backend server. |
| Database/Auth/Storage | **Supabase**: PostgreSQL, Auth (email + password), Row Level Security, Storage |
| Supabase libs | `@supabase/supabase-js`, `@supabase/ssr` |
| Styling | **Tailwind CSS** (latest stable) |
| i18n | **next-intl** (cookie-based locale, no URL prefix): `en`, `ur` (RTL) |
| Validation | **Zod**; forms with **react-hook-form** + `@hookform/resolvers` |
| Tests | **Vitest** (unit), Playwright (optional e2e from Phase 4) |
| Lint/format | ESLint (next config), Prettier |
| Package manager | npm, Node 20+ |
| Hosting | **Vercel** (app) + **Supabase cloud** (database, region Singapore) |

Use the latest stable versions at build time and commit the lockfile. Do not add other UI libraries (no component kits). Write small components yourself.

## 2. Project setup commands (Phase 1)
```bash
# run INSIDE the project root folder that already contains docs/ and AGENTS.md (do not create a sub-folder)
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm
npm i @supabase/supabase-js @supabase/ssr next-intl zod react-hook-form @hookform/resolvers
npm i -D vitest @vitejs/plugin-react prettier
```
`package.json` scripts must include: `dev`, `build`, `start`, `lint`, `typecheck` (`tsc --noEmit`), `test` (`vitest run`).

## 3. Environment variables
`.env.example` (commit) and `.env.local` (never commit):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=        # server only, never imported in client components
NEXT_PUBLIC_APP_NAME=Factory Manager
```
`SUPABASE_SERVICE_ROLE_KEY` is used ONLY in `src/lib/supabase/admin.ts` (user management in Super Admin/Security phases). Add `import 'server-only'` there.

## 4. Folder structure
```
src/
  app/
    (auth)/login/page.tsx
    (app)/layout.tsx                 # header + auth guard
    (app)/dashboard/page.tsx
    (app)/products/page.tsx          # list + add product
    (app)/products/[id]/page.tsx     # qualities, sizes, prices
    (app)/customers/page.tsx
    (app)/customers/[id]/page.tsx
    (app)/invoices/page.tsx
    (app)/invoices/new/page.tsx
    (app)/invoices/[id]/page.tsx     # view + print
    (app)/invoices/[id]/edit/page.tsx  # drafts only
    (app)/settings/page.tsx
    (app)/payments/...  (Phase 5)    (app)/ledger/... (Phase 5)
    layout.tsx  globals.css  print.css
  components/
    ui/        Button, Input, Select, SearchSelect, Table, Modal, ConfirmDialog, Toast, Card, Field, LanguageSwitch
    invoice/   InvoiceForm, InvoiceLineCard, InvoicePaper, InvoiceTotals
    products/  PriceTable, ProductForm
    customers/ CustomerForm, CustomerQuickAdd
  lib/
    supabase/  server.ts, client.ts, middleware.ts, admin.ts
    money.ts            # ALL money math (see 04)
    money.test.ts
    format.ts           # number/date formatting
    errors.ts           # maps DB error codes to i18n message keys
    auth.ts             # getSessionProfile(), requireAdmin()
  i18n/ request.ts
  messages/ en.json, ur.json
  types/ database.ts    # generated with `supabase gen types typescript`
  middleware.ts
supabase/
  migrations/  0001_core.sql ... (see 02)
  seed.sql
DECISIONS.md   QUESTIONS.md (copy)
```

## 5. Design system (strict)
**Look reference: `reference/invoice-example.html`. Copy its look.**
- Page background **plain white `#FFFFFF`**. No dark mode (`<meta name="color-scheme" content="light">`).
- Only blue, grey, black, white. No gradients, shadows, blur, animations (except 150ms hover color), emoji or decorative icons.

| Token | Value | Use |
|---|---|---|
| `blue` | `#1D4ED8` | primary buttons, links, focus ring, invoice header |
| `blue-dark` | `#1E40AF` | button hover |
| `text` | `#111111` | all text |
| `muted` | `#6B7280` | labels, hints |
| `line` | `#D1D5DB` | card/table borders |
| `field-border` | `#9CA3AF` | input borders |
| `grey` | `#F3F4F6` | read-only fields, table headers, totals row |
| `danger` | `#B91C1C` | errors, remove buttons |
| `success` | `#15803D` | success messages only |

Components:
- **Card**: white, 1px `line` border, 6px radius, 14px padding.
- **Input/Select**: min-height **44px**, font 16px, 1px `field-border`, 4px radius. Focus: 2px blue outline. Read-only: grey background, bold text.
- **Button primary**: solid blue, white text, 44px high. **Secondary**: white with blue border and blue text. **Danger**: white with red border/text.
- Labels above fields, 13px muted. Error text 14px red under the field or form.
- **Table**: 1px borders, grey header, horizontal scroll container on mobile (`overflow-x:auto`).
- **Modal**: centered white box with 1px border, dim backdrop `rgba(0,0,0,.4)`.
- **Dashboard**: grid of big buttons (2 columns on phone, 4 on desktop), each 96px+ tall, blue text on white with blue border, one job each.
- **Header**: organization name left; language switch (English / اردو) and Logout right.
- Min font 16px for inputs. Tap targets >= 44px. Single-column forms on phone.
- Every list/form has: loading state, empty state ("No records yet"), error state in plain words.
- Confirm before cancel/delete with a ConfirmDialog.

## 6. Internationalization
- `en` and `ur`. Locale stored in cookie `locale` and in `profiles.language`. Default `en`.
- `ur` sets `<html dir="rtl" lang="ur">`. Use Tailwind logical utilities (`ms-`, `me-`, `ps-`, `pe-`, `text-start`) instead of left/right.
- Urdu font: **Noto Nastaliq Urdu** (body text may use Noto Sans Arabic for numbers/tables for legibility). Load with `next/font/google`.
- **No hard-coded visible text.** Every string comes from `messages/*.json` with keys like `invoice.new.title`. Provide both languages for every key. Numbers stay Western digits (0-9).
- Customer/product names are stored exactly as typed (can be Urdu or English).

## 7. Code rules
1. TypeScript strict; **no `any`**; no `@ts-ignore`.
2. **Server-side everything that matters**: validation (Zod), authorization, price lookup, totals. Never trust values from the browser.
3. Data writes go through Server Actions that call Supabase with the **user's session client** (so RLS applies). Use the service-role client only for Auth admin tasks.
4. Every business table has `organization_id`; policies in SQL enforce it (see `02`). Do not rely on `where organization_id = ...` in app code alone.
5. **Money**: DB `numeric(14,2)`; in TypeScript convert to integer **paisa** (minor units) and never use floating math on money. All math in `src/lib/money.ts` only.
6. Errors: DB functions raise coded errors (e.g. `PRICE_MISSING_DOZEN:Kili Clump 1/2 (Medium)`); `lib/errors.ts` maps codes to i18n keys; UI shows the message in the user's language.
7. Server Action return type: `{ ok: true, data } | { ok: false, error: { code: string, message: string } }`.
8. Small files, small components. No duplicated logic: invoice preview and server use the same `money.ts`.
9. After any DB change: add a new migration file (never edit an applied migration); regenerate `src/types/database.ts`.
10. Accessibility basics: labels linked to inputs, buttons are `<button>`, focus visible, contrast as per tokens.
11. Git: one commit per phase `Phase N: name`. `.env.local` ignored.
12. Performance: paginate lists (25 per page), index foreign keys, no N+1 queries.

## 8. Auth and routing
- Supabase email/password. No public sign-up. Users created by admins only.
- `middleware.ts` refreshes the session and redirects unauthenticated users to `/login`.
- After login, load `profiles` (role, organization, language). If the profile is inactive or the organization is `suspended`, sign out and show "Your account is not active. Contact the software provider."
- Helpers: `getSessionProfile()` (server) and `requireAdmin()` (throws/redirects when role is not admin).
- Roles: `super_admin` (organization_id null), `admin`, `employee`.
