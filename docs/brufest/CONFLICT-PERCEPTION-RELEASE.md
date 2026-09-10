# Study One: perception of conflict and willingness to discuss — 10 September 2026

Richard explicitly authorised two additions to both questionnaires and production deployment, including the agreed adjustment from wanting to enter conflict to willingness to discuss a disagreement. The coordinating task supplied Bo’s message text and source references (DM D1K914XC2 / 1789043172.936589; shared conversation GC3RB28RG / 1789042163.450799). No Slack reads or messages were needed for this implementation.

New instrument: `brufest-study-one-conflict-perception-v6-2026-09-10`. The existing sixteen core questions and their item-specific response scales are unchanged. The two additions follow them as questions 17 and 18, before the three connection questions. Both first and second questionnaires use identical wording, anchors, bands, bounds and positive numeric direction.

## Exact additions

**E1_CONFLICT_PERCEPTION** — perceived value of conflict

“When you think about conflict with someone over an issue that matters to you, how do you tend to see the conflict itself?”

- 0 — Something destructive that diminishes what’s possible
- 10 — Something generative that can create new possibilities
- Visible response bands: Destructive / Mostly destructive / In between / Mostly generative / Generative.

Bo’s original stem and endpoint meanings are retained. Full endpoint definitions are displayed directly above the existing continuous 0–10 control; shorter band labels keep the mobile control readable. The midpoint is labelled “In between”, without asserting that both outcomes occur or that neither occurs.

**E1_DISCUSSION_WILLINGNESS** — willingness to discuss a disagreement

“When you anticipate a disagreement with someone over an issue that matters to you, how willing are you to discuss it with them?”

- 0 — Not at all willing to discuss it
- 10 — Very willing to discuss it
- Visible response bands: Not at all willing / Slightly willing / Moderately willing / Quite willing / Very willing.

The adjusted stem and both endpoints refer to discussing the same disagreement. This measures willingness, separate from seeing conflict as generative. It does not ask whether the person desires confrontation. Full endpoints appear above the continuous control.

Both items retain Prefer not to answer / Cannot assess, begin unselected, and preserve raw continuous values without rounding. Higher values mean more generative perception or more willingness to discuss; neither item is reversed. No combined score is introduced. Existing participants retain their enrolment/baseline version, including their original follow-up. No old answers are replaced and no missing baselines are manufactured for these additions.

## Verification

61 automated tests pass. The complete V5 first/second snapshots remain frozen, alongside all previous historical snapshots. Removing the two additions from V6 reproduces V5 exactly, including all topic, exposure and learning branches. Tests cover matched wording/anchors, zero/ten/raw decimal values, missing responses, range rejection, existing/new follow-up version matching, saved baseline preservation, exports and refusal to invent new baselines for imported mixed-version pairs.

The locked Next.js 15.5.25 production build, lint and type checking pass. Real local HTTP checks pass with eight synthetic participants across all seven instrument generations, preserving original baselines, version-pinned follow-ups, date gates, exports and contact isolation. All synthetic records are confined to the local QA store and removed by the local QA script. Desktop and 390px mobile screenshots verify both full endpoint definitions and unclipped band labels; keyboard Home/End reaches 0/10. ContinuousOrb and its interaction code are unchanged.

Live verification and deployment evidence follow after production release. No production QA submissions or Slack sends are authorised or performed.

Review: https://experiments.evolvable.me/study-one?preview=1

## Production release verified

Implementation commit `6b747a8` deployed as Railway `eafe3067-c4e1-4fb4-9e07-3fc74a912cf5`, status SUCCESS. Target: project `ed40ec0d-aec9-48e2-b3af-1f820e94e5a9`, environment `d86f82f2-579c-4de2-8085-f00903b86816`, service `9586c104-8863-467f-adab-bef9a2fa5432`, existing `/study-one-data` volume. Public questionnaire and public/direct service health endpoints return HTTP 200.

The production container matches all 44 tested source-manifest files, with zero mismatches. Manifest SHA256: `f04a892eea44a3e525b5f7208ec0512bf8d75b40a5dd53f1ce662d25361920af`.

Live browser verification confirms both additions at questions 17/18 in the first questionnaire and again in the actual After Big Brue questionnaire. Exact stems, full 0/10 endpoints, five bands, unselected state and explicit missing choices are visible. The live second-questionnaire heading and timing instruction were verified, rather than inferred from a preview shortcut. Full first-questionnaire count is 29 with the selected-topic branch, or 26 before that branch; the second starts with 33 when no baseline topic reference is supplied in preview.

Read-only pre/post-release audits confirm identical complete research and contact hashes: 24 participant records, 18 responses, 24 contacts. No production test submissions were made. Evidence: `output/conflict-perception-tests.txt`, `output/conflict-perception-build.txt`, `output/conflict-perception-http-result.json`, `output/conflict-perception-live-before.json`, `output/conflict-perception-live-after.json`, `output/conflict-perception-live-manifest.json`, and the browser checks in this task’s tool history. No Slack messages or invitations were sent.
