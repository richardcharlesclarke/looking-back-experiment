# Study 1 — Festival audience change • v0.1

## Research question and status
Among people who attend Brufest, does their orientation towards disagreement change over the festival, does it persist, and how does it relate to their actual experiences?
A festival pilot: ask people before and after, see what changes, and learn what is worth testing next. Questions below are our working v0.1 set, dated 5 September 2026.
## Design and allocation
Before-and-after audience study: each attendee supplies PRE and POST using the same pseudonymous token. PRE must precede substantive festival exposure; POST is completed at the end of that person's attendance. Record actual timestamps and exposure before baseline if baseline was late.
Flow: audience PRE → chosen festival experiences → audience POST → optional follow-up at 10 days after their last attendance (working default within the proposed 7–14-day window).
Different people attend different events. The keynote is a recorded exposure, separate from Studies 2 and 3 briefings. Comparisons by attendance are associations, not proof of causation. A non-attending comparison cohort, pretest randomisation and reflection-prompt trial are future options, not part of this build.
## Repeated core: PRE, POST and optional follow-up
Intro: “Thinking about how you would respond to a serious disagreement now, how true is each statement of you?”
Answer every core item on the same seven-point scale: 1 Not at all true of me now; 2; 3; 4; 5; 6; 7 Very true of me now. Provide a separate Prefer not to answer option. No preselected answer. Use identical IDs, wording, anchors and participant-specific item order across waves.
- E1_HUM_01 — My view on an important issue may contain weaknesses I have not yet recognised.
- E1_HUM_02 — Once I have thought carefully about an issue, I see little value in revisiting the opposing case. [Reverse direction]
- E1_CUR_01 — When someone strongly disagrees with me, I want to understand how their view makes sense to them.
- E1_CUR_02 — I am willing to spend time with the strongest case against a view I hold.
- E1_REG_01 — When I reject someone’s conclusion, I can still identify the concern or value behind it.
- E1_REG_02 — I can disagree strongly with a person’s view without treating that view as a summary of the person.
- E1_CPX_01 — Difficult public questions often contain tensions that cannot be reduced to one simple choice.
- E1_CPX_02 — A useful disagreement can improve the map of a problem even when nobody changes sides.
- E1_REV_01 — I am willing to qualify my position publicly when a good argument exposes a weakness in it.
- E1_REV_02 — Qualifying my position in a disagreement feels like losing ground. [Reverse direction]
- E1_AGY_01 — I feel able to stop a difficult disagreement becoming personal.
- E1_AGY_02 — When a disagreement becomes tense, there is little I can do to make it productive. [Reverse direction]
## PRE-only questions
- E1_PRE_DAYS — Which festival days do you intend to attend? [Programme day multi-select; Not sure]
- E1_PRE_ACCESS — What type of ticket or access do you have? [Configured ticket types; Other; Prefer not to answer]
- E1_PRE_SESSIONS — Which sessions or activities do you intend to attend? [Versioned programme multi-select; Not yet decided]
- E1_PRE_FAMILIAR — Before today, how familiar were you with this festival? [Not at all; A little; Quite familiar; Very familiar]
- E1_PRE_PRIOR — Before today, had you encountered Beau’s material about disagreement or taken part in a related briefing or exercise? [No; Yes; Not sure; optional description]
- E1_PRE_EXPOSURE — Before completing this questionnaire, have you already attended a festival session or activity today? [No; Yes → select sessions/activities; Not sure]
- E1_PRE_INTEREST — How interested are you in public or political questions? [0 Not at all → 10 Extremely; Prefer not to answer]
Optional demographics remain configurable and off by default; no demographic answer is needed to match responses.
## POST-only exposure
- E1_POST_DAYS — On which festival days did you attend? [Programme day multi-select]
- E1_POST_SESSIONS — Which sessions or activities did you attend? [Programme multi-select; Other with text; Cannot remember]
- E1_POST_PORTION — For each selected session, did you attend all or only part? [All; Part; Not sure]
- E1_POST_ROLE — For each selected session, did you mainly listen/watch or actively take part? [Listen/watch; Actively take part; Both; Not sure]
- E1_POST_HUB — Which workshops, Hub activities, Speakers’ Corner or soapbox sessions did you attend or join? [Programme multi-select plus Other; None]
- E1_POST_KEYNOTE — Did you attend [Beau session title]? [All; Part; No; Not sure]. If attendance is already recorded through the session selector, derive this field rather than asking twice.
- E1_POST_KEYNOTE_IMPACT — If you attended Beau’s session: how much did it change how you think about disagreement or uncertainty? [0 Not at all → 10 A great deal]. Self-attributed impact is descriptive, not evidence of causation.
- E1_POST_DISAGREEMENT — During the festival, did you have a meaningful disagreement or difficult conversation with another attendee? [No; Yes; Not sure; Prefer not to answer]
- E1_POST_TRIAL — Did you take part in the organised small-group disagreement study? [No; Yes; Not sure]. Join Study 3 records by token when available; record its timing separately.
## POST-only outcomes
- E1_POST_CHANGE — What best describes any change in how you approach disagreement? [Choose up to two: No meaningful change; More interested in understanding different views; More willing to qualify my own view; More aware of uncertainty; Better able to explain why people disagree; More able to handle a difficult exchange; Less willing to engage; Something else]. No meaningful change is exclusive; this adapts the proposal's issue-specific taxonomy to a festival-wide question.
- E1_POST_OPEN — What, if anything, changed in how you think about disagreement? [Optional short text]
- E1_POST_GENERATED — Did any conversation or event produce an idea, distinction or question that was new to you? If so, describe one. [Optional short text]
- E1_POST_INFLUENCE — Which experience most affected your thinking about disagreement, if any? [Programme session; Informal conversation; Small-group study; Other; None; Not sure]
- E1_POST_CHOICE — Which would you choose to read next about an issue you care about? [A strong case supporting my view; A strong case challenging my view; A comparison of different views; Nothing further]. Store as a stated preference. Only call it observed behaviour if real comparable materials are offered and selection is recorded; resource links are placeholders.
## Optional follow-up
Repeat the 12 core items unchanged, then ask:
- E1_FU_OPPOSING — Since the festival, have you deliberately sought a serious argument against a view you hold? [Yes; No; No opportunity; Prefer not to answer]
- E1_FU_CONVERSATION — Since the festival, have you initiated, continued or returned to a difficult conversation? [Yes; No; No opportunity; Prefer not to answer]
- E1_FU_USED — Have you used anything from the festival in a disagreement? [Yes; No; No opportunity; Not sure]
- E1_FU_EXAMPLE — Give one concrete example, if you wish. Please avoid names or identifying details. [Optional text]
## Outcomes and interpretation
Report matched item-level change. Exploratory two-item domain summaries: humility HUM, curiosity CUR, opponent regard REG, complexity CPX, revisability REV and agency AGY. Reverse-direction items use 8 minus response only for those exploratory summaries. Require both items for a domain summary; otherwise leave missing. Do not create a total score.
Report sample flow, matching rate, missing answers, baseline timing, completion and follow-up loss. Exposure comparisons remain observational; do not treat people missing POST as unchanged. Follow-up is optional and must not obstruct immediate PRE/POST completion.
