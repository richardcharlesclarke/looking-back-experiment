const baseUrl = process.env.SEED_BASE_URL || "http://localhost:3000";
const cohortSlug = process.env.SEED_COHORT_SLUG || "conference-2026";
const cohortLabel = process.env.SEED_COHORT_LABEL || "WMC2026 Conference";

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

const choices = [
  ["Happy", 6],
  ["Authentic", 5],
  ["Meaningful", 3],
  ["Free", 3],
  ["Without Fear", 2],
  ["Adventurous", 2],
  ["Healthy", 1]
];

const ratingPatterns = {
  Happy: [-1, -1, -1, 2, 2, 1, 1, 0, -1, 1, 2],
  Authentic: [0, 0, -1, 1, 2, 2, 1, 1, -1, 2, 2],
  Meaningful: [1, 0, 0, 1, 2, 1, 2, 1, 0, 1, 2],
  Free: [-1, -1, -1, 2, 1, 1, 0, 0, -1, 2, 1],
  "Without Fear": [-2, -2, -1, 1, 1, 0, 0, -1, -1, 1, 1],
  Adventurous: [0, 0, 0, 2, 1, 2, 1, 1, 0, 2, 2],
  Healthy: [-1, -1, -1, 1, 1, 0, 0, 0, -1, 1, 1]
};

const locations = [
  ["London", "GB", 51.5072, -0.1276],
  ["Manchester", "GB", 53.4808, -2.2426],
  ["Birmingham", "GB", 52.4862, -1.8904],
  ["Edinburgh", "GB", 55.9533, -3.1883],
  ["Dublin", "IE", 53.3498, -6.2603],
  ["Amsterdam", "NL", 52.3676, 4.9041],
  ["Berlin", "DE", 52.52, 13.405],
  ["Paris", "FR", 48.8566, 2.3522],
  ["Madrid", "ES", 40.4168, -3.7038],
  ["Lisbon", "PT", 38.7223, -9.1393],
  ["New York", "US", 40.7128, -74.006],
  ["Boston", "US", 42.3601, -71.0589],
  ["Toronto", "CA", 43.6532, -79.3832],
  ["Cape Town", "ZA", -33.9249, 18.4241],
  ["Tel Aviv", "IL", 32.0853, 34.7818],
  ["Melbourne", "AU", -37.8136, 144.9631],
  ["Sydney", "AU", -33.8688, 151.2093],
  ["Mexico City", "MX", 19.4326, -99.1332],
  ["Sao Paulo", "BR", -23.5558, -46.6396],
  ["Athens", "GR", 37.9838, 23.7275],
  ["Warsaw", "PL", 52.2297, 21.0122],
  ["Rome", "IT", 41.9028, 12.4964]
];

let submitted = 0;
for (const [choice, count] of choices) {
  for (let index = 0; index < count; index++) {
    const [city, countryCode, latitude, longitude] = locations[submitted % locations.length];
    const ratings = Object.fromEntries(
      dimensions.map((dimension, ratingIndex) => [dimension, ratingPatterns[choice][ratingIndex]])
    );
    const response = await fetch(`${baseUrl}/api/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idealWord: `conference-test-${choice.toLowerCase().replaceAll(" ", "-")}-${index + 1}`,
        guidingValue: "conference test data",
        lifeChoice: choice,
        ratings,
        ageBand: "35-44",
        gender: "",
        cohortSlug,
        cohortLabel,
        location: {
          consent: true,
          latitude,
          longitude,
          city,
          countryCode,
          source: "seed"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`${response.status} ${await response.text()}`);
    }
    submitted++;
  }
}

console.log(`Seeded ${submitted} conference test submissions with location data.`);
