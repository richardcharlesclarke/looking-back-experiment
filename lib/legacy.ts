import { RATING_DIMENSIONS } from "./constants";
import type { ChoiceStat, RatingStat, Stats } from "./types";

const legacyChoices = [
  ["Meaningful", 145],
  ["Happy", 137],
  ["Without Fear", 72],
  ["Authentic", 65],
  ["Adventurous", 63],
  ["Successful", 58],
  ["Free", 40],
  ["Wise", 33],
  ["Valuable", 32],
  ["Healthy", 28],
  ["Inspired", 28],
  ["Wealthy", 23],
  ["Useful", 19],
  ["Diverse", 18],
  ["Pleasurable", 16],
  ["Safe", 16],
  ["Carefree", 15],
  ["Easy", 9],
  ["As it is", 1],
  ["Purposeful", 1],
  ["Kind", 1],
  ["the same is was", 1],
  ["Realizzato", 1],
  ["I accept my past lives :)", 1],
  ["Productive", 1],
  ["less complicated", 1]
] as const;

const menChoices = [
  ["Meaningful", 59],
  ["Happy", 45],
  ["Without Fear", 24],
  ["Authentic", 20],
  ["Adventurous", 34],
  ["Successful", 30],
  ["Free", 10],
  ["Wise", 20],
  ["Valuable", 17],
  ["Healthy", 11],
  ["Inspired", 15],
  ["Wealthy", 11],
  ["Useful", 10],
  ["Diverse", 9],
  ["Pleasurable", 7],
  ["Safe", 8],
  ["Carefree", 5],
  ["Easy", 3],
  ["As it is", 1],
  ["Purposeful", 1],
  ["Realizzato", 1],
  ["Productive", 1]
] as const;

const womenChoices = [
  ["Meaningful", 79],
  ["Happy", 88],
  ["Without Fear", 42],
  ["Authentic", 43],
  ["Adventurous", 28],
  ["Successful", 26],
  ["Free", 27],
  ["Wise", 12],
  ["Valuable", 15],
  ["Healthy", 17],
  ["Inspired", 13],
  ["Wealthy", 11],
  ["Useful", 9],
  ["Diverse", 8],
  ["Pleasurable", 9],
  ["Safe", 8],
  ["Carefree", 10],
  ["Easy", 6],
  ["Kind", 1],
  ["the same is was", 1],
  ["I accept my past lives :)", 1],
  ["less complicated", 1]
] as const;

const legacyRatingByGender: Record<string, { men: number; women: number }> = {
  Uncertainty: { men: 1.706744868, women: 2.544052863 },
  Change: { men: 1.644117647, women: 2.103752759 },
  Stress: { men: 1.198830409, women: 1.982339956 },
  Anxiety: { men: 0.7046783626, women: 1.594713656 },
  Growth: { men: 1.020527859, women: 1.326710817 },
  Creativity: { men: 0.5221238938, women: 0.6850220264 },
  Joy: { men: 0.4035087719, women: 0.4392935982 },
  Achievement: { men: 0.284457478, women: 0.4008810573 },
  Fulfilment: { men: 0.08875739645, women: -0.002202643172 },
  Loneliness: { men: -0.2514619883, women: 0.002207505519 },
  Loss: { men: -0.7882352941, women: -0.09251101322 }
};

const legacyLocations = [
  ["US", 39.8283, -98.5795],
  ["GB", 54.7024, -3.2766],
  ["IL", 31.0461, 34.8516],
  ["PL", 51.9194, 19.1451],
  ["ZA", -30.5595, 22.9375],
  ["PT", 39.3999, -8.2245],
  ["GR", 39.0742, 21.8243],
  ["DE", 51.1657, 10.4515],
  ["IT", 41.8719, 12.5674],
  ["MX", 23.6345, -102.5528],
  ["ES", 40.4637, -3.7492],
  ["FR", 46.2276, 2.2137],
  ["CA", 56.1304, -106.3468],
  ["AU", -25.2744, 133.7751],
  ["BR", -14.235, -51.9253]
] as const;

function choiceStats(rows: readonly (readonly [string, number])[]): ChoiceStat[] {
  const total = rows.reduce((sum, [, count]) => sum + count, 0);
  return rows
    .filter(([, count]) => count > 0)
    .map(([choice, count]) => ({ choice, count, percent: total ? count / total : 0 }));
}

function total(rows: readonly (readonly [string, number])[]) {
  return rows.reduce((sum, [, count]) => sum + count, 0);
}

const menTotal = total(menChoices);
const womenTotal = total(womenChoices);

export const LEGACY_STATS: Stats = {
  total: total(legacyChoices),
  choices: choiceStats(legacyChoices),
  byGender: {
    Man: choiceStats(menChoices),
    Woman: choiceStats(womenChoices)
  },
  byAge: {},
  ratings: RATING_DIMENSIONS.map((dimension): RatingStat => {
    const value = legacyRatingByGender[dimension];
    if (!value) return { dimension, average: 0 };
    return {
      dimension,
      average: (value.men * menTotal + value.women * womenTotal) / (menTotal + womenTotal)
    };
  }),
  words: legacyChoices.map(([choice]) => choice),
  values: [],
  locations: legacyLocations.map(([country, latitude, longitude]) => ({
    latitude,
    longitude,
    choice: `Legacy ${country}`
  }))
};

function mergeChoiceStats(current: ChoiceStat[], legacy: ChoiceStat[]): ChoiceStat[] {
  const counts = new Map<string, number>();
  for (const item of [...current, ...legacy]) {
    counts.set(item.choice, (counts.get(item.choice) ?? 0) + item.count);
  }
  const mergedTotal = Array.from(counts.values()).reduce((sum, count) => sum + count, 0);
  return Array.from(counts.entries())
    .map(([choice, count]) => ({ choice, count, percent: mergedTotal ? count / mergedTotal : 0 }))
    .sort((a, b) => b.count - a.count);
}

function mergeGrouped(
  current: Record<string, ChoiceStat[]>,
  legacy: Record<string, ChoiceStat[]>
): Record<string, ChoiceStat[]> {
  const groups = new Set([...Object.keys(current), ...Object.keys(legacy)]);
  return Object.fromEntries(
    Array.from(groups).map((group) => [group, mergeChoiceStats(current[group] ?? [], legacy[group] ?? [])])
  );
}

export function mergeWithLegacy(current: Stats): Stats {
  const total = current.total + LEGACY_STATS.total;
  return {
    total,
    choices: mergeChoiceStats(current.choices, LEGACY_STATS.choices),
    byGender: mergeGrouped(current.byGender, LEGACY_STATS.byGender),
    byAge: current.byAge,
    ratings: RATING_DIMENSIONS.map((dimension): RatingStat => {
      const currentRating = current.ratings.find((item) => item.dimension === dimension)?.average ?? 0;
      const legacyRating = LEGACY_STATS.ratings.find((item) => item.dimension === dimension)?.average ?? 0;
      return {
        dimension,
        average: total ? (currentRating * current.total + legacyRating * LEGACY_STATS.total) / total : 0
      };
    }),
    words: [...current.words, ...LEGACY_STATS.words],
    values: current.values,
    locations: [...current.locations, ...LEGACY_STATS.locations]
  };
}
