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
- Additional mobile-emulated touch test passes; response buttons at 390px are at least 44px. Loading, blocked storage and 200% zoom were tested. Overflow checks pass.
- Before screenshots include actual live entry/first sections and all nine post sections plus contact/waiting/completion at desktop/mobile widths. Live browser fixtures intercept participant API calls and do not write research data.
- Screenshot inspection corrected cramped mobile slider anchors. Final representative images and machine-readable run outputs are under `output/playwright/`.

## Source and deployment boundary

The initial worktree contained only the public proxy. Commit `9ed127e` snapshots the existing Brufest source from the separate worktree as a review baseline. Review the participant change against that commit. The separate original worktree remains untouched. Deploy only the output of `scripts/package-study-one-review.py`, not this complete repository: the existing service runs the allowlisted standalone application. The package contains no data, environment files, Looking Back or other study routes.

Production target verified: project `ed40ec0d-aec9-48e2-b3af-1f820e94e5a9`, environment `d86f82f2-579c-4de2-8085-f00903b86816` (`study-one-review`), service `9586c104-8863-467f-adab-bef9a2fa5432`. Existing `/study-one-data` volume and storage configuration are retained. Public proxy and asset prefix remain `/study-one`.
