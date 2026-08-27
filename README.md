# Looking Back Experiment

A standalone Evolvable-style public reflective experiment.

The initiatives hub currently includes:

- `/looking-back`: the public Looking Back reflection.
- `/conflictbench`: the Brewfest pre-festival ConflictBench questionnaire.

ConflictBench stores responses separately in `conflictbench_submissions`. Its
placeholder Brewfest topics and position labels live in `lib/conflictbench.ts`.

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
