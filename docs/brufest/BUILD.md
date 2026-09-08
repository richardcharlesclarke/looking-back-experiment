# Revised participant and helper flow — 7 September 2026

The current small-group entry is `/brufest/pairs`; the separate helper workspace is `/admin/brufest/pairs`. Start with [HELPER-RUN-SHEET.md](HELPER-RUN-SHEET.md) for the practical process. Earlier pair demo records and endpoints below remain for regression/history, not the new participant journey. The festival, panels, Looking Back and ConflictBench flows remain intact.

The revised participant path screens across three draft programme-grounded topics before pairing. Its own opaque personal return links replace manual BF/member-key entry. New records are versioned `brufest-pairs-v0.2-draft-2026-09-07` and stored alongside, not over, earlier submissions. The helper manually matches screened identities, then allocation is blocked until both PRE submissions exist. The recorded random seed reproduces the 1:1 allocation; topic stratification is not implemented. Briefing text is snapshotted with version `brufest-pair-briefing-v0.2-2026-09-07`. The treatment wording is retained; logistical-control delivery now refers to the real personal-link flow.

Opening order, two separate openings, discussion, joint record, private POST and partner checks have explicit stages. Timers record wall time and require notes for material deviations. Early stopping is supported without deleting evidence. Participant endpoints expose only their current step and the specifically permitted partner reason summary. Helper guide and exports require administrator login. JSON exports remove personal-link secrets; CSV retains question wording, topic, condition and explicit missingness. This is still local only, with draft content and no consent collection or discussion recording/analysis pipeline.

Validation completed 7 September 2026: all 14 checks in `./scripts/test-brufest.sh`, TypeScript, ESLint and an isolated production build passed. A full local HTTP rehearsal passed helper authentication, sessionless screening, manual pairing, baseline-gated allocation, ordered timed stages, joint/post/partner gates, saved identity, secret-free exports and preservation of original records. Chrome checks confirmed empty-answer validation, continuous 2.6 slider input, draft recovery after reload, persistent Volunteer 003 identity, helper sign-in, screening answers and completed-pair counts. All created responses are explicitly demonstrations. Mobile layout, real-database persistence and recording have not been newly exercised in this revision. Original build notes follow for provenance.

---

# Brufest questionnaires

Built 5 September 2026 on `codex/brufest-three-studies`. Local preview only; no push or deployment performed.

## Open and try

- `/` has three new cards alongside the original two experiments.
- `/brufest/festival`: audience before, after and follow-up.
- `/brufest/panels`: speaker and audience before/after.
- `/brufest/pairs`: screening, private before/after, one shared record, private partner accuracy rating.
- `/admin/brufest`: facilitator login, sessions, allocation, private participant links, briefing scripts, stage controls, delivery notes, completions and CSV/JSON.

The original `/looking-back`, `/conflictbench`, their APIs and their data stores are unchanged. The newer uncommitted questionnaire in the `f7eb` worktree was used as a design reference, not overwritten or copied over the existing route.

Start locally with no production database:

```sh
DATABASE_URL='' npm run dev -- --hostname 127.0.0.1 --port 3118
```

The local facilitator login reuses the existing development default (`admin`). Sample panel and pair sessions are created in preview mode. Private sample keys are provided to the browser only in development. To test two people in one browser, expand the return-code section and choose **Start for another person** before the second person's form. Each person needs a distinct return code; retain each person's code for their later forms.

For a pair: complete both PRE forms; advance the session through briefing and conversation in the facilitator screen; open POST; complete each person's private POST, one joint record, then both partner ratings. The joint record can be collected before private POST if preferred. Partner ratings wait for both POSTs. Participant links open in another tab; session stage changes take effect on the server immediately.

## Content and behaviour

Exact working question text is in `lib/brufest/question-bank.json`; flow, response type, short/extended forms, optionality and branching live in `lib/brufest/instruments.ts`. The source documents are retained beside this file. Briefings are in `lib/brufest/briefings.json`.

Source: the v0.1 Notion pages written in the originating Brufest task:

- [Festival](https://www.notion.so/3d27d52ecd548131b716e7d7100066ff)
- [Panels](https://www.notion.so/3d27d52ecd5481719234f1e9424ca0a3)
- [Pairs](https://www.notion.so/3d27d52ecd5481b7bb53f1b0a3d26f01)
- [Shared measures and scripts](https://www.notion.so/3d27d52ecd5481fe8fecc432610b7878)

Seven-point agreement questions use discrete choices. Position/confidence/understanding retain the original continuous orb interaction on a 0–10 scale in 0.1 increments, with nearest-anchor highlighting and no snapping on release. Drag, keyboard arrows and Home/End work. Written responses reuse the existing voice textarea and transcription endpoint; microphone use and an OpenAI key were not exercised during this build.

Answers start unselected. Zero is valid; missing values have explicit reasons. Written answers can be skipped. Drafts, the current page and return code are stored on the participant's device; a reload followed by Begin resumes the form. Failed submissions retain the draft and can be retried. A successful submission clears that draft. No total score or personality feedback is produced.

One central proposition per session is implemented. Extra proposition batteries and named-panellist assessment of another speaker's written summary remain optional extensions, not required by the short-form pilot. Speaker position cross-predictions and pair partner assessment are implemented. Panel eligibility screening is currently a facilitator task; pair screening answers appear in the facilitator workspace. Pair matching is manual from those responses; the software randomly allocates each created pair to a briefing condition. Allocation is recorded at creation and concealed from participant forms; PRE remains before briefing delivery.

Panel speaker labels serve as stable identities within this pilot. Use consistent labels across sessions. Panels sharing a speaker inherit a condition; conflicting bridges are rejected. Contamination-group IDs follow connected panels and are included in exports. A pair gets one allocation and two private member keys. The first PRE binds each key to a participant return code. The same code cannot take both places or enter another pair.

## Storage and exports

Development without `DATABASE_URL`: durable `.local/brufest-pilot.json` in this checkout. It survives server restarts and is git-ignored. Serialised writes plus atomic rename prevent partial writes in the single development server.

With Postgres: a separate `brufest_pilot_state` table holds the pilot state. A transaction and row lock serialise mutations across app processes. Existing experiment tables are never queried or changed by the new store. This simple model is intended for the festival pilot, not a high-volume research platform. The Postgres path is implemented but has not been tested against a real database in this task.

Response CSV is long-form (one item per row): participant code, study, role, wave, session, proposition, member, instrument version, exact prompt, item ID, condition, contamination group, briefing version, test marker, numeric/text/options/missing reason, order and timestamps. Full JSON also contains session configuration, allocation draws, member-to-participant binding and delivery notes, but omits private invitation keys. Admin access is required. Test records remain explicitly marked.

Behavioural coding guidance is retained in the shared-measures document. No transcript analysis, recording pipeline, computed outcome dashboard or coder interface is claimed as implemented here.

## Before public use

Fill in programme choices in `instruments.ts`, create real session/proposition records, and supply participant information/consent/retention/contact details. Current sample wording is deliberately labelled. No consent acceptance is collected by these preview forms. New production submissions are disabled unless `BRUFEST_READY=true` and a database is configured; this flag is a deployment switch, not a substitute for completing those fields. Production facilitator access also requires explicit admin password and cookie secret. Existing experiments are unaffected by this gate.

## Verification

```sh
./scripts/test-brufest.sh
node scripts/verify-brufest-http.cjs # local dev server; uses development admin login
npm run lint
npm run build
```

Tests cover every role/wave and extended form, repeated wording/anchors, branching, zero/continuous/missing values, duplicate submissions, allocation, identity binding, stage order, private partner access, joint-record uniqueness and exports. HTTP verification creates labelled local test records. Browser checks cover the homepage, festival validation/completion/refresh recovery, mobile overflow, continuous slider drag and keyboard behaviour, and facilitator sign-in/session links. No live-site submission was made.
