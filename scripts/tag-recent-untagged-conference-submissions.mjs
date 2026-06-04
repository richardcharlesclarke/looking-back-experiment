import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const since = process.env.CONFERENCE_SUBMISSIONS_SINCE;
const cohortSlug = process.env.CONFERENCE_COHORT_SLUG || "conference-2026";
const cohortLabel = process.env.CONFERENCE_COHORT_LABEL || "Conference population";
const shouldUpdate = process.env.TAG_CONFERENCE_SUBMISSIONS === "1";

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (!since) {
  console.error("CONFERENCE_SUBMISSIONS_SINCE is required, for example 2026-06-04T09:00:00Z.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false }
});

const params = [since];
const whereClause = "created_at >= $1 and cohort_slug is null";

try {
  const preview = await pool.query(
    `
      select id, created_at, life_choice, ideal_word, guiding_value, age_band, gender, cohort_slug, cohort_label
      from submissions
      where ${whereClause}
      order by created_at desc
      limit 300
    `,
    params
  );

  console.table(preview.rows);
  console.log(`${preview.rowCount} recent untagged submissions matched.`);

  if (!shouldUpdate) {
    console.log("Dry run only. Set TAG_CONFERENCE_SUBMISSIONS=1 to tag these rows.");
    process.exit(0);
  }

  const updated = await pool.query(
    `
      update submissions
      set cohort_slug = $2,
          cohort_label = $3
      where ${whereClause}
    `,
    [...params, cohortSlug, cohortLabel]
  );
  console.log(`Tagged ${updated.rowCount} submissions as ${cohortSlug} (${cohortLabel}).`);
} finally {
  await pool.end();
}
