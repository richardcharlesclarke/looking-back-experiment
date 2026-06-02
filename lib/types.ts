export type Ratings = Record<string, number>;

export type LocationSnapshot = {
  consent: boolean;
  latitude?: number;
  longitude?: number;
  accuracy?: number;
  timezone?: string;
  locale?: string;
};

export type SubmissionInput = {
  idealWord: string;
  guidingValue: string;
  lifeChoice: string;
  otherChoice?: string;
  ratings: Ratings;
  ageBand?: string;
  gender?: string;
  genderSelfDescription?: string;
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
  byGender: Record<string, ChoiceStat[]>;
  byAge: Record<string, ChoiceStat[]>;
  ratings: RatingStat[];
  words: string[];
  values: string[];
  locations: Array<{ latitude: number; longitude: number; choice: string }>;
};
