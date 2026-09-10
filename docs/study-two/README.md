# Study Two questionnaire review — 10 September 2026

This release adds role-specific questionnaire pages to the existing experiments hub. It does not change Study One's proxy, hosted service, start command, instrument or records.

- `/study-two/speaker/before` and `/study-two/speaker/after`
- `/study-two/audience/before` and `/study-two/audience/after`
- `/study-two` is a speaker-before entry for convenience.
- `/study-guides/study-one` and `/study-guides/study-two` are separate researcher guides.
- `/study-two/review` holds setup, all four direct entry links, preserved walkthroughs and CSV/JSON downloads. Participant pages do not link to it or include its controls.

Publication is for Richard's inspection. Participant distribution and real Study Two collection are not enabled. Browser localStorage `study-two-review-v1` is the only response store. There are no new response APIs or database mutations. Exported records explicitly say reviewOnly/true and retain the instrument version, panel snapshot, exact questions, scales, target speakers, missingness and completion timestamps.

Each new person receives a UUID. Their before/after links carry that UUID; a missing or wrong-role UUID is rejected, not matched by guessing. Links currently work only in their originating browser. The same unchanged sample panel has the same panel ID; edits create a new ID. Once a person starts, both waves use their frozen panel snapshot. Restarting creates a new person without deleting earlier records. The example claim and Speaker A/B/C labels are placeholders; selection, consent, allocation and delivery must be settled before fieldwork.

The new instrument is `study-two-review-v1-2026-09-10`. It deliberately revises the earlier v0.1 bank under Richard's request for a sensible draft, rather than silently relabelling the old responses. Five common speaker items replace eight; the same topic position/confidence/understanding measures and other-speaker position predictions repeat at both waves. With three speakers: 11 before and 17 after, including optional writing. Audience: 5 before and 10 after. Agreement and ability use item-appropriate continuous 0–100 labels; topic scales retain 0–10. The actual Study One `ContinuousOrb` and participant CSS are reused with local instrument imports. No continuous answer is converted to a seven-point score.

The current working Notion Study Two and methods were read from the verified context pack at `/Users/admin/Documents/Codex/2026-09-07/realtime-voice-chat-2/outputs/study-two-context/`. Briefing, programme inventory, implementation audit and chronological decisions were also read. The original proposal's tail beyond 20,000 characters and full underlying Record transcripts were not available; current working sources and later explicit instructions govern this implementation. AI-only versus human/combined coding remains unresolved. No recording/coding pipeline is built.

The Study One guide is preserved in `study-one-facilitator-guide-source.md`, supplied by the separately assigned source-verification task. Its static HTML is generated into the route's content.json. The guide distinguishes actual questionnaire/matching functionality from unconfirmed invitation, staffing and inbox arrangements. No website email sending is claimed.

Validation: `node scripts/test-study-two.mjs`, `npm run lint`, `npm run build`. Browser walkthroughs cover all four forms, missing-answer validation, zero and keyboard input, non-snapping pointer dragging, refresh recovery, matched before/after UUIDs, role separation, absence of researcher controls on participant pages and 390px layout. Browser artifacts are excluded from deployment. Test data stays in the browser used for QA.

Field collection still needs durable private return links/storage across devices, agreed participant information and consent, actual roster/propositions, final questions, delivery and recruitment permission. The older all-study pilot's allocation/recording-related functionality has not been deployed by this review release.
