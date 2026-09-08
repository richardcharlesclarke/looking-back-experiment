import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { registerVolunteer, identify, participantView, createPair, submitPairAnswers, advancePair, stopPair, seededBit } from '../lib/brufest/pair-flow';
import { PAIR_VERSION, TOPICS } from '../lib/brufest/pair-topics';
import { questions } from '../lib/brufest/instruments';
import { exportRows } from '../lib/brufest/export';
import type { State, Answers, Context } from '../lib/brufest/types';
const fresh=():State=>({sessions:[],submissions:[]});
const key=()=>randomBytes(32).toString('hex');
function fill(c:Context,n=3):Answers {
  const a:Answers={};for(let i=0;i<3;i++)for(const q of questions(c,a))if(a[q.id]===undefined)a[q.id]=q.type==='text'?'TEST: a reason for this position':q.type==='multi'?[q.options![0]]:q.type==='single'?q.options![0]:n;return a;
}
function setup(){const s=fresh(),a=registerVolunteer(s,key(),true),b=registerVolunteer(s,key(),true);
  for(const [p,n] of [[a,2],[b,8]] as const)submitPairAnswers(s,p,'screen',fill(participantView(s,p).context!,n),new Date().toISOString());
  const r=createPair(s,{volunteers:[a.id,b.id],topicId:TOPICS[0].id,reason:'TEST: opposite positions, willing to discuss; follow listed topic order.'});return {s,a,b,r};}
const save=(s:State,p:ReturnType<typeof registerVolunteer>)=>{const v=participantView(s,p);return submitPairAnswers(s,p,v.wave,fill(v.context!),new Date().toISOString());};
test('screening exists without sessions, registration retries preserve one identity and drafts have stable bank',()=>{
  const s=fresh(),access=key(),p=registerVolunteer(s,access,true);assert.equal(registerVolunteer(s,access,true),p);assert.equal(s.sessions.length,0);
  assert.equal(participantView(s,p).context?.screeningBank,PAIR_VERSION);assert.equal(questions(participantView(s,p).context!).length,12);
  assert.throws(()=>identify(s,key()));assert.equal(identify(s,access).id,p.id);
  save(s,p);assert.equal(participantView(s,p).wave,null);assert.equal(s.submissions.length,1);
  submitPairAnswers(s,p,'screen',{},new Date().toISOString());assert.equal(s.submissions.length,1);
});
test('pairing refuses same volunteer, unwilling, missing-position, unscreened and already-paired participants',()=>{
  const s=fresh(),a=registerVolunteer(s,key(),true),b=registerVolunteer(s,key(),true);
  const input={volunteers:[a.id,b.id],topicId:TOPICS[0].id,reason:'TEST: genuine difference'};
  assert.throws(()=>createPair(s,input));
  const av=fill(participantView(s,a).context!,2),bv=fill(participantView(s,b).context!,8);bv.SCREEN_migration_WILLING='No';
  submitPairAnswers(s,a,'screen',av,new Date().toISOString());submitPairAnswers(s,b,'screen',bv,new Date().toISOString());
  assert.throws(()=>createPair(s,input),/willing/);assert.throws(()=>createPair(s,{...input,volunteers:[a.id,a.id]}));
  const {s:s2,a:a2,b:b2}=setup();assert.throws(()=>createPair(s2,{...input,volunteers:[a2.id,b2.id]}),/already/);
});
test('allocation occurs only after two completed PREs, seed reproduces condition, participant view never leaks assignment or partner answers',()=>{
  const {s,a,b,r}=setup();assert.equal(r.condition,undefined);assert.equal(r.allocationSeed,undefined);
  assert.throws(()=>advancePair(s,r.id,''),/Both before/);save(s,a);assert.throws(()=>advancePair(s,r.id,''),/Both before/);save(s,b);
  advancePair(s,r.id,'');assert.equal(r.stage,'briefing');assert.equal(seededBit(r.allocationSeed!),r.allocationDraw);assert.ok(r.allocatedAt);assert.ok(r.briefingText);
  const v=participantView(s,a);assert.equal(v.wave,null);assert.ok(!JSON.stringify(v).includes(r.allocationSeed!));assert.ok(!JSON.stringify(v).includes('condition'));assert.ok(!JSON.stringify(v).includes(b.access));
  const seed=r.allocationSeed;advancePair(s,r.id,'TEST: fast local rehearsal');assert.equal(r.allocationSeed,seed);
});
test('full paired sequence gates joint, private after and partner checks, preserves one record and matching on a new device',()=>{
  const {s,a,b,r}=setup();save(s,a);save(s,b);
  assert.throws(()=>submitPairAnswers(s,a,'post',{},new Date().toISOString()),/not open/);
  advancePair(s,r.id,'');assert.throws(()=>advancePair(s,r.id,''),/duration/);
  advancePair(s,r.id,'TEST: accelerated rehearsal');assert.equal(r.stage,r.firstSpeaker?'opening-b':'opening-a');
  advancePair(s,r.id,'TEST: accelerated rehearsal');advancePair(s,r.id,'TEST: accelerated rehearsal');assert.equal(r.stage,'discussion');
  advancePair(s,r.id,'TEST: accelerated rehearsal');assert.equal(r.stage,'joint');assert.equal(participantView(s,a).wave,'joint');assert.equal(participantView(s,b).wave,null);
  assert.throws(()=>advancePair(s,r.id,'TEST: accelerated rehearsal'),/joint record/);save(s,a);
  submitPairAnswers(s,a,'joint',{},new Date().toISOString());assert.equal(s.submissions.filter(x=>x.context.wave==='joint').length,1);
  advancePair(s,r.id,'TEST: accelerated rehearsal');save(s,a);assert.equal(participantView(s,a).wave,null);save(s,b);
  const restored=identify(s,a.access);assert.equal(participantView(s,restored).wave,'partner');
  assert.equal(participantView(s,a).context?.partnerSummary,'TEST: a reason for this position');
  assert.ok(!JSON.stringify(participantView(s,a)).includes('E3_OWN_REASON'));
  save(s,a);save(s,b);advancePair(s,r.id,'');assert.equal(r.stage,'closed');assert.equal(participantView(s,a).wave,null);
  assert.throws(()=>advancePair(s,r.id,''),/closed/);
  const rows=exportRows(s);assert.ok(rows.every(row=>row.prompt));assert.ok(rows.filter(row=>row.wave==='pre').every(row=>row.condition===r.condition));
  assert.ok(!JSON.stringify(rows).includes(a.access));assert.equal(s.sessions.length,0);
});
test('zero and explicit missing survive screening export; all-missing answers cannot produce a pair',()=>{
  const s=fresh(),a=registerVolunteer(s,key(),true),b=registerVolunteer(s,key(),true);
  const c=participantView(s,a).context!,aa=fill(c,0),ba=fill(c,8);aa.SCREEN_migration_REASON={missing:'prefer_not'};aa.SCREEN_ai_POSITION={missing:'cannot_assess'};
  submitPairAnswers(s,a,'screen',aa,new Date().toISOString());submitPairAnswers(s,b,'screen',ba,new Date().toISOString());
  const rows=exportRows(s);assert.equal(rows.find(x=>x.participantToken===a.token&&x.itemId==='SCREEN_migration_POSITION')?.numeric,0);
  assert.throws(()=>createPair(s,{volunteers:[a.id,b.id],topicId:'ai',reason:'TEST: incomplete positions'}),/position/);
});
test('stop/withdrawal preserves incomplete records and never presents completion as a finished questionnaire',()=>{
  const {s,a,r}=setup();save(s,a);stopPair(s,r.id,'TEST: participant stops');assert.equal(r.stage,'closed');assert.equal(r.condition,undefined);assert.equal(participantView(s,a).wave,null);assert.ok(r.stoppedReason);assert.equal(s.submissions.length,3);
});
