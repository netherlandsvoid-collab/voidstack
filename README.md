# Nexirel

A responsive social home and digital marketplace for creatives, built with Next.js, TypeScript, Tailwind CSS, Lucide icons, Node SQLite, and Stripe Connect test-checkout support. Original bundled sample artwork keeps the first-run experience independent of third-party image hosts.

## Run

Requires **Node 24+** (uses `node:sqlite`).

```sh
npm ci --cache /tmp/nexirel-npm
npm run dev
```

Open the application on port 3000 through your development environment. No credentials are required for local development. Register your own account; sample creators cannot be logged into. SQLite persistence is created automatically in `.data/nexirel.sqlite`. Do not commit `.data` or environment secrets.

```sh
npm run build
npm start
npm run typecheck
# With the application running in another terminal:
npm test
node tests/ui.mjs
node scripts/clean-test-data.mjs
```

Browser tests use `/usr/bin/chromium`; override `CHROMIUM_PATH` for your machine. Screenshots go to `test-results`. API tests create three accounts and exercise the five requested journeys; the cleanup script removes only accounts with the exact automated-test names. Use a separate `DATA_DIR` for automated testing on a shared machine.

## Working journeys

- Register/sign in/sign out with salted scrypt passwords and HTTP-only same-site sessions. Complete and edit a profile, avatar, bio, discipline, and website.
- Browse Discover (newest first), Following, categories, creator profiles, and saved work. Publish text, up to six images, or controlled video; edit/delete your own posts; like, comment, and copy shareable post links. Search creators, posts, and products.
- Follow creators, send one-to-one messages and private image attachments, see unread indicators and read receipts. Server-sent events update connected clients; 30-second polling is a reconnection fallback. Messages and attachments are restricted to participants. Blocking prevents new messages in either direction.
- Create a storefront using your existing account. Upload separate public previews and private files; save drafts, publish or archive. Browse category/price filters and sorting, product details, compatibility and licence terms.
- Explicit simulated checkout without credentials. Persist development orders, see order-derived seller metrics, and request signed downloads. Authorised links expire in 60 seconds and also require the purchasing user's session. Archiving preserves existing purchases. Sample products return an explicitly labelled demonstration text file, never a promised commercial asset.
- Notifications for follows, likes, comments and purchases, linked to their targets. Report posts and block creators. Protected moderation UI for reports, suspending users, and archiving listings.

Register the intended moderator, then grant the role through the server console:

```sh
node scripts/admin.mjs <existing-username>
```

Visit account Settings → Administration. There is no public role-promotion API or default admin password.

## Stripe test payments and Connect payouts

The adapter uses Stripe's official SDK and its current Checkout/Connect type definitions. Implementation references checked: [Stripe SDK webhook instructions](https://github.com/stripe/stripe-node#webhook-signing) and [official Checkout sample](https://github.com/stripe-samples/checkout-single-subscription/blob/main/server/node/server.js). Direct `docs.stripe.com` access was blocked in this environment, so regional eligibility and hosted end-to-end checkout have **not** been verified.

1. Confirm [Stripe Connect availability](https://docs.stripe.com/connect/cross-border-payouts) for the platform's deployment country and each seller. The deployment country was not specified. Do not enable real payments until eligibility, taxes, refunds, disputes, and marketplace obligations are reviewed.
2. Create a Stripe platform with Connect enabled, test keys, and fully onboarded test connected accounts (charges and payouts enabled).
3. Copy `.env.example` to `.env.local` and set `APP_URL`, `STRIPE_SECRET_KEY` (`sk_test_` only), `STRIPE_WEBHOOK_SECRET`, and `STRIPE_CONNECTED_ACCOUNTS` (JSON map of Nexirel seller ID → `acct_…`). Restart the server. These are server-only secrets.
4. Configure a signed webhook at `/api/stripe/webhook` for `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, and `checkout.session.expired`. For local development, use Stripe CLI forwarding and its matching signing secret.
5. Checkout uses server-owned prices, USD, a verified server-side Connect destination, and a stable idempotency key. The buyer returns to Purchases; the redirect does not grant access. Only a valid signed webhook with matching session, order, currency and amount marks the order paid. Duplicate events are recorded and ignored. Live-mode keys and events are deliberately rejected.

Without Stripe credentials, the interface clearly shows **Development checkout**. Production simulation is disabled unless `ENABLE_DEV_CHECKOUT=true` is explicitly set on a private demo. Never enable it on a commercial deployment. Development orders are visibly marked and are not real earnings. Seller Connect self-service onboarding and payout-status UI are not implemented; operator-managed test account mapping is required. Payment-provider calls need `api.stripe.com` network access.

## Persistence, security, and deployment

The default runtime is a **single Node server with SQLite**, not Supabase. Keep `.data` on a private persistent disk, restrict filesystem access, back it up with a SQLite-aware tool, and terminate TLS at your host/reverse proxy. Do not deploy this storage model to ephemeral serverless instances or run multiple replicas against independent disks. Live processes must be restarted after environment restoration.

All mutation APIs validate sessions server-side. Ownership checks prevent editing other users' profiles, posts, and listings. Private message data is filtered by participant; paid file IDs are omitted from public product data. Uploads are capped at 10 MB, public uploads are limited to image/video MIME types, common image signatures are checked, and archive/project files are never executed. Downloads use attachment disposition, safe filenames, no-store caching and a session-bound HMAC signature. Basic in-process request throttling is suitable for development, not a substitute for edge rate limits.

Before public launch: add malware scanning/quarantine and robust media decoding/transcoding; distributed rate limiting, bot protection, monitoring, database migrations/backups and recovery; an active moderation process; email verification and password recovery delivery; account deletion/export and legal policies; seller self-service KYC onboarding; tax/refund/dispute handling; and security/load review. Email recovery currently states that no email is sent. There is no false success screen.

### Optional Supabase migration target

`supabase/migrations/001_optional_production_schema.sql` provides a schema/RLS and storage-policy starting point for Supabase Auth, PostgreSQL, private product storage, and participant-only messaging. **It is not applied, integration-tested, or connected to the runtime.** Implement a Supabase repository adapter, auth callbacks, verified email/recovery, signed storage issuance, and Realtime subscriptions before selecting this backend. Setting Supabase environment variables alone does not switch the app. Never expose a service-role key to the browser.

### Known scope limits

- Local durable data is implemented and tested; managed Supabase auth/storage is a migration target.
- Live payments, real payouts and regional availability are unverified; Stripe supports test mode only.
- Product preview is a single cover image; post media supports multiple images. Image optimisation uses browser-native loading and vector samples; production photo variants/transcoding remain.
- The local message transport uses SSE with fallback polling, not Supabase Realtime. There is no end-to-end encryption.
- Feeds have a client-side “load more” experience over the current data snapshot; server-side cursor pagination and full-text indexes are required for large deployments.

These boundaries are intentional and visible. The app is a working development implementation, not a claim of production launch readiness.

## Sample content

All sample illustrations and avatars in `public/art` are original SVG compositions generated by `scripts/art.mjs`, bundled with this project under the MIT licence in `public/art/LICENSE.txt`. Sample creator personas are fictional. Sample activity is labelled, and buyer/seller transactions use actual local order records.

## Deploy on Render

The root `render.yaml` Blueprint configures a paid Starter Node web service and a 1 GB persistent disk. Review the current price in Render before creating the service. The disk stores SQLite and private uploads at `/var/data/nexirel`; never change this to the ephemeral application directory. Use one instance. Automatic deploys and simulated production checkout are disabled.

1. In Render, choose **New → Blueprint**, select this GitHub repository and its `main` branch, and use the root `render.yaml`.
2. Review the service and disk charges, then create the Blueprint. Render builds and starts the application; `/api/health` checks database access.
3. Open the HTTPS address assigned by Render and register your own account. New installs contain fictional sample creators and bundled art, not local development accounts or uploaded files.
4. For Stripe test payments, add the server-only variables described above in Render's environment settings and set `APP_URL` to the exact assigned HTTPS address. Do not enable simulated checkout on a public deployment. Restart the service after changing variables.
5. Keep a backup of the persistent disk. The first paid disk-backed deploy may interrupt service briefly; review Render's current disk and backup documentation.

Connecting GitHub in your Render account does not grant this chat access to your Render dashboard. Blueprint service creation and its paid resources must be confirmed in Render itself.
