import { Pool } from "pg";
import { LIFE_CHOICES, RATING_DIMENSIONS } from "./constants";
import { mergeWithLegacy } from "./legacy";
import type { ChoiceStat, Stats, Submission, SubmissionInput } from "./types";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

const globalForStore = globalThis as typeof globalThis & {
  lookingBackMemoryStore?: Submission[];
};

const memoryStore = globalForStore.lookingBackMemoryStore ?? [];
globalForStore.lookingBackMemoryStore = memoryStore;

function getPool() {
  if (!process.env.DATABASE_URL) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DATABASE_URL.includes("localhost") ? false : { rejectUnauthorized: false }
    });
  }
  return pool;
}

async function ensureSchema(db: Pool) {
  schemaReady ??= db.query(`
    create extension if not exists pgcrypto;

    create table if not exists submissions (
      id uuid primary key default gen_random_uuid(),
      created_at timestamptz not null default now(),
      ideal_word text not null,
      guiding_value text not null,
      life_choice text not null,
      other_choice text,
      ratings jsonb not null,
      age_band text,
      gender text,
      location_consent boolean not null default false,
      latitude numeric,
      longitude numeric,
      accuracy numeric,
      timezone text,
      locale text
    );

    create index if not exists submissions_created_at_idx on submissions (created_at desc);
    create index if not exists submissions_life_choice_idx on submissions (life_choice);
    create index if not exists submissions_gender_idx on submissions (gender);
    create index if not exists submissions_age_band_idx on submissions (age_band);

    create table if not exists legacy_location_points (
      id uuid primary key default gen_random_uuid(),
      source text not null,
      source_row integer not null,
      captured_at_text text,
      city text,
      country text,
      latitude numeric not null,
      longitude numeric not null,
      imported_at timestamptz not null default now(),
      unique (source, source_row)
    );

    create index if not exists legacy_location_points_source_idx on legacy_location_points (source);
    create index if not exists legacy_location_points_country_idx on legacy_location_points (country);
  `).then(() => undefined);
  await schemaReady;
}

function normalizeChoice(input: SubmissionInput) {
  if (input.lifeChoice === "Other" && input.otherChoice?.trim()) return input.otherChoice.trim();
  return input.lifeChoice;
}

function rowToSubmission(row: Record<string, unknown>): Submission {
  const gender = String(row.gender ?? "");
  return {
    id: String(row.id),
    createdAt: new Date(String(row.created_at)).toISOString(),
    idealWord: String(row.ideal_word ?? ""),
    guidingValue: String(row.guiding_value ?? ""),
    lifeChoice: String(row.life_choice ?? ""),
    otherChoice: row.other_choice ? String(row.other_choice) : undefined,
    ratings: row.ratings as Record<string, number>,
    ageBand: row.age_band ? String(row.age_band) : undefined,
    gender,
    location: {
      consent: Boolean(row.location_consent),
      latitude: row.latitude == null ? undefined : Number(row.latitude),
      longitude: row.longitude == null ? undefined : Number(row.longitude),
      accuracy: row.accuracy == null ? undefined : Number(row.accuracy),
      timezone: row.timezone ? String(row.timezone) : undefined,
      locale: row.locale ? String(row.locale) : undefined
    }
  };
}

export async function createSubmission(input: SubmissionInput): Promise<Submission> {
  const normalized: SubmissionInput = {
    ...input,
    lifeChoice: normalizeChoice(input),
    idealWord: input.idealWord.trim(),
    guidingValue: input.guidingValue.trim(),
    otherChoice: input.otherChoice?.trim() || undefined
  };

  const db = getPool();
  if (!db) {
    const submission: Submission = {
      ...normalized,
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString()
    };
    memoryStore.unshift(submission);
    return submission;
  }

  await ensureSchema(db);
  const result = await db.query(
    `insert into submissions
      (ideal_word, guiding_value, life_choice, other_choice, ratings, age_band, gender,
       location_consent, latitude, longitude, accuracy, timezone, locale)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     returning *`,
    [
      normalized.idealWord,
      normalized.guidingValue,
      normalized.lifeChoice,
      normalized.otherChoice ?? null,
      JSON.stringify(normalized.ratings),
      normalized.ageBand ?? null,
      normalized.genderSelfDescription || normalized.gender || null,
      normalized.location.consent,
      normalized.location.latitude ?? null,
      normalized.location.longitude ?? null,
      normalized.location.accuracy ?? null,
      normalized.location.timezone ?? null,
      normalized.location.locale ?? null
    ]
  );
  return rowToSubmission(result.rows[0]);
}

export async function listSubmissions(): Promise<Submission[]> {
  const db = getPool();
  if (!db) return memoryStore;
  await ensureSchema(db);
  const result = await db.query("select * from submissions order by created_at desc limit 5000");
  return result.rows.map(rowToSubmission);
}

function distribution(items: Submission[], getter: (item: Submission) => string | undefined): ChoiceStat[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const value = getter(item)?.trim();
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const total = Array.from(counts.values()).reduce((sum, value) => sum + value, 0);
  return Array.from(counts.entries())
    .map(([choice, count]) => ({ choice, count, percent: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count);
}

function groupedChoiceStats(items: Submission[], groupBy: (item: Submission) => string | undefined) {
  const grouped: Record<string, Submission[]> = {};
  for (const item of items) {
    const key = groupBy(item)?.trim();
    if (!key) continue;
    grouped[key] = grouped[key] ?? [];
    grouped[key].push(item);
  }
  return Object.fromEntries(
    Object.entries(grouped).map(([key, group]) => [key, distribution(group, (item) => item.lifeChoice)])
  );
}

function approximateCoordinates(item: Submission) {
  if (item.location.latitude != null && item.location.longitude != null) {
    return { latitude: item.location.latitude, longitude: item.location.longitude };
  }

  const timezone = item.location.timezone;
  if (!timezone) return null;

  const timezoneCoordinates: Record<string, { latitude: number; longitude: number }> = {
    "Europe/London": { latitude: 51.5072, longitude: -0.1276 },
    "Europe/Dublin": { latitude: 53.3498, longitude: -6.2603 },
    "Europe/Paris": { latitude: 48.8566, longitude: 2.3522 },
    "Europe/Berlin": { latitude: 52.52, longitude: 13.405 },
    "America/New_York": { latitude: 40.7128, longitude: -74.006 },
    "America/Chicago": { latitude: 41.8781, longitude: -87.6298 },
    "America/Denver": { latitude: 39.7392, longitude: -104.9903 },
    "America/Los_Angeles": { latitude: 34.0522, longitude: -118.2437 }
  };

  return timezoneCoordinates[timezone] ?? null;
}

export function buildStats(items: Submission[]): Stats {
  const ratings = RATING_DIMENSIONS.map((dimension) => {
    const values = items
      .map((item) => item.ratings[dimension])
      .filter((value): value is number => typeof value === "number");
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return { dimension, average };
  });

  return {
    total: items.length,
    choices: distribution(items, (item) => item.lifeChoice || LIFE_CHOICES[0]),
    byGender: groupedChoiceStats(items, (item) => item.gender),
    byAge: groupedChoiceStats(items, (item) => item.ageBand),
    ratings,
    words: items.map((item) => item.idealWord).filter(Boolean).slice(0, 80),
    values: items.map((item) => item.guidingValue).filter(Boolean).slice(0, 80),
    locations: items
      .filter((item) => item.location.consent)
      .map((item) => {
        const coordinates = approximateCoordinates(item);
        if (!coordinates) return null;
        return {
          latitude: coordinates.latitude,
          longitude: coordinates.longitude,
          choice: item.lifeChoice
        };
      })
      .filter((item): item is { latitude: number; longitude: number; choice: string } => item != null)
  };
}

async function listLegacyLocationPoints() {
  const db = getPool();
  if (!db) return [];
  await ensureSchema(db);
  const result = await db.query(`
    select latitude, longitude
    from legacy_location_points
    where latitude between -90 and 90
      and longitude between -180 and 180
    order by source_row asc
    limit 5000
  `);
  return result.rows.map((row) => ({
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    choice: "Legacy participant"
  }));
}

export async function getStats(options: { includeLegacy?: boolean } = {}) {
  const current = buildStats(await listSubmissions());
  const stats = options.includeLegacy ? mergeWithLegacy(current) : current;
  if (!options.includeLegacy) return stats;
  const legacyLocations = await listLegacyLocationPoints();
  return {
    ...stats,
    locations: [...stats.locations, ...legacyLocations]
  };
}
