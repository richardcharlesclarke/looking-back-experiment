/* eslint-disable @typescript-eslint/no-require-imports */
// Real production runtime, isolated local synthetic store. Never targets a public host.
const assert=require('node:assert/strict'),{randomBytes}=require('node:crypto'),path=require('node:path');
process.env.STUDY_ONE_STORE_DIR=path.resolve('.local/conflict-perception-http-qa');
const {transaction}=require('../.local/brufest-tests/lib/brufest/festival/store');
const {questions,topicReferenceFromAnswers}=require('../.local/brufest-tests/lib/brufest/instruments');
const {CONTINUOUS_INSTRUMENT_VERSION:OLD,PERSPECTIVES_INSTRUMENT_VERSION:V2,CONFLICT_INSTRUMENT_VERSION:V3,SELECTIVE_INSTRUMENT_VERSION:V4,RESPONSE_SCALE_INSTRUMENT_VERSION:V5,CONFLICT_PERCEPTION_INSTRUMENT_VERSION:VERSION}=require('../.local/brufest-tests/lib/brufest/festival/scales');
const {INFORMATION_VERSION,FESTIVAL_VERSION}=require('../.local/brufest-tests/lib/brufest/festival/content');
const base='http://localhost:3143',keys=[];let cookie;
async function api(body){const r=await fetch(base+'/study-one/api/brufest/festival',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({kind:'first',...body})});return {status:r.status,data:await r.json()};}
async function admin(format){const r=await fetch(base+'/api/brufest/festival/assistant?format='+format,{headers:{Cookie:cookie}});assert.equal(r.status,200);return format==='research'?r.json():r.text();}
function fill(wave,version,seed={},topicReference){const a={...seed};for(let i=0;i<3;i++)for(const q of questions({study:'festival',role:'attendee',wave,festivalVersion:FESTIVAL_VERSION,responseInstrument:version,topicReference},a))if(a[q.id]===undefined)a[q.id]=q.type==='text'?'SYNTHETIC local data':q.type==='multi'?[q.options.includes('Cannot remember')?'Cannot remember':q.options[0]]:q.type==='single'?q.options[0]:q.type==='continuous'?Math.min(q.max,71.23456789):4;return a;}
(async()=>{
 const login=await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'local-qa-only'})});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
 for(const [firstVersion,encounter] of [[undefined,'Yes'],[OLD,'Yes'],[V2,'Yes'],[V3,'Yes'],[V4,'Yes'],[V5,'Yes'],[VERSION,'Yes'],[VERSION,'No']]){
  const access=randomBytes(32).toString('hex');keys.push(access);
  const enrol=await api({access,action:'enrol',agree:true,informationVersion:INFORMATION_VERSION,instrumentVersion:firstVersion});assert.equal(enrol.status,200);const id=enrol.data.id;
  const answers=fill('pre',firstVersion);if(firstVersion){answers.E1_HUM_01=0;answers.E1_HUM_02=100;answers.E1_CUR_02={missing:'cannot_assess'};}
  if(firstVersion===VERSION){answers.E1_CONFLICT_PERCEPTION=0;answers.E1_DISCUSSION_WILLINGNESS=10;answers.E1_EXPECT_UNDERSTANDING=0;answers.E1_EXPECT_CONNECTION_LOSS=100;answers.E1_ACK_01={missing:'cannot_assess'};answers.E1_CONNECTION_SIMILAR=1;answers.E1_CONNECTION_WORLD=7;delete answers.E1_FUTURE_OUTLOOK;
   assert.equal((await api({access,action:'submit',wave:'pre',instrumentVersion:firstVersion,answers:{...answers,E1_CONNECTION_WORLD:1.5},startedAt:new Date().toISOString()})).status,400);
  }
  assert.equal((await api({access,action:'submit',wave:'pre',instrumentVersion:firstVersion,answers,startedAt:new Date().toISOString()})).data.step,'contact');
  const original=JSON.stringify((await admin('research')).people.find(p=>p.id===id).responses[0]);
  await api({access,action:'contact',permission:true,email:`synthetic-${keys.length}@example.com`});
  const after=await transaction(d=>d.contacts.contacts.find(c=>c.personId===id).afterKey);
  assert.equal((await api({access:after,kind:'after',action:'status'})).data.step,'waiting');
  await transaction(d=>{d.research.people.find(p=>p.id===id).isTest=true;});
  const prep=await fetch(base+'/api/brufest/festival/assistant',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,Origin:base},body:JSON.stringify({action:'prepare_demo',id})});assert.equal(prep.status,200);
  const expected=firstVersion??FESTIVAL_VERSION;
  assert.equal((await api({access:after,kind:'after',action:'status'})).data.responseInstrument,expected);
  const wrong=firstVersion===VERSION?OLD:VERSION;assert.equal((await api({access:after,kind:'after',action:'submit',wave:'post',instrumentVersion:wrong,answers:fill('post',wrong),startedAt:new Date().toISOString()})).status,400);
  const afterAnswers=fill('post',expected,firstVersion===VERSION?{E1_POST_ENCOUNTER:encounter,E1_POST_TOPIC:'A synthetic topic',E1_POST_DEPTH:'Shallower',E1_POST_POSITION_CHANGE:'My position stayed the same',E1_POST_ASSUMPTION:'No',E1_CONNECTION_SIMILAR:{missing:'prefer_not'}}:{},topicReferenceFromAnswers(answers));
  assert.equal((await api({access:after,kind:'after',action:'submit',wave:'post',instrumentVersion:expected,answers:afterAnswers,startedAt:new Date().toISOString()})).data.step,'complete');
  const stored=(await admin('research')).people.find(p=>p.id===id);assert.equal(JSON.stringify(stored.responses[0]),original);assert.equal(stored.responses[1].answers.E1_CUR_01,firstVersion?71.23456789:4);
  assert.equal(stored.responses.length,2);await api({access:after,kind:'after',action:'submit',wave:'post',instrumentVersion:expected,answers:{},startedAt:new Date().toISOString()});assert.equal((await admin('research')).people.find(p=>p.id===id).responses.length,2);
  if(firstVersion===VERSION){assert.equal(stored.responses[0].answers.E1_CONFLICT_PERCEPTION,0);assert.equal(stored.responses[0].answers.E1_DISCUSSION_WILLINGNESS,10);assert.equal(stored.responses[1].answers.E1_CONFLICT_PERCEPTION,10);assert.equal(stored.responses[1].questions.find(q=>q.id==='E1_DISCUSSION_WILLINGNESS').high,'Very willing to discuss it');assert.equal(stored.responses[0].answers.E1_CONNECTION_WORLD,7);assert.equal(stored.responses[0].answers.E1_EXPECT_UNDERSTANDING,0);assert.equal(stored.responses[0].answers.E1_EXPECT_CONNECTION_LOSS,100);assert.deepEqual(stored.responses[0].questions.find(q=>q.id==='E1_EXPECT_UNDERSTANDING').bands,['Not at all likely','Slightly likely','Somewhat likely','Very likely','Extremely likely']);assert.deepEqual(stored.responses[1].answers.E1_CONNECTION_SIMILAR,{missing:'prefer_not'});if(encounter==='No')assert.equal(stored.responses[1].answers.E1_POST_TOPIC,undefined);else assert.equal(stored.responses[1].answers.E1_POST_DEPTH,'Shallower');}
 }
 const comparison=await admin('comparison'),rows=await admin('responses');assert.ok(comparison.includes(VERSION));assert.ok(rows.includes('People all over the world'));assert.ok(rows.includes('Shallower'));assert.ok(rows.includes('71.23456789'));assert.ok(rows.includes('felt_connection'));assert.ok(!rows.includes('@example.com'));assert.ok(!rows.includes(keys[0]));
 for(const access of keys){assert.equal((await api({access,action:'delete'})).data.step,'deleted');assert.equal((await api({access,action:'status'})).status,400);}
 console.log(JSON.stringify({passed:true,localOnly:true,syntheticParticipants:keys.length,checks:['legacy, continuous, perspectives, conflict, selective item-specific scale and conflict-perception versions','actual HTTP storage export','exact original baselines preserved','version pinned follow-up','date gates','circle endpoints and missing','learning yes and no branches','duplicate suppression','consent and contact isolation','synthetic deletion and link revocation']}));
})().catch(e=>{console.error(e);process.exit(1)});
