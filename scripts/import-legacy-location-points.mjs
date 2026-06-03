import fs from "node:fs";
import { Pool } from "pg";

const filePath = process.argv[2];

if (!filePath) {
  console.error("Usage: node scripts/import-legacy-location-points.mjs <sanitized-location-csv>");
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

function toNumber(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

const rows = parseCsv(fs.readFileSync(filePath, "utf8"));
const header = rows.shift();

if (!header || header.join(",") !== "source,source_row,captured_at_text,city,country,latitude,longitude") {
  console.error("Unexpected CSV header.");
  process.exit(1);
}

const points = rows
  .map(([source, sourceRow, capturedAtText, city, country, latitude, longitude]) => ({
    source,
    sourceRow: Number(sourceRow),
    capturedAtText: capturedAtText || null,
    city: city || null,
    country: country || null,
    latitude: toNumber(latitude),
    longitude: toNumber(longitude)
  }))
  .filter((point) =>
    point.source &&
    Number.isInteger(point.sourceRow) &&
    point.latitude != null &&
    point.longitude != null &&
    point.latitude >= -90 &&
    point.latitude <= 90 &&
    point.longitude >= -180 &&
    point.longitude <= 180
  );

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL.includes("localhost") || process.env.DATABASE_URL.includes("railway.internal")
    ? false
    : { rejectUnauthorized: false }
});

try {
  await pool.query(`
    create extension if not exists pgcrypto;

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
  `);

  for (const point of points) {
    await pool.query(
      `
        insert into legacy_location_points
          (source, source_row, captured_at_text, city, country, latitude, longitude)
        values ($1, $2, $3, $4, $5, $6, $7)
        on conflict (source, source_row)
        do update set
          captured_at_text = excluded.captured_at_text,
          city = excluded.city,
          country = excluded.country,
          latitude = excluded.latitude,
          longitude = excluded.longitude,
          imported_at = now()
      `,
      [
        point.source,
        point.sourceRow,
        point.capturedAtText,
        point.city,
        point.country,
        point.latitude,
        point.longitude
      ]
    );
  }

  const count = await pool.query(
    "select count(*)::int as count from legacy_location_points where source = $1",
    ["looking_back_live_ip_data"]
  );

  console.log(`Imported ${points.length} valid location points.`);
  console.log(`Stored ${count.rows[0].count} location points for looking_back_live_ip_data.`);
} finally {
  await pool.end();
}
