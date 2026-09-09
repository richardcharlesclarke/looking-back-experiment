# Study One recording revision — 9 September 2026

Richard authorised implementation and production deployment following the meeting recorded in **Discussion on AI, Conflict Perception, and Study Design** (GPT chat `6aa18a34-baf8-83eb-a467-c6db6db1553e`). The source extraction was read directly. Only original questions 1–8 were reviewed. Richard subsequently authorised editorial judgment for unsettled wording, prioritising clarity and brevity, and explicitly requested Astra's final wording review. Astra recommended retaining the final text below.

This is editorially finalised wording following the recorded directions. It does not imply that every word was dictated or agreed verbatim in the meeting.

| Original | New position | Final wording | Basis |
| --- | --- | --- | --- |
| Q1 | 1 | My view on an important issue contains weaknesses I have not yet recognized. | Agreed removal of “may”, with grammar adjusted. |
| Q2 | 2 | I see little value in revisiting the opposing case. | Remove introductory qualification; retain reverse direction and the strongest recorded candidate. |
| Q3 | 3 | When someone strongly disagrees with me, I want to understand how their view makes sense to them. | Retained exactly from the live question. |
| Q4 | 4 | I am willing to spend time considering the strongest argument against a view I hold. | Clarify considering an argument while preserving willingness to spend time. |
| Q5 | 5 | When I reject someone’s conclusion, I can still understand the concern or value behind it. | Replace “identify” with the intended understanding construct. |
| Q6 | 6 | I can disagree strongly with a person’s view without rejecting the person. | Simplify person/position separation. |
| Q7a | 7 | Important conflicts often involve several issues, not just a choice between two sides. | Agreed conceptual split: multiple issues rather than a binary framing; editorial wording. |
| Q7b | 8 | Choices in important conflicts can have several connected consequences. | Separate interconnected-consequences construct; editorial wording. |
| Q8 | 9 | A useful conflict can expand one’s perception of a problem, even when nobody changes sides. | Preferred perception language replaces “map”; apply conflict framing. |

Original Q9–12 remain word-for-word and move to positions 10–13. The two connection questions move to 14–15, the existing optional future-outlook item to 16, and attendance to 17–19. No new optimism/adaptability measure is added. Existing post-event measures, response scales, controls, skip choices, reverse flags and contact-permission flow remain intact. Broad current study framing uses “conflict”; retained items using “disagree” are untouched. The wider landing-page rewrite was deferred in the meeting and remains out of scope.

## Current lead and historical information

The current “What is the study about?” section names **Beau Lotto** as study lead. The current study contact is **beau@labofmisfits.com**, confirmed in both Agent OS contact aliases and people records; the coordinating task independently confirmed it in a Brufest meeting invitation. Existing authorship/ownership metadata is untouched. No message is sent to Beau or any participant.

Information version `study-one-information-v6-2026-09-09` contains this current framing, lead and contact. Historical v5 and v4 information is frozen byte-for-byte, including its original lead, contact and timing. Fingerprints captured before editing and verified in tests:

- v5: `2f4c13d602cbbec77dda9ce898a8ee1a33c427fc3f3f42bb7383cd0ceb1a459a`
- v4: `a5bfb048a0c5d1509f6d79afa5f9b6ca8e6e1ef8e9e6bbbfdb0b2147e2d2a475`

The causal limitation remains explicit: change across the festival does not establish that the festival caused it. Privacy/retention dates and the existing provisional duration are unchanged.

## Versioning and validation

New instrument: `brufest-study-one-conflict-v3-2026-09-09`. Q7a and Q7b use distinct IDs `E1_CPX_ISSUES` and `E1_CPX_CONSEQUENCES`; the old `E1_CPX_01` is absent from v3 and remains in previous instruments. Revised prompts are conditional on v3; the shared historical question bank is unchanged. New enrolments and the default preview use v3. Existing enrolments/drafts retain their pinned versions, and a saved baseline determines its compatible follow-up. Cross-version submissions are rejected. Exports retain saved question snapshots and flag changed wording as non-comparable without manufacturing a historical answer for the new item.

The semantic connection preview and toolbar find the question by ID after the numbering shift. The direct view remains fresh, unanswered and unable to submit research responses.

47 unit/flow/privacy tests pass, including exact new wording, split response independence, original Q3/Q9–12 and added measures unchanged, all prior instrument follow-ups, exact historical consent, and mixed-version comparison handling. Type checks, lint and standalone production build pass. Real isolated HTTP save/retrieve/export passes for five synthetic participants spanning legacy, continuous v1, perspectives v2 and conflict v3, including date gates, exact decimals, missing answers, branch pruning, duplicate handling and local-only deletion/revocation. The complete desktop journey passes for 19 pre and 35 post questions with API requests intercepted.

Pre-release authenticated read records **21 people and 17 responses**, retaining hashes/counts only. Deployment target remains the existing Railway project `ed40ec0d-aec9-48e2-b3af-1f820e94e5a9`, environment `d86f82f2-579c-4de2-8085-f00903b86816`, service `9586c104-8863-467f-adab-bef9a2fa5432`, and `/study-one-data` volume. Package: `output/conflict-v3-final`. No production QA responses are submitted.

Live verification will be recorded after release.
