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
export const isPerspectivesInstrument = (version?: string) => version === PERSPECTIVES_INSTRUMENT_VERSION || version === CONFLICT_INSTRUMENT_VERSION;
export const isContinuousInstrument = (version?: string) => version === CONTINUOUS_INSTRUMENT_VERSION || isPerspectivesInstrument(version);
