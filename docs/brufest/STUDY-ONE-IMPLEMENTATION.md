# Study One implementation — 7 September 2026

The participant journey is `/brufest/festival`, with a separate research-assistant workspace at `/admin/brufest/festival`. It replaces the older generic festival screen; earlier research records are preserved in their original store and are not silently enrolled into the new email-follow-up process.

## What now happens

1. Richard reviews the invitation draft and passes the first-questionnaire link to the organiser. The organiser sends it externally.
2. The attendee reads the study information and actively agrees. Agreement text, information version/content and timestamp are recorded.
3. The first questionnaire saves before email is requested. Drafts survive reloads; continuous responses remain in 0.1 increments.
4. Email and follow-up permission are separate choices. Declining saves no email; stopping contact removes the email and excludes the person from the recipient list.
5. The assistant finds the saved email, copies a personal second-questionnaire link/draft, sends externally, and records sent/failed evidence. The website sends no emails. Demonstration release is labelled separately from the festival timing.
6. Opening the personal second link on another browser identifies the same research participant without a typed code. Missing first responses, wrong link kinds and unopened second questionnaires are rejected. Duplicate submissions do not overwrite saved answers.
7. Research exports include per-person repeated-item comparisons and missing second responses, without contact emails or private links. Contact data is only in the authenticated assistant view/download.

## Storage and access

`lib/brufest/festival` owns the new state. It does not read or mutate earlier experiment data. Research and contact records are separate files (or separate Postgres tables), linked by a random participant ID. Personal first keys are SHA-256 hashed in the contact store; personal second keys are random 256-bit values retained only there so an assistant can resend them. Replacing a second link revokes the old link without changing the matched research record. Duplicate emails never merge participants.

The local file implementation publishes two files using an atomic revision pointer and serialises writes; it is intended for one app process. Hosted review uses one replica and its own persistent volume. Contact and research access are separated at the application/export level, not by different database roles. Backups and data-retention policy remain research-owner decisions.

Research answer and information text snapshots preserve the exact version used. Earlier festival instruments still resolve using the old programme; new records explicitly use the versioned, source-checked 7 September programme.

## Field use and data handling

`STUDY_ONE_APPROVED` is true. New records are real participant records and accept ordinary valid email addresses; previously created demonstration records keep their test label. The participant information names Richard Clarke as study lead and uses the monitored `richardcharlesclarke@gmail.com` address for questions, removal requests, invitation replies and follow-up replies. No email is sent by the website.

Participants must be 18 or over. The stated duration is about seven minutes, based on the current 15-item reading and response load. The initial study-information agreement remains required. The separate before-attendance checkbox and redundant questionnaire exposure item were removed at Richard’s request.

The first questionnaire closes at the festival’s start (19 September, 10:00 BST) and the second opens after the weekend (21 September, 00:00 BST). Email addresses and personal links are removed after 31 October 2026; remaining research responses are removed after 30 September 2027. A six-hour application timer and every data transaction enforce those dates. Participants can remove both stores using their private link, and the assistant can remove both stores after confirming the exact saved email or participant reference. Deleted links immediately stop working.

The file store deletes its prior application revision after each successful write. Railway scheduled volume backups, if enabled, can retain a deleted copy for 6 days (daily), 27 days (weekly), or 89 days (monthly). They are not active research/contact data. A restore procedure must repeat participant-requested deletion before the restored copy is used. Do not create or lock manual backups containing live participant data.

## Programme evidence

- https://bigbrue.com/programme/ — main-stage sessions and 19–20 September 2026 dates, checked 7 September.
- https://bigbrue.com/hub/ — named Hub activities, checked 7 September.

Beau’s currently listed session is Reaching for Wonderment. The revised question names that session rather than presenting an unverified keynote title.

## Review deployment

`scripts/package-study-one-review.py` produces an allowlisted source tree and SHA-256 manifest. It strips all original experiments, panel and pair routes, their data stores and credentials. The isolated questionnaire definitions are compared against the source for both waves and attendance branches. The public package has separately pinned, patched runtime dependencies; the main checkout package remains unchanged.

The full local suite, isolated production runtime, browser first-to-second flow, research/contact exclusion, removal, and hosted persistence are recorded in the delivery checklist. Functional checks use synthetic records and send no email.

## Review revision — original questions 16–19 removed

The first questionnaire now has 15 items in four parts. Festival familiarity, prior Beau material, the repeated before-exposure question and public/political interest were removed from the new Study One flow and validation. Legacy instruments and stored question/answer snapshots remain intact. New first responses use `brufest-study-one-pre-v0.3-2026-09-07`; the journey/draft storage key stays stable. An older draft on the removed fifth part resumes at the fourth part with its remaining answers preserved.

The personal-link/manage-follow-up and shared-device demonstration disclosures and their contents were removed from the participant screen. The study-information agreement, automatic drafts, identity matching, the separate email/permission step and assistant controls remain.

## Review revision — one initial agreement checkbox

Only the study-information agreement checkbox remains. Starting no longer requires or sends the separate attendance declaration. Omitted `beforeExposure` is stored as `beforeExposureConfirmed: null` (not recorded), never assumed true. Explicit declarations from older clients and historical records retain their actual true/false value. No study information text, other questionnaire content, draft keys or other study flow was changed.

## Review revision — email choice hierarchy

The email/permission save action is a filled primary button. The optional no-email action is smaller underlined text beneath it, retaining a 44px hit area, keyboard access and its existing consent behavior. Only Study One contact-form markup and styles changed.

## Approved wording and reversible contact-choice batch

The participant information now asks “What would you do?” and omits the requested review-details section. The approved operational information and consent snapshot use `study-one-information-v4-2026-09-07`; historical snapshots remain unchanged. Autosave continues without its normal status label. Saved-response receipts use “You’re finished for now. You can close this page.” and omit the specified no-email-sent sentence. The specified assistant review banner was removed.

A person who declined email can expand “Add an email for follow-up” on the existing saved response. Email permission starts unchecked and must be explicitly given. The existing identity, saved first response and private link are reused; no duplicate questionnaire is created. Opting in restores contact eligibility through the existing separate contact store. No mail is sent by this change.

## Optional Evolvable continuation

After the first questionnaire and the separate email choice are complete, the saved-response screen offers an optional link to `https://www.evolvable.me`. The copy describes it as a way to explore how the participant approaches different situations before Big Brue. It is not shown after the post-festival questionnaire. The link has no participant identifier, token, email, analytics parameter or automatic redirect, and clicking it is not part of study participation.
