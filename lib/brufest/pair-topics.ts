import type { Question } from './types';

// Immutable draft bank. New wording requires a new version; saved answers retain this bank.
export const PAIR_VERSION = 'brufest-pairs-v0.2-draft-2026-09-07';
export const PAIR_TOPICS_APPROVED = false;
export const TOPICS = [
  {
    id: 'migration', title: 'Migration', programme: 'We Need to Talk About Migration',
    proposition: 'The UK should make it easier for people from other countries to come here to live and work.',
    source: 'https://bigbrue.com/programme/we-need-to-talk-about-migration/',
    rationale: 'The programme examines openness, borders and belonging. Colin identified this panel as the clearest contrasting case. This statement narrows that broad discussion to migration for living and working; it does not ask about asylum.',
  },
  {
    id: 'family', title: 'Assisted dying', programme: 'Family Matters',
    proposition: 'Adults with a terminal illness should be allowed to receive medical assistance to end their lives.',
    source: 'https://bigbrue.com/programme/family-matters/',
    rationale: 'The programme explicitly identifies assisted dying as one of the speakers’ disagreements. Colin identified this panel as a strong contrast. This draft asks about that issue without attributing a position to a speaker or making a claim about current law; scope and safeguards need wording review.',
  },
  {
    id: 'ai', title: 'Artificial intelligence', programme: 'AI and Global Disorder',
    proposition: 'Governments should slow the introduction of powerful AI systems until their risks are better understood.',
    source: 'https://bigbrue.com/programme/ai-and-global-disorder/',
    rationale: 'The programme contrasts risks of instability with potential benefits of AI. Colin described contrasting perspectives rather than clear opposition. This draft turns the pace-of-adoption trade-off into a question volunteers can disagree about.',
  },
] as const;
export function screeningQuestions(): Question[] {
  return TOPICS.flatMap(t => [
    { id: `SCREEN_${t.id}_POSITION`, prompt: `To what extent do you support this statement: “${t.proposition}”`, type: 'scale' as const, low: 'Strongly oppose', high: 'Strongly support', required: true, section: t.title },
    { id: `SCREEN_${t.id}_IMPORTANCE`, prompt: 'How important is this issue to you personally?', type: 'scale' as const, low: 'Not at all', high: 'Extremely', required: true, section: t.title },
    { id: `SCREEN_${t.id}_REASON`, prompt: 'What is the main reason for your position?', type: 'text' as const, required: false, section: t.title },
    { id: `SCREEN_${t.id}_WILLING`, prompt: 'Would you be willing to discuss this issue with someone who sees it differently?', type: 'single' as const, options: ['Yes', 'No'], required: true, section: t.title },
  ]);
}
