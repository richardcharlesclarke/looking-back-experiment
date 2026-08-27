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
