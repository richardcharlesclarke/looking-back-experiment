export type Ratings = Record<string, number>;

export type LocationSnapshot = {
  consent: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  city?: string;
  region?: string;
  country?: string;
  countryCode?: string;
  timezone?: string;
  locale?: string;
  source?: string;
};

export type SubmissionInput = {
  idealWord: string;
  guidingValue: string;
  alignment: string;
  blocker: string;
  enabler: string;
  lifeChoice: string;
  otherChoice?: string;
  ratings: Ratings;
  ageBand?: string;
  gender?: string;
  genderSelfDescription?: string;
  cohortSlug?: string;
  cohortLabel?: string;
  location: LocationSnapshot;
};

export type Submission = SubmissionInput & {
  id: string;
  createdAt: string;
};

export type ChoiceStat = {
  choice: string;
  count: number;
  percent: number;
};

export type RatingStat = {
  dimension: string;
  average: number;
};

export type Stats = {
  total: number;
  choices: ChoiceStat[];
  cohortComparison?: CohortComparison;
  byGender: Record<string, ChoiceStat[]>;
  byAge: Record<string, ChoiceStat[]>;
  ratings: RatingStat[];
  words: string[];
  values: string[];
  blockers: string[];
  enablers: string[];
  locations: Array<{ latitude: number; longitude: number; choice: string }>;
};

export type CohortComparison = {
  populationLabel: string;
  cohortLabel: string;
  populationTotal: number;
  cohortTotal: number;
  population: ChoiceStat[];
  cohort: ChoiceStat[];
  populationRatings: RatingStat[];
  cohortRatings: RatingStat[];
};
