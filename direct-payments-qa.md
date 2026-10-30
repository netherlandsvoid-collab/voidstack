# Direct seller payments

Implemented seller-owned receiving settings, buyer checkout with a method selector,
manual seller confirmation, and private download delivery. No provider credentials,
SQL migrations or new deployment variables are required. Existing listings stay USD;
NGN and other supported currencies must be selected explicitly.

## Validation

- Unit/integration suite: 33 passed, 1 hosted journey skipped. Real Supabase SDKs
  run against an isolated HTTP fixture; migration suites use PGlite.
- Mock journey suite: all five connected journeys passed, including payment report,
  buyer approval rejection, seller receipt confirmation, and signed file delivery.
- TypeScript and optimized production build passed; whitespace checks passed.
- New tests cover private settings/order visibility, URL allowlists, currency mismatch,
  price/status tampering, duplicate checkout races, unauthorized approval, required
  receipt acknowledgement, payment-not-found/resubmission, stale and competing seller
  reviews, paid-order immutability, and original-file delivery after listing edits.
- Browser: actual components against isolated route handlers, desktop and 390px iframe.
  Walked buyer method selection → order instructions → payment report → seller review
  → required full-receipt checkbox → confirmation → buyer download-ready status.
  Saved receiving settings successfully. Checked phone form layout and fixed unstyled
  fields outside the profile modal. No application errors observed; console included
  browser-extension metadata warnings unrelated to the app.
- React review: components remain at module scope; server endpoints authenticate
  every operation; asynchronous option loading ignores unmounted results; seller
  review state resets when the order revision changes; labelled fields, required
  checkbox, status/alert messages and native controls support keyboard use.

## Limits

No real account, payment or production data was used. Hosted deployment and a real
buyer/seller walkthrough remain post-merge checks. Nexirel cannot verify external
payments, account ownership, provider eligibility or receiving capability. Sellers
must check their account before confirmation; external refunds/disputes stay between
buyer, seller and their provider. No currency conversion, automatic provider payout,
escrow, receipt-image verification, cancellation or payment-method changes after order
creation are included. Notification writes are best-effort; order state is authoritative.
