export const CONFLICTBENCH_VERSION = "brufest-pre-v0.1";

// Replace these placeholders once Brufest confirms its issue list and
// topic-specific bipolar endpoints. Keeping the content in one configuration
// block prevents placeholder research wording from leaking into the form logic.
export const BRUFEST_TOPICS = [
  {
    slug: "placeholder-topic-1",
    label: "[Placeholder] Brufest topic 1",
    positionLow: "Strongly favour position A",
    positionHigh: "Strongly favour position B"
  },
  {
    slug: "placeholder-topic-2",
    label: "[Placeholder] Brufest topic 2",
    positionLow: "Strongly favour position A",
    positionHigh: "Strongly favour position B"
  },
  {
    slug: "placeholder-topic-3",
    label: "[Placeholder] Brufest topic 3",
    positionLow: "Strongly favour position A",
    positionHigh: "Strongly favour position B"
  }
] as const;

export const PROFILE_DIMENSIONS = [
  { key: "openMinded", low: "Closed-minded", high: "Open-minded" },
  { key: "curious", low: "Dogmatic", high: "Curious" },
  { key: "reasonable", low: "Unreasonable", high: "Reasonable" },
  { key: "thoughtful", low: "Unthinking", high: "Thoughtful" },
  { key: "informed", low: "Uninformed", high: "Informed" },
  { key: "goodFaith", low: "Acting in bad faith", high: "Acting in good faith" },
  { key: "trustworthy", low: "Untrustworthy", high: "Trustworthy" },
  { key: "willingToListen", low: "Unwilling to listen", high: "Willing to listen" }
] as const;

export type ProfileKey = (typeof PROFILE_DIMENSIONS)[number]["key"];
export type ProfileRatings = Record<ProfileKey, number>;

export type ConflictBenchResponses = {
  topic: string;
  position: number;
  currentView: string;
  confidence: number;
  issueComplexity: number;
  legitimateConsiderations: number;
  reasonableDisagreement: number;
  opposingUnderstanding: number;
  opposingArgument: string;
  opponentProfile: ProfileRatings;
  selfProfile: ProfileRatings;
  selfOtherCloseness: number;
  selfOtherClosenessPosition: { x: number; y: number };
  willingnessConversation: number;
  interestInDisagreement: number;
  opennessToInfluence: number;
  willingnessToChange: number;
  changingMindSkill: number;
  changingMindIdentity: number;
  recallChangedMind: number;
  changedMindAbout?: string;
  influenceConversation: number;
  remainCurious: number;
  productiveWayForward: number;
};

export type ConflictBenchDerivedMeasures = {
  perceivedIssueComplexity: number;
  perceivedOpponentProfile: number;
  selfProfile: number;
  selfOtherProfileDistance: number;
  perceivedChangeability: number;
  conflictAgency: number;
};

function mean(values: number[]) {
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function rounded(value: number) {
  return Math.round(value * 100) / 100;
}

export function deriveConflictBenchMeasures(responses: ConflictBenchResponses): ConflictBenchDerivedMeasures {
  const opponentValues = PROFILE_DIMENSIONS.map(({ key }) => responses.opponentProfile[key]);
  const selfValues = PROFILE_DIMENSIONS.map(({ key }) => responses.selfProfile[key]);
  const squaredProfileDifferences = PROFILE_DIMENSIONS.map(({ key }) => {
    const difference = responses.selfProfile[key] - responses.opponentProfile[key];
    return difference * difference;
  });

  return {
    perceivedIssueComplexity: rounded(mean([
      responses.issueComplexity,
      responses.legitimateConsiderations,
      responses.reasonableDisagreement
    ])),
    perceivedOpponentProfile: rounded(mean(opponentValues)),
    selfProfile: rounded(mean(selfValues)),
    selfOtherProfileDistance: rounded(Math.sqrt(mean(squaredProfileDifferences))),
    perceivedChangeability: rounded(mean([
      responses.changingMindSkill,
      responses.changingMindIdentity,
      responses.recallChangedMind
    ])),
    conflictAgency: rounded(mean([
      responses.influenceConversation,
      responses.remainCurious,
      responses.productiveWayForward
    ]))
  };
}
