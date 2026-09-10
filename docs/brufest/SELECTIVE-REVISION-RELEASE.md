# Study One selective revision — 10 September 2026

Richard explicitly authorised implementation and production deployment of the recommendations in the comparison report, then added Bo's connection and topic-certainty proposals to the same release. This is exploratory within-person before/after festival research. No control group, invitation sending or additional methodological expansion is included.

Instrument: `brufest-study-one-selective-v4-2026-09-10`. New participants receive this version. Earlier participants and saved baselines retain their existing versions and follow-up wording. Historical consent information is unchanged.

## Final sixteen core items

1. My view on an important issue is likely to contain weaknesses I have not yet recognised.
2. When I have a strong opinion about a topic that matters to me, I see little value in considering a perspective that challenges it.
3. I am willing to spend time considering the strongest argument against a view I hold.
4. When someone strongly disagrees with me, I want to understand how their view makes sense to them.
5. When I reject someone’s conclusion, I can still understand the concern or value behind it.
6. When I disagree with someone, I recognise that the issue may involve several connected concerns.
7. I feel able to stop a difficult disagreement becoming personal.
8. When a disagreement becomes tense, there is little I can do to make it productive.
9. I can disagree strongly with a person’s view without rejecting the person.
10. When I recognise a weakness in my view, I am willing to acknowledge it openly.
11. I can learn something valuable from a view that challenges my own, even if my conclusion does not change.
12. Even when I am convinced my view is correct, acting on it may have consequences I have not anticipated.
13. When I see a good reason to do so, I am willing to revise my position in a disagreement.
14. Acknowledging a weakness in my view feels like losing ground.
15. When you strongly disagree with someone about an issue that matters to you, how likely is the conversation to deepen your understanding?
16. When you strongly disagree with someone about an issue that matters to you, how likely is the conversation to leave you feeling less connected to that person?

Items 1–14 use the existing continuous 0–100 truth-of-me scale. Items 15–16 use continuous 0–100 likelihood with Not at all likely, Slightly likely, Somewhat likely, Very likely, Extremely likely. Missing and Cannot assess remain explicit. These are item-level outcomes, with no total or automatically reconstructed domain scores.

Editorial choices: retain willingness rather than habitual behaviour; retain separate desire and ability to understand; separate willingness to acknowledge from willingness to revise; remove negative-only framing from unforeseen consequences. Omit Bo's overlapping standalone usefulness-without-agreement item. This retains sixteen core items including the restored understanding-ability item.

## Three connection circles

- How connected do you feel to people who have similar views to your own?
- How connected do you feel to people who have views that are significantly different from your own?
- How connected do you feel to people all over the world?

These are Bo's exact proposed prompts. Similar and significantly different views use new IDs; the historical friends/family target remains in older instruments. Worldwide connection and the separate outlook question remain.

## Selected topic and starting view

Bo's exact selection prompt: “Which of the panels is discussing a topic about which you feel very certain?” Choices are twenty real panel/conversation titles checked against https://bigbrue.com/programme/ on 10 September, excluding welcome, poetry/music and the selected solo-interview entries. The new topic bank uses the updated “Who Wants to Be an Entrepreneur?” title; the historical attendance bank is unchanged. None of these, Not sure, and Prefer not to answer are available.

A selected panel leads to “What is your current view on this topic? State it briefly in your own words. Please avoid names or identifying details.” The exact original response is saved. The same topic and starting view are shown alongside both before/after questions:

- How certain are you that your current view on this topic is correct? 0 — Not at all certain → 10 — Completely certain.
- How willing are you to reconsider your current view on this topic? 0 — Not at all willing → 10 — Completely willing.

These prompts and endpoints preserve Bo's wording. The surrounding instructions use festival timing and say to answer about the same view as the participant sees it now. The server derives the follow-up reference from the saved baseline, ignoring client-supplied replacements. The context is also snapshotted with both questions for export/comparability. Skipping the topic or starting view omits the paired ratings, with no fabricated baseline. Changing the selected topic or editing the starting view clears dependent draft ratings.

The full first form contains 27 questions when the topic branch is completed, 24 when no panel is selected, or 25 if the starting view is skipped. This includes sixteen core, three circles, existing outlook, topic/view/two ratings, and three attendance questions.

## Verification and release

53 automated tests pass, including exact preservation of all four older before/after question snapshots, version-pinned submissions, exact topic-reference preservation, forged-reference rejection, missing/opt-out paths, 0–10 bounds, circle target changes, and export comparability. Real local HTTP checks pass with six synthetic participants spanning five instrument generations; no production QA submissions are made. Build, lint and type checking pass in the 44-file allowlisted deployment package using locked Next.js 15.5.25. Desktop/mobile local preview checks cover the core, likelihood endpoints, circle targets, selected topic, written view, and matched after-festival reference.

Production target: project ed40ec0d-aec9-48e2-b3af-1f820e94e5a9, environment d86f82f2-579c-4de2-8085-f00903b86816 (study-one-review), service 9586c104-8863-467f-adab-bef9a2fa5432 (study-one-review), existing /study-one-data volume. Pre-release deployment 24df8c21-d518-48ac-b449-59281e2b635b. Read-only storage audit records 22 people, 17 responses, 22 contacts; only counts and cryptographic hashes are retained locally.

Production release complete: implementation commit `75db257` deployed as Railway deployment `13a9168a-67f2-4658-9fa1-9d34bee985db` with status SUCCESS and 1/1 health check passed. Public questionnaire and both public/direct service health endpoints return HTTP 200.

The production container's 44-file manifest matches the tested package exactly: SHA256 `ffc20d99eecaa5c6deac477d4ec9248adc6f37d676f6381baef35eca55b5ad02`, zero file mismatches. Read-only post-release audit confirms the complete research and contact store hashes are identical to the pre-release audit: all 22 people, 17 responses and 22 contacts unchanged. No production research responses were created for QA.

Live preview verification read all sixteen final core prompts, both likelihood label sets, and all three exact connection prompts. The full 27-question topic branch completes in preview mode without submission; the live certainty and reconsideration prompts display Bo's exact numeric endpoints. The selected panel and starting view render correctly. Desktop topic-reference and 390px mobile connection screenshots were visually inspected; the long different-views label wraps, all seven circle choices and navigation remain usable. Matched post-festival starting-view rendering was checked locally; server-side reference integrity and all versioned follow-ups are covered by automated and real local HTTP tests.

Evidence in the worktree output directory: `selective-tests.txt`, `selective-build.txt`, `selective-http-result.json`, `selective-live-before.json`, `selective-live-after.json`, and `live-manifest-verification.json`. Browser verification is recorded in this task's tool history. No Slack messages or invitations were sent.

Review: https://experiments.evolvable.me/study-one?preview=1

Connection review: https://experiments.evolvable.me/study-one?preview=1&step=connection-similar

The longstanding 8-minute estimate remains provisional; no participant timing study was conducted. These checks establish implementation behaviour, not psychometric validation or causation.
