# Looking Back Experiment Handoff

Last updated: 2026-06-02

## Why This Exists

Rich wanted to find old code for the Lab of Misfits `labofmisfits.org` / `labofmisfits.com` Umbraco site, specifically an old experiment called **Looking Back**.

We found the old Umbraco-era code under:

`/Users/admin/God-Assessments/lom-site`

The current checkout did not obviously contain the full old experiment, but the Git history did. We recovered the relevant historical files into:

`/Users/admin/Documents/Codex/2026-06-02/um-is-there-anywhere-on-this/outputs/recovered-looking-back`

The historical files showed that Looking Back had multiple versions, not a single clean canonical instrument:

- public Typeform-driven versions;
- forced-choice versions;
- free-text versions;
- 2020 “last year” reflection versions;
- conference-specific variants;
- Prolific variants;
- results pages that pulled data from Google Sheets and rendered charts client-side.

The important historical reference point is not to clone the old implementation. It is to preserve the idea and relaunch it as a modern standalone public reflective experiment.

## What Rich Asked For

Rich wants this rebuilt as a **standalone website**, likely to be hosted at:

`experiments.evolvable.com`

It should be a **public / reflective experience first**, not primarily a research dashboard or a survey.

The aim is:

- relaunch Looking Back as a new public experiment;
- use it for a conference/public context;
- make it feel like an **Evolvable experiment**;
- make it immediately shareable and visually good;
- show the participant where they sit relative to everyone else;
- collect real data, but keep the participant experience as the priority.

This may later become part of a reflective tools area of Evolvable, but that decision is deliberately on hold.

## Product Direction

Treat the experience as:

1. A short contemplative entry point.
2. A few carefully paced reflective questions.
3. A personal result.
4. Immediate aggregate comparison.
5. A gentle path onward to Evolvable.

Do **not** make it feel like Typeform.

Do **not** make it feel like a research/admin dashboard.

Do **not** over-index on the old Lab of Misfits identity. The tone should be Evolvable-adjacent.

Rich explicitly liked the framing: **public / reflective experience first; data collection second.**

## Current V1 Decisions

The app should start fresh rather than seeding historical data.

Participants should see results immediately after submitting.

Repeat participation is allowed.

There is no “take this again later” mechanic for V1.

No CSV export is needed for V1.

Admin is needed, but simple admin is acceptable initially.

## Participant Flow

Current intended flow:

1. Intro page.
2. Short reflective prompt.
3. Free-text word: how the participant would like their life to have been.
4. Free-text value: the most important value they live by.
5. Forced-choice Looking Back category, with an optional Other.
6. Last-year reflection ratings.
7. Lightweight demographic/context questions.
8. Optional approximate location consent.
9. Immediate personal result and aggregate comparison.
10. CTA to Explore Evolvable.

## Questions / Measures

### Free Text

Use both:

- “Please write a single word to describe how you’d like your life to have been.”
- “Please write a word or sentence to describe the most important value you live your life by.”

Free text can be stored raw.

Free text can be shown publicly only as anonymised aggregate fragments/word displays.

### Forced Choice

Use the old forced-choice list, with spelling corrected:

- Carefree
- Valuable
- Wealthy
- Meaningful
- Easy
- Useful
- Free
- Safe
- Diverse
- Authentic
- Healthy
- Inspired
- Tender
- Pleasurable
- Adventurous
- Without Fear
- Successful
- Wise
- Happy
- Other

If a participant chooses Other, their answer should become its own visible category rather than being grouped into a generic Other bucket.

### Last-Year Ratings

Rich decided to keep the old 2020-style dimensions but update the prompt to “the last year.”

Prompt direction:

“Compared with your usual life, in the last year did you feel...”

Ratings:

- Very much less
- Less
- Same
- More
- Very much more

Dimensions:

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

## Demographics / Context

Collect only:

- age band;
- gender;
- optional approximate browser location.

Age bands:

- Under 18
- 18-24
- 25-34
- 35-44
- 45-54
- 55-64
- 65+

Gender options:

- Woman
- Man
- Non-binary
- Prefer to self-describe
- Prefer not to say

Location copy should be lightweight and clear:

“Allow approximate browser location so your result can be compared geographically. We do not store your IP address.”

Do not store IP addresses. Rich only wants geographic inference.

No heavy GDPR flow was requested for V1.

## Results Page Intent

The results page should feel like a reflective reward, not a dashboard.

It should show:

- the participant’s selected category;
- how many people chose the same;
- overall distribution;
- gender split;
- age-band split if useful;
- geographic pattern if location data exists;
- last-year rating profile;
- anonymised free-text fragments/word cloud;
- live aggregate updates from the database;
- Explore Evolvable CTA.

Rich wants the results to discover whatever the live data shows, not force the old “Meaningful vs Happy” story.

Historical old-sheet reference: the old public result showed Meaningful and Happy as the strongest categories, followed by Without Fear, Authentic, Adventurous, Successful. That is context only, not something to bake in.

## Implementation So Far

A standalone Next.js app was built and moved to:

`/Users/admin/looking-back-experiment`

It uses:

- Next.js App Router;
- React / TypeScript;
- Recharts;
- Lucide icons;
- Postgres via `pg`;
- local in-memory preview store when `DATABASE_URL` is absent.

It includes:

- participant flow;
- live aggregate stats;
- admin page;
- Postgres schema;
- simple password admin auth.

The current project builds and lints from the moved project root.

Verified on 2026-06-02:

```bash
cd /Users/admin/looking-back-experiment
rm -rf .next
npm run build
npm run lint
```

Both passed.

The folder is not currently a Git repo.

## Deployment Direction

Deploy separately from the main Evolvable app.

Likely target:

- Railway app;
- new Railway Postgres database;
- domain/subdomain: `experiments.evolvable.com`.

Do not connect it into existing Evolvable production until Rich explicitly decides that.

Production env vars needed:

- `DATABASE_URL`
- `ADMIN_PASSWORD`
- `ADMIN_COOKIE_SECRET`

Database schema is in `schema.sql`.

## Current Risks / Things To Be Careful About

The app currently has `node_modules` and `.next` locally because it was built/tested. `.gitignore` excludes them.

Before serious work, initialize Git and commit the source cleanly.

Admin auth is simple and acceptable for V1, but should be reviewed before public launch.

The location display is simple; it is meant as V1 geographic context, not robust geospatial analysis.

The results page exists but can still be improved aesthetically and narratively. Keep changes aligned with the “reflective experience first” principle.

Dependency install previously reported moderate audit findings. Do not blindly run `npm audit fix --force`.

## Suggested Next Thread Prompt

When opening this as a Codex project, start with:

> Continue work on the Looking Back Experiment in `/Users/admin/looking-back-experiment`. Read `HANDOFF.md` first. This is a public reflective Evolvable experiment first and a data collection tool second. Preserve the current product decisions unless Rich changes them.

