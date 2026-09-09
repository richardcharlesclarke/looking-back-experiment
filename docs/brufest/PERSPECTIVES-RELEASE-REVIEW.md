# Study One perspectives revision — 9 September 2026

Richard authorised implementation and live publication of the source-grounded proposal. Target: https://experiments.evolvable.me/study-one. No message is sent to Bo.

## Participant experience

All twelve existing continuous agreement statements, their wording/order/response semantics, and the three pre-festival attendance questions remain. The new first questionnaire has 18 questions: two separate seven-position connection pictures (Me / My close friends and family; Me / People all over the world) and one optional future-outlook question precede attendance. The circles are centred, draggable with mouse/touch, selectable by picture, keyboard-operable, unselected initially, and respect reduced motion. Ordinal connection values are separate from the continuous 0–100 core.

The future item asks about life for people worldwide over the next ten years, with five pessimistic-to-optimistic choices plus Not sure. It is optional. No personality-metaphor or Big Five section is added.

After the festival, the same repeated questions appear. Attendance/exposure and the existing disagreement reflection remain. The generic new-idea text is replaced with a branch asking whether a differing view was encountered; Yes opens a topic description, perceived depth of understanding, newly noticed assumption, position change, and optional concrete account. No, Cannot recall, and opt-outs bypass this branch. Neutral choices allow unchanged or shallower understanding and unchanged positions. Hidden branch answers are removed by server validation.

`?preview=1` is an additional read-only review flow with before/after and connection shortcuts. It uses the actual new form, never calls the participant API, never changes existing participant access/drafts, and never creates saved research/contact data. Preview completion explicitly says nothing was submitted.

## Measurement and historical preservation

New instrument: `brufest-study-one-perspectives-v2-2026-09-09`. New enrolments pin it; post instruments resolve from the saved baseline. Older unsubmitted continuous drafts and seven-point/continuous baselines retain their original compatible forms. Unsupported switches are rejected server-side. Existing mixed-format historical records still export as non-comparable.

Question snapshots include circle target, instructions, seven labels, type and bounds. Exports add target, help, construct and options; comparisons check question meaning and response metadata, not just numeric bounds. All missing responses remain explicit; no new baseline value is fabricated, no composite openness score is created, and post-only accounts remain retrospective.

Current information v5 describes the additional outcomes and a provisional eight-minute first questionnaire. Privacy/contact/retention rules are unchanged. Cached original pages can still consent to the exact original v4 information; they cannot enrol into v2 under old information. Existing consent snapshots are untouched.

Connection is pictorial self-report, not objective behaviour. Future outlook and perceived understanding are distinct outcomes. Before/after differences without a control group do not establish festival causation.

## Validation

42 unit/flow/privacy tests pass, including version pinning, exact original core, ordinal endpoints/missing values, all learning branches, consent compatibility, exports, and historical comparisons. Main production build and standalone Next 15.5.25 build pass. The final 44-file allowlist source manifest is verified; no unrelated experiment route, credential or participant file is included.

Real local production HTTP integration passes for four synthetic people spanning original seven-point, continuous v1 and perspectives v2: save/retrieve/export, exact decimals, circle endpoints, missing responses, positive/no-encounter branches, unchanged baseline snapshots, date gates, duplicate suppression, and local-only deletion/revocation. Complete desktop participant journey passes, including errors/retries and contact choices. Focused desktop/390px/320px checks cover circle centring, selection, native touch drag, keyboard, reload, opt-outs and reduced motion. Live checks are recorded below after deployment.

## Release boundary

Existing Railway project `ed40ec0d-aec9-48e2-b3af-1f820e94e5a9`, environment `d86f82f2-579c-4de2-8085-f00903b86816`, service `9586c104-8863-467f-adab-bef9a2fa5432`; retain single replica and `/study-one-data` volume. Package: `output/perspectives-v2-final`.

Pre-release authenticated read recorded 16 people and 18 responses, retaining only hashes and counts. No real participant submission/deletion is performed for QA. Browser participant API tests are intercepted; actual storage/exports are exercised against the isolated local runtime.
