# Instructions for the AI builder (read this first)

This repository builds a multi-tenant **Factory Management System** (invoice first). All specifications are in `./docs`.

1. Read `docs/README.md` first, then every file it lists, in the order it gives. Open `docs/reference/invoice-example.html` for the visual look only (follow `docs/04-INVOICE-MODULE.md` for behavior).
2. Build ONE phase at a time, only the phase the owner names (see `docs/03-BUILD-STEPS.md`). Never start the next phase on your own.
3. Do not ask the owner to re-explain anything that is in `docs/`. If something is missing, use the default in `docs/QUESTIONS.md` and record the assumption in `DECISIONS.md` (create it in the project root).
4. App code goes in the project root (`src/`, `supabase/`, `package.json`, ...). Never put app code inside `docs/`. Do not edit files in `docs/` unless the owner asks.
5. Real data to import after Phases 2 and 3: `docs/data/products-import.csv` and `docs/data/customers-import.csv`.
6. When a phase is finished, run typecheck, lint, tests and build, and reply in the "Phase Report" format from `docs/README.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
