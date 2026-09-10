import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {questions,answerError} from '../lib/brufest/instruments';
import {enrol,context,submit,saveContact,assistantAction,researchRows,comparisons,view} from '../lib/brufest/festival/flow';
import {empty} from '../lib/brufest/festival/store';
import {INFORMATION_VERSION,FESTIVAL_PROGRAMME,TOPIC_PROGRAMME} from '../lib/brufest/festival/content';
import {RESPONSE_SCALE_INSTRUMENT_VERSION as V5,CONFLICT_PERCEPTION_INSTRUMENT_VERSION as V6} from '../lib/brufest/festival/scales';
import type {Answers} from '../lib/brufest/types';
const reference={topic:TOPIC_PROGRAMME[0],view:'Synthetic view'};
const allBranches:Answers={E1_PRE_TOPIC_PANEL:reference.topic,E1_PRE_STARTING_VIEW:reference.view,E1_POST_ENCOUNTER:'Yes',E1_POST_KEYNOTE:'All',E1_POST_SESSIONS:FESTIVAL_PROGRAMME};
const ids=['E1_CONFLICT_PERCEPTION','E1_DISCUSSION_WILLINGNESS'];
function fill(wave:'pre'|'post',version:string):Answers {
 const a:Answers={...allBranches};for(let pass=0;pass<3;pass++)for(const q of questions(context(wave,version,reference),a))if(a[q.id]===undefined)a[q.id]=q.type==='text'?'Synthetic explanation':q.type==='multi'?[q.options![0]]:q.type==='single'?q.options![0]:q.type==='continuous'?Math.min(q.max!,7.123456789):4;return a;
}
test('V5 complete snapshots stay frozen; V6 only adds two identical 0–10 items before the connection questions',()=>{
 const old=['pre','post'].map(w=>questions(context(w as 'pre'|'post',V5,reference),allBranches));
 assert.equal(createHash('sha256').update(JSON.stringify(old)).digest('hex'),'5be25e4017e87e9305cc823cdbb0ab3da185a70172e732508d082ea96ad02b64');
 for(const [i,wave] of (['pre','post'] as const).entries()){
  const current=questions(context(wave,V6,reference),allBranches);
  assert.equal(current.length,old[i].length+2);assert.deepEqual(current.filter(q=>!ids.includes(q.id)),old[i]);
  assert.deepEqual(current.slice(16,18).map(q=>q.id),ids);assert.equal(current[18].id,'E1_CONNECTION_SIMILAR');
  assert.deepEqual(current.slice(16,18),questions(context(wave==='pre'?'post':'pre',V6,reference),allBranches).slice(16,18));
  for(const q of current.slice(16,18)){
   assert.equal(q.type,'continuous');assert.equal(q.min,0);assert.equal(q.max,10);assert.ok(!q.reverse);assert.equal(q.bands?.length,5);
   for(const n of [0,5,7.123456789,10,{missing:'prefer_not'},{missing:'cannot_assess'}])assert.equal(answerError(q,n),null);
   assert.ok(answerError(q,-.1));assert.ok(answerError(q,10.1));assert.ok(answerError(q,undefined));
  }
 }
});
test('Conflict value and willingness to discuss use separate constructs and coherent approved stems/anchors',()=>{
 const [value,willingness]=questions(context('pre',V6)).slice(16,18);
 assert.equal(value.prompt,'When you think about conflict with someone over an issue that matters to you, how do you tend to see the conflict itself?');
 assert.equal(value.low,'Something destructive that diminishes what’s possible');assert.equal(value.high,'Something generative that can create new possibilities');assert.equal(value.construct,'perceived_conflict_value');
 assert.equal(willingness.prompt,'When you anticipate a disagreement with someone over an issue that matters to you, how willing are you to discuss it with them?');
 assert.equal(willingness.low,'Not at all willing to discuss it');assert.equal(willingness.high,'Very willing to discuss it');assert.equal(willingness.construct,'willingness_to_discuss_disagreement');
 for(const q of [value,willingness])assert.equal(q.help,`0 — ${q.low} → 10 — ${q.high}`);
 assert.deepEqual(willingness.bands,['Not at all willing','Slightly willing','Moderately willing','Quite willing','Very willing']);
});
test('V5/V6 enrolment and baseline pin their own follow-up; original answers and raw new decimals survive export',()=>{
 for(const version of [V5,V6]){
  const data=empty(),{p,c}=enrol(data,{access:randomBytes(32).toString('hex'),agree:true,informationVersion:INFORMATION_VERSION,instrumentVersion:version});p.isTest=true;
  assert.equal(view(p,c,'first').responseInstrument,version);
  const pre=fill('pre',version);if(version===V6){pre[ids[0]]=0;pre[ids[1]]=10;}
  submit(p,c,'first',{wave:'pre',instrumentVersion:version,answers:pre,startedAt:new Date().toISOString()});const saved=JSON.stringify(p.responses[0]);
  saveContact(data,p,c,{permission:true,email:'conflict@example.com'});assistantAction(data,{action:'prepare_demo',id:p.id});assert.equal(view(p,c,'after').responseInstrument,version);assert.deepEqual(view(p,c,'after').topicReference,reference);
  const wrong=version===V5?V6:V5;assert.throws(()=>submit(p,c,'after',{wave:'post',instrumentVersion:wrong,answers:fill('post',wrong),startedAt:new Date().toISOString()}),/personal link/);
  submit(p,c,'after',{wave:'post',instrumentVersion:version,answers:fill('post',version),startedAt:new Date().toISOString()});assert.equal(JSON.stringify(p.responses[0]),saved);assert.ok(comparisons(data).every(r=>r.comparable));
  const rows=researchRows(data),pairs=comparisons(data).filter(r=>ids.includes(r.itemId));assert.equal(pairs.length,version===V6?2:0);
  if(version===V6){assert.equal(rows.find(r=>r.itemId===ids[0])?.value,0);assert.equal(rows.find(r=>r.itemId===ids[1])?.value,10);for(const id of ids){assert.equal(p.responses[1].answers[id],7.123456789);assert.deepEqual(p.responses[0].questions.find(q=>q.id===id),p.responses[1].questions.find(q=>q.id===id));}}
  else assert.ok(!p.responses.some(r=>r.questions.some(q=>ids.includes(q.id))));
 }
});
test('An imported V5/V6 pair cannot fabricate baselines for the two additions',()=>{
 const data=empty(),{p,c}=enrol(data,{access:randomBytes(32).toString('hex'),agree:true,informationVersion:INFORMATION_VERSION,instrumentVersion:V5});
 submit(p,c,'first',{wave:'pre',instrumentVersion:V5,answers:fill('pre',V5),startedAt:new Date().toISOString()});
 p.responses.push({id:'synthetic-mixed-perception',wave:'post',answers:fill('post',V6),questions:questions(context('post',V6,reference),allBranches),instrumentVersion:V6,programmeVersion:'synthetic',startedAt:new Date().toISOString(),completedAt:new Date().toISOString()});
 assert.ok(!comparisons(data).some(r=>ids.includes(r.itemId)));assert.ok(comparisons(data).every(r=>r.comparable));
});
