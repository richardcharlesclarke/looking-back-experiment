export const FESTIVAL_VERSION = 'brufest-study-one-v0.2-2026-09-07';
// Keep the journey/draft key stable while recording the shortened first instrument.
export const FIRST_INSTRUMENT_VERSION = 'brufest-study-one-pre-v0.3-2026-09-07';
export const INFORMATION_VERSION = 'study-one-information-v5-2026-09-09';
export const PERMISSION_VERSION = 'study-one-one-followup-email-v1';
export const CONTACT_EMAIL = 'richardcharlesclarke@gmail.com';
export const EVOLVABLE_URL = 'https://www.evolvable.me';
export const STUDY_ONE_PUBLIC_PATH = '/study-one';
export const STUDY_ONE_PUBLIC_URL = 'https://experiments.evolvable.me/study-one';
export const STUDY_ONE_API_PATH = `${STUDY_ONE_PUBLIC_PATH}/api/brufest/festival`;
export const STUDY_ONE_ADMIN_URL = 'https://study-one-review-study-one-review.up.railway.app/admin/brufest/festival';
export const MINIMUM_AGE = 18;
// Provisional from the current reading and response load; confirm with a paced human rehearsal.
export const ESTIMATED_MINUTES = 8;
export const STUDY_ONE_APPROVED = true;
export const FIRST_CLOSES_AT = '2026-09-19T09:00:00Z';
export const SECOND_OPENS_AT = '2026-09-20T23:00:00Z';
export const CONTACT_DELETE_AT = '2026-10-31T23:59:59Z';
export const RESEARCH_DELETE_AT = '2027-09-30T23:59:59Z';
export function showEvolvableInvitation(step:string,kind:string,completed:string[]) {
  return kind==='first'&&completed.includes('pre')&&!completed.includes('post')&&['waiting','stopped'].includes(step);
}
export const INFORMATION = [
  { title: 'What is the study about?', text: 'We want to understand whether festival attendees’ approach to disagreement, feelings of connection and outlook change across Big Brue. We also ask what, if anything, they came to understand differently. We compare each person’s answers before and after the festival. This does not establish that the festival caused a change.' },
  { title: 'What would you do?', text: 'Complete the first questionnaire before attending festival activities, then attend normally. After saving your first answers, you can give an email address and agree to receive a personal link to the questionnaire after the festival. You do not need to remember a code.' },
  { title: 'Taking part is your choice', text: `You must be ${MINIMUM_AGE} or over to take part. Allow about ${ESTIMATED_MINUTES} minutes for the first questionnaire. You can skip individual questions or stop. Giving an email address and agreeing to the follow-up are separate choices after the first questionnaire.` },
  { title: 'Who sees your information?', text: `Richard Clarke leads the study. Only the study team can see saved responses. Research answers use a random participant identifier. Email addresses and private access links are stored separately, are excluded from research exports, and are used only by the research assistant for this study's follow-up. Keep your personal link private.` },
  { title: 'How long do we keep it?', text: `We delete email addresses and personal links after 31 October 2026. We delete the remaining research responses after 30 September 2027. Before the contact details are deleted, you can remove both your answers and contact details using your personal link or by emailing ${CONTACT_EMAIL}. Once the contact details are deleted, we can no longer link a response to you. If a scheduled hosting backup contains deleted data, it can remain for up to 89 days; it is not used for research or contact, and deletion must be repeated before any restored copy is used.` },
];
// Cached original pages can complete the consent they actually displayed.
export const ORIGINAL_INFORMATION_VERSION = 'study-one-information-v4-2026-09-07';
export const ORIGINAL_INFORMATION = INFORMATION.map((item, index) => index === 0
  ? {...item, text: 'We want to understand whether festival attendees’ approach to disagreement changes across Big Brue. We compare each person’s answers before and after the festival. This does not establish that the festival caused a change.'}
  : index === 2 ? {...item, text: item.text.replace('about 8 minutes', 'about 7 minutes')} : item);
export const CONSENT_TEXT = 'I have read the study information above and agree to take part.';
export const FOLLOWUP_TEXT = 'I agree to receive the questionnaire after the festival by email. My email will be used for this study follow-up, not marketing.';
export const SOURCE = 'https://bigbrue.com/programme/';
export const HUB_SOURCE = 'https://bigbrue.com/hub/';
export const PROGRAMME_VERSION = 'big-brue-programme-2026-09-07';
export const FESTIVAL_PROGRAMME = [
  'Saturday — Welcome to Big Brue', 'Saturday — Mushrooms and the Mind', 'Saturday — We Need to Talk About Migration',
  'Saturday — Somerset State of Mind', 'Saturday — Museums of the Future', 'Saturday — Reaching for Wonderment',
  'Saturday — Family Matters', 'Saturday — 5x15: Can Britain Be “Great” Again?', 'Saturday — After Empire',
  'Saturday — Difficult Women', 'Saturday — Crafting for Survival', 'Saturday — America on the Brink',
  'Saturday — Poetry Battle', 'Saturday — Local Ingredients, Global Appetites',
  'Sunday — How to Be an Entrepreneur', 'Sunday — Sunday Paper Round', 'Sunday — AI and Global Disorder',
  'Sunday — Nurturing Creativity', 'Sunday — Making Space for Nature', 'Sunday — Truth-Telling in a Fake News World',
  'Sunday — Flipping the Narrative', 'Sunday — New World Order?', 'Sunday — The Third Act',
  'Sunday — An Anarchist in the Garden', 'Sunday — Life Lessons', 'Sunday — Music from the Frontline',
];
export const HUB_PROGRAMME = ['Speakers’ Corner', 'Live music at the Hub', 'Children’s pop-up theatre', 'Barefoot movement', 'Life drawing', 'Future Family Lab', 'How to Have a Great Family Row', 'Slow Scent', 'Leathercraft', 'I Didn’t Lick It', 'Apple pressing', 'AI and the Creative Life', 'No Dig demonstration', 'The Big Brue Daily'];
export const BEAU_SESSION = 'Saturday — Reaching for Wonderment';
export function invitation(firstLink: string) {
  return `DRAFT — for Richard and the festival organiser to review before sending.\n\nSubject: Invitation to the Big Brue before-and-after study\n\nWe are inviting Big Brue attendees aged ${MINIMUM_AGE} or over to take part in a study of how people approach disagreement before and after the festival. Participation is optional. The first questionnaire should take about ${ESTIMATED_MINUTES} minutes. Read the study information and, if you agree, complete it before attending festival activities:\n${firstLink}\n\nAfter your first questionnaire, you can provide an email address and agree to receive a personal link to the second questionnaire after the festival. Attend the festival as normal.\n\nQuestions or requests: ${CONTACT_EMAIL}. Replying to this invitation reaches the same monitored inbox.`;
}
export function followup(link: string, isTest: boolean) {
  return `${isTest ? 'DEMONSTRATION DRAFT — use only with invented test contacts.\n\n' : ''}Subject: Your questionnaire after Big Brue\n\nThank you for completing the first questionnaire. You agreed to receive this follow-up. Please complete the questionnaire after the festival using your personal link:\n${link}\n\nThe link matches your answers to your first questionnaire; there is no code to remember. Keep it private. Participation remains optional.\n\nQuestions or requests: ${CONTACT_EMAIL}. You can also reply to this email.`;
}
