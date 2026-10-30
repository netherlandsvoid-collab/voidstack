# Nexirel UI/UX audit and polish

Scope: public feed, marketplace, phone navigation, dialogs, Settings, and the existing direct-payment flow. Captured October 30, 2026 in Chrome. The brief is an improvement to the existing Open Studio design, not a new visual direction.

## 1. Feed — improved

Live desktop evidence: [01](docs/ux-polish/nexirel-polish-01-live-home.jpg).
Live phone evidence: [03](docs/ux-polish/nexirel-polish-03-live-phone.jpg).

The existing palette, artwork and typography are recognizable and worth keeping.
On phones, the decorative heading mark wraps onto its own line, taking space from
the feed. Fixed cover crops hide substantial parts of wide artwork. Touch controls
and content hierarchy could be clearer. Tablet sale previews squeeze titles into
very narrow columns.

Changes: a consistent sticky header, visible phone search, a phone-sized heading
without the decorative mark, framed cards, full artwork contained within reserved
image slots, larger main touch targets and a stacked tablet sale layout.

Matched fixture comparison: [before](docs/ux-polish/nexirel-polish-06-baseline-responsive.jpg),
[after](docs/ux-polish/nexirel-polish-08-after-responsive.jpg),
[side by side](docs/ux-polish/nexirel-polish-10-phone-comparison.jpg).

## 2. Marketplace — improved

Live evidence: [02](docs/ux-polish/nexirel-polish-02-live-market.jpg).

The collection and filter structure work. Small phone cards and compact selects
make titles, prices and choices harder to read. The dark marketplace banner's
headline uses a fixed dark color and is difficult to see.

Changes: one readable product column on small phones, two on wider phones, larger
filter controls, currency-safe wrapping, card surfaces, and semantic dark-theme
text colors. Removed a leftover static USD label beside non-USD product prices.

Dark contrast: [before fix](docs/ux-polish/nexirel-polish-12-dark-before-fix.jpg),
[after fix](docs/ux-polish/nexirel-polish-11-after-dark.jpg).

## 3. Navigation and dialogs — improved

Live phone dialog evidence: [04](docs/ux-polish/nexirel-polish-04-live-dialog.jpg).

Navigation and dialogs appear abruptly. Code review confirmed the old focus trap
included hidden/disabled fields and there was no background scroll lock. The drawer
lacked its own visible close control. The initial skeleton did not match the feed.

Changes: short entrance/exit animations, a drawer close control, scroll locking,
inert background regions, visible/enabled-field focus trapping, Escape dismissal,
restored focus and focus on the destination page after dialog navigation. Phone
dialogs use the available screen height as bottom sheets. The close control stays
reachable while scrolling long forms. Loading uses the feed's actual composition.

Motion respects reduced-motion CSS and disables smooth programmatic navigation
when the OS preference requests it. No scroll hijacking or animation dependency
was added. This is not an FPS benchmark.

## 4. Settings and buying — improved; payment rules retained

[Phone payment settings](docs/ux-polish/nexirel-polish-09-after-settings.jpg).

Profile, security and receiving settings previously formed one long form stack.
They now have keyboard-accessible Profile / Security / Payments tabs. Forms stay
mounted so drafts survive tab switches. Creator studio opens Payments directly.

Verified with isolated buyer/seller accounts: resource details → method selection
→ instructions → payment report → seller acknowledgement → paid status → enabled
buyer Download button. Reporting payment still does not unlock a file.

## Accessibility and verification limits

- Browser checks covered 320px, 390px, 768px and desktop. No horizontal overflow was
  observed in measured phone/feed and marketplace regions. Main controls are at
  least 44 CSS px; this is not a claim that every inline text link meets that size.
- Verified arrow/Home/End tab behavior, Tab skipping hidden panels, draft retention,
  Escape, scroll lock, close-control visibility in a long form, and destination focus.
- Checked light and dark themes. No application exception was observed in the final
  run. Browser extension metadata errors and a hydration warning naming injected
  `data-oai-browser-agent-cursor-*` attributes were environmental observations.
- Phone/tablet checks use real browser iframe viewports, not physical devices.
  iOS/Android keyboards, screen-reader announcements and real low-end-device frame
  rates still need device testing. OS reduced-motion emulation was not available;
  preference branches and CSS were reviewed, rather than claiming an OS-level test.
- Live review was read-only. All form/payment walkthroughs used isolated fixture
  accounts and fake receiving details. No real money or production account was used.
- Backend payment authorization, upload limits and storage settings are unchanged.
