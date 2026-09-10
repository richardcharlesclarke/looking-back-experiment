// Generated from lib/study-two/instrument.ts by scripts/sync-study-two-service.mjs.
export const VERSION = 'study-two-review-v1-2026-09-10';
export const SAMPLE = { id: 'sample-panel', title: 'Who should shape our town?', proposition: 'Residents should have the final say on major changes to their town.', speakers: [{ id: 'speaker-a', name: 'Speaker A' }, { id: 'speaker-b', name: 'Speaker B' }, { id: 'speaker-c', name: 'Speaker C' }] };
const agreement = ['Strongly disagree', 'Somewhat disagree', 'Neither agree nor disagree', 'Somewhat agree', 'Strongly agree'];
const support = ['Strongly oppose', 'Lean against', 'Neither oppose nor support', 'Lean towards', 'Strongly support'];
const extent = ['Not at all', 'A little', 'Somewhat', 'Very well', 'Extremely well'];
function scale(id, prompt, section, bands = agreement, max = 100) { return { id, prompt, section, type: 'continuous', max, bands }; }
export function questions(panel, role, wave, speakerId) {
    const p = role === 'speaker' ? 'S2S' : 'S2A';
    const out = role === 'speaker' ? [
        scale('S2S_OPEN', 'I can see ways in which my current view on this issue may be incomplete.', 'How you approach this discussion'),
        scale('S2S_CURIOUS', 'I want to understand why the other speakers see this issue as they do.', 'How you approach this discussion'),
        scale('S2S_REVISE', 'I am willing to say publicly where an argument leads me to qualify my view.', 'How you approach this discussion'),
        scale('S2S_RESPECT', 'I can take the other speakers’ reasons seriously even when I disagree with their conclusions.', 'How you approach this discussion'),
        scale('S2S_ABLE', 'How able do you feel to keep a difficult discussion focused on the issue when someone challenges you?', 'How you approach this discussion', ['Not at all able', 'Slightly able', 'Somewhat able', 'Very able', 'Extremely able'])
    ] : [];
    out.push(scale(p + '_POSITION', `To what extent do you support this claim: “${panel.proposition}”`, 'Your view', support, 10), scale(p + '_CONFIDENCE', `How confident are you in your position on this claim: “${panel.proposition}”`, 'Your view', ['Not at all confident', 'Slightly confident', 'Somewhat confident', 'Very confident', 'Completely confident'], 10), scale(p + '_UNDERSTANDING', `How well do you understand the strongest reasons for a view different from yours on this claim: “${panel.proposition}”`, 'Understanding another view', extent, 10));
    if (role === 'speaker') {
        for (const speaker of panel.speakers.filter(s => s.id !== speakerId))
            out.push({ ...scale('S2S_PREDICT_' + speaker.id, `Where do you think ${speaker.name} stands on this claim: “${panel.proposition}”`, 'Understanding another view', support, 10), target: speaker.id, cannot: 'cannot_estimate' });
        out.push({ id: 'S2S_REASON', prompt: `What is the strongest reason someone might disagree with your position on this claim: “${panel.proposition}”`, section: 'Understanding another view', type: 'text', optional: true });
    }
    else if (wave === 'pre')
        out.push(scale('S2A_FAMILIAR', 'How familiar are you with the subject of this panel?', 'Before the panel', ['Not at all familiar', 'Slightly familiar', 'Somewhat familiar', 'Very familiar', 'Extremely familiar'], 10), scale('S2A_IMPORTANCE', 'How much does this issue matter to you personally?', 'Before the panel', ['Not at all', 'A little', 'Somewhat', 'A lot', 'Extremely'], 10));
    if (wave === 'post') {
        const process = role === 'speaker' ? [
            ['UNDERSTOOD', 'The discussion helped me understand another speaker’s reasons more clearly.'], ['QUALIFIED', 'I qualified or refined a claim because of something another speaker said.'], ['NEW', 'The discussion produced a useful question, distinction or possibility that I had not considered before.'], ['RESPECTED', 'I felt respected when other speakers challenged me.'], ['CONTINUE', 'I would be willing to continue this discussion with these speakers.']
        ] : [['RESPONDED', 'The speakers responded to one another’s reasons.'], ['QUALIFIED', 'At least one speaker qualified or refined a claim in response to another speaker.'], ['UNDERSTOOD', 'The discussion helped me understand why people hold different views on this issue.'], ['NEW', 'The discussion gave me a useful question, distinction or possibility I had not considered before.'], ['RESPECT', 'The speakers treated one another with respect when they disagreed.']];
        out.push(...process.map(([id, prompt]) => ({ ...scale(p + '_POST_' + id, prompt, role === 'speaker' ? 'The discussion' : 'What you heard'), cannot: 'cannot_assess' })));
        if (role === 'audience')
            out.push({ id: 'S2A_CLOSEST', prompt: 'Which speaker’s position was closest to yours?', section: 'What you heard', type: 'single', options: [...panel.speakers.map(s => s.name), 'None of these speakers', 'Not sure'] });
        out.push({ id: p + '_NEW_EXAMPLE', prompt: role === 'speaker' ? 'What did the discussion help you see or say differently, if anything?' : 'What is one idea or question from the panel that you had not considered before, if any?', section: 'In your own words', type: 'text', optional: true });
    }
    return out;
}
