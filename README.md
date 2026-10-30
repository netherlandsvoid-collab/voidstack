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
   Add `https://voidstack-rosy.vercel.app/auth/callback**` under **Redirect URLs**
   for email changes. The restricted callback pattern also allows the SDK's PKCE
   flow-id query parameter. Keep Secure email change enabled. The existing
   Change email address template can keep its default `{{ .ConfirmationURL }}`.
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
Public previews and private chat attachments are capped at 10 MB. Product originals use their own configurable limit; archive/project files are never executed.

The existing `/api/media/:id` URLs remain stable. After access checks, the route
redirects to a short-lived signed Storage URL so large responses also avoid
Vercel's payload limit. Private messages remain participant-only, and product
files still require the signed paid-download flow. Older base64 records continue
to work. The bucket is private and needs no public read/write RLS policies.

Abandoned or rejected objects remain private; scheduled cleanup and full malware
scanning/media decoding are not included. Public feed queries still scan record
types and require pagination/query optimization at scale.
Password recovery sends reset emails through the configured Supabase SMTP provider; see the setup below.

## Account settings and sale posts

Settings includes profile details, a unique username, email changes and password
changes. Sensitive changes require the current password and an active session.
Email changes remain pending until Supabase's required confirmations are complete;
open confirmation links in the browser that requested the change, or sign in with
the confirmed new address afterward. Passwords stay in Supabase Auth. The signed-in
user's email appears only in the private `me` response, never public creator data.
Forgotten-password recovery is still separate from signed-in password changes.

In the post composer, choose **Sell a download**, add a public preview, enter a
price and currency, and upload the buyer's private original/archive/project
file. The post and published marketplace product are saved in one bulk upsert.
The feed and post details show the price and link to the product. Editing a sale
post preserves the product link; edit its price or private file in Creator studio.
A normal post remains free. Listings currently use a personal-use licence.

Checkout now supports direct payments to sellers with manual receipt confirmation.
See Payments below for setup and the delivery flow.
No new SQL migration or environment variables are required for these controls;
the email callback Redirect URL above must be configured before email changes.

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

Buyers pay sellers directly outside Nexirel. There is no automatic provider charge,
escrow, cross-currency conversion, automatic payment verification, or automatic refund.

1. In **Settings → Receive payments**, sellers add up to five bank accounts,
   PayPal emails, Paystack payment links or Flutterwave payment links, each with a
   receiving currency. Links must use HTTPS on the provider's allowed domains.
   Sellers need their own working receiving account/link; saving details does not
   activate any provider or verify account ownership.
2. Set the listing's currency to match a saved payment method. Existing listings
   retain USD. Supported currencies are USD, NGN, EUR, GBP, CAD, AUD, GHS, KES and
   ZAR. There is no conversion. NGN/KES listings allow prices from 1 to 10,000,000;
   other currencies allow 1 to 10,000, at most two decimal places. Marketplace
   price sorting groups currencies before sorting amounts.
3. Buyer selects **Get this resource → Show payment instructions**, sends the
   exact amount to the seller, and supplies their payer name and transaction ID
   through **I've sent payment**. This does not grant download access.
4. Seller opens **Creator studio → Recent orders → Payment details & review**,
   independently checks the actual account and confirms full receipt to unlock
   the file, or sends a payment-not-found note so the buyer can check and resubmit.
5. Buyer returns to **Purchases & downloads** to reopen instructions/check status,
   or download once confirmed. Status refreshes on the app's normal polling cycle.

Payment settings are separate private `seller-payment` records in the existing
server-only table. Public profiles/state never contain them; authenticated buyers
can see the matching seller details at checkout. Buyer and seller each see their
order's payment snapshot. Downloads still require the buyer's session, paid order,
and expiring signed URL. The order captures the original file, title, price,
currency and selected payment instructions, so later listing/settings edits do not
replace an existing order's agreement. Personal bank details are intentionally
shared with buyers; do not enter card data, passwords or provider API secrets.

The existing primary key makes direct order creation idempotent. Conditional
PostgREST updates check status and revision to prevent concurrent confirmation or
stale reviews from reverting paid orders. Only the owning seller can confirm;
buyers and other users cannot approve payments. No receipt image is treated as
proof. Sample resources cannot receive direct orders. Existing paid development
orders remain accessible and keep their original mode labels.

**No new SQL, payment API keys or environment variables are needed.** Existing
Supabase runtime/table and private storage setup must already work. Deploy the
code, then sellers configure their own payment options. `ENABLE_DEV_CHECKOUT` is
legacy and no longer creates simulated orders. Stripe test helpers/webhook remain
for existing test records; the normal checkout endpoint exclusively creates direct
orders and never completes a simulated purchase.

Distributed rate limiting, moderation operations, malware scanning, backups,
account deletion/export, real payment-provider readiness and load testing remain
launch work. The in-process throttle is a basic development safeguard.

### Open Studio visual system

The lavender/plum/orange theme lives in `src/app/studio.css`, layered over the existing structural styles. The feed spotlights the first result, shows a linked download only when a published listing exists, and offers a collapsible Filter feed control. The download shelf uses published product data. Navigation changes clear cross-page category filters. Mobile retains a bottom navigation bar and drawer; dark mode uses the same semantic tokens.

`public/studio/*.webp` contains generated sample artwork; only sample seed images and the marketplace banner use it. User-uploaded images and records are unchanged. Manrope is self-hosted under `public/fonts`, with its SIL Open Font License alongside it. No additional deployment variables or SQL are needed. See `design-qa.md` for browser checks and remaining test gaps.


### Forgotten-password recovery setup

The sign-in form includes **Forgot password?**. Recovery sends through the existing Supabase Auth/SMTP configuration. New password entry is separate from the signed-in current-password settings flow.

Before deploying this change, in Supabase **Authentication → URL Configuration → Redirect URLs**, add:

```text
https://voidstack-rosy.vercel.app/reset-password
```

In **Authentication → Email Templates → Reset Password**, set the reset link to:

```html
<a href="{{ .SiteURL }}/reset-password#token_hash={{ .TokenHash }}">Reset password</a>
```

Keep the production Site URL `https://voidstack-rosy.vercel.app` and the existing SMTP configuration. Do not change the signup or change-email templates. The reset template must use this link, rather than `{{ .ConfirmationURL }}`: this flow verifies the recovery token on form submission, not on link opening. URL fragments keep the token out of web-server request logs. The reset page removes it from the address bar and uses a no-referrer policy. Refreshing that page clears the in-memory link; request a fresh email if needed.

The API validates new/confirmed passwords (10–128 characters) before consuming the single-use Supabase recovery token. An ordinary session or signup token cannot authorize a forgotten-password reset. The recovery session is signed out after the update. Missing mail configuration/provider errors are reported honestly; unknown account addresses get the same generic success message. Supabase Auth's email rate limits apply along with the existing per-instance API limiter. No SQL migration, new secret, or environment variable is needed (`APP_URL` must remain the production URL).

Validation: isolated SDK/route tests cover email requests, non-disclosure, wrong origins, invalid/expired/replayed tokens, mismatched/short passwords, account ownership, old/new login credentials, session cleanup, missing configuration, and provider failures. Real inbox delivery and the dashboard template must be checked after deployment.


### Private product originals and large uploads

Run `supabase/migrations/004_product_storage.sql` in the Supabase SQL editor. It creates the **private** `voidstack-products` bucket with a 50 MiB default limit. It does not change the existing 10 MiB `voidstack-media` bucket, and rerunning it preserves any higher product-bucket limit you configured. Do not add public read/write policies.

The sale composer and Creator studio now show the selected filename, size, upload progress, verified success, inline failure/retry, and pause/resume/cancel controls. Project file types such as PSD/AI/AEP/BLEND can upload as private binary files when the browser assigns a nonstandard MIME type. Existing listing editors show the current file's name/size to its owner only. Selecting a file does not mean it is attached: only successful storage verification sets the listing file ID.

Product uploads use TUS directly from the browser to Storage in 6 MiB chunks. The server issues an owner/path-scoped signed upload token, then checks the actual stored size/type/signature before recording a private original. File contents never pass through the Vercel API. Automatic retry resumes the accepted byte offset in the current upload; pause/resume works while the page stays open. **Refresh/closing the page loses the upload state.** Signed tickets/pending records expire after two hours. Very slow uploads may need to restart before that deadline. This is not a cross-device/background uploader.

**Supabase Free has a provider ceiling of 50 MB per file. Changing code cannot raise that ceiling.** Files of 100 MB, 1 GB, etc. require an eligible paid Storage plan or a different storage integration. No plan is upgraded automatically.

For a paid project, configure all three limits together:

1. Supabase Storage Settings → global maximum file size: set your chosen maximum.
2. Storage → `voidstack-products` → Edit bucket → maximum file size: set the same maximum; keep the bucket private.
3. Vercel Production variable `PRODUCT_MAX_UPLOAD_MB`: set the maximum in MiB, then redeploy. `1024` means 1 GiB and `5120` means 5 GiB. The application supports 1–5120 MiB and defaults to `50` if unset.

The public state response exposes only this numeric upload limit so the file picker can display the correct cap. It never exposes storage secrets, original paths, file IDs, or other sellers' original filenames. The provider's plan/global/bucket restrictions still take precedence. Download authorization and legacy media URLs continue to work.

Tests exercise the real TUS client with a 7 MiB file, a failed chunk/HEAD-offset recovery, private bucket completion, size limits through a 1 GiB metadata ticket, unchanged media limits, ownership, and private metadata visibility. No multi-GB payload or production upload is used by these tests. There is no malware scanner, archive execution, orphan cleanup job, or seller quota/billing system in this change.
