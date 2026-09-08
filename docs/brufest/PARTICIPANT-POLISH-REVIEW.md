# How We Disagree participant release — 8 September 2026

The public `/study-one` route imported the participant component directly and missed `brufest.css`, which lived in a sibling route layout. Live response scales, fieldsets, navigation and the footer consequently rendered with little or no styling. This release makes the participant design self-contained at both routes.

The design follows Looking Back's quiet green palette, restrained borders, generous whitespace and strong reading hierarchy. It uses a narrower reading column, consistent question cards, explicit selected responses, readable mobile controls, progress, visible keyboard focus, focused validation with a link back to the question, clear loading/retry states and tidy email/completion screens. Mobile scale anchors use readable rows; 390px response targets meet 44px. Nested contact editing uses a secondary heading and avoids another padded page inside the page.

## Public copy

| Location | Final wording |
| --- | --- |
| Public title / header | How We Disagree |
| Context | Before and after Big Brue |
| Entry | A study of how people approach disagreement before and after Big Brue. Read about taking part below. |
| Start | Begin before Big Brue |
| Questionnaire headings | Before Big Brue / After Big Brue |
| Progress | Step X of Y |
| Navigation | Back / Continue / Save my answers |
| Optional email heading | Stay in touch for after Big Brue |
| Email actions | Save my follow-up choice / Finish without email follow-up |
| Completion | Thank you — both sets of answers are saved |
| Completion action | You’re all done. You can close this page. |
| Footer | How We Disagree · Big Brue / Study team sign in |

Approved information, consent, follow-up permission, question prompts/order/values, instrument versions, participant keys, draft keys, backend matching, retention, storage and researcher surfaces are unchanged. No Looking Back source changed.

## Evidence

- 30 existing instrument/flow/privacy/deletion tests pass; repository lint and production build pass.
- Standalone allowlisted Study One package lint and Next 15.5.25 production build pass.
- Real local HTTP check covers consent, validation, saved first response, optional contact, actual date gating, matched second response with a local-only demo fixture, and deletion revoking both keys.
- Full rendered browser flow passes at 1440px, 390px and 320px. It covers every first section and all nine after-festival sections in the chosen branching scenario, explicit missing answers, exact 9.9 slider values, Back, save retry, email validation/edit/decline, waiting, completion, deletion and invalid links.
- Additional mobile-emulated touch test passes; response buttons at 390px are at least 44px. Loading, blocked storage and 200% zoom were tested. Overflow checks pass. Normal muted text is 6.10:1 against question cards; primary text exceeds 11:1. Control borders were darkened in the final pass to exceed 3:1.
- Before screenshots include actual live entry/first sections and all nine post sections plus contact/waiting/completion at desktop/mobile widths. Live browser fixtures intercept participant API calls and do not write research data.
- Screenshot inspection corrected cramped mobile slider anchors. Final representative images and machine-readable run outputs are under `output/playwright/`.

## Source and deployment boundary

The initial worktree contained only the public proxy. Commit `9ed127e` snapshots the existing Brufest source from the separate worktree as a review baseline. Review the participant change against that commit. The separate original worktree remains untouched. Deploy only the output of `scripts/package-study-one-review.py`, not this complete repository: the existing service runs the allowlisted standalone application. The package contains no data, environment files, Looking Back or other study routes.

Production target verified: project `ed40ec0d-aec9-48e2-b3af-1f820e94e5a9`, environment `d86f82f2-579c-4de2-8085-f00903b86816` (`study-one-review`), service `9586c104-8863-467f-adab-bef9a2fa5432`. Existing `/study-one-data` volume and storage configuration are retained. Public proxy and asset prefix remain `/study-one`.

## Confirmed production release

- Final deployment: `cc0ee2f7-73a1-4b16-91a2-c61bc943b097`, Railway `SUCCESS`, 8 September 2026. Deployed code: `08b7d63`.
- Public URL: https://experiments.evolvable.me/study-one
- Final public participant stylesheet: `/study-one/_next/static/css/8d9e31c139628d49.css`; SHA-256 `e81b68f48f16998aa30fbd781fac63c950ad70a67f787d1eb884e8ebea5f22d0`. Final darker borders verified in the served asset.
- Actual public page, JS and CSS assets return 200. Admin API rejects anonymous access with 401.
- Full live-rendered desktop/mobile journeys pass with intercepted synthetic API responses, including the future after-festival experience. Real production date gating was not bypassed.
- A separate real public API smoke test enrolled one temporary synthetic participant, saved the first questionnaire, declined follow-up, reloaded the saved state, deleted that record and confirmed its private link was revoked. Completed at `2026-09-08T15:58:38Z`; no smoke-test record remains. No emails sent.
- Draft reload restores page and answers; keyboard focus is a visible 3px outline. Final package source manifest matches every allowlisted source file.
- Visual comparison: `output/VISUAL-REVIEW.md`. Detailed public receipts: `output/public-smoke-final.json`, `output/playwright/live-after-desktop-qa.txt`, `output/playwright/live-after-mobile-qa.txt`.
