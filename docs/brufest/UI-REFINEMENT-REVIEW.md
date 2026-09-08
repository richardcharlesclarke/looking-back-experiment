# Study One layout and interaction refinement — 8 September 2026

This release corrects the desktop layout and controls from the previous continuous-response release. The questionnaire and navigation share a centered 860px column. Smaller headings and tighter spacing let the core response screens fit a 1366×768 desktop viewport. Back and Continue (including Save my answers) have equal width and height. Longer programme lists and text screens remain scrollable.

All five response labels are centered buttons. Each selects the center of its existing band (10, 30, 50, 70 or 90), and the orb center aligns exactly above the clicked label. Dragging remains continuous without snapping; keyboard still reaches 0 and 100. Mobile uses the same horizontal alignment with shorter visible labels and full accessible names. The full selected label remains in the readout.

The header now reads `Initiatives at evolvable.me`, matching the original page, and links to https://experiments.evolvable.me. The legacy-draft notice has been removed. Old drafts remain untouched and are never converted to the new scale.

## Original artwork, copied exactly

The invented `public/study-one/perspectives.svg` is removed. The questionnaire uses the exact `ratings-stage-deco` markup and VectorDecoration props from `app/looking-back/page.tsx`, the unchanged `app/looking-back/VectorDecoration.tsx`, the unchanged `ratings-v1` / `ratings-v2` placement rules in `app/globals.css`, and the original assets:

- `public/vector-decoration/profile-vector-new-1.svg`
- `public/vector-decoration/profile-vector-new-2-open.svg`

The original 22-second first profile, 24-second second profile and staggered paths, rotation, side placement, opacity and reduced-motion behavior are retained. No new illustration or custom animation engine is introduced. Looking Back itself has no source changes.

## Validation

- Repository lint, all 36 existing tests, repository production build and the 43-file standalone package lint/build pass.
- Full browser journeys pass at desktop 1366×768 and mobile 390px/320px. They test each label's numerical value and alignment, drag precision, equal navigation dimensions, validation, Back, save/retry, optional email, waiting, completion and deletion. Core desktop questionnaire controls remain within the viewport; every captured state has no horizontal overflow.
- Native touch checks all five buttons and unsnapped dragging. Reload and header navigation preserve the exact draft. A legacy draft produces neither the removed notice nor converted responses.
- Both original vector assets load and run their original animation timings; reduced motion is static.
- No measurement, consent, identity, retention, date gate, storage or export code changed. Deployment uses the existing Study One service and volume only.

Local receipts: `output/playwright/refined-production-desktop.txt`, `third-full-mobile.txt`, `third-full-320.txt`, `refined-specific-qa.txt`, and `output/refined-*-build.txt`. Live checks are recorded below after deployment.

## Confirmed public release

Deployment `4330db26-5080-4bc0-ae1d-f7f362042901` is Railway `SUCCESS`, code `c3d59ad`. Public URL: https://experiments.evolvable.me/study-one.

The live desktop journey passes all 55 states, including label selection/alignment, core viewport fit and equal navigation dimensions. Native mobile testing passes all five label taps, continuous dragging, draft restoration, corrected header and removed notice. Both original SVG files are byte-for-byte identical to the repo on the public domain and the standalone service. Their original animations and reduced-motion behavior are verified.

The real public save/export/delete smoke check passed at `2026-09-08T16:57:12Z`, preserving an exact decimal and endpoint values. Its temporary record was removed and link revoked. All 15 existing participants and 17 existing responses remain unchanged. The existing volume remains `/study-one-data`.

Receipts: `output/refined-live-smoke.json`, `output/refined-live-artwork.json`, `output/refined-deployment.json`, `output/playwright/refined-live-desktop.txt`, and `output/playwright/refined-live-specific-qa.txt`. Representative live screenshots: `output/playwright/refined-live-1366-pre-section-2.png` and `output/playwright/refined-live-native-mobile.png`.

## Label copy and click animation refinement

The core labels now omit “now” in the buttons, accessible names and selected-value readout. Every desktop button uses a consistent two-line layout: degree on the first line and “true of me” on the second. This is a presentation change; stored instrument metadata and numeric values are untouched.

Selecting a label animates the orb to that band's center over 620ms with a smooth curve that does not overshoot. Pointer interaction immediately disables this transition, preserving continuous raw drag values; keyboard adjustments are also immediate. Reduced-motion preferences disable the transition.

Repository lint and the standalone production build pass. Focused desktop/mobile browser checks sample the movement across frames, confirm intermediate positions and the exact endpoint without bounce, interrupt an active animation with a drag, verify exact draft restoration, compare all label row heights and check reduced motion. Receipts: `output/playwright/label-motion-local-qa.txt` and `output/label-motion-build.txt`.
