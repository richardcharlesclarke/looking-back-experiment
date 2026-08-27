import { Pool } from "pg";
import {
  CONFLICTBENCH_VERSION,
  deriveConflictBenchMeasures,
  type ConflictBenchResponses
} from "./conflictbench";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

export type StoredConflictBenchSubmission = {
  id: string;
  createdAt: string;
  questionnaireVersion: string;
  responses: ConflictBenchResponses;
  derivedMeasures: ReturnType<typeof deriveConflictBenchMeasures>;
};

const globalForConflictBench = globalThis as typeof globalThis & {
  conflictBenchMemoryStore?: StoredConflictBenchSubmission[];
};

const memoryStore = globalForConflictBench.conflictBenchMemoryStore ?? [];
globalForConflictBench.conflictBenchMemoryStore = memoryStore;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
  });
  return pool;
}

async function ensureSchema(db: Pool) {
  schemaReady ??= db.query(`
    create extension if not exists pgcrypto;

    create table if not exists conflictbench_submissions (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      questionnaire_version text not null,
      topic text not null,
      responses jsonb not null,
      derived_measures jsonb not null
    );

    create index if not exists conflictbench_submissions_created_at_idx
      on conflictbench_submissions (created_at desc);
    create index if not exists conflictbench_submissions_topic_idx
      on conflictbench_submissions (topic);
  `).then(() => undefined);
  await schemaReady;
}

export async function createConflictBenchSubmission(
  responses: ConflictBenchResponses
): Promise<StoredConflictBenchSubmission> {
  const normalized: ConflictBenchResponses = {
    ...responses,
    currentView: responses.currentView.trim(),
    opposingArgument: responses.opposingArgument.trim(),
    changedMindAbout: responses.changedMindAbout?.trim() || undefined
  };
  const derivedMeasures = deriveConflictBenchMeasures(normalized);
  const db = getPool();

  if (!db) {
    const submission = {
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      questionnaireVersion: CONFLICTBENCH_VERSION,
      responses: normalized,
      derivedMeasures
    };
    memoryStore.unshift(submission);
    return submission;
  }

  await ensureSchema(db);
  const result = await db.query(
    `insert into conflictbench_submissions
      (questionnaire_version, topic, responses, derived_measures)
     values ($1, $2, $3, $4)
     returning id, created_at`,
    [
      CONFLICTBENCH_VERSION,
      normalized.topic,
      JSON.stringify(normalized),
      JSON.stringify(derivedMeasures)
    ]
  );

  return {
    id: String(result.rows[0].id),
    createdAt: new Date(String(result.rows[0].created_at)).toISOString(),
    questionnaireVersion: CONFLICTBENCH_VERSION,
    responses: normalized,
    derivedMeasures
  };
}

function rowToConflictBenchSubmission(row: Record<string, unknown>): StoredConflictBenchSubmission {
  return {
    id: String(row.id),
    createdAt: new Date(String(row.created_at)).toISOString(),
    questionnaireVersion: String(row.questionnaire_version),
    responses: row.responses as ConflictBenchResponses,
    derivedMeasures: row.derived_measures as ReturnType<typeof deriveConflictBenchMeasures>
  };
}

export async function listConflictBenchSubmissions(): Promise<StoredConflictBenchSubmission[]> {
  const db = getPool();
  if (!db) return memoryStore;

  await ensureSchema(db);
  const result = await db.query(`
    select id, created_at, questionnaire_version, responses, derived_measures
    from conflictbench_submissions
    order by created_at desc
    limit 5000
  `);
  return result.rows.map(rowToConflictBenchSubmission);
}
