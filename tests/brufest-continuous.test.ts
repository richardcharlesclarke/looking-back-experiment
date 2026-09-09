import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {questions,validateAnswers,answerError} from '../lib/brufest/instruments';
import {enrol,context,submit,saveContact,assistantAction,researchRows,comparisons} from '../lib/brufest/festival/flow';
import {empty} from '../lib/brufest/festival/store';
import {INFORMATION_VERSION,FIRST_INSTRUMENT_VERSION,FESTIVAL_VERSION} from '../lib/brufest/festival/content';
import {CONTINUOUS_INSTRUMENT_VERSION as VERSION,CONTINUOUS_LABELS,responseBand} from '../lib/brufest/festival/scales';
import type {Answers} from '../lib/brufest/types';
const timestamp=()=>new Date().toISOString();
function answers(wave:'pre'|'post',version?:string):Answers {
 const a:Answers={};for(let pass=0;pass<3;pass++)for(const q of questions(context(wave,version),a))if(a[q.id]===undefined)a[q.id]=q.type==='text'?'SYNTHETIC':q.type==='multi'?[q.options!.includes('Cannot remember')?'Cannot remember':q.options![0]]:q.type==='single'?q.options!.includes('No')?'No':q.options![0]:q.type==='continuous'?71.23456789:4;
 return a;
}
function person(){const data=empty();const {p,c}=enrol(data,{access:randomBytes(32).toString('hex'),agree:true,informationVersion:INFORMATION_VERSION});p.isTest=true;return {data,p,c};}
test('New core questions preserve prompts and order, have five descriptive bands and explicit 0–100 bounds',()=>{
 const old=questions(context('pre')),current=questions(context('pre',VERSION));
 assert.deepEqual(current.map(q=>q.id),old.map(q=>q.id));assert.deepEqual(current.map(q=>q.prompt),old.map(q=>q.prompt));
 assert.equal(current.filter(q=>q.type==='continuous').length,12);
 for(const q of current.slice(0,12)){assert.equal(q.min,0);assert.equal(q.max,100);assert.deepEqual(q.bands,CONTINUOUS_LABELS);}
 assert.ok(old.slice(0,12).every(q=>q.type==='likert'&&q.min===1&&q.max===7));
 assert.ok(questions(context('post',VERSION),{E1_POST_KEYNOTE:'All'}).find(q=>q.id==='E1_POST_KEYNOTE_IMPACT')?.max===10);
});
test('Exact raw continuous values, zero, endpoints and explicit missing responses survive validation and export',()=>{
 const {data,p,c}=person();const a=answers('pre',VERSION);Object.assign(a,{E1_HUM_01:0,E1_HUM_02:100,E1_CUR_01:71.23456789,E1_CUR_02:2,E1_REG_01:{missing:'prefer_not'},E1_REG_02:{missing:'cannot_assess'}});
 const checked=validateAnswers(context('pre',VERSION),a);assert.deepEqual(checked.answers,a);
 submit(p,c,'first',{wave:'pre',instrumentVersion:VERSION,answers:a,startedAt:timestamp()});
 const restored=JSON.parse(JSON.stringify(data));assert.deepEqual(restored.research.people[0].responses[0].answers,a);
 const rows=researchRows(restored);const row=rows.find(r=>r.itemId==='E1_CUR_01')!;assert.equal(row.value,71.23456789);assert.equal(row.scaleMax,100);assert.equal(row.responseType,'continuous');assert.equal(row.instrumentVersion,VERSION);
 for(const n of [-1,100.01,NaN,Infinity,'71'])assert.ok(answerError(checked.questions[0],n));
});
test('Cached legacy clients stay seven-point; unknown formats fail; old 2 is never relabelled as 2/100',()=>{
 const {p,c}=person();const a=answers('pre');a.E1_HUM_01=2;
 assert.throws(()=>submit(p,c,'first',{wave:'pre',instrumentVersion:'unknown',answers:a,startedAt:timestamp()}),/version/);
 assert.throws(()=>submit(p,c,'first',{wave:'pre',answers:{...a,E1_HUM_01:71},startedAt:timestamp()}),/scale/);
 submit(p,c,'first',{wave:'pre',answers:a,startedAt:timestamp()});assert.equal(p.responses[0].instrumentVersion,FIRST_INSTRUMENT_VERSION);assert.equal(p.responses[0].questions[0].max,7);assert.equal(p.responses[0].answers.E1_HUM_01,2);
});
test('Mixed before/after formats remain matched by identity but are explicitly non-comparable without conversion',()=>{
 const {data,p,c}=person();submit(p,c,'first',{wave:'pre',answers:answers('pre'),startedAt:timestamp()});const legacy=JSON.stringify(p.responses[0]);
 saveContact(data,p,c,{permission:true,email:'qa@example.com'});assistantAction(data,{action:'prepare_demo',id:p.id});
 assert.throws(()=>submit(p,c,'after',{wave:'post',instrumentVersion:VERSION,answers:answers('post',VERSION),startedAt:timestamp()}),/personal link/);
 // Existing mixed-format records remain readable even though new mixed submissions are prevented.
 const checked=validateAnswers(context('post',VERSION),answers('post',VERSION));
 p.responses.push({id:'historical-mixed',wave:'post',instrumentVersion:VERSION,programmeVersion:'historical',...checked,startedAt:timestamp(),completedAt:timestamp()});
 assert.equal(JSON.stringify(p.responses[0]),legacy);const rows=comparisons(data);assert.equal(rows.length,12);
 for(const r of rows){assert.equal(r.matched,true);assert.equal(r.comparable,false);assert.equal(r.before,4);assert.equal(r.after,71.23456789);assert.equal(r.beforeMax,7);assert.equal(r.afterMax,100);assert.match(r.comparisonNote,/Different/);assert.equal(r.beforeInstrumentVersion,FIRST_INSTRUMENT_VERSION);assert.equal(r.afterInstrumentVersion,VERSION);}
});
test('Same-format comparisons retain original metadata and missing post records stay non-comparable',()=>{
 const {data,p,c}=person();submit(p,c,'first',{wave:'pre',instrumentVersion:VERSION,answers:answers('pre',VERSION),startedAt:timestamp()});assert.ok(comparisons(data).every(r=>!r.matched&&!r.comparable));
 saveContact(data,p,c,{permission:true,email:'qa@example.com'});assistantAction(data,{action:'prepare_demo',id:p.id});submit(p,c,'after',{wave:'post',instrumentVersion:VERSION,answers:answers('post',VERSION),startedAt:timestamp()});assert.ok(comparisons(data).every(r=>r.comparable));
 assert.equal(FESTIVAL_VERSION,'brufest-study-one-v0.2-2026-09-07');assert.equal(FIRST_INSTRUMENT_VERSION,'brufest-study-one-pre-v0.3-2026-09-07');
});
test('Descriptive bands switch at each boundary without affecting raw values',()=>{
 assert.deepEqual([0,19.999,20,39.999,40,59.999,60,79.999,80,100].map(n=>responseBand(n)),[0,0,1,1,2,2,3,3,4,4]);
});
