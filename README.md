# Looking Back Experiment

A standalone Evolvable-style public reflective experiment.

The initiatives hub currently includes:

- `/looking-back`: the public Looking Back reflection.
- `/conflictbench`: the Brufest pre-festival ConflictBench questionnaire.

ConflictBench stores responses separately in `conflictbench_submissions`. Its
placeholder Brufest topics and position labels live in `lib/conflictbench.ts`.

For project context and product decisions, read `HANDOFF.md`.

## Local Preview

```bash
npm install
npm run dev
```

Without `DATABASE_URL`, the app uses an in-memory preview store. For production, create a Postgres database and apply `schema.sql`.

## Environment

Copy `.env.example` to `.env.local` and set:

- `DATABASE_URL`: Postgres connection string.
- `ADMIN_PASSWORD`: password for `/admin`.
- `ADMIN_COOKIE_SECRET`: long random string used to sign the admin cookie.

## Database

Apply:

```bash
psql "$DATABASE_URL" -f schema.sql
```

## Study Two speaker release

The speaker study at `/study-two/speaker/before` collects the approved 21 before /
25 after responses after explicit research consent. Returning historical links
create a separate consented pair; historical answers and acknowledgements remain
unchanged. Participants can withdraw through their private link. Research records
expire after 30 September 2027; Beau Lotto is the participant contact. Recording
permission is separate. The audience home-page entry remains inactive.

Study Two uses the separate `study-two-store` service and its persistent volume,
not the preview store described above. The Railway `looking-back` environment
builds both `app` and `study-two-store` from GitHub branch `looking-back`. Verify
both deployments and `/study-two/api` after an authorised release.
