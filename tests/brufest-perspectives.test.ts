import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {questions,validateAnswers,answerError} from '../lib/brufest/instruments';
import {enrol,context,submit,saveContact,assistantAction,researchRows,comparisons,view,participantInstrument} from '../lib/brufest/festival/flow';
import {empty} from '../lib/brufest/festival/store';
import {ORIGINAL_INFORMATION_VERSION,ORIGINAL_INFORMATION,INFORMATION_VERSION,FIRST_INSTRUMENT_VERSION,FESTIVAL_VERSION} from '../lib/brufest/festival/content';
import {CONTINUOUS_INSTRUMENT_VERSION as OLD,PERSPECTIVES_INSTRUMENT_VERSION as VERSION} from '../lib/brufest/festival/scales';
import type {Answers} from '../lib/brufest/types';
const stamp=()=>new Date().toISOString();
function fill(wave:'pre'|'post',version=VERSION,seed:Answers={}):Answers {
 const a:Answers={...seed};for(let pass=0;pass<3;pass++)for(const q of questions(context(wave,version),a))if(a[q.id]===undefined)a[q.id]=q.type==='text'?'A synthetic topic and explanation.':q.type==='multi'?[q.options!.includes('Cannot remember')?'Cannot remember':q.options![0]]:q.type==='single'?q.options![0]:q.type==='continuous'?71.23456789:4;
 return a;
}
function person(version?:string){const data=empty();const {p,c}=enrol(data,{access:randomBytes(32).toString('hex'),agree:true,informationVersion:INFORMATION_VERSION,...(version?{instrumentVersion:version}:{})});p.isTest=true;return {data,p,c};}
test('Perspectives retains all 12 exact core items and all three attendance questions; versions do not leak',()=>{
 const old=questions(context('pre',OLD)),now=questions(context('pre',VERSION));assert.equal(now.length,18);
 assert.deepEqual(now.slice(0,12),old.slice(0,12));assert.deepEqual(now.slice(-3),old.slice(-3));
 assert.equal(now.filter(q=>q.type==='circles').length,2);assert.equal(old.filter(q=>q.type==='circles').length,0);
 assert.equal(now.find(q=>q.id==='E1_FUTURE_OUTLOOK')?.required,false);
 const post=questions(context('post',VERSION));assert.ok(!post.some(q=>q.id==='E1_POST_GENERATED'));assert.ok(post.some(q=>q.id==='E1_POST_OPEN'));
 assert.ok(questions(context('post',OLD)).some(q=>q.id==='E1_POST_GENERATED'));
});
test('Connection endpoints, integers, missing values, labels and targets persist and export independently',()=>{
 const {data,p,c}=person(VERSION);const a=fill('pre');Object.assign(a,{E1_CONNECTION_CLOSE:1,E1_CONNECTION_WORLD:7});delete a.E1_FUTURE_OUTLOOK;
 submit(p,c,'first',{wave:'pre',instrumentVersion:VERSION,answers:a,startedAt:stamp()});const snapshot=JSON.stringify(p.responses[0]);
 const restored=JSON.parse(JSON.stringify(data));const rows=researchRows(restored);assert.equal(rows.find(r=>r.itemId==='E1_CONNECTION_WORLD')?.value,7);assert.equal(rows.find(r=>r.itemId==='E1_CONNECTION_WORLD')?.target,'People all over the world');assert.equal(rows.find(r=>r.itemId==='E1_CONNECTION_CLOSE')?.scaleMin,1);assert.equal(rows.find(r=>r.itemId==='E1_CONNECTION_CLOSE')?.responseType,'circles');
 const q=p.responses[0].questions.find(q=>q.type==='circles')!;
 for(const bad of [0,8,1.5,'4',NaN])assert.ok(answerError(q,bad));for(const good of [1,7,{missing:'prefer_not'},{missing:'cannot_assess'}])assert.equal(answerError(q,good),null);
 saveContact(data,p,c,{permission:true,email:'qa@example.com'});assistantAction(data,{action:'prepare_demo',id:p.id});
 const after=fill('post');after.E1_CONNECTION_WORLD={missing:'cannot_assess'};
 submit(p,c,'after',{wave:'post',instrumentVersion:VERSION,answers:after,startedAt:stamp()});assert.equal(JSON.stringify(p.responses[0]),snapshot);assert.equal(comparisons(data).length,15);assert.ok(comparisons(data).every(r=>r.comparable));assert.deepEqual(comparisons(data).find(r=>r.itemId==='E1_CONNECTION_WORLD')?.after,{missing:'cannot_assess'});
});
test('New enrolment is pinned; original baselines route to original follow-up, including seven-point records',()=>{
 for(const version of [FIRST_INSTRUMENT_VERSION,OLD,VERSION]){
  const {data,p,c}=person(version);assert.equal(view(p,c,'first').responseInstrument,version);
  submit(p,c,'first',{wave:'pre',instrumentVersion:version,answers:fill('pre',version),startedAt:stamp()});
  const expected=version===FIRST_INSTRUMENT_VERSION?FESTIVAL_VERSION:version;
  assert.equal(participantInstrument(p,'post'),expected);saveContact(data,p,c,{permission:true,email:'qa@example.com'});assistantAction(data,{action:'prepare_demo',id:p.id});assert.equal(view(p,c,'after').responseInstrument,expected);
  const wrong=version===VERSION?OLD:VERSION;assert.throws(()=>submit(p,c,'after',{wave:'post',instrumentVersion:wrong,answers:fill('post',wrong),startedAt:stamp()}),/personal link/);
  submit(p,c,'after',{wave:'post',instrumentVersion:expected,answers:fill('post',expected),startedAt:stamp()});assert.ok(comparisons(data).every(r=>r.comparable));
 }
 const {p,c}=person(VERSION);assert.throws(()=>submit(p,c,'first',{wave:'pre',instrumentVersion:OLD,answers:fill('pre',OLD),startedAt:stamp()}),/personal link/);
 const existing=person();assert.equal(view(existing.p,existing.c,'first').responseInstrument,OLD);
});
test('Learning branches permit no encounter, no change, negative change and opting out; hidden answers are not saved',()=>{
 for(const encounter of ['No','Cannot recall',{missing:'prefer_not'}] as const){
  const a=fill('post',VERSION,{E1_POST_ENCOUNTER:encounter,E1_POST_TOPIC:'Stale hidden topic'});
  const checked=validateAnswers(context('post',VERSION),a);assert.ok(!checked.questions.some(q=>q.id==='E1_POST_DEPTH'));assert.equal(checked.answers.E1_POST_TOPIC,undefined);
 }
 const a=fill('post',VERSION,{E1_POST_ENCOUNTER:'Yes',E1_POST_DEPTH:'Shallower',E1_POST_ASSUMPTION:'No',E1_POST_POSITION_CHANGE:'My position stayed the same',E1_POST_UNDERSTANDING_ACCOUNT:{missing:'prefer_not'}});
 assert.equal(validateAnswers(context('post',VERSION),a).answers.E1_POST_DEPTH,'Shallower');
 delete a.E1_POST_TOPIC;assert.throws(()=>validateAnswers(context('post',VERSION),a),/topic/);
 a.E1_POST_TOPIC={missing:'prefer_not'};assert.doesNotThrow(()=>validateAnswers(context('post',VERSION),a));
});
test('Changed question meaning or circle referent is not labelled comparable',()=>{
 const {data,p,c}=person(VERSION);submit(p,c,'first',{wave:'pre',instrumentVersion:VERSION,answers:fill('pre'),startedAt:stamp()});saveContact(data,p,c,{permission:true,email:'qa@example.com'});assistantAction(data,{action:'prepare_demo',id:p.id});submit(p,c,'after',{wave:'post',instrumentVersion:VERSION,answers:fill('post'),startedAt:stamp()});
 p.responses[1].questions.find(q=>q.id==='E1_CONNECTION_WORLD')!.target='A different group';assert.equal(comparisons(data).find(q=>q.itemId==='E1_CONNECTION_WORLD')?.comparable,false);
});

test('Cached original consent keeps its exact information while the expanded questionnaire requires current information',()=>{
 const data=empty();const {p}=enrol(data,{access:randomBytes(32).toString('hex'),agree:true,informationVersion:ORIGINAL_INFORMATION_VERSION,instrumentVersion:OLD});
 assert.equal(p.consent.version,ORIGINAL_INFORMATION_VERSION);assert.deepEqual(p.consent.information,ORIGINAL_INFORMATION);assert.match(p.consent.information[2].text,/7 minutes/);
 assert.throws(()=>enrol(data,{access:randomBytes(32).toString('hex'),agree:true,informationVersion:ORIGINAL_INFORMATION_VERSION,instrumentVersion:VERSION}),/information/);
});
