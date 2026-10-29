# Voidstack / Nexirel

A Next.js social platform and digital marketplace. The Vercel runtime uses
**Supabase Auth and hosted Postgres**. No SQLite files or writable application
filesystem are required. Existing app interfaces and ownership checks are preserved.

## Connect the Supabase project

1. In Supabase **SQL Editor**, run
   [`supabase/migrations/002_vercel_runtime.sql`](supabase/migrations/002_vercel_runtime.sql).
   For image/file uploads, also run
   [`supabase/migrations/003_media_storage.sql`](supabase/migrations/003_media_storage.sql)
   to create the private `voidstack-media` bucket with a 10 MB per-file limit.
   `001_optional_production_schema.sql` is a historical,
   unused normalized-schema proposal and is not the schema this adapter reads.
2. In Vercel, open **voidstack → Settings → Environment Variables** and set:

   | Name | Value | Visibility |
   | --- | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://zxprjbwmfixswstqwwko.supabase.co` | Public |
   | `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Project's `sb_publishable_…` key | Public |
   | `SUPABASE_SECRET_KEY` | Supabase Settings → API Keys → Secret keys (`sb_secret_…`) | Server only |
   | `APP_URL` | `https://voidstack-rosy.vercel.app` | Public URL |
   | `ENABLE_DEV_CHECKOUT` | `false` | Configuration |

   Apply production values to **Production**. Use a separate Supabase test project
   for Preview and automated integration testing. Never put the secret key in a
   `NEXT_PUBLIC_` variable, source control, screenshots, or chat.
   Remove obsolete `DATA_DIR` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` variables.
3. In Supabase **Authentication → URL Configuration**, set **Site URL** to
   `https://voidstack-rosy.vercel.app`.
4. In **Authentication → Email Templates → Confirm signup**, replace the
   confirmation button/link's `{{ .ConfirmationURL }}` with:

   ```text
   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email
   ```

   Keep email confirmation enabled for public signup. The app shows a check-email
   message until confirmation succeeds. Configure production SMTP/email delivery
   in Supabase; built-in email delivery has restrictions and rate limits.
5. Merge/deploy the code changes, then redeploy after setting variables. Confirm
   `/api/health` responds with JSON `{ "status": "ok" }` before testing signup.

   Test signup → confirmation email → confirmation link → logged-in account,
   then sign out and sign in again. Supabase Authentication → Users and the
   `voidstack_records` table should contain the new account and profile.

No automatic migration of old `.data/nexirel.sqlite` users is performed. Users
must register again. Password hashes and custom `nx_session` cookies are retired.
The user-provided publishable key is not hardcoded into the source.

## Storage and authorization

The API reads/writes a private `voidstack_records(kind, id, data)` Postgres table
using a server-only secret key. This preserves the app's existing record shapes.
RLS is enabled, and `anon`/`authenticated` have no direct table grants or policies.
Browser users access data through API routes; session validation, participation,
moderation, product ownership and purchase checks happen on the server.

A trigger creates the profile atomically with each Supabase Auth user. A unique
index prevents duplicate usernames under concurrency. Client metadata never sets
administrator roles. SSR cookies are HTTP-only and updated on every authenticated
API response, including session refresh and logout. Responses are private/no-store.

Sample creators and artwork are read-only local fallback content; sample accounts
cannot be logged into. Moderation can persist overrides for sample records.
Cross-instance notifications use the existing 30-second polling. `/api/events`
returns 204 to stop the old process-local SSE connection on serverless hosts.
Supabase Realtime and a normalized query/pagination architecture are not included.

New uploads go directly from the browser to a private Supabase Storage bucket
using a server-issued, path-scoped signed upload token. Only small metadata
requests pass through Vercel. The API verifies session, ownership, actual size,
content type and common file signatures before making an upload available.
All files are capped at 10 MB; archive/project files are never executed.

The existing `/api/media/:id` URLs remain stable. After access checks, the route
redirects to a short-lived signed Storage URL so large responses also avoid
Vercel's payload limit. Private messages remain participant-only, and product
files still require the signed paid-download flow. Older base64 records continue
to work. The bucket is private and needs no public read/write RLS policies.

Abandoned or rejected objects remain private; scheduled cleanup and full malware
scanning/media decoding are not included. Public feed queries still scan record
types and require pagination/query optimization at scale.
Password recovery retains the honest "no reset email sent" placeholder until a
recovery and password-update flow is implemented.

## Local development and tests

Use Node 24+. Copy `.env.example` to `.env.local` and fill values from a **test**
Supabase project where the migration has been applied. Next.js loads this file.

```sh
npm ci
npm run dev
npm run typecheck
npm test
npm run test:journeys:mock
npm run build
```

Unit tests exercise the real Supabase SDKs against an isolated HTTP fixture.
Postgres migration tests run in PGlite and check profile creation, uniqueness,
rollback, role injection prevention, and blocked direct browser table access.
The full existing journeys can run against the actual route handlers plus that
fixture, without production network calls. This does not replace hosted testing.

For hosted journeys, use a dedicated disposable Supabase project and app
instance, set `TEST_URL`, and explicitly disable email confirmation **only in that
test project** (the journey assumes immediate signup). Never use production:

```sh
TEST_URL=http://localhost:3000 node --import tsx --test tests/journeys.test.ts
```

Grant an existing real user moderation rights from your own trusted terminal:

```sh
node --env-file=.env.local scripts/admin.mjs <existing-username>
```

The old SQLite cleanup script is intentionally disabled. Remove test users from
Supabase Auth only on your dedicated test project.

## Payments and launch scope

Stripe **test mode only** remains optional. Set `STRIPE_SECRET_KEY`,
`STRIPE_WEBHOOK_SECRET`, `STRIPE_CONNECTED_ACCOUNTS` (seller ID → onboarded test
Connect account ID), and `APP_URL`. Only signed, matching payment events grant
paid-download access. Downloads require a session, paid order and short-lived
signature shared consistently across serverless instances. Real commerce,
seller onboarding, production payouts and regional eligibility are not enabled.
Do not enable simulated checkout on a public site.

Distributed rate limiting, moderation operations, malware scanning, backups,
account deletion/export, real payment-provider readiness and load testing remain
launch work. The in-process throttle is a basic development safeguard.
