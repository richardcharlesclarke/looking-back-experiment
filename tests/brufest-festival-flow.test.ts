import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { questions } from '../lib/brufest/instruments';
import { enrol, identify, submit, saveContact, view, context, assistantAction, assistantRows, researchRows, comparisons, stopContact, deleteParticipant } from '../lib/brufest/festival/flow';
import { empty, purgeExpired } from '../lib/brufest/festival/store';
import { INFORMATION_VERSION, FESTIVAL_VERSION, FIRST_INSTRUMENT_VERSION, STUDY_ONE_APPROVED, CONTACT_DELETE_AT, RESEARCH_DELETE_AT, CONTACT_EMAIL, ESTIMATED_MINUTES, MINIMUM_AGE, EVOLVABLE_URL, showEvolvableInvitation } from '../lib/brufest/festival/content';
import type { Answers } from '../lib/brufest/types';
const key=()=>randomBytes(32).toString('hex');
function setup(isTest=true){const data=empty(),access=key();const {p,c}=enrol(data,{access,agree:true,informationVersion:INFORMATION_VERSION});p.isTest=isTest;return {data,access,p,c};}
function fill(wave:'pre'|'post',n=4){const a:Answers={};for(let pass=0;pass<3;pass++)for(const q of questions(context(wave),a))if(a[q.id]===undefined)a[q.id]=q.type==='text'?'SYNTHETIC STUDY ONE TEST':q.type==='multi'?[q.options!.includes('Cannot remember')?'Cannot remember':q.options!.includes('Not yet decided')?'Not yet decided':q.options![0]]:q.type==='single'?q.options!.includes('No')?'No':q.options![0]:n;return a;}
const first=(p:ReturnType<typeof setup>['p'],c:ReturnType<typeof setup>['c'])=>submit(p,c,'first',{wave:'pre',answers:fill('pre',2),startedAt:new Date().toISOString()});
test('Study One accepts real participation only after current agreement',()=>{assert.equal(STUDY_ONE_APPROVED,true);assert.throws(()=>enrol(empty(),{access:key(),agree:false,beforeExposure:true,informationVersion:INFORMATION_VERSION}));const data=empty(),access=key(),{p,c}=enrol(data,{access,agree:true,informationVersion:INFORMATION_VERSION});assert.equal(p.isTest,false);assert.equal(p.consent.version,INFORMATION_VERSION);assert.equal(enrol(data,{access}).p.id,p.id);assert.equal(data.research.people.length,1);assert.ok(!JSON.stringify(data.research).includes(access));assert.ok(!JSON.stringify(data.research).includes(c.afterKey));});
test('Second link cannot supply a missing first questionnaire',()=>{const {p,c}=setup();assert.throws(()=>view(p,c,'after'),/No first questionnaire/);assert.equal(p.consent.beforeExposureConfirmed,null);assert.equal(p.responses.length,0);first(p,c);assert.equal(view(p,c,'first').step,'contact');assert.throws(()=>submit(p,c,'first',{wave:'post',answers:fill('post'),startedAt:new Date().toISOString()}),/personal link/);});
test('Email requires explicit permission and a first response; contacts stay out of research exports',()=>{const {data,p,c}=setup(false);assert.throws(()=>saveContact(data,p,c,{permission:true,email:'a@example.com'}));first(p,c);assert.throws(()=>saveContact(data,p,c,{email:'a@example.com'}));saveContact(data,p,c,{permission:true,email:'real@gmail.com'});assert.equal(view(p,c,'first').step,'waiting');assert.ok(!JSON.stringify(data.research).includes('real@gmail.com'));assert.ok(!JSON.stringify(researchRows(data)).includes('real@gmail.com'));assert.ok(assistantRows(data)[0].afterKey);stopContact(c);assert.equal(c.email,null);assert.equal(assistantRows(data)[0].afterKey,null);assert.equal(view(p,c,'after').step,'stopped');});
test('Duplicate email never merges identities; declining contact removes email and excludes recipient',()=>{const {data,p,c}=setup();first(p,c);saveContact(data,p,c,{permission:true,email:'same@example.com'});const next=enrol(data,{access:key(),agree:true,informationVersion:INFORMATION_VERSION});first(next.p,next.c);assert.throws(()=>saveContact(data,next.p,next.c,{permission:true,email:'same@example.com'}),/another study response/);assert.notEqual(p.id,next.p.id);saveContact(data,p,c,{permission:false});assert.equal(c.email,null);assert.equal(c.permission,false);assert.equal(assistantRows(data)[0].afterKey,null);});
test('Second questionnaire opens only after first, permission and deliberate demonstration release',()=>{const {data,p,c}=setup();first(p,c);saveContact(data,p,c,{permission:true,email:'test@example.com'});assert.equal(view(p,c,'after').step,'waiting');assert.throws(()=>submit(p,c,'after',{wave:'post',answers:fill('post'),startedAt:new Date().toISOString()}),/not open/);assistantAction(data,{action:'prepare_demo',id:p.id});assert.equal(view(p,c,'after').step,'post');submit(p,c,'after',{wave:'post',answers:fill('post',6),startedAt:new Date().toISOString()});assert.equal(view(p,c,'after').step,'complete');assert.equal(comparisons(data).length,12);assert.ok(comparisons(data).every(r=>r.matched&&r.before===2&&r.after===6));assert.equal(submit(p,c,'after',{wave:'post'}).duplicate,true);assert.equal(p.responses.length,2);assert.equal(p.responses[0].instrumentVersion,FIRST_INSTRUMENT_VERSION);});
test('Replacement link revokes old access without changing matched participant; saved address must be confirmed',()=>{const {data,p,c}=setup();first(p,c);saveContact(data,p,c,{permission:true,email:'recover@example.com'});const old=c.afterKey;assert.throws(()=>assistantAction(data,{action:'replace_link',id:p.id,confirmEmail:'wrong@example.com'}));assistantAction(data,{action:'replace_link',id:p.id,confirmEmail:'recover@example.com'});assert.throws(()=>identify(data,old,'after'));assert.equal(identify(data,c.afterKey,'after').p.id,p.id);assert.equal(p.responses.length,1);});
test('Delivery tracking requires eligible recipient and external delivery note, and never sends mail',()=>{const {data,p,c}=setup();assert.throws(()=>assistantAction(data,{action:'sent',id:p.id,note:'TEST evidence'}));first(p,c);saveContact(data,p,c,{permission:true,email:'mail@example.com'});assistantAction(data,{action:'prepare_demo',id:p.id});assert.throws(()=>assistantAction(data,{action:'sent',id:p.id,note:''}));assistantAction(data,{action:'sent',id:p.id,note:'SYNTHETIC external mail status'});assert.equal(c.delivery,'sent');assert.ok(c.sentAt);assistantAction(data,{action:'failed',id:p.id,note:'SYNTHETIC bounce evidence'});assert.equal(c.delivery,'failed');});
test('Real records cannot use demonstration release; revised programme has no samples; legacy programme remains unchanged',()=>{const {data,p,c}=setup();first(p,c);saveContact(data,p,c,{permission:true,email:'gates@example.com'});p.isTest=false;assert.throws(()=>assistantAction(data,{action:'prepare_demo',id:p.id}),/Only demonstration/);assert.equal(view(p,c,'after').step,'waiting');const revised=questions(context('pre')),legacy=questions({study:'festival',role:'attendee',wave:'pre'});assert.ok(revised.every(q=>!JSON.stringify(q).includes('Sample:')));assert.ok(legacy.some(q=>JSON.stringify(q).includes('Sample:')));assert.ok(revised.find(q=>q.id==='E1_PRE_SESSIONS')!.options!.some(s=>s.includes('Reaching for Wonderment')));});

test('Shortened first questionnaire saves without original Q16–19; historical item snapshots still export',()=>{
  const removed=['E1_PRE_FAMILIAR','E1_PRE_PRIOR','E1_PRE_EXPOSURE','E1_PRE_INTEREST'];
  const revised=questions(context('pre')),legacy=questions({study:'festival',role:'attendee',wave:'pre'});
  assert.equal(revised.length,15);
  assert.deepEqual(revised.slice(12).map(q=>q.id),['E1_PRE_DAYS','E1_PRE_ACCESS','E1_PRE_SESSIONS']);
  assert.ok(removed.every(id=>!revised.some(q=>q.id===id)&&legacy.some(q=>q.id===id)));
  const {data,p,c}=setup();first(p,c);
  assert.equal(view(p,c,'first').step,'contact');
  assert.ok(removed.every(id=>!(id in p.responses[0].answers)));
  // Stored historical responses carry their own question/answer snapshots.
  const historical=structuredClone(p.responses[0]);historical.instrumentVersion=FESTIVAL_VERSION;
  historical.questions=legacy;historical.answers={...historical.answers,E1_PRE_FAMILIAR:'A little',E1_PRE_PRIOR:'No',E1_PRE_EXPOSURE:'No',E1_PRE_INTEREST:2.6};
  p.responses=[historical];
  assert.deepEqual(researchRows(data).filter(r=>removed.includes(r.itemId)).map(r=>[r.itemId,r.value]),[['E1_PRE_FAMILIAR','A little'],['E1_PRE_PRIOR','No'],['E1_PRE_EXPOSURE','No'],['E1_PRE_INTEREST',2.6]]);
  assert.equal(comparisons(data).length,12);
});

test('Omitted exposure confirmation is null; explicit historical declarations remain accurately recorded',()=>{
  for(const value of [undefined,false,true]){
    const data=empty(),access=key();
    const {p}=enrol(data,{access,agree:true,informationVersion:INFORMATION_VERSION,...(value===undefined?{}:{beforeExposure:value})});
    assert.equal(p.consent.beforeExposureConfirmed,value??null);
    const saved=structuredClone(p.consent);
    enrol(data,{access,agree:true,informationVersion:INFORMATION_VERSION});
    assert.deepEqual(p.consent,saved);
  }
});

test('Declining email can be reversed on the same saved questionnaire with fresh explicit permission',()=>{
  const {data,p,c,access}=setup();first(p,c);
  const original=structuredClone(p.responses),participantId=p.id;
  saveContact(data,p,c,{permission:false,email:'ignored@example.com'});
  assert.equal(view(p,c,'first').step,'stopped');
  assert.equal(c.email,null);assert.equal(c.permission,false);
  assert.equal(assistantRows(data)[0].afterKey,null);
  assert.throws(()=>saveContact(data,p,c,{email:'changed-mind@example.com'}),/Choose whether/);
  assert.equal(c.email,null);assert.equal(c.permission,false);
  saveContact(data,p,c,{permission:true,email:'changed-mind@example.com'});
  assert.equal(view(p,c,'first').step,'waiting');
  assert.equal(c.delivery,'not_sent');assert.equal(c.permission,true);
  assert.ok(c.permissionAt);assert.ok(c.permissionText);
  assert.equal(identify(data,access,'first').p.id,participantId);
  assert.equal(data.research.people.length,1);assert.equal(data.contacts.contacts.length,1);
  assert.deepEqual(p.responses,original);
  assistantAction(data,{action:'prepare_demo',id:p.id});
  submit(p,c,'after',{wave:'post',answers:fill('post',6),startedAt:new Date().toISOString()});
  assert.equal(comparisons(data).length,12);
  assert.ok(comparisons(data).every(r=>r.participantId===participantId&&r.matched&&r.before===2&&r.after===6));
  assert.ok(!JSON.stringify(researchRows(data)).includes('changed-mind@example.com'));
});

test('Participant deletion removes both stores and revokes both personal links',()=>{
  const {data,p,c,access}=setup();first(p,c);saveContact(data,p,c,{permission:true,email:'remove@example.com'});const after=c.afterKey;
  const result=deleteParticipant(data,p.id);assert.equal(result.step,'deleted');assert.equal(data.research.people.length,0);assert.equal(data.contacts.contacts.length,0);
  assert.throws(()=>identify(data,access,'first'),/not recognised/);assert.throws(()=>identify(data,after,'after'),/not recognised/);
});

test('Assistant deletion requires the displayed contact confirmation and removes answers and contact',()=>{
  const {data,p,c}=setup();first(p,c);saveContact(data,p,c,{permission:true,email:'requester@example.com'});
  assert.throws(()=>assistantAction(data,{action:'delete_person',id:p.id,confirmDelete:'wrong@example.com'}),/confirmation/);
  assistantAction(data,{action:'delete_person',id:p.id,confirmDelete:'requester@example.com'});assert.equal(data.research.people.length,0);assert.equal(data.contacts.contacts.length,0);
});

test('Fixed retention deletes contact first and research responses later',()=>{
  const {data,p,c}=setup();first(p,c);saveContact(data,p,c,{permission:true,email:'retention@example.com'});
  purgeExpired(data,Date.parse(CONTACT_DELETE_AT)-1);assert.equal(data.contacts.contacts.length,1);assert.equal(data.research.people.length,1);
  purgeExpired(data,Date.parse(CONTACT_DELETE_AT));assert.equal(data.contacts.contacts.length,0);assert.equal(data.research.people.length,1);assert.equal(assistantRows(data)[0].contactRetained,false);
  purgeExpired(data,Date.parse(RESEARCH_DELETE_AT));assert.equal(data.research.people.length,0);
});

test('Participant information contains the operational age, duration, contact and retention dates',()=>{
  assert.equal(MINIMUM_AGE,18);assert.equal(ESTIMATED_MINUTES,7);assert.equal(CONTACT_EMAIL,'richardcharlesclarke@gmail.com');
  assert.match(CONTACT_DELETE_AT,/2026-10-31/);assert.match(RESEARCH_DELETE_AT,/2027-09-30/);
});

test('Evolvable is offered only after the first questionnaire is complete and transfers no study data',()=>{
  const target=new URL(EVOLVABLE_URL);assert.equal(target.href,'https://www.evolvable.me/');assert.equal(target.search,'');assert.equal(target.hash,'');
  assert.equal(showEvolvableInvitation('waiting','first',['pre']),true);
  assert.equal(showEvolvableInvitation('stopped','first',['pre']),true);
  assert.equal(showEvolvableInvitation('contact','first',['pre']),false);
  assert.equal(showEvolvableInvitation('waiting','after',['pre']),false);
  assert.equal(showEvolvableInvitation('complete','first',['pre','post']),false);
});
