# Factory Management System: Spec Pack for the AI Builder

This `docs/` folder sits inside the project root (next to `AGENTS.md`). The app code (`src/`, `supabase/`, `package.json`...) is created in the project root, NOT inside `docs/`. All file names below are relative to `docs/`.

You (the AI) are going to build this product from these files. They are written so that **you can start work immediately without asking the owner to explain anything**. If something is truly missing, use the default written in `QUESTIONS.md` and keep going.

## Reading order (read ALL fully before writing any code)
| # | File | Content |
|---|---|---|
| 1 | `README.md` | This file: rules of engagement, manual steps, definition of done |
| 2 | `00-PROJECT-OVERVIEW.md` | Product, users, glossary, modules, decisions already made |
| 3 | `01-TECH-AND-UI-RULES.md` | Stack, setup commands, folder structure, design system, code rules |
| 4 | `02-DATABASE.md` | Full SQL (migrations) for phases 1-5 + column lists for later phases |
| 5 | `03-BUILD-STEPS.md` | Phases 1-13, tasks, files, acceptance checklists |
| 6 | `04-INVOICE-MODULE.md` | The most important module, in complete detail |
| 7 | `05-DATA-IMPORT.md` | CSV import for products and customers |
| 8 | `07-SCREEN-SPECS.md` | Every screen: route, fields, buttons, messages |
| 9 | `08-TEST-PLAN.md` | Unit tests, manual test script, RLS tests |
| 10 | `QUESTIONS.md` | Open questions with the default to use meanwhile |
| 11 | `06-ANTIGRAVITY-PROMPTS.md` | The prompts the owner will paste (read to know what is expected) |
| 12 | `data/products-import.csv`, `data/customers-import.csv` | Real price lists (148 rows) and customers/distributors (42 rows): import them after Phases 2 and 3 |
| 13 | `reference/invoice-example.html` | Working UI/behavior reference for the invoice and the prices screen. Open it in a browser and copy the look exactly |

## Rules of engagement
1. Build **one phase at a time**, only the phase the owner names. Never start the next phase on your own.
2. Follow stack, folder structure, naming and UI rules exactly. Do not substitute libraries.
3. Never invent business rules. If unclear: use the default in `QUESTIONS.md`, and add a line to `DECISIONS.md` (create it) saying what you assumed.
4. Every table has RLS. Every query is scoped by organization. No exceptions.
5. All money math lives in ONE shared module with unit tests (spec in `04`).
6. After each phase: run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`. Then report using the **Phase Report format** below.
7. Do not leave TODOs, placeholder screens, fake data or `console.log` in finished work.
8. Commit after each phase with message `Phase N: <name>`.

## Phase Report format (what you reply with when a phase is finished)
```
PHASE N DONE: <name>
Built: <short list>
Migrations added: <file names>
Commands run: typecheck / lint / test / build  -> pass or fail
Checklist (from 03-BUILD-STEPS.md): each item PASS / FAIL / NOT TESTED (with reason)
Assumptions made (also added to DECISIONS.md): ...
Known issues: ...
How to test manually: <3-6 steps>
```

## Manual steps ONLY the owner can do (the AI cannot)
Ask the owner to do these once, in this order, and wait for confirmation:
1. Create a **Supabase** project. Region: **Singapore (ap-southeast-1)**. Save the database password.
2. In Supabase > Project Settings > API copy: Project URL, `anon` key, `service_role` key.
3. Put them in `.env.local` (see `01` for variable names). Never commit this file.
4. Apply migrations: either `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase db push`, or paste each file of `supabase/migrations` in the Supabase SQL editor in file-name order.
5. Supabase > Authentication > Users > Add user (email + password) for the first admin of A One. Copy that user's UUID.
6. Run `supabase/seed.sql` (it has a clearly marked place to paste the UUID).
7. Create a GitHub repo and push. Create a **Vercel** project from it and add the same 3 environment variables. 
8. Supabase > Authentication > Providers > Email: turn OFF "Allow new users to sign up" (users are created by admins only).

## Definition of done for the whole first release (Phases 1-5)
- Admin logs in on a phone, sets product prices, adds customers, creates an invoice with dozens and pieces, prints it on A4 / saves as PDF, sees the party ledger.
- Two organizations in the same database can never see each other's data.
- All tests pass, build passes, deployed on Vercel.
