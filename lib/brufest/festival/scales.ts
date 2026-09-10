// A new measurement format. Never convert historical seven-point answers implicitly.
export const CONTINUOUS_INSTRUMENT_VERSION = 'brufest-study-one-continuous-v1-2026-09-08';
export const CONTINUOUS_LABELS = ['Not at all true of me now', 'Slightly true of me now', 'Somewhat true of me now', 'Mostly true of me now', 'Very true of me now'];
// Equal response bands: [0,20), [20,40), [40,60), [60,80), [80,100].
export function responseBand(value: number, max = 100) {
  return Math.min(4, Math.max(0, Math.floor(value / max * 5)));
}

export const PERSPECTIVES_INSTRUMENT_VERSION = 'brufest-study-one-perspectives-v2-2026-09-09';
export const CONNECTION_LABELS = ['Not at all connected', 'Very little connection', 'A little connection', 'Some connection', 'Quite connected', 'Very connected', 'Extremely connected'];
export const CONFLICT_INSTRUMENT_VERSION = 'brufest-study-one-conflict-v3-2026-09-09';
export const SELECTIVE_INSTRUMENT_VERSION = 'brufest-study-one-selective-v4-2026-09-10';
export const LIKELIHOOD_LABELS = ['Not at all likely', 'Slightly likely', 'Somewhat likely', 'Very likely', 'Extremely likely'];
export const RESPONSE_SCALE_INSTRUMENT_VERSION = 'brufest-study-one-item-scales-v5-2026-09-10';
export const AGREEMENT_LABELS = ['Strongly disagree', 'Somewhat disagree', 'Neither agree nor disagree', 'Somewhat agree', 'Strongly agree'];
export const WILLINGNESS_LABELS = ['Not at all willing', 'Slightly willing', 'Somewhat willing', 'Very willing', 'Completely willing'];
export const DESIRE_LABELS = ['No desire', 'Slight desire', 'Some desire', 'Strong desire', 'Very strong desire'];
export const ABILITY_LABELS = ['Not at all able', 'Slightly able', 'Somewhat able', 'Mostly able', 'Fully able'];
// Explicit item decisions: agreement retains the meaning/direction of negative statements.
export const ITEM_RESPONSE_LABELS: Record<string, readonly string[]> = {
  E1_HUM_01: AGREEMENT_LABELS,
  E1_HUM_02: AGREEMENT_LABELS,
  E1_CUR_02: WILLINGNESS_LABELS,
  E1_CUR_01: DESIRE_LABELS,
  E1_REG_01: ABILITY_LABELS,
  E1_CPX_ISSUES: AGREEMENT_LABELS,
  E1_AGY_01: ABILITY_LABELS,
  E1_AGY_02: AGREEMENT_LABELS,
  E1_REG_02: ABILITY_LABELS,
  E1_ACK_01: WILLINGNESS_LABELS,
  E1_LEARN_01: ABILITY_LABELS,
  E1_CPX_UNANTICIPATED: AGREEMENT_LABELS,
  E1_REV_WILLING: WILLINGNESS_LABELS,
  E1_ACK_COST: AGREEMENT_LABELS,
};
export const isSelectiveInstrument = (version?: string) => version === SELECTIVE_INSTRUMENT_VERSION || version === RESPONSE_SCALE_INSTRUMENT_VERSION;
export const isPerspectivesInstrument = (version?: string) => version === PERSPECTIVES_INSTRUMENT_VERSION || version === CONFLICT_INSTRUMENT_VERSION || isSelectiveInstrument(version);
export const isContinuousInstrument = (version?: string) => version === CONTINUOUS_INSTRUMENT_VERSION || isPerspectivesInstrument(version);
