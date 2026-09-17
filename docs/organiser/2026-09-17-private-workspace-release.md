# Private study workspace and retained questionnaire resets

## Reviewable result

Public `/` contains participant study cards only. Public participant information, consent,
questionnaires, return links and withdrawal routes are unchanged.

- `/results`: private two-study results home.
- `/results/study-one`: respondent overview, recorded contact/permission/delivery status,
  inline exact saved answers, missing-email respondents retained, optional visible-answer CSV.
- `/study-two/results`: matching inline overview/answers, frozen versions/scales,
  before/after status, protected reset and superseded history.
- `/administration`: guides and study-specific tools, separate from results.
- `/administration/study-one`: existing contact/link/delivery/withdrawal capabilities and
  research exports, now through the same-origin authenticated server bridge.
- `/study-two/review`: preserved panel preparation, private links and full current/history exports.
- Both `/study-guides/*` pages and existing `/admin/*` pages require server-side authentication.
- `/organiser/sign-in`: one existing study admin password, safe same-origin return destination.
- POST `/api/admin/logout`: expires organiser cookie only. Participant storage is untouched.

Results show descriptive status and individual recorded answers, not causal findings or
combined scores. Tests are excluded by default. Study One contact fields join on exact
participant ID; no inference from missing AFTER and no filtering out no-email answers.
Different wording/scales are displayed separately, never converted.

## Reset contract

Only consented, nonwithdrawn speaker records can be reset. BEFORE, AFTER or BOTH increments
only affected attempt counters and archives their saved forms with exact questionnaire and
consent snapshots. Identity, private access hash, unreset wave and instrument remain intact.
The monotonic reset version protects against stale organiser actions; request IDs make retries
idempotent. Stale participant saves are rejected before duplicate-completion handling.

A BEFORE-only reset retains old AFTER answers, explicitly linked to the earlier BEFORE attempt.
They cannot become a current matched pair. Resetting AFTER allows a new response linked to the
current BEFORE. History is available only through protected admin responses and JSON export;
it is excluded from current counts and current matched pairs. Withdrawal removes all attempts.

Browser drafts are namespaced by attempt. Refresh/reset recovery removes only older keys for
the exact person/version/wave, including legacy keys; current, future and other-wave drafts remain.

## Validation completed locally

- Main app lint and production build; Study One legacy service lint and production build.
- 16 store tests including all three reset scopes, partial/unstarted forms, restart persistence,
  idempotent retries, atomic ordering, stale saves/final submissions, withdrawal and pairing.
- Exact approved instrument wording/21+25 parity, unchanged audience/Study One orb, generated
  service module parity and precise draft-key invalidation.
- Results formatting/classification, zero and missing answers, frozen scale comparison.
- HTTP: 10 private pages and RSC redirects; signed-out API denial; authenticated guides/results;
  no-store; safe login; logout; public homepage and participant access; no private keys in overview.
- Legacy service: five admin pages redirect unauthenticated requests to shared sign-in;
  six protected APIs reject unauthenticated requests.
- Chrome desktop and 390px: inline expansion directly under respondent, no-email answers,
  exact values, mobile cards without page overflow, study switch, guide access and logout/Back.
- Synthetic real-store browser reset: stale open tab rejected, same link starts empty attempt 2,
  archived attempt visible, organiser logout leaves participant access intact.

Read-only production baseline: Study One 84 retained records, 60 BEFORE, 0 AFTER, 0 labelled tests.
No real participant records were reset, deleted, seeded or edited by these checks.

## Release plan — NOT DEPLOYED

Approval for the expanded reorganisation is still required. Release the complete package together.

1. Main Railway app in `looking-back`: set server-only `STUDY_ONE_ADMIN_COOKIE_SECRET` to the
   existing Study One service secret, without printing/logging it. Default upstream URL is the
   existing Study One Railway service; `STUDY_ONE_ADMIN_URL` may override it for isolated testing.
2. Align legacy Study One `ADMIN_PASSWORD` with the existing main app admin password at release,
   without changing either cookie secret or printing values. All user-facing entry is through the
   main same-origin workspace; bridge authenticates server-to-server with the upstream secret.
3. Deploy Study Two store and main app commit to their established `looking-back` GitHub branch
   route. Verify BOTH service deployments include this commit; a successful web build alone is
   insufficient for reset functionality.
4. Deploy the small Study One legacy auth-guard companion commit from the selective worktree
   to its existing `study-one-review` service/environment, preserving database and volume config.
   The TS build excludes ignored `output` and `.local` snapshots so stale archived code is not compiled.
5. Verify live protected routes, actual sign-in/logout and both read-only exports. Check main/store
   health and store identity/volume, confirm data totals relative to any real incoming submissions.
   Do not test reset on real production participants. Existing legacy admin functionality/code is retained.

Synthetic preview: `node scripts/preview-organiser.mjs`, then `http://127.0.0.1:3196/results`,
password `local-preview-only`. Uses temporary synthetic Study Two storage and a local Study One
fixture. `python3 scripts/test-organiser-http.py` runs the HTTP boundary checks against that preview.
