import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const since = process.env.TEST_SUBMISSIONS_SINCE;
const cohortSlug = process.env.TEST_COHORT_SLUG;
const shouldDelete = process.env.DELETE_TEST_SUBMISSIONS === "1";

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

if (!since) {
  console.error("TEST_SUBMISSIONS_SINCE is required, for example 2026-06-04T09:00:00Z.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false }
});

const predicates = ["created_at >= $1"];
const params = [since];

if (cohortSlug) {
  params.push(cohortSlug);
  predicates.push(`cohort_slug = $${params.length}`);
} else {
  predicates.push(`(
    cohort_slug in ('test', 'dev', 'local', 'screen-preview')
    or ideal_word ilike '%test%'
    or guiding_value ilike '%test%'
    or other_choice ilike '%test%'
  )`);
}

const whereClause = predicates.join(" and ");

try {
  const preview = await pool.query(
    `
      select id, created_at, life_choice, ideal_word, guiding_value, age_band, gender, cohort_slug, cohort_label
      from submissions
      where ${whereClause}
      order by created_at desc
      limit 200
    `,
    params
  );

  console.table(preview.rows);
  console.log(`${preview.rowCount} candidate test submissions matched.`);

  if (!shouldDelete) {
    console.log("Dry run only. Set DELETE_TEST_SUBMISSIONS=1 to delete these matched rows.");
    process.exit(0);
  }

  const deleted = await pool.query(`delete from submissions where ${whereClause}`, params);
  console.log(`Deleted ${deleted.rowCount} submissions.`);
} finally {
  await pool.end();
}
