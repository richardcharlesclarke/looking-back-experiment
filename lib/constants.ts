export const LIFE_CHOICES = [
  "Carefree",
  "Valuable",
  "Wealthy",
  "Meaningful",
  "Easy",
  "Useful",
  "Free",
  "Safe",
  "Diverse",
  "Authentic",
  "Healthy",
  "Inspired",
  "Tender",
  "Pleasurable",
  "Adventurous",
  "Without Fear",
  "Successful",
  "Wise",
  "Happy",
  "Other"
] as const;

export const RATING_DIMENSIONS = [
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
] as const;

export const RATING_OPTIONS = [
  { label: "Very much less", value: -2 },
  { label: "Less", value: -1 },
  { label: "Same", value: 0 },
  { label: "More", value: 1 },
  { label: "Very much more", value: 2 }
] as const;

export const AGE_BANDS = ["Under 18", "18-24", "25-34", "35-44", "45-54", "55-64", "65+"] as const;

export const GENDERS = [
  "Woman",
  "Man",
  "Non-binary"
] as const;

export const EVOLVABLE_URL = "https://evolvable.me";
