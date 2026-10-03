# Authentication (Deferred)

As requested, formal authentication (email/password login screens) is temporarily deferred for the initial development phase.

## Requirements When Implemented
When we re-enable authentication, we must follow the rules specified in `docs/01-TECH-AND-UI-RULES.md` and `docs/02-DATABASE.md`:
- Users are created by admins only (no public sign-up).
- Uses Supabase email/password Auth.
- Profiles table must link to `auth.users(id)`.
- RLS relies heavily on `auth.uid()` to fetch the correct `organization_id` via the `current_org_id()` function.
- Roles (`super_admin`, `admin`, `employee`) restrict access to pages like `/settings` and certain API actions.

## Development Workarounds
Since the database's Row Level Security (RLS) completely breaks if there is no logged-in user (queries will return 0 rows), we must use one of the temporary solutions to simulate a session so the app works during development.
