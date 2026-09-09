import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash,randomBytes} from 'node:crypto';
import {questions} from '../lib/brufest/instruments';
import {enrol,context,submit,saveContact,assistantAction,researchRows,comparisons,view} from '../lib/brufest/festival/flow';
import {empty} from '../lib/brufest/festival/store';
import {ORIGINAL_INFORMATION_VERSION,ORIGINAL_INFORMATION,PREVIOUS_INFORMATION_VERSION,PREVIOUS_INFORMATION,INFORMATION_VERSION,INFORMATION,FIRST_INSTRUMENT_VERSION,FESTIVAL_VERSION,CONTACT_EMAIL} from '../lib/brufest/festival/content';
import {CONTINUOUS_INSTRUMENT_VERSION,PERSPECTIVES_INSTRUMENT_VERSION as OLD,CONFLICT_INSTRUMENT_VERSION as VERSION} from '../lib/brufest/festival/scales';
import type {Answers} from '../lib/brufest/types';
const stamp=()=>new Date().toISOString();
const hash=(x:unknown)=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
function fill(wave:'pre'|'post',version=VERSION):Answers {
 const a:Answers={};for(let pass=0;pass<3;pass++)for(const q of questions(context(wave,version),a))if(a[q.id]===undefined)a[q.id]=q.type==='text'?'A synthetic explanation.':q.type==='multi'?[q.options!.includes('Cannot remember')?'Cannot remember':q.options![0]]:q.type==='single'?q.options![0]:q.type==='continuous'?71.23456789:4;return a;
}
function person(version=VERSION,informationVersion=INFORMATION_VERSION){const data=empty();const {p,c}=enrol(data,{access:randomBytes(32).toString('hex'),agree:true,informationVersion,instrumentVersion:version});p.isTest=true;return {data,p,c};}
test('Recording revision has nine explicit items for original Q1–8, with Q7 split and 19 first questions',()=>{
 const q=questions(context('pre',VERSION));assert.equal(q.length,19);
 assert.deepEqual(q.slice(0,9).map(x=>[x.id,x.prompt]),[
  ['E1_HUM_01','My view on an important issue contains weaknesses I have not yet recognized.'],
  ['E1_HUM_02','I see little value in revisiting the opposing case.'],
  ['E1_CUR_01','When someone strongly disagrees with me, I want to understand how their view makes sense to them.'],
  ['E1_CUR_02','I am willing to spend time considering the strongest argument against a view I hold.'],
  ['E1_REG_01','When I reject someone’s conclusion, I can still understand the concern or value behind it.'],
  ['E1_REG_02','I can disagree strongly with a person’s view without rejecting the person.'],
  ['E1_CPX_ISSUES','Important conflicts often involve several issues, not just a choice between two sides.'],
  ['E1_CPX_CONSEQUENCES','Choices in important conflicts can have several connected consequences.'],
  ['E1_CPX_02','A useful conflict can expand one’s perception of a problem, even when nobody changes sides.'],
 ]);assert.ok(!q.some(x=>x.id==='E1_CPX_01'));assert.equal(q[1].reverse,true);
 const old=questions(context('pre',OLD));assert.deepEqual(q[2],old[2]);assert.deepEqual(q.slice(9,13),old.slice(8,12));assert.deepEqual(q.slice(13),old.slice(12));
 for(const x of q.slice(0,13)){assert.equal(x.type,'continuous');assert.equal(x.min,0);assert.equal(x.max,100);assert.deepEqual(x.bands,old[0].bands);}
 assert.deepEqual(questions(context('post',VERSION)).slice(13),questions(context('post',OLD)).slice(12));
});
test('Each split response saves separately with exact values and identical before/after wording',()=>{
 const {data,p,c}=person();const a=fill('pre');Object.assign(a,{E1_CPX_ISSUES:0,E1_CPX_CONSEQUENCES:100,E1_HUM_02:{missing:'cannot_assess'}});
 submit(p,c,'first',{wave:'pre',instrumentVersion:VERSION,answers:a,startedAt:stamp()});const before=JSON.stringify(p.responses[0]);
 saveContact(data,p,c,{permission:true,email:'qa@example.com'});assistantAction(data,{action:'prepare_demo',id:p.id});const post=fill('post');post.E1_CPX_CONSEQUENCES={missing:'prefer_not'};
 submit(p,c,'after',{wave:'post',instrumentVersion:VERSION,answers:post,startedAt:stamp()});assert.equal(JSON.stringify(p.responses[0]),before);
 const rows=researchRows(data);assert.equal(rows.find(r=>r.wave==='pre'&&r.itemId==='E1_CPX_ISSUES')?.value,0);assert.equal(rows.find(r=>r.wave==='pre'&&r.itemId==='E1_CPX_CONSEQUENCES')?.value,100);assert.ok(!rows.some(r=>r.itemId==='E1_CPX_01'));
 const pairs=comparisons(data);assert.equal(pairs.length,16);assert.ok(pairs.every(r=>r.comparable));assert.deepEqual(pairs.find(r=>r.itemId==='E1_CPX_CONSEQUENCES')?.after,{missing:'prefer_not'});
 assert.equal(rows.find(r=>r.itemId==='E1_CUR_01')?.value,71.23456789);
});
test('Every prior instrument keeps its pinned first form and compatible follow-up after revision',()=>{
 for(const version of [FIRST_INSTRUMENT_VERSION,CONTINUOUS_INSTRUMENT_VERSION,OLD,VERSION]){
  const {data,p,c}=person(version);assert.equal(view(p,c,'first').responseInstrument,version);submit(p,c,'first',{wave:'pre',instrumentVersion:version,answers:fill('pre',version),startedAt:stamp()});const before=JSON.stringify(p.responses[0]);
  saveContact(data,p,c,{permission:true,email:'qa@example.com'});assistantAction(data,{action:'prepare_demo',id:p.id});const expected=version===FIRST_INSTRUMENT_VERSION?FESTIVAL_VERSION:version;assert.equal(view(p,c,'after').responseInstrument,expected);
  const wrong=version===VERSION?OLD:VERSION;assert.throws(()=>submit(p,c,'after',{wave:'post',instrumentVersion:wrong,answers:fill('post',wrong),startedAt:stamp()}),/personal link/);
  submit(p,c,'after',{wave:'post',instrumentVersion:expected,answers:fill('post',expected),startedAt:stamp()});assert.equal(JSON.stringify(p.responses[0]),before);assert.ok(comparisons(data).every(r=>r.comparable));
  if(version!==VERSION){assert.match(p.responses[0].questions[0].prompt,/may contain/);assert.ok(!p.responses[0].questions.some(q=>q.id==='E1_CPX_ISSUES'));}
 }
 const {p,c}=person(OLD,PREVIOUS_INFORMATION_VERSION);assert.throws(()=>submit(p,c,'first',{wave:'pre',instrumentVersion:VERSION,answers:fill('pre'),startedAt:stamp()}),/personal link/);
});
test('Historical information remains byte-for-byte identical while current contact is Beau',()=>{
 assert.equal(hash(PREVIOUS_INFORMATION),'2f4c13d602cbbec77dda9ce898a8ee1a33c427fc3f3f42bb7383cd0ceb1a459a');
 assert.equal(hash(ORIGINAL_INFORMATION),'a5bfb048a0c5d1509f6d79afa5f9b6ca8e6e1ef8e9e6bbbfdb0b2147e2d2a475');
 assert.match(INFORMATION[0].text,/Beau Lotto leads the study/);assert.match(PREVIOUS_INFORMATION[3].text,/Richard Clarke leads the study/);assert.equal(CONTACT_EMAIL,'beau@labofmisfits.com');assert.match(INFORMATION[4].text,/beau@labofmisfits.com/);assert.match(INFORMATION[0].text,/does not establish that the festival caused/);
 assert.deepEqual(person(OLD,PREVIOUS_INFORMATION_VERSION).p.consent.information,PREVIOUS_INFORMATION);
 assert.deepEqual(person(CONTINUOUS_INSTRUMENT_VERSION,ORIGINAL_INFORMATION_VERSION).p.consent.information,ORIGINAL_INFORMATION);
 for(const old of [PREVIOUS_INFORMATION_VERSION,ORIGINAL_INFORMATION_VERSION])assert.throws(()=>person(VERSION,old),/information/);
});
test('Mixed historical snapshots never manufacture a Q7 baseline or compare changed wording as equal',()=>{
 const {data,p,c}=person(OLD);submit(p,c,'first',{wave:'pre',instrumentVersion:OLD,answers:fill('pre',OLD),startedAt:stamp()});
 // Simulate imported historical mixed data; normal submission correctly rejects this pairing.
 p.responses.push({id:'synthetic-mixed',wave:'post',answers:fill('post'),questions:questions(context('post',VERSION),fill('post')),instrumentVersion:VERSION,programmeVersion:'synthetic',startedAt:stamp(),completedAt:stamp()});
 const pairs=comparisons(data);assert.equal(pairs.find(q=>q.itemId==='E1_HUM_01')?.comparable,false);assert.equal(pairs.find(q=>q.itemId==='E1_CPX_01')?.after,null);assert.ok(!pairs.some(q=>q.itemId==='E1_CPX_CONSEQUENCES'));assert.equal(pairs.find(q=>q.itemId==='E1_CUR_01')?.comparable,true);assert.equal(pairs.find(q=>q.itemId==='E1_REV_01')?.comparable,true);
});
