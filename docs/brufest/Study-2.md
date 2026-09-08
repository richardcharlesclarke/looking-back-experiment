# Study 2 — Panel intervention • v0.1

## Research question and status
Does a short pre-panel briefing improve how panellists engage with disagreement, what the discussion produces, and what its audience understands or experiences?
A festival pilot comparing panels with and without the disagreement briefing. Working questions: v0.1, 5 September 2026. Fill in panel names and speakers later.
## Eligibility and allocation
Create panel records with panel ID, speaker IDs, moderator ID, duration, time, topic, one approved central proposition by default, and optional additional propositions. Proposition template: “[Specific claim on the panel topic]”; anchors 0 Strongly oppose and 10 Strongly support. Wording and endpoints must remain identical across waves.
Screen each speaker privately: E2_SCREEN_POSITION — To what extent do you support this proposition? [0 Strongly oppose → 10 Strongly support]. E2_SCREEN_REASON — What is your main reason? [Short text]. Use the positions and reasons to check there is a real disagreement and room for speakers to respond to one another; record the reason for including the panel.
Allocate whole panels 1:1 to treatment or active control. Never allocate speakers separately within a panel. Before allocating, connect every panel that shares a speaker, including indirect connections, into one contamination group. Allocate that entire group together, or retain only one panel from it. Balance format and expected disagreement where feasible; record the random method, seed, eligible list and assignment timestamp. Do not rerandomise after seeing outcomes.
Use condition values unassigned, treatment, active_control. Actual panel/speaker selection may be filled in later. A placeholder is not an assignment. If organisers ultimately choose conditions instead of allowing random allocation, record allocation_method=nonrandom and analyse as a nonrandom comparison.
## Flow
Private screening → eligibility and group allocation → panellist PRE before any briefing → treatment or equal-duration active control → recorded panel → panellist POST.
Audience micro-PRE immediately before the panel → same audience topic measures immediately afterwards plus process/outcome questions. Use participant token + panel ID to match. Keep condition hidden from audiences and out of public URLs and promotion.
## Panellist repeated core: PRE and POST
Intro: “Thinking about the central question of this panel, how true is each statement of you now?” Scale 1 Not at all true of me now → 7 Very true of me now; separate Prefer not to answer. Repeat exact wording and IDs.
- E2P_OPN_01 — My current position on this panel’s central question may be incomplete.
- E2P_CUR_01 — I am interested in understanding how the other panellists’ positions make sense to them.
- E2P_REG_01 — I regard the other panellists’ reasons as worth examining carefully.
- E2P_REV_01 — I am willing to qualify a claim publicly if the evidence or argument warrants it.
- E2P_DEF_01 — I can be challenged on this issue without treating the challenge as personal.
- E2P_REV_02 — I can state what would make me revise part of my position.
- E2P_GEN_01 — Disagreement on this issue can produce a better framing even if nobody changes sides.
- E2P_AGY_01 — I feel able to help a difficult discussion remain productive.
## Panellist proposition measures: identical PRE and POST
- E2P_POSITION — To what extent do you support [proposition]? [0 Strongly oppose → 10 Strongly support]
- E2P_CONFIDENCE — How confident are you in your position on [proposition]? [0 Not at all confident → 10 Completely confident]
- E2P_UNDERSTANDING — How well do you understand the strongest reasons for a position different from your own on [proposition]? [0 Not at all → 10 Extremely well]
- E2P_PREDICT — Where do you think [other panellist] stands on [proposition]? [Same 0–10 position scale; Cannot estimate]. Repeat for every other panellist; store target speaker ID.
- E2P_REASON — What is the strongest reason someone might disagree with your position on [proposition]? [Optional short text]
## Panellist POST-only
Short-form default: items 01, 03, 04, 06, 07 and CHANGE, plus one optional open response. The other POST items below are retained extensions; do not show the whole bank by default.
Scale 1 Strongly disagree → 7 Strongly agree; allow Cannot assess and Prefer not to answer separately.
- E2P_POST_01 — The discussion improved my understanding of at least one other panellist’s reasoning.
- E2P_POST_02 — Another panellist represented my view accurately.
- E2P_POST_03 — I refined or qualified at least one claim because of something another panellist said.
- E2P_POST_04 — The discussion produced a distinction, question or proposal that was not available at the start.
- E2P_POST_05 — The disagreement remained focused on claims and reasons rather than character or motives.
- E2P_POST_06 — I felt respected while being challenged.
- E2P_POST_07 — I would willingly continue this conversation.
- E2P_POST_08 — The exchange became more about winning than understanding. [Adverse direction]
- E2P_POST_09 — I said something I had not expected to say before the discussion began.
- E2P_POST_10 — During the panel, I felt defensive. [Descriptive; not automatically a failure]
- E2P_CHANGE — What best describes any change in your thinking about the panel’s central question? [Shared topic-change choices in the methods page; maximum two]
- E2P_OPEN_GENERATED — What did the discussion produce, if anything, that was not available at the start? [Optional text]
- E2P_OPEN_OTHER — What was the strongest point made by a panellist whose position differed from yours? [Optional text; target speaker selector]
- E2P_OPEN_DIFFERENT — What, if anything, would you now say differently? [Optional text]
- E2P_SUMMARY_ACCURACY — If another panellist summarised your reason: how accurately does this capture your reasoning? [0 Not at all accurately → 10 Very accurately; Cannot assess]. Optional linked assessment, separate from agreement or liking.
## Audience micro-PRE and repeated POST
Intro: “Please answer about [panel title] and its central question.” Use one proposition by default to keep this brief.
- E2A_POSITION — To what extent do you support [proposition]? [0 Strongly oppose → 10 Strongly support]
- E2A_CONFIDENCE — How confident are you in your position on [proposition]? [0 Not at all confident → 10 Completely confident]
- E2A_UNDERSTANDING — How well do you understand the strongest reasons for a position different from your own on [proposition]? [0 Not at all → 10 Extremely well]
PRE only: E2A_FAMILIARITY — How familiar are you with this subject? [0 Not at all → 10 Extremely]. E2A_IMPORTANCE — How important is this issue to you personally? [0 Not at all → 10 Extremely]. Store participant token, panel ID and timestamps.
## Audience POST-only
Short-form default: PROC_01, PROC_04, GEN_01, GEN_02, UND_01, REL_01, CLOSEST and one optional GENERATED response, alongside the three repeated topic measures. The other items are optional extensions.
Scale 1 Strongly disagree → 7 Strongly agree; allow Cannot assess and Prefer not to answer.
- E2A_PROC_01 — The panellists responded directly to one another rather than giving parallel speeches.
- E2A_PROC_02 — The panellists asked questions that opened up information rather than merely making a point.
- E2A_PROC_03 — The panellists represented views they disagreed with accurately before criticising them.
- E2A_PROC_04 — At least one panellist refined or qualified a claim in response to something another person said.
- E2A_GEN_01 — The discussion exposed important distinctions or trade-offs that were not clear at the start.
- E2A_GEN_02 — The discussion generated a new question, framing or proposal rather than merely repeating familiar positions.
- E2A_UND_01 — I am now better able to explain why more than one position on the issue makes sense to the people who hold it.
- E2A_REL_01 — The panellists showed that strong disagreement can remain compatible with respect.
- E2A_REL_02 — I would willingly hear this group continue the discussion.
- E2A_DEG_01 — The exchange became more about winning than understanding. [Adverse direction]
- E2A_INTENSITY — How intense was the disagreement? [0 No disagreement → 10 Extremely intense]
- E2A_CLOSEST — Which panellist’s position was closest to yours? [Speaker selector; None; Unclear]
- E2A_CHANGE — What best describes any change in your thinking about the panel’s central question? [Shared topic-change choices; maximum two]
- E2A_GENERATED — What is one idea, distinction or question you heard that you had not considered before? [Optional text]
- E2A_CONTINUE — How willing would you now be to have a serious conversation with someone who strongly disagrees with you on this subject? [0 Not at all willing → 10 Very willing]. This is intention, not observed behaviour.
Optional retained exploratory item E2A_SHAPE: “Which shape best describes the discussion?” [Two parallel lines; Two lines colliding; Two lines gradually converging; Two lines crossing and continuing; A tangled knot; A widening fork; Hard to say]. Do not score one shape as success.
## Outcomes, coding and analysis
Look for direct engagement with another person's reasons, better understanding, useful new distinctions or questions, and willingness to continue. Keep these as separate outcomes. Use the shared coding notes to capture examples from recordings.
Key secondary outcomes: new-output and integration code rates, matched panellist understanding/position-prediction error, and matched audience understanding change. Report other item and process profiles as exploratory. Position change and lower confidence are descriptive, never automatic improvements.
For each respondent, prediction error is mean absolute difference between predicted and target speaker self-reported position on the same proposition and wave. Require available paired values; report coverage. This measures position knowledge, not full understanding of reasons; retain reason summaries.
Analyse outcomes at the randomised panel or contamination-group level, respecting any grouping used in allocation. Audience answers and speaking turns are nested observations, not extra independent treatment units. Report effect estimates, individual panel profiles and uncertainty; no claim of adequate power follows from a fixed panel-count threshold.
