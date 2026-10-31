# Nexirel post-launch verification — October 31, 2026

## Result

Six client-side issues were found and corrected on the fix/post-launch-checks branch. The live site still needs the resulting pull request merged to receive these fixes. No production accounts, messages, posts, payment details or orders were created or changed by the tests.

The tested story is: a visitor discovers public creative work, opens posts/profiles, signs in for community actions, and uses authenticated posting, messaging and direct seller-payment flows backed by Supabase.

## Findings and corrections

| Severity | Trigger and observed result | Correction | Code |
| --- | --- | --- | --- |
| P2 | A missing/deleted post URL left “Loading post...” permanently visible after the feed finished loading. Its detail-modal layout collapsed to a thin strip. Reproduced on the production domain. | Separate loading, backend-error/retry and unavailable states; use the normal dialog layout when there is no post. Include a return-to-browsing action. | src/app/page.tsx: post dialog rendering |
| P2 | An invalid profile URL rendered a completely blank main region after loading. Reproduced live. | Add loading and unavailable-profile states, an Explore action, and retain the existing API error/retry display. | src/app/page.tsx: profile rendering |
| P2 | Escape dismissed a post dialog but left ?post=... in the URL; reloading reopened it. Navigating away from a profile also retained its old URL. | Centralize dialog dismissal, use it for Escape/button/scrim, and clear obsolete deep-link parameters on page navigation. Closing only a navigation drawer does not erase a valid profile URL. | src/app/page.tsx: closeDialog, useOverlayFocus callback and go |
| P2 | Copy post link threw an uncaught TypeError when navigator.clipboard was unavailable. Reproduced in the live site embedded in a test frame, where clipboard access is not provided. The same missing-API/permission failure can occur in restricted browser contexts. | Share and Copy post link use one guarded helper. Show the URL for manual copying if the clipboard call is absent or rejected. | src/app/page.tsx: copyPostLink and post action handlers |
| P2 | A logged-out visitor clicked Block / unblock creator; the sign-in dialog briefly opened and was then closed by the options handler. Reproduced live; no block was written. | Return immediately after opening authentication; close the post action dialog only after an authenticated block request succeeds. | src/app/page.tsx: block action |
| P3 | Post-detail Save always displayed the same empty icon and label after saving, despite the state changing. The feed button already reflected the state. | Reflect saved/unsaved state in the icon, color, accessible label and aria-pressed. Add matching pressed/name semantics to detail Like. | src/app/page.tsx: detail-actions |

## Evidence

- docs/post-launch-qa/nexirel-missing-post-before.jpg: live missing-post hang/collapsed dialog.
- docs/post-launch-qa/nexirel-missing-post-after.jpg: corrected fixture-rendered unavailable dialog.
- docs/post-launch-qa/nexirel-missing-profile-before.jpg: live blank profile.
- docs/post-launch-qa/nexirel-missing-profile-after.jpg: corrected unavailable profile.
- docs/post-launch-qa/nexirel-qa-messages.jpg: sent message in an isolated account.
- docs/post-launch-qa/nexirel-qa-phone-messages.jpg: recipient sees that same message on a phone layout.

Before/after screenshots intentionally use production public content for reproduction and isolated test content for regression checks. They are functional evidence, not matched-theme pixel comparisons.

## Verified boundaries

| Boundary | Result and evidence |
| --- | --- |
| Live UI and assets | New design loads; visible image elements had complete/naturalWidth values; normal navigation and load-more worked. |
| Live API/database | /api/health returned HTTP 200, status ok; /api/state returned HTTP 200 JSON with public users/posts/products. |
| Guest data privacy | Guest state had zero orders and seller orders, no seller payment methods, no user email/password fields, and no original fileId in public products. This is a scoped public-response check, not a comprehensive security assessment. |
| Server observability | Vercel grouped runtime errors reported no clusters for the preceding one-hour window at query time. The clipboard failure was a browser exception, not a server exception. |
| Live filtering/search | Currency filtering produced the correct empty NGN state for the available products; an unmatched search produced an empty feed and cleared back to results. |
| Responsive UI | Live 390px and 768px iframe viewports had document client/scroll widths 375/375 and 753/753 respectively, accounting for native scrollbars. No horizontal document overflow in these states. |
| Auth/account/data | Automated fixture tests covered signup, login/logout, confirmation-required state, expired-session refresh, profile uniqueness, password/email changes and recovery token misuse/single-use behavior. No real credentials entered or reset email sent. |
| Posting/comments | Connected journeys publish and comment through the real route handlers and SDK boundary; browser fixture comment submission and updated conversation count were observed. |
| Messaging | Browser fixture seller sent a message; the buyer saw the conversation and message in a 390px phone iframe. Connected tests also rejected third-party access. |
| Uploads | Automated tests verified direct storage uploads, scoped tickets, private files, 6MB TUS chunks/retries and verification. No production file or real GB transfer was uploaded. |
| Checkout/download | Connected fixture journey verifies that direct orders wait for seller receipt confirmation and only authorized paid buyers obtain signed download links, including after archiving. No money moved. |
| Corrected client states | Missing post now shows unavailable; Escape cleans the URL and reload stays closed; missing profile returns to Explore with clean URL; restricted clipboard shows a manual-copy URL without an application exception; guest block keeps Sign in visible; detail Save becomes Unsave with aria-pressed=true. |

## Validation

- npm test: 33 passed, 0 failed, 1 skipped. The skipped item is the hosted journey suite; it was run separately against the isolated connected fixture.
- npm run test:journeys:mock: all five journeys passed (runner reports six tests including parent).
- Optimized Next production build and TypeScript passed on the corrected code.
- git diff --check passed.
- Final corrected preview browser error sample contained no application warning/exception. Browser-extension metadata errors were filtered separately.
- The legacy tests/ui.mjs script still refers to the retired simulated purchase flow and localhost:3000. It was not run or counted as a passing test; current UI verification used the cloud browser and real connected route-handler fixtures.

## Limits and follow-ups

Physical-device keyboards/screen readers, real SMTP delivery, real third-party transfers, multi-GB uploads and a load/performance test were not exercised. The previously deferred 50MB product-upload limit is unchanged. Backend tests use the real Supabase client libraries against a controlled HTTP fixture; they cannot establish the receiving eligibility or balance of any seller's real payment account.
