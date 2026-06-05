# Looking Back Change Spec

Last updated: 2026-06-05

## Source

This captures the recent Slack direction from Beau for the Looking Back experiment, especially the messages from 2026-06-04 and 2026-06-05.

Relevant Slack links:

- 2026-06-05: Beau proposed splitting the experiment into two conceptually different sections: first page about what the participant wants their life to mean, then the last-year questions.
  https://labofmisfitsgroup.slack.com/archives/D1K914XC2/p1780642333425379
- 2026-06-04: Beau suggested hiding the current map display, keeping location data for later analysis, showing the value word cloud instead, adding alignment, and adding blocker/enabler prompts.
  https://labofmisfitsgroup.slack.com/archives/D1K914XC2/p1780606234705449
- 2026-06-03: Beau asked whether the conference group can be ring-fenced and compared with the average.
  https://labofmisfitsgroup.slack.com/archives/D1K914XC2/p1780487803504089

## Product Change

The experiment should now read as two conceptual sections:

1. What you want your life to mean.
2. The last-year reflection questions.

The first section should include five participant inputs:

1. The Looking Back choice: how the participant would like their life to have been.
2. The value question: the most important value they live by.
3. An alignment question: whether they feel they are living in alignment with the Looking Back choice.
4. A blocker prompt: one word or name describing what blocks them from living in alignment.
5. An enabler prompt: one word or name describing what enables them to live in alignment.

The second section remains the existing 11 last-year rating dimensions:

- Stress
- Anxiety
- Loneliness
- Joy
- Fulfilment
- Creativity
- Achievement
- Uncertainty
- Loss
- Change
- Growth

## Required Implementation Changes

### 1. Add New Submission Fields

Add these fields to the submission model, API validation, in-memory preview store, database schema, and admin table:

- `alignment`: the participant's answer to whether they are living in alignment with the selected Looking Back word.
- `blocker`: free text, one word or name.
- `enabler`: free text, one word or name.

Recommended storage columns:

- `alignment text`
- `blocker text`
- `enabler text`

Use `alter table submissions add column if not exists ...` in both `schema.sql` and `ensureSchema()` in [lib/store.ts](/Users/admin/looking-back-experiment/lib/store.ts).

### 2. Decide Alignment Scale

Slack says to add an "are you aligned" question, but does not specify the response format.

Recommended V1 choice: a compact forced-choice scale:

- Not at all
- Slightly
- Somewhat
- Mostly
- Completely

This keeps it comparable and avoids another long free-text answer. Store the label or a numeric score plus label. If storing only one value, store the label in `alignment`.

### 3. Restructure The Reflect Step

Update the current `reflect` step in [app/looking-back/page.tsx](/Users/admin/looking-back-experiment/app/looking-back/page.tsx) so it presents the first section as a coherent page:

- Section title: "What do you want your life to mean?"
- Question 1: existing Looking Back forced-choice grid.
- Question 2: existing value text area.
- Question 3: new alignment control.
- Question 4: new blocker input.
- Question 5: new enabler input.

Validation should require:

- selected Looking Back word;
- value;
- alignment;
- blocker;
- enabler.

Keep blocker and enabler copy broad enough to allow either a person/name or an internal concept, because Beau explicitly mentioned both kinds.

### 4. Keep Location Capture, Hide Location Display

Do not remove location capture or database storage. Beau wants the data retained for later analysis.

Remove or hide the current results map section:

- The "Geographic pattern" section in [app/looking-back/page.tsx](/Users/admin/looking-back-experiment/app/looking-back/page.tsx).
- The `ResponseGlobe` display from the public results experience.

The location consent UI can remain in the context step unless Rich decides to remove the participant-facing location ask entirely. Current Slack direction is only to hide the displayed map.

### 5. Replace The Map With A Value Word Cloud

Show a word cloud or word-fragment display using the existing `stats.values` collection.

The app already includes `values` in [lib/types.ts](/Users/admin/looking-back-experiment/lib/types.ts) and [lib/store.ts](/Users/admin/looking-back-experiment/lib/store.ts). The missing piece is the visual component in results.

Recommended display:

- Section title: "Values people are living by"
- Use anonymised fragments from `guidingValue`.
- Keep the display lightweight and reflective, not dashboard-like.
- If there are no values yet, show an empty state.

### 6. Consider Showing Blocker And Enabler Clouds

Once `blocker` and `enabler` are stored, add aggregate displays for them if there is enough data.

Recommended section:

- "What gets in the way"
- "What helps"

This was not explicitly requested as a results display, so implement after the value word cloud unless time is tight.

### 7. Preserve Conference Ring-Fencing

Keep the existing cohort mechanism:

- query params: `cohort`, `cohortLabel`, `event`;
- storage fields: `cohort_slug`, `cohort_label`;
- default config: `conference-2026` / `WMC2026 Conference`.

The current results already compare the cohort with historical data when `legacy=1`. Maintain that behavior while making sure the event group remains separable from general population submissions.

### 8. Clean Up Gender Options

The handoff says gender options should include:

- Woman
- Man
- Non-binary
- Prefer to self-describe
- Prefer not to say

Current code only lists:

- Woman
- Man
- Non-binary

Update [lib/constants.ts](/Users/admin/looking-back-experiment/lib/constants.ts), API validation, UI, types if needed, and admin display to support self-description or explicitly use the empty value as "Prefer not to say".

## Implementation Order

1. Update types, constants, schema, and store mapping for `alignment`, `blocker`, and `enabler`.
2. Update `/api/submit` validation.
3. Update the reflect step UI and submission payload.
4. Update admin table.
5. Hide/remove the public map section.
6. Add the value word cloud in its place.
7. Optionally add blocker/enabler aggregate displays.
8. Run local build and browser-check the participant flow and results screen.

## Open Questions

- Should alignment be stored as a label, numeric score, or both?
- Should blocker/enabler be required, or can participants skip them?
- Should blocker/enabler clouds appear in V1 results, or only be stored for later analysis?
- Should location consent remain visible now that the map is hidden?
