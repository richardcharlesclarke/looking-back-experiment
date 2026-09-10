# Study Two persistent store

Single Node process, one Railway replica, dedicated `/study-two-data` volume. Do not scale this file-backed service to multiple writers. Startup refuses Railway operation if the configured directory is not its mounted volume.

`state.json` is written through a serial transaction queue: new temporary file, file fsync, atomic rename, directory fsync. Corrupt state fails closed; it is never silently replaced. Only SHA-256 hashes of random 256-bit participant keys are stored. The service has no public domain; the hub calls it through Railway's private network using a separate service secret. Health exposes store/process identities for persistence verification, never answers.

Records retain immutable panel and questionnaire snapshots, role and instrument IDs. Drafts use revision checks. Identical retries are idempotent; completed answers cannot be overwritten. The after form requires a completed before form. Prepared links do not start the questionnaire clock until the person begins. Exports require the hub's protected admin session and exclude private keys/hashes. All current records are marked as test records pending fieldwork information and permission to distribute.

Tests: `node --test store.test.mjs`. Canonical question source: `../../lib/study-two/instrument.ts`; regenerate the server module using `node scripts/sync-study-two-service.mjs` from the repository root.
