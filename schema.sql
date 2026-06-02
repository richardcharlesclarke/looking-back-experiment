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
