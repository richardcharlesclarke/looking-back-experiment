import fs from "node:fs";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;
const cohortSlug = process.env.SEED_COHORT_SLUG || "conference-2026";
const cohortLabel = process.env.SEED_COHORT_LABEL || "WMC2026 Conference";

if (!databaseUrl) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const dimensions = [
  "Stress",
  "Anxiety",
  "Loneliness",
  "Joy",
  "Fulfilment",
  "Creativity",
  "Achievement",
  "Uncertainty",
  "Loss",
  "Change",
  "Growth"
];

const demoRows = [
  {
    lifeChoice: "Meaningful",
    guidingValue: "curiosity",
    alignment: "Mostly",
    blocker: "fear",
    enabler: "community",
    ratings: [1, 0, -1, 2, 2, 1, 1, 1, -1, 2, 2],
    ageBand: "35-44",
    gender: "Woman",
    location: ["London", "England", "United Kingdom", "GB", 51.5072, -0.1276]
  },
  {
    lifeChoice: "Meaningful",
    guidingValue: "curiosity",
    alignment: "Completely",
    blocker: "time",
    enabler: "family",
    ratings: [0, -1, -1, 2, 2, 1, 1, 0, -2, 2, 2],
    ageBand: "45-54",
    gender: "Man",
    location: ["Perth", "Western Australia", "Australia", "AU", -31.9523, 115.8613]
  },
  {
    lifeChoice: "Meaningful",
    guidingValue: "curiosity",
    alignment: "Mostly",
    blocker: "fear",
    enabler: "community",
    ratings: [1, 0, -1, 1, 2, 1, 2, 1, -1, 2, 2],
    ageBand: "55-64",
    gender: "Woman",
    location: ["Toronto", "Ontario", "Canada", "CA", 43.6532, -79.3832]
  },
  {
    lifeChoice: "Authentic",
    guidingValue: "courage",
    alignment: "Somewhat",
    blocker: "pressure",
    enabler: "curiosity",
    ratings: [1, 0, -1, 1, 2, 2, 1, 1, -1, 2, 2],
    ageBand: "35-44",
    gender: "Non-binary",
    location: ["Denver", "Colorado", "United States", "US", 39.7392, -104.9903]
  },
  {
    lifeChoice: "Authentic",
    guidingValue: "courage",
    alignment: "Mostly",
    blocker: "time",
    enabler: "family",
    ratings: [0, -1, -2, 1, 2, 2, 1, 0, -1, 2, 2],
    ageBand: "45-54",
    gender: "Woman",
    location: ["Johannesburg", "Gauteng", "South Africa", "ZA", -26.2041, 28.0473]
  },
  {
    lifeChoice: "Without Fear",
    guidingValue: "connection",
    alignment: "Slightly",
    blocker: "fear",
    enabler: "curiosity",
    ratings: [2, 1, 0, 1, 1, 0, 0, 2, -1, 2, 2],
    ageBand: "25-34",
    gender: "Man",
    location: ["Santiago", "Santiago Metropolitan", "Chile", "CL", -33.4489, -70.6693]
  },
  {
    lifeChoice: "Happy",
    guidingValue: "connection",
    alignment: "Mostly",
    blocker: "pressure",
    enabler: "community",
    ratings: [-1, -1, -2, 2, 1, 1, 0, 0, -2, 1, 1],
    ageBand: "55-64",
    gender: "Prefer not to say",
    location: ["Stockholm", "Stockholm", "Sweden", "SE", 59.3293, 18.0686]
  },
  {
    lifeChoice: "Useful",
    guidingValue: "integrity",
    alignment: "Somewhat",
    blocker: "doubt",
    enabler: "discipline",
    ratings: [1, 0, -1, 1, 2, 1, 2, 1, -1, 1, 2],
    ageBand: "45-54",
    gender: "Man",
    location: ["Vancouver", "British Columbia", "Canada", "CA", 49.2827, -123.1207]
  },
  {
    lifeChoice: "Successful",
    guidingValue: "family",
    alignment: "Mostly",
    blocker: "work",
    enabler: "purpose",
    ratings: [2, 1, -1, 1, 1, 0, 2, 1, -1, 1, 1],
    ageBand: "35-44",
    gender: "Woman",
    location: ["London", "England", "United Kingdom", "GB", 51.5072, -0.1276]
  },
  {
    lifeChoice: "Free",
    guidingValue: "growth",
    alignment: "Completely",
    blocker: "expectation",
    enabler: "rest",
    ratings: [0, -1, -2, 2, 1, 1, 1, 0, -2, 2, 2],
    ageBand: "65+",
    gender: "Man",
    location: ["Perth", "Western Australia", "Australia", "AU", -31.9523, 115.8613]
  }
];

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes("localhost") ? false : { rejectUnauthorized: false }
});

try {
  await pool.query(fs.readFileSync("schema.sql", "utf8"));

  const deleted = await pool.query("delete from submissions where cohort_slug = $1", [cohortSlug]);

  for (const [index, row] of demoRows.entries()) {
    const [city, region, country, countryCode, latitude, longitude] = row.location;
    const ratings = Object.fromEntries(dimensions.map((dimension, ratingIndex) => [dimension, row.ratings[ratingIndex]]));

    await pool.query(
      `insert into submissions
        (ideal_word, guiding_value, alignment, blocker, enabler, life_choice, ratings, age_band, gender, cohort_slug, cohort_label,
         location_consent, latitude, longitude, accuracy, city, region, country, country_code, timezone, locale, location_source)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21)`,
      [
        row.lifeChoice,
        row.guidingValue,
        row.alignment,
        row.blocker,
        row.enabler,
        row.lifeChoice,
        JSON.stringify(ratings),
        row.ageBand,
        row.gender,
        cohortSlug,
        cohortLabel,
        latitude,
        longitude,
        50_000,
        city,
        region,
        country,
        countryCode,
        "Europe/London",
        "en-GB",
        "demo-seed",
      ]
    );
  }

  console.log(`Deleted ${deleted.rowCount} existing ${cohortSlug} submissions.`);
  console.log(`Seeded ${demoRows.length} demo ${cohortSlug} submissions.`);
} finally {
  await pool.end();
}
