import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {questions,answerError,topicReferenceFromAnswers} from '../lib/brufest/instruments';
import {enrol,context,submit,saveContact,assistantAction,researchRows,comparisons,view} from '../lib/brufest/festival/flow';
import {empty} from '../lib/brufest/festival/store';
import {INFORMATION_VERSION,PREVIOUS_INFORMATION_VERSION,FESTIVAL_PROGRAMME,TOPIC_PROGRAMME} from '../lib/brufest/festival/content';
import {SELECTIVE_INSTRUMENT_VERSION as V4,RESPONSE_SCALE_INSTRUMENT_VERSION as V5,CONTINUOUS_LABELS} from '../lib/brufest/festival/scales';
import type {Answers,TopicReference} from '../lib/brufest/types';
const reference={topic:TOPIC_PROGRAMME[0],view:'Synthetic view'};
const allBranches:Answers={E1_PRE_TOPIC_PANEL:reference.topic,E1_PRE_STARTING_VIEW:reference.view,E1_POST_ENCOUNTER:'Yes',E1_POST_KEYNOTE:'All',E1_POST_SESSIONS:FESTIVAL_PROGRAMME};
function fill(wave:'pre'|'post',version:string,ref?:TopicReference):Answers {
 const a:Answers={...allBranches};for(let pass=0;pass<3;pass++)for(const q of questions(context(wave,version,ref),a))if(a[q.id]===undefined)a[q.id]=q.type==='text'?'Synthetic explanation':q.type==='multi'?[q.options![0]]:q.type==='single'?q.options![0]:q.type==='continuous'?Math.min(q.max!,71.23456789):4;return a;
}
const expected=[
 ['E1_HUM_01','Strongly disagree','Strongly agree'],['E1_HUM_02','Strongly disagree','Strongly agree'],
 ['E1_CUR_02','Not at all willing','Completely willing'],['E1_CUR_01','No desire','Very strong desire'],
 ['E1_REG_01','Not at all able','Fully able'],['E1_CPX_ISSUES','Strongly disagree','Strongly agree'],
 ['E1_AGY_01','Not at all able','Fully able'],['E1_AGY_02','Strongly disagree','Strongly agree'],
 ['E1_REG_02','Not at all able','Fully able'],['E1_ACK_01','Not at all willing','Completely willing'],
 ['E1_LEARN_01','Not at all able','Fully able'],['E1_CPX_UNANTICIPATED','Strongly disagree','Strongly agree'],
 ['E1_REV_WILLING','Not at all willing','Completely willing'],['E1_ACK_COST','Strongly disagree','Strongly agree'],
];
test('V4 full first/second snapshots, including every exposure, learning and topic branch, are frozen',()=>{
 const snapshot=['pre','post'].map(w=>questions(context(w as 'pre'|'post',V4,reference),allBranches));
 assert.deepEqual(snapshot.map(q=>q.length),[27,91]);
 assert.equal(createHash('sha256').update(JSON.stringify(snapshot)).digest('hex'),'084804d7ac98da2e5ca1f4fe0b5a086167ee3f27968a842f98aa7c183e6d52fd');
});
test('Each revised scale fits its statement and changes only labels, retaining wording, direction and continuous bounds',()=>{
 for(const wave of ['pre','post'] as const){
  const old=questions(context(wave,V4,reference),allBranches),current=questions(context(wave,V5,reference),allBranches);
  assert.equal(current.length,old.length);
  for(let i=0;i<current.length;i++){
   const q=current[i],before=old[i],spec=expected.find(s=>s[0]===q.id);
   if(!spec){assert.deepEqual(q,before);continue;}
   assert.deepEqual({...q,low:before.low,high:before.high,bands:before.bands},before);
   assert.equal(q.low,spec[1]);assert.equal(q.high,spec[2]);assert.equal(q.bands?.length,5);assert.equal(q.bands?.[0],q.low);assert.equal(q.bands?.[4],q.high);
   assert.equal(q.type,'continuous');assert.equal(q.min,0);assert.equal(q.max,100);
   for(const v of [0,50,71.23456789,100,{missing:'prefer_not'},{missing:'cannot_assess'}])assert.equal(answerError(q,v),null);
   assert.ok(answerError(q,-1));assert.ok(answerError(q,101));
  }
  assert.deepEqual(current.slice(0,20),questions(context(wave==='pre'?'post':'pre',V5,reference),allBranches).slice(0,20));
  assert.deepEqual(current.filter(q=>q.reverse).slice(0,4).map(q=>q.id),['E1_HUM_02','E1_AGY_02','E1_ACK_COST','E1_EXPECT_CONNECTION_LOSS']);
 }
});
test('V4 and V5 follow-ups retain their own scales, exact baselines, topic references and export values',()=>{
 for(const version of [V4,V5]){
  const data=empty(),{p,c}=enrol(data,{access:randomBytes(32).toString('hex'),agree:true,informationVersion:INFORMATION_VERSION,instrumentVersion:version});p.isTest=true;
  const pre=fill('pre',version);pre.E1_HUM_01=0;pre.E1_HUM_02=100;pre.E1_CUR_02={missing:'cannot_assess'};
  submit(p,c,'first',{wave:'pre',instrumentVersion:version,answers:pre,startedAt:new Date().toISOString()});const saved=JSON.stringify(p.responses[0]);
  saveContact(data,p,c,{permission:true,email:'scales@example.com'});assistantAction(data,{action:'prepare_demo',id:p.id});
  assert.equal(view(p,c,'after').responseInstrument,version);assert.deepEqual(view(p,c,'after').topicReference,reference);
  const wrong=version===V4?V5:V4;
  assert.throws(()=>submit(p,c,'after',{wave:'post',instrumentVersion:wrong,answers:fill('post',wrong,reference),startedAt:new Date().toISOString()}),/personal link/);
  submit(p,c,'after',{wave:'post',instrumentVersion:version,answers:fill('post',version,topicReferenceFromAnswers(pre)),topicReference:{topic:'forged',view:'forged'},startedAt:new Date().toISOString()});
  assert.equal(JSON.stringify(p.responses[0]),saved);assert.ok(comparisons(data).every(r=>r.comparable));
  const rows=researchRows(data);assert.equal(rows.find(r=>r.itemId==='E1_HUM_01')?.value,0);assert.equal(rows.find(r=>r.itemId==='E1_HUM_02')?.value,100);assert.equal(rows.find(r=>r.itemId==='E1_REG_01')?.value,71.23456789);
  assert.equal(rows.find(r=>r.itemId==='E1_HUM_01')?.responseBands?.[0],version===V4?CONTINUOUS_LABELS[0]:'Strongly disagree');
  assert.equal(p.responses[1].questions.find(q=>q.id==='E1_TOPIC_CERTAINTY')?.target,JSON.stringify(reference));
 }
 assert.throws(()=>enrol(empty(),{access:randomBytes(32).toString('hex'),agree:true,informationVersion:PREVIOUS_INFORMATION_VERSION,instrumentVersion:V5}),/information/);
});
test('Imported pairs with changed response labels are explicitly not comparable; unchanged items still are',()=>{
 const data=empty(),{p,c}=enrol(data,{access:randomBytes(32).toString('hex'),agree:true,informationVersion:INFORMATION_VERSION,instrumentVersion:V4});
 submit(p,c,'first',{wave:'pre',instrumentVersion:V4,answers:fill('pre',V4),startedAt:new Date().toISOString()});
 p.responses.push({id:'synthetic-mixed-scales',wave:'post',answers:fill('post',V5,reference),questions:questions(context('post',V5,reference),allBranches),instrumentVersion:V5,programmeVersion:'synthetic',startedAt:new Date().toISOString(),completedAt:new Date().toISOString()});
 const pairs=comparisons(data);for(const [id] of expected)assert.equal(pairs.find(r=>r.itemId===id)?.comparable,false,id);
 for(const id of ['E1_EXPECT_UNDERSTANDING','E1_CONNECTION_WORLD','E1_TOPIC_CERTAINTY'])assert.equal(pairs.find(r=>r.itemId===id)?.comparable,true,id);
});
