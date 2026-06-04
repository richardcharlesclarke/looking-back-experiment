import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const cohortSlug = process.env.CONFERENCE_COHORT_SLUG || "conference-2026";
const cohortLabel = process.env.CONFERENCE_COHORT_LABEL || "WMC2026 Conference Population";
const tagUntaggedSince = process.env.CONFERENCE_SUBMISSIONS_SINCE;
const shouldApply = process.env.APPLY_CONFERENCE_DATA_TIDY === "1";

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false }
});

try {
  const before = await pool.query(`
    select
      coalesce(cohort_slug, '(historic/untagged)') as cohort_slug,
      coalesce(cohort_label, '') as cohort_label,
      count(*)::int as count,
      min(created_at) as first_seen,
      max(created_at) as last_seen
    from submissions
    group by cohort_slug, cohort_label
    order by count desc, cohort_slug asc
  `);

  console.log("Current cohorts:");
  console.table(before.rows);

  if (tagUntaggedSince) {
    const candidates = await pool.query(
      `
        select id, created_at, life_choice, ideal_word, guiding_value, cohort_slug, cohort_label
        from submissions
        where cohort_slug is null
          and created_at >= $1
        order by created_at desc
        limit 300
      `,
      [tagUntaggedSince]
    );

    console.log(`Recent untagged rows to move into ${cohortSlug}:`);
    console.table(candidates.rows);

    if (shouldApply) {
      const tagged = await pool.query(
        `
          update submissions
          set cohort_slug = $2,
              cohort_label = $3
          where cohort_slug is null
            and created_at >= $1
        `,
        [tagUntaggedSince, cohortSlug, cohortLabel]
      );
      console.log(`Tagged ${tagged.rowCount} recent untagged submissions as ${cohortSlug}.`);
    }
  } else {
    console.log("CONFERENCE_SUBMISSIONS_SINCE not set, so untagged rows are treated as fixed historic population.");
  }

  const deleteCandidates = await pool.query(
    `
      select id, created_at, life_choice, ideal_word, guiding_value, cohort_slug, cohort_label
      from submissions
      where cohort_slug is not null
        and cohort_slug <> $1
      order by created_at desc
      limit 300
    `,
    [cohortSlug]
  );

  console.log(`Rows outside historic population and ${cohortSlug}:`);
  console.table(deleteCandidates.rows);

  if (!shouldApply) {
    console.log("Dry run only. Set APPLY_CONFERENCE_DATA_TIDY=1 to tag/delete these rows.");
    process.exit(0);
  }

  const deleted = await pool.query(
    `
      delete from submissions
      where cohort_slug is not null
        and cohort_slug <> $1
    `,
    [cohortSlug]
  );
  console.log(`Deleted ${deleted.rowCount} non-conference cohort submissions.`);

  const after = await pool.query(`
    select
      coalesce(cohort_slug, '(historic/untagged)') as cohort_slug,
      coalesce(cohort_label, '') as cohort_label,
      count(*)::int as count,
      min(created_at) as first_seen,
      max(created_at) as last_seen
    from submissions
    group by cohort_slug, cohort_label
    order by count desc, cohort_slug asc
  `);

  console.log("Remaining cohorts:");
  console.table(after.rows);
} finally {
  await pool.end();
}
