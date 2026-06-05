import { Pool } from "pg";
import { LIFE_CHOICES, RATING_DIMENSIONS } from "./constants";
import { mergeWithLegacy } from "./legacy";
import type { ChoiceStat, CohortComparison, Stats, Submission, SubmissionInput } from "./types";

let pool: Pool | null = null;
let schemaReady: Promise<void> | null = null;

const globalForStore = globalThis as typeof globalThis & {
  lookingBackMemoryStore?: Submission[];
};

const memoryStore = globalForStore.lookingBackMemoryStore ?? [];
globalForStore.lookingBackMemoryStore = memoryStore;

const FAKE_CONFERENCE_COHORT_SLUG = "conference-2026";
const FAKE_CONFERENCE_COHORT_LABEL = "WMC2026 Conference";

const FAKE_CONFERENCE_CHOICES = [
  "Meaningful", "Meaningful", "Meaningful",
  "Authentic", "Authentic",
  "Without Fear", "Happy", "Useful", "Successful", "Free",
  "Meaningful", "Meaningful", "Meaningful", "Meaningful", "Meaningful",
  "Authentic", "Authentic", "Authentic", "Authentic",
  "Without Fear", "Without Fear", "Without Fear", "Without Fear", "Without Fear",
  "Happy", "Happy", "Happy", "Happy", "Happy",
  "Useful", "Useful", "Useful", "Useful",
  "Wise", "Wise", "Wise",
  "Successful", "Successful", "Successful",
  "Adventurous", "Adventurous", "Free", "Free", "Healthy", "Valuable", "Inspired", "Safe"
];

const FAKE_CONFERENCE_VALUES = [
  "curiosity", "curiosity", "curiosity",
  "courage", "courage",
  "connection", "connection",
  "integrity", "family", "growth",
  "curiosity", "curiosity", "curiosity", "curiosity", "curiosity", "curiosity",
  "courage", "courage", "courage", "courage", "courage",
  "connection", "connection", "connection", "connection", "connection", "connection",
  "integrity", "integrity", "integrity", "integrity", "integrity",
  "family", "family", "family", "family",
  "growth", "growth", "growth", "growth",
  "kindness", "kindness", "kindness",
  "freedom", "freedom", "freedom",
  "purpose", "purpose", "service", "service", "trust", "trust",
  "resilience", "presence", "play", "learning", "fairness", "optimism"
];

const FAKE_CONFERENCE_BLOCKERS = [
  "fear", "fear", "fear",
  "time", "time",
  "pressure", "pressure",
  "doubt", "work", "expectation",
  "fear", "fear", "fear", "fear",
  "time", "time", "time", "time",
  "pressure", "pressure", "pressure", "pressure",
  "doubt", "doubt", "doubt", "doubt",
  "work", "work", "work",
  "expectation", "expectation", "expectation",
  "fatigue", "fatigue",
  "habit", "habit",
  "noise", "perfection", "responsibility", "distance", "uncertainty", "comparison"
];

const FAKE_CONFERENCE_ENABLERS = [
  "community", "community", "community",
  "family", "family",
  "curiosity", "curiosity",
  "discipline", "purpose", "rest",
  "community", "community", "community",
  "family", "family", "family",
  "curiosity", "curiosity", "curiosity",
  "discipline", "discipline", "discipline",
  "purpose", "purpose", "purpose",
  "rest", "rest", "rest",
  "optimism", "optimism",
  "attention", "attention",
  "practice", "practice",
  "love", "clarity", "mentors", "friends", "nature", "conversation"
];

const FAKE_CONFERENCE_GENDERS = [
  "Woman", "Man", "Woman", "Man", "Woman", "Man", "Non-binary", "Prefer not to say"
];

const FAKE_CONFERENCE_AGE_BANDS = [
  "25-34", "35-44", "35-44", "45-54", "45-54", "55-64", "55-64", "65+"
];

const FAKE_CONFERENCE_LOCATIONS = [
  { city: "London", region: "England", country: "United Kingdom", countryCode: "GB", latitude: 51.5072, longitude: -0.1276 },
  { city: "Perth", region: "Western Australia", country: "Australia", countryCode: "AU", latitude: -31.9523, longitude: 115.8613 },
  { city: "Toronto", region: "Ontario", country: "Canada", countryCode: "CA", latitude: 43.6532, longitude: -79.3832 },
  { city: "Denver", region: "Colorado", country: "United States", countryCode: "US", latitude: 39.7392, longitude: -104.9903 },
  { city: "Johannesburg", region: "Gauteng", country: "South Africa", countryCode: "ZA", latitude: -26.2041, longitude: 28.0473 },
  { city: "Santiago", region: "Santiago Metropolitan", country: "Chile", countryCode: "CL", latitude: -33.4489, longitude: -70.6693 },
  { city: "Stockholm", region: "Stockholm", country: "Sweden", countryCode: "SE", latitude: 59.3293, longitude: 18.0686 },
  { city: "Vancouver", region: "British Columbia", country: "Canada", countryCode: "CA", latitude: 49.2827, longitude: -123.1207 }
];

const FAKE_RATING_BASE: Record<string, number> = {
  Stress: 1,
  Anxiety: 0,
  Loneliness: -1,
  Joy: 1,
  Fulfilment: 1,
  Creativity: 1,
  Achievement: 1,
  Uncertainty: 1,
  Loss: -1,
  Change: 2,
  Growth: 2
};

const FAKE_CHOICE_RATING_BIAS: Record<string, Partial<Record<string, number>>> = {
  "Without Fear": { Stress: 1, Anxiety: 1, Uncertainty: 1, Growth: 1 },
  Meaningful: { Fulfilment: 1, Growth: 1, Joy: 1 },
  Authentic: { Creativity: 1, Fulfilment: 1 },
  Happy: { Joy: 1, Loneliness: 1, Stress: -1 },
  Useful: { Achievement: 1, Fulfilment: 1 },
  Successful: { Achievement: 1, Stress: 1 },
  Healthy: { Stress: -1, Anxiety: -1, Joy: 1 }
};

function seedFakeConferenceData() {
  if (process.env.DATABASE_URL) return;

  for (let index = memoryStore.length - 1; index >= 0; index--) {
    if (memoryStore[index]?.cohortSlug === FAKE_CONFERENCE_COHORT_SLUG) {
      memoryStore.splice(index, 1);
    }
  }

  for (let index = 0; index < 10; index++) {
    const lifeChoice = FAKE_CONFERENCE_CHOICES[index % FAKE_CONFERENCE_CHOICES.length];
    const location = FAKE_CONFERENCE_LOCATIONS[index % FAKE_CONFERENCE_LOCATIONS.length];
    memoryStore.push({
      id: `fake-conference-${index + 1}`,
      createdAt: new Date(Date.UTC(2026, 5, 5, 8 + Math.floor(index / 12), (index % 12) * 5)).toISOString(),
      idealWord: lifeChoice,
      guidingValue: FAKE_CONFERENCE_VALUES[index % FAKE_CONFERENCE_VALUES.length],
      alignment: fakeAlignment(index, lifeChoice),
      blocker: FAKE_CONFERENCE_BLOCKERS[index % FAKE_CONFERENCE_BLOCKERS.length],
      enabler: FAKE_CONFERENCE_ENABLERS[index % FAKE_CONFERENCE_ENABLERS.length],
      lifeChoice,
      ratings: fakeRatings(index, lifeChoice),
      ageBand: FAKE_CONFERENCE_AGE_BANDS[index % FAKE_CONFERENCE_AGE_BANDS.length],
      gender: FAKE_CONFERENCE_GENDERS[index % FAKE_CONFERENCE_GENDERS.length],
      cohortSlug: FAKE_CONFERENCE_COHORT_SLUG,
      cohortLabel: FAKE_CONFERENCE_COHORT_LABEL,
      location: {
        consent: index % 5 !== 0,
        ...location,
        accuracy: 50_000,
        timezone: "Europe/London",
        locale: "en-GB",
        source: "fake-conference-seed"
      }
    });
  }
}

function fakeAlignment(index: number, lifeChoice: string) {
  if (lifeChoice === "Without Fear") return index % 3 === 0 ? "Slightly" : "Somewhat";
  if (lifeChoice === "Successful") return index % 4 === 0 ? "Completely" : "Mostly";
  return ["Somewhat", "Mostly", "Mostly", "Completely"][index % 4];
}

function fakeRatings(index: number, lifeChoice: string) {
  return Object.fromEntries(
    RATING_DIMENSIONS.map((dimension, dimensionIndex) => {
      const variation = ((index + dimensionIndex * 2) % 5) - 2;
      const subtleVariation = variation > 0 ? 0 : variation < 0 ? -1 : 0;
      const base = FAKE_RATING_BASE[dimension] ?? 0;
      const bias = FAKE_CHOICE_RATING_BIAS[lifeChoice]?.[dimension] ?? 0;
      return [dimension, Math.min(Math.max(base + bias + subtleVariation, -2), 2)];
    })
  );
}

seedFakeConferenceData();

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
      alignment text,
      blocker text,
      enabler text,
      life_choice text not null,
      other_choice text,
      ratings jsonb not null,
      age_band text,
      gender text,
      cohort_slug text,
      cohort_label text,
      location_consent boolean not null default false,
      latitude numeric,
      longitude numeric,
      accuracy numeric,
      city text,
      region text,
      country text,
      country_code text,
      timezone text,
      locale text,
      location_source text
    );

    alter table submissions add column if not exists city text;
    alter table submissions add column if not exists region text;
    alter table submissions add column if not exists country text;
    alter table submissions add column if not exists country_code text;
    alter table submissions add column if not exists location_source text;
    alter table submissions add column if not exists cohort_slug text;
    alter table submissions add column if not exists cohort_label text;
    alter table submissions add column if not exists alignment text;
    alter table submissions add column if not exists blocker text;
    alter table submissions add column if not exists enabler text;

    create index if not exists submissions_created_at_idx on submissions (created_at desc);
    create index if not exists submissions_life_choice_idx on submissions (life_choice);
    create index if not exists submissions_gender_idx on submissions (gender);
    create index if not exists submissions_age_band_idx on submissions (age_band);
    create index if not exists submissions_cohort_slug_idx on submissions (cohort_slug);

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
    alignment: String(row.alignment ?? ""),
    blocker: String(row.blocker ?? ""),
    enabler: String(row.enabler ?? ""),
    lifeChoice: String(row.life_choice ?? ""),
    otherChoice: row.other_choice ? String(row.other_choice) : undefined,
    ratings: row.ratings as Record<string, number>,
    ageBand: row.age_band ? String(row.age_band) : undefined,
    gender,
    cohortSlug: row.cohort_slug ? String(row.cohort_slug) : undefined,
    cohortLabel: row.cohort_label ? String(row.cohort_label) : undefined,
    location: {
      consent: Boolean(row.location_consent),
      latitude: row.latitude == null ? undefined : Number(row.latitude),
      longitude: row.longitude == null ? undefined : Number(row.longitude),
      accuracy: row.accuracy == null ? undefined : Number(row.accuracy),
      city: row.city ? String(row.city) : undefined,
      region: row.region ? String(row.region) : undefined,
      country: row.country ? String(row.country) : undefined,
      countryCode: row.country_code ? String(row.country_code) : undefined,
      timezone: row.timezone ? String(row.timezone) : undefined,
      locale: row.locale ? String(row.locale) : undefined,
      source: row.location_source ? String(row.location_source) : undefined
    }
  };
}

export async function createSubmission(input: SubmissionInput): Promise<Submission> {
  const normalized: SubmissionInput = {
    ...input,
    lifeChoice: normalizeChoice(input),
    idealWord: input.idealWord.trim(),
    guidingValue: input.guidingValue.trim(),
    alignment: input.alignment.trim(),
    blocker: input.blocker.trim(),
    enabler: input.enabler.trim(),
    otherChoice: input.otherChoice?.trim() || undefined,
    cohortSlug: input.cohortSlug?.trim() || undefined,
    cohortLabel: input.cohortLabel?.trim() || undefined
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
      (ideal_word, guiding_value, alignment, blocker, enabler, life_choice, other_choice, ratings, age_band, gender, cohort_slug, cohort_label,
       location_consent, latitude, longitude, accuracy, city, region, country, country_code, timezone, locale, location_source)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
     returning *`,
    [
      normalized.idealWord,
      normalized.guidingValue,
      normalized.alignment,
      normalized.blocker,
      normalized.enabler,
      normalized.lifeChoice,
      normalized.otherChoice ?? null,
      JSON.stringify(normalized.ratings),
      normalized.ageBand ?? null,
      normalized.genderSelfDescription || normalized.gender || null,
      normalized.cohortSlug ?? null,
      normalized.cohortLabel ?? null,
      normalized.location.consent,
      normalized.location.latitude ?? null,
      normalized.location.longitude ?? null,
      normalized.location.accuracy ?? null,
      normalized.location.city ?? null,
      normalized.location.region ?? null,
      normalized.location.country ?? null,
      normalized.location.countryCode ?? null,
      normalized.location.timezone ?? null,
      normalized.location.locale ?? null,
      normalized.location.source ?? null
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

  return null;
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
    blockers: items.map((item) => item.blocker).filter(Boolean).slice(0, 80),
    enablers: items.map((item) => item.enabler).filter(Boolean).slice(0, 80),
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

function buildCohortComparison(
  items: Submission[],
  cohortSlug: string,
  cohortLabel: string,
  includeLegacy: boolean
): CohortComparison {
  const currentPopulation = items.filter((item) => !item.cohortSlug);
  const cohort = items.filter((item) => item.cohortSlug === cohortSlug);
  const populationStats = includeLegacy ? mergeWithLegacy(buildStats(currentPopulation)) : buildStats([]);
  const cohortStats = buildStats(cohort);

  return {
    populationLabel: "Historic Data",
    cohortLabel,
    populationTotal: populationStats.total,
    cohortTotal: cohort.length,
    population: populationStats.choices,
    cohort: cohortStats.choices,
    populationRatings: includeLegacy ? populationStats.ratings : [],
    cohortRatings: cohortStats.ratings
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

export async function getStats(options: { includeLegacy?: boolean; cohortSlug?: string; cohortLabel?: string } = {}) {
  const submissions = await listSubmissions();
  const current = buildStats(submissions);
  const stats = options.includeLegacy ? mergeWithLegacy(current) : current;
  const cohortSlug = options.cohortSlug?.trim();
  const cohortComparison = cohortSlug
    ? buildCohortComparison(submissions, cohortSlug, options.cohortLabel?.trim() || "WMC2026 Conference", Boolean(options.includeLegacy))
    : undefined;
  const statsWithComparison = cohortComparison ? { ...stats, cohortComparison } : stats;
  if (!options.includeLegacy) return statsWithComparison;
  const legacyLocations = await listLegacyLocationPoints();
  return {
    ...statsWithComparison,
    locations: [...statsWithComparison.locations, ...legacyLocations]
  };
}
