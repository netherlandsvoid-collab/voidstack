# Studio Signal design QA

final result: passed

## Visual truth and browser evidence

- Approved light target: /workspace/scratch/04aab27885d4/generated_images/exec-db5a3e15-7d45-4367-b6cd-89ba153da066.png.
- Approved dark combination: /workspace/scratch/04aab27885d4/generated_images/exec-ab553710-01e3-4bf5-a1eb-1b4a5adb2df4.png.
- Both source images are 1487 × 1058 pixels. They are concept images, not screenshots of a functional app.
- Browser: Chrome cloud browser, CSS viewport 1363 × 936, devicePixelRatio 1, document client width 1348. Viewport screenshots returned 1348 × 926 pixels. Full comparisons normalize the source to 1348 pixels wide, preserve its aspect ratio and crop its extra bottom pixels to the screenshot height. Neither image is stretched to a different aspect ratio.
- Final implementation screenshots: docs/studio-signal/signal-desktop-light.jpg and signal-desktop-dark.jpg.
- Full comparisons: docs/studio-signal/comparison-light.jpg and comparison-dark.jpg.
- Focused comparisons: docs/studio-signal/details-light.jpg and details-dark.jpg. These retain native normalized pixels for typography, the search/header and creator controls.
- Responsive: docs/studio-signal/signal-responsive-final.jpg shows 390 × 844 and 768 × 844 iframe viewports, each with a 1px border. Native scrollbar leaves 375px/753px of content. signal-narrow-phone.jpg uses a 320 × 740 iframe with 305px content. All three document scroll widths equaled their client widths.
- Supporting states: signal-settings-dark.jpg, signal-phone-settings.jpg. These use isolated test accounts and fictional payment details.
- The local preview uses real production components/API handlers with an isolated Supabase fixture; no production user or payment records were changed. Fixture bridges and actor switching are outside the git worktree and are not shipped.

## Comparison history and fixes

1. [P2, fixed] Follow labels were clipped by a legacy 25px icon-button width. Initial browser evidence: signal-initial-dark.jpg. Set explicit width:auto, minimum 66px and no flex shrink. Final desktop screenshots show complete Follow labels and readable creator names.
2. [P2, fixed] Mobile header showed an old CSS-generated wordmark underneath the new wordmark. Removed the breadcrumb pseudo-element and explicitly displayed the avatar. Final responsive screenshot shows a single brand, drawer button, profile control and full-width search.
3. [P2, fixed] Cards had excessive height because title and download rows stretched the entire grid row. Full first-pass comparison showed fewer visible projects than the target. Removed the redundant title button (the artwork's accessible View title and detail dialog retain the title), moved the download link into a compact independent overlay and aligned grid items to start. Final full-view comparisons show the intended two-column art-first rhythm and the beginning of the second row.
4. [P2, fixed] Closed phone navigation remained keyboard reachable off screen. Added a media-query-aware inert state, retained the existing focus trap and background locking while open. Browser AX state excludes the closed drawer and exposes its notification/settings/purchases controls when open.
5. [P3, fixed] Added a root beforeInteractive theme bootstrap to restore saved or OS theme before hydration, with only the HTML theme-attribute hydration difference suppressed. Verified dark mode after reload. The toggle remains usable without persistent storage.

## Required fidelity surfaces

- Fonts/typography: existing self-hosted Manrope supplies the geometric display and UI family, with bold tightly tracked headlines and readable 14px navigation/body controls. Header/search, brand, active tabs and creator buttons inspected at native pixels. Small artwork/sample metadata remains secondary. No network font dependency added.
- Spacing/layout: 80px icon rail, horizontal header, persistent category controls, two-column feed and right discovery rail match the selected structure. At tablet width the discovery rail is omitted; on phones it follows the feed. Cards become one column below 540px. Header and Create action wrap without horizontal document overflow.
- Colors/tokens: white/cobalt in light mode; near-black/graphite, ivory and lime in dark mode. Artwork remains full color. Settings, message bubbles, buttons, forms, marketplace, profile and order surfaces inherit the same semantic tokens. No orange/purple primary controls remain in the new shell.
- Images: four generated, optimized WebP artworks match the selected blue typography, iridescent ring, red editorial poster and coastal architecture subjects. Artwork uses contain to preserve uploaded compositions; videos have native controls without a nested button. Existing sample avatar illustrations and two older sample artworks remain actual supplied project assets, rather than invented real people or extra fake posts.
- Copy/content: approved headline and discovery framing retained. Existing real creator names, product titles, prices, sample labels and actual available work counts take precedence over invented mock data. Hence the creator strip has one/two thumbnails where that is the real content, and no fake View all directory feature or invented comments are shown. Existing user posts remain chronological.
- Icons: established Lucide outline shapes match the reference's thin rounded icon language. Controls have accessible labels and native title hints. The wordmark is text; no rasterized UI or custom SVG icon substitute was introduced.
- Motion/accessibility: retain short overlay/page transitions, focus trapping/restoration, Escape, scroll lock and reduced-motion branches from the preceding release. Use subtle artwork zoom only for hover-capable pointers and no reduced-motion preference. Mobile primary controls use 44px targets; color is accompanied by aria-pressed/current states.

## Browser checks

- Follow creator → Following feed; Like and Save → Saved collection.
- Create post → publish a text post → appears in feed.
- Settings Profile/Security/Payments; unsaved name preserved when changing tabs; Escape closes dialog.
- Phone drawer → Settings sheet; visible field/tab navigation; sticky close control; closed drawer inert.
- Buyer product → currency-matched bank instructions → report test reference → seller studio review → explicit received checkbox → confirm → buyer Purchases shows enabled Download.
- Marketplace currency filter shows only NGN fixture item; theme switches; no currency conversion added.
- Forgotten-password deep link /?auth=recover opens the recovery dialog.
- Theme persists after reload, including pre-hydration styling.
- Browser error log checked: no application warning/exception in the final filtered sample; browser-extension metadata errors appeared separately. A preview restart encountered stale Next dev bootstrap artifacts, resolved by moving the generated dev cache and restarting; no production code workaround for that cache was added.
- TypeScript/optimized production build passed. Five connected mock journeys passed (test runner: 6 including parent). Whitespace check passed.

## Intentional differences and remaining gaps

The mock's fake people, synthetic counts and four thumbnails per creator were not made into production facts. Real data can change the exact density and image subjects. One-column phone and reduced-motion layouts are functional adaptations of the approved desktop images.

No new payment provider, SQL migration, environment variable or upload cap is required. The deferred 50MB product upload limit is unchanged. No real transfer/email confirmation or 100MB/GB upload was performed. Physical phone keyboards, screen readers, high zoom, OS reduced-motion emulation and measured low-end-device animation frame rates remain device QA follow-ups.

## Implementation checklist

- [x] Approved light and dark targets implemented.
- [x] Visual findings fixed and compared again.
- [x] Responsive, settings and core community interactions checked.
- [x] Isolated purchase-to-unlock flow checked.
- [x] Build, typecheck, connected journeys and diff check pass.
- [x] Reviewable GitHub change prepared; production merge remains separate.
