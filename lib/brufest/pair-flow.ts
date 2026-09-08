import { createHash, randomBytes, randomUUID } from 'node:crypto';
import type { Context, State, Submission } from './types';
import type { PairRun, ParticipantView, Volunteer, PairAdminView } from './pair-types';
import { PAIR_VERSION, TOPICS } from './pair-topics';
import { validateAnswers } from './instruments';
import { pairBriefing, PAIR_BRIEFING_VERSION } from './pair-briefings';

const now = () => new Date().toISOString();
const people = (s: State) => (s.volunteers ??= []);
const pairs = (s: State) => (s.pairs ??= []);
export function registerVolunteer(s: State, access: unknown, isTest: boolean): Volunteer {
  if (typeof access !== 'string' || !/^[a-f0-9]{64}$/.test(access)) throw new Error('Please reopen the screening questionnaire.');
  const existing = people(s).find(p => p.access === access);
  if (existing) return existing;
  const p = { id: randomUUID(), token: `BF-${randomBytes(6).toString('hex').toUpperCase()}`, access,
    label: `Volunteer ${String(people(s).length + 1).padStart(3, '0')}`, createdAt: now(), isTest };
  people(s).push(p);
  return p;
}
export function identify(s: State, access: unknown) {
  if (typeof access !== 'string' || access.length !== 64) throw new Error('Open the personal return link saved after screening.');
  const p = people(s).find(p => p.access === access);
  if (!p) throw new Error('This return link was not recognised. Ask the helper; do not start again if answers have already been saved.');
  return p;
}
const records = (s: State, p: Volunteer, r?: PairRun) => s.submissions.filter(x => x.participantToken === p.token && (!r || x.context.session?.id === r.id));
export const screenRecord = (s: State, p: Volunteer) => records(s, p).find(x => x.context.wave === 'screen' && x.instrumentVersion === PAIR_VERSION);
export function runContext(r: PairRun, member: number, wave: Context['wave']): Context {
  return { study: 'pairs', role: 'participant', wave, member,
    session: { id: r.id, study: 'pairs', title: 'Paired discussion', proposition: r.proposition,
      speakers: ['Participant A', 'Participant B'], stage: r.stage === 'pre' ? 'pre' : r.stage === 'closed' ? 'closed' : 'post', isTest: r.isTest } };
}
export function participantView(s: State, p: Volunteer): ParticipantView {
  const r = pairs(s).find(r => r.volunteers.includes(p.id));
  const complete = records(s, p, r).map(x => x.context.wave);
  const result: ParticipantView = { label: p.label, screenDone: !!p.screenedAt, wave: null, completed: complete,
    message: 'Screening saved. Show the helper your volunteer number. The helper will look for a willing partner with a different view.' };
  if (!p.screenedAt) return { ...result, wave: 'screen', context: { study: 'pairs', role: 'participant', wave: 'screen', screeningBank: PAIR_VERSION }, message: 'Answer privately so the helper can find a suitable discussion partner.' };
  if (!r) return result;
  const member = r.volunteers.indexOf(p.id);
  result.pair = { proposition: r.proposition, stage: r.stage, member, title: 'Paired discussion' };
  const done = (w: string) => complete.includes(w as Context['wave']);
  const jointDone = s.submissions.some(x => x.context.session?.id === r.id && x.context.wave === 'joint');
  if (r.stage === 'pre') {
    result.wave = done('pre') ? null : 'pre';
    result.message = done('pre') ? 'Before questionnaire saved. Wait for the helper to give both participants the briefing.' : 'Complete these questions privately before the helper gives the briefing.';
  } else if (r.stage === 'briefing') result.message = 'The helper will now give both participants the same assigned briefing. Keep this page for the later questionnaires.';
  else if (r.stage.startsWith('opening')) result.message = `Participant ${r.stage === 'opening-a' ? 'A' : 'B'} has two minutes to explain their position. The other participant listens. The helper keeps time.`;
  else if (r.stage === 'discussion') result.message = 'Discuss the statement together for eight minutes. The helper keeps time. Agreement is not required.';
  else if (r.stage === 'joint') {
    result.wave = member === 0 && !jointDone ? 'joint' : null;
    result.message = jointDone ? 'Joint discussion record saved. Wait for the helper to open the private after questionnaires.' : 'Complete one joint discussion record together on Participant A’s device. The helper allows three minutes. Different descriptions are allowed.';
  } else if (r.stage === 'post') {
    if (!done('post')) { result.wave = 'post'; result.message = 'Complete these questions privately. Do not show Participant A or B these answers.'; }
    else {
      const both = r.volunteers.every(id => {
        const person = people(s).find(p => p.id === id)!;
        return records(s, person, r).some(x => x.context.wave === 'post');
      });
      result.wave = both && !done('partner') ? 'partner' : null;
      result.message = done('partner') ? 'All your questionnaires are complete. The helper will finish the activity and explain the study.' : both ? 'Check how accurately your partner described your reason. Complete this privately before the debrief.' : 'After questionnaire saved. Wait for your partner to finish, then check their description of your reason.';
    }
  } else result.message = 'This discussion is closed. Thank you for taking part.';
  if (result.wave) {
    result.context = runContext(r, member, result.wave);
    if (result.wave === 'partner') {
      const other = people(s).find(p => p.id === r.volunteers[1 - member])!;
      const text = records(s, other, r).find(x => x.context.wave === 'post')?.answers.E3_OTHER_REASON;
      result.context.partnerSummary = typeof text === 'string' && text.trim() ? text : 'Your partner did not provide a written description. Select Cannot assess.';
    }
  }
  return result;
}
export function submitPairAnswers(s: State, p: Volunteer, wave: unknown, answers: unknown, startedAt: unknown) {
  // Exact retries are idempotent, including when the helper has advanced the stage.
  const r = pairs(s).find(r => r.volunteers.includes(p.id));
  const old = records(s, p, wave === 'screen' ? undefined : r).find(x => x.context.wave === wave && x.instrumentVersion === PAIR_VERSION);
  if (old) return { id: old.id, duplicate: true };
  const view = participantView(s, p);
  if (!view.context || wave !== view.wave) throw new Error('This questionnaire is not open. Return to your current step.');
  if (typeof startedAt !== 'string' || !Number.isFinite(Date.parse(startedAt)) || Date.parse(startedAt) > Date.now() + 60000) throw new Error('Invalid questionnaire start time.');
  const validated = validateAnswers(view.context, answers);
  const item: Submission = { id: randomUUID(), participantToken: p.token, context: view.context, answers: validated.answers,
    instrumentVersion: PAIR_VERSION, startedAt, createdAt: now(), displayOrder: validated.questions.map(q => q.id),
    isTest: p.isTest, condition: wave === 'screen' ? undefined : r?.condition,
    briefingVersion: wave === 'screen' ? undefined : PAIR_BRIEFING_VERSION };
  s.submissions.push(item);
  if (wave === 'screen') p.screenedAt = item.createdAt;
  return { id: item.id, duplicate: false };
}
export function createPair(s: State, input: Record<string, unknown>): PairRun {
  const ids = input.volunteers;
  if (!Array.isArray(ids) || ids.length !== 2 || ids[0] === ids[1]) throw new Error('Choose two different screened volunteers.');
  const topic = TOPICS.find(t => t.id === input.topicId);
  if (!topic) throw new Error('Choose a screening topic.');
  const selected = ids.map(id => people(s).find(p => p.id === id));
  if (selected.some(p => !p?.screenedAt)) throw new Error('Both volunteers must complete screening.');
  if (pairs(s).some(r => r.volunteers.some(id => ids.includes(id)))) throw new Error('A volunteer is already in a pair. Each volunteer takes part once.');
  const responses = selected.map(p => screenRecord(s, p!)!.answers);
  if (responses.some(a => a[`SCREEN_${topic.id}_WILLING`] !== 'Yes')) throw new Error('Both volunteers must be willing to discuss this topic.');
  if (responses.some(a => typeof a[`SCREEN_${topic.id}_POSITION`] !== 'number')) throw new Error('Choose a topic with a position from both volunteers.');
  if (responses[0][`SCREEN_${topic.id}_POSITION`] === responses[1][`SCREEN_${topic.id}_POSITION`]) throw new Error('Choose volunteers with different positions.');
  if (typeof input.reason !== 'string' || input.reason.trim().length < 10 || input.reason.length > 2000) throw new Error('Record the difference in their positions/reasons and why this pair is suitable.');
  if (selected[0]!.isTest !== selected[1]!.isTest) throw new Error('Do not pair a demonstration volunteer with a real volunteer.');
  const r: PairRun = { id: randomUUID(), volunteers: ids as [string,string], topicId: topic.id, proposition: topic.proposition,
    topicSource: topic.source, version: PAIR_VERSION, pairingReason: input.reason.trim(), createdAt: now(), stage: 'pre',
    stageStartedAt: now(), history: [], notes: '', isTest: selected.every(p => p!.isTest) };
  pairs(s).push(r);
  return r;
}
export function seededBit(seed: string) { return createHash('sha256').update(seed).digest()[0] & 1; }
export function advancePair(s: State, id: unknown, note: unknown) {
  const r = pairs(s).find(r => r.id === id);
  if (!r) throw new Error('Pair not found.');
  if (typeof note !== 'string' || note.length > 3000) throw new Error('Enter a short timing or delivery note.');
  const count = (wave: string) => s.submissions.filter(x => x.context.session?.id === r.id && x.context.wave === wave).length;
  const elapsed = Math.max(0, Math.round((Date.now() - Date.parse(r.stageStartedAt)) / 1000));
  if (r.stage === 'closed') throw new Error('This pair is closed.');
  if (r.stage === 'pre') {
    if (count('pre') !== 2) throw new Error('Both before questionnaires must be saved before allocation.');
    if (r.condition) throw new Error('This pair already has an allocation.');
    r.allocationSeed = randomBytes(32).toString('hex');
    r.allocationDraw = seededBit(r.allocationSeed);
    r.condition = r.allocationDraw ? 'treatment' : 'active_control';
    r.allocationMethod = 'Independent 1:1 random draw after both PRE; SHA-256(seed) first byte parity; no topic stratification';
    r.allocatedAt = now();
    r.briefingVersion=PAIR_BRIEFING_VERSION;
    r.briefingText=pairBriefing(r.condition,r.proposition);
    r.firstSpeaker = seededBit(`${r.allocationSeed}:independent-opening-order`);
  }
  if (r.stage === 'joint' && count('joint') !== 1) throw new Error('Save the joint record first. Missing answers can be explicitly skipped.');
  if (r.stage === 'post' && (count('post') !== 2 || count('partner') !== 2)) throw new Error('Both after questionnaires and both partner checks must be saved before closing.');
  const target = r.stage === 'briefing' ? 300 : r.stage.startsWith('opening') ? 120 : r.stage === 'discussion' ? 480 : r.stage === 'joint' ? 180 : 0;
  if (target && Math.abs(elapsed - target) > 30 && note.trim().length < 5) throw new Error('Record why this stage differed from the planned duration before continuing.');
  r.history.push({ stage: r.stage, at: now(), elapsedSeconds: elapsed, note: note.trim() });
  const order: PairRun['stage'][] = ['pre','briefing', ...(r.firstSpeaker ? ['opening-b','opening-a'] as const : ['opening-a','opening-b'] as const), 'discussion','joint','post','closed'];
  r.stage = order[order.indexOf(r.stage) + 1];
  r.stageStartedAt = now();
  return r;
}
export function pairAdminView(s: State): PairAdminView {
  return { volunteers: people(s).map(p => ({ ...p, answers: screenRecord(s,p)?.answers ?? {}, paired: pairs(s).some(r => r.volunteers.includes(p.id)) })),
    pairs: pairs(s).map(r => ({ ...r, labels: r.volunteers.map(id => people(s).find(p => p.id === id)!.label),
      completions: Object.fromEntries(['pre','joint','post','partner'].map(w => [w, s.submissions.filter(x => x.context.session?.id === r.id && x.context.wave === w).length])) })) };
}
export function stopPair(s:State,id:unknown,reason:unknown){
  const r=pairs(s).find(r=>r.id===id);
  if(!r||r.stage==='closed')throw new Error('Choose an active pair.');
  if(typeof reason!=='string'||reason.trim().length<5||reason.length>3000)throw new Error('Record why the activity stopped; avoid identifying details.');
  r.history.push({stage:r.stage,at:now(),elapsedSeconds:Math.max(0,Math.round((Date.now()-Date.parse(r.stageStartedAt))/1000)),note:`Stopped early: ${reason.trim()}`});
  r.stoppedReason=reason.trim();r.stage='closed';r.stageStartedAt=now();return r;
}
