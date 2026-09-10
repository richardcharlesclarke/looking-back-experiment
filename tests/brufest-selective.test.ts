import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {questions,answerError,topicReferenceFromAnswers} from '../lib/brufest/instruments';
import {enrol,context,submit,saveContact,assistantAction,researchRows,comparisons,view} from '../lib/brufest/festival/flow';
import {empty} from '../lib/brufest/festival/store';
import {INFORMATION_VERSION,PREVIOUS_INFORMATION_VERSION,FIRST_INSTRUMENT_VERSION,FESTIVAL_VERSION} from '../lib/brufest/festival/content';
import {CONTINUOUS_INSTRUMENT_VERSION,PERSPECTIVES_INSTRUMENT_VERSION,CONFLICT_INSTRUMENT_VERSION,SELECTIVE_INSTRUMENT_VERSION as VERSION,CONTINUOUS_LABELS,LIKELIHOOD_LABELS} from '../lib/brufest/festival/scales';
import type {Answers,TopicReference} from '../lib/brufest/types';
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const stamp=()=>new Date().toISOString();
function fill(wave:'pre'|'post',version:string,reference?:TopicReference):Answers {
 const a:Answers={};for(let pass=0;pass<3;pass++)for(const q of questions(context(wave,version,reference),a))if(a[q.id]===undefined)a[q.id]=q.type==='text'?'A synthetic explanation.':q.type==='multi'?[q.options!.includes('Cannot remember')?'Cannot remember':q.options![0]]:q.type==='single'?q.options![0]:q.type==='continuous'?Math.min(q.max!,71.23456789):4;return a;
}
test('Selective core separates willingness, ability, acknowledgement, revision and expectations with appropriate scales',()=>{
 const pre=questions(context('pre',VERSION));const post=questions(context('post',VERSION));
 assert.equal(pre.length,24);assert.equal(new Set(pre.map(q=>q.id)).size,pre.length);assert.deepEqual(pre.slice(0,20),post.slice(0,20));
 assert.match(pre[2].prompt,/I am willing to spend time considering/);assert.match(pre[3].prompt,/I want to understand/);assert.match(pre[4].prompt,/I can still understand/);
 assert.equal(pre[9].prompt,'When I recognise a weakness in my view, I am willing to acknowledge it openly.');
 assert.equal(pre[12].prompt,'When I see a good reason to do so, I am willing to revise my position in a disagreement.');assert.ok(!pre[12].reverse);
 assert.equal(pre[13].prompt,'Acknowledging a weakness in my view feels like losing ground.');assert.equal(pre[13].reverse,true);
 assert.ok(!pre.some(q=>q.prompt.includes('I spend time')||q.prompt.includes('negative consequences')||q.prompt.includes('no decision or agreement')));
 for(const q of pre.slice(0,14)){assert.equal(q.type,'continuous');assert.deepEqual(q.bands,CONTINUOUS_LABELS);}
 for(const q of pre.slice(14,16)){assert.deepEqual(q.bands,LIKELIHOOD_LABELS);assert.equal(q.low,'Not at all likely');assert.equal(q.high,'Extremely likely');assert.equal(q.min,0);assert.equal(q.max,100);assert.equal(answerError(q,0),null);assert.equal(answerError(q,100),null);assert.equal(answerError(q,{missing:'cannot_assess'}),null);assert.ok(answerError(q,101));}
 assert.deepEqual(pre.slice(18,20),questions(context('pre',CONFLICT_INSTRUMENT_VERSION)).slice(14,16));assert.deepEqual(pre.slice(21),questions(context('pre',CONFLICT_INSTRUMENT_VERSION)).slice(16));
 assert.deepEqual(post.slice(18),questions(context('post',CONFLICT_INSTRUMENT_VERSION)).slice(14));
});
test('All four earlier instruments retain complete before/after question snapshots',()=>{
 const expected=[
 [FIRST_INSTRUMENT_VERSION,'923047ad233e027012ed6759e507ca5b8cecf6bdd548fdebf46a86d015e35d85'],
 [CONTINUOUS_INSTRUMENT_VERSION,'e0f66324435ca92ee225bfe1bada823a091a0f8f2f15b1bef86be15817530ba2'],
 [PERSPECTIVES_INSTRUMENT_VERSION,'7384017d28f73e1e8684a168d4740ebc4d41a8acbb6fc2abc4fbe082bb712c5a'],
 [CONFLICT_INSTRUMENT_VERSION,'f95064feda71bf7960e4b83e7a417660320f85d1ac633171f7aeac0b9288b803'],
 ];
 for(const [version,digest] of expected)assert.equal(hash(['pre','post'].map(w=>questions(context(w as 'pre'|'post',version),{E1_POST_ENCOUNTER:'Yes'}))),digest,version);
});
test('New and historical baselines keep their own follow-up, reject cross-version submissions, and preserve exact records',()=>{
 for(const version of [FIRST_INSTRUMENT_VERSION,CONTINUOUS_INSTRUMENT_VERSION,PERSPECTIVES_INSTRUMENT_VERSION,CONFLICT_INSTRUMENT_VERSION,VERSION]){
  const data=empty();const {p,c}=enrol(data,{access:randomBytes(32).toString('hex'),agree:true,informationVersion:INFORMATION_VERSION,instrumentVersion:version});p.isTest=true;
  assert.equal(view(p,c,'first').responseInstrument,version);const answers=fill('pre',version);
  if(version===VERSION){answers.E1_EXPECT_UNDERSTANDING=0;answers.E1_EXPECT_CONNECTION_LOSS=100;answers.E1_ACK_01={missing:'cannot_assess'};}
  submit(p,c,'first',{wave:'pre',instrumentVersion:version,answers,startedAt:stamp()});const before=JSON.stringify(p.responses[0]);
  saveContact(data,p,c,{permission:true,email:'synthetic@example.com'});assistantAction(data,{action:'prepare_demo',id:p.id});const expected=version===FIRST_INSTRUMENT_VERSION?FESTIVAL_VERSION:version;
  assert.equal(view(p,c,'after').responseInstrument,expected);const wrong=version===VERSION?CONFLICT_INSTRUMENT_VERSION:VERSION;
  assert.throws(()=>submit(p,c,'after',{wave:'post',instrumentVersion:wrong,answers:fill('post',wrong),startedAt:stamp()}),/personal link/);
  submit(p,c,'after',{wave:'post',instrumentVersion:expected,answers:fill('post',expected,topicReferenceFromAnswers(answers)),startedAt:stamp()});assert.equal(JSON.stringify(p.responses[0]),before);assert.ok(comparisons(data).every(r=>r.comparable));
  if(version===VERSION){const rows=researchRows(data);assert.equal(comparisons(data).length,22);assert.equal(rows.find(r=>r.itemId==='E1_EXPECT_UNDERSTANDING')?.value,0);assert.equal(rows.find(r=>r.itemId==='E1_EXPECT_CONNECTION_LOSS')?.value,100);assert.deepEqual(rows.find(r=>r.itemId==='E1_EXPECT_UNDERSTANDING')?.responseBands,LIKELIHOOD_LABELS);assert.equal(rows.find(r=>r.itemId==='E1_REV_WILLING')?.value,71.23456789);}
 }
 assert.throws(()=>enrol(empty(),{access:randomBytes(32).toString('hex'),agree:true,informationVersion:PREVIOUS_INFORMATION_VERSION,instrumentVersion:VERSION}),/information/);
});
test('Imported mixed versions cannot manufacture new expected-outcome baselines or silently compare changed wording',()=>{
 const data=empty();const {p,c}=enrol(data,{access:randomBytes(32).toString('hex'),agree:true,informationVersion:INFORMATION_VERSION,instrumentVersion:CONFLICT_INSTRUMENT_VERSION});
 submit(p,c,'first',{wave:'pre',instrumentVersion:CONFLICT_INSTRUMENT_VERSION,answers:fill('pre',CONFLICT_INSTRUMENT_VERSION),startedAt:stamp()});
 p.responses.push({id:'synthetic-mixed',wave:'post',answers:fill('post',VERSION),questions:questions(context('post',VERSION),fill('post',VERSION)),instrumentVersion:VERSION,programmeVersion:'synthetic',startedAt:stamp(),completedAt:stamp()});
 const pairs=comparisons(data);assert.equal(pairs.find(q=>q.itemId==='E1_HUM_01')?.comparable,false);assert.equal(pairs.find(q=>q.itemId==='E1_CUR_02')?.comparable,true);assert.equal(pairs.find(q=>q.itemId==='E1_REV_01')?.after,null);assert.ok(!pairs.some(q=>q.itemId==='E1_EXPECT_UNDERSTANDING'));
});
test('Topic reference is copied exactly from the baseline, rated on 0–10, and cannot be replaced by the client',()=>{
 const data=empty();const {p,c}=enrol(data,{access:randomBytes(32).toString('hex'),agree:true,informationVersion:INFORMATION_VERSION,instrumentVersion:VERSION});p.isTest=true;
 const a=fill('pre',VERSION);a.E1_PRE_STARTING_VIEW='  My actual starting view.\nKeep these exact words.  ';a.E1_TOPIC_CERTAINTY=0;a.E1_TOPIC_RECONSIDER=10;
 submit(p,c,'first',{wave:'pre',instrumentVersion:VERSION,answers:a,startedAt:stamp()});const before=JSON.stringify(p.responses[0]);
 saveContact(data,p,c,{permission:true,email:'topic@example.com'});assistantAction(data,{action:'prepare_demo',id:p.id});const reference=topicReferenceFromAnswers(a)!;assert.deepEqual(view(p,c,'after').topicReference,reference);
 const post=fill('post',VERSION,reference);Object.assign(post,{E1_PRE_TOPIC_PANEL:'A forged topic',E1_PRE_STARTING_VIEW:'A rewritten starting view',E1_TOPIC_CERTAINTY:2.34567,E1_TOPIC_RECONSIDER:{missing:'cannot_assess'}});
 submit(p,c,'after',{wave:'post',instrumentVersion:VERSION,answers:post,topicReference:{topic:'forged',view:'forged'},startedAt:stamp()});assert.equal(JSON.stringify(p.responses[0]),before);
 const saved=p.responses[1];assert.equal(saved.answers.E1_PRE_STARTING_VIEW,undefined);assert.equal(saved.answers.E1_TOPIC_CERTAINTY,2.34567);
 for(const id of ['E1_TOPIC_CERTAINTY','E1_TOPIC_RECONSIDER']){const q=saved.questions.find(q=>q.id===id)!;assert.equal(q.target,JSON.stringify(reference));assert.equal(q.min,0);assert.equal(q.max,10);assert.deepEqual(q,p.responses[0].questions.find(q=>q.id===id));assert.equal(comparisons(data).find(q=>q.itemId===id)?.comparable,true);}
});
test('Skipping the topic or starting view never invents later certainty questions; changed circle targets remain separate',()=>{
 const skipped:Answers={E1_PRE_TOPIC_PANEL:'None of these',E1_PRE_STARTING_VIEW:'Stale draft',E1_TOPIC_CERTAINTY:8};
 assert.equal(topicReferenceFromAnswers(skipped),undefined);assert.ok(!questions(context('pre',VERSION),skipped).some(q=>q.id==='E1_TOPIC_CERTAINTY'));
 assert.ok(!questions(context('post',VERSION)).some(q=>q.id==='E1_TOPIC_CERTAINTY'));
 const pre=questions(context('pre',VERSION));const circles=pre.filter(q=>q.type==='circles');assert.deepEqual(circles.map(q=>q.prompt),['How connected do you feel to people who have similar views to your own?','How connected do you feel to people who have views that are significantly different from your own?','How connected do you feel to people all over the world?']);assert.ok(!pre.some(q=>q.id==='E1_CONNECTION_CLOSE'));
 const selected=fill('pre',VERSION);selected.E1_PRE_STARTING_VIEW={missing:'prefer_not'};assert.equal(topicReferenceFromAnswers(selected),undefined);assert.ok(!questions(context('pre',VERSION),selected).some(q=>q.id==='E1_TOPIC_RECONSIDER'));
});
