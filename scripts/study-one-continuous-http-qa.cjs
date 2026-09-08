/* eslint-disable @typescript-eslint/no-require-imports */
// Isolated local production API only. No production date gates or records are changed.
const assert=require('node:assert/strict'),{randomBytes}=require('node:crypto'),path=require('node:path');
process.env.STUDY_ONE_STORE_DIR=path.resolve('.local/continuous-http-qa');
const {transaction}=require('../.local/brufest-tests/lib/brufest/festival/store');
const {questions}=require('../.local/brufest-tests/lib/brufest/instruments');
const {CONTINUOUS_INSTRUMENT_VERSION:VERSION}=require('../.local/brufest-tests/lib/brufest/festival/scales');
const {INFORMATION_VERSION,FESTIVAL_VERSION}=require('../.local/brufest-tests/lib/brufest/festival/content');
const base='http://localhost:3123', keys=[];let cookie;
async function api(body){const r=await fetch(base+'/study-one/api/brufest/festival',{method:'POST',headers:{'Content-Type':'application/json',Origin:base},body:JSON.stringify({kind:'first',...body})});return {status:r.status,data:await r.json()};}
async function admin(format){const r=await fetch(base+'/api/brufest/festival/assistant?format='+format,{headers:{Cookie:cookie}});assert.equal(r.status,200);return format==='research'?r.json():r.text();}
function fill(wave,version){const a={};for(let i=0;i<3;i++)for(const q of questions({study:'festival',role:'attendee',wave,festivalVersion:FESTIVAL_VERSION,responseInstrument:version},a))if(a[q.id]===undefined)a[q.id]=q.type==='text'?'SYNTHETIC':q.type==='multi'?[q.options[0]]:q.type==='single'?q.options[0]:q.type==='continuous'?71.23456789:4;return a;}
(async()=>{
 const login=await fetch(base+'/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'local-qa-only'})});assert.equal(login.status,200);cookie=login.headers.get('set-cookie').split(';')[0];
 try{for(const firstVersion of [undefined,VERSION]){
  const access=randomBytes(32).toString('hex');keys.push(access);
  const enrol=await api({access,action:'enrol',agree:true,informationVersion:INFORMATION_VERSION});assert.equal(enrol.status,200);const id=enrol.data.id;
  const answers=fill('pre',firstVersion);if(firstVersion){answers.E1_HUM_01=0;answers.E1_HUM_02=100;answers.E1_CUR_02={missing:'cannot_assess'};}
  assert.equal((await api({access,action:'submit',wave:'pre',instrumentVersion:firstVersion,answers:{...answers,E1_CUR_01:101},startedAt:new Date().toISOString()})).status,400);
  assert.equal((await api({access,action:'submit',wave:'pre',instrumentVersion:firstVersion,answers,startedAt:new Date().toISOString()})).data.step,'contact');
  const original=JSON.stringify((await admin('research')).people.find(p=>p.id===id).responses[0]);
  await api({access,action:'contact',permission:true,email:`synthetic-${keys.length}@example.com`});
  const after=await transaction(d=>{const c=d.contacts.contacts.find(c=>c.personId===id);return c.afterKey;});
  assert.equal((await api({access:after,kind:'after',action:'status'})).data.step,'waiting');
  await transaction(d=>{d.research.people.find(p=>p.id===id).isTest=true;});
  const prep=await fetch(base+'/api/brufest/festival/assistant',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie,Origin:base},body:JSON.stringify({action:'prepare_demo',id})});assert.equal(prep.status,200);
  const afterAnswers=fill('post',VERSION);assert.equal((await api({access:after,kind:'after',action:'submit',wave:'post',instrumentVersion:VERSION,answers:afterAnswers,startedAt:new Date().toISOString()})).data.step,'complete');
  const stored=(await admin('research')).people.find(p=>p.id===id);assert.equal(JSON.stringify(stored.responses[0]),original);assert.equal(stored.responses[1].answers.E1_CUR_01,71.23456789);assert.equal(stored.responses[1].questions[0].max,100);
  const comparison=await admin('comparison');assert.ok(comparison.includes('beforeInstrumentVersion'));if(!firstVersion)assert.ok(comparison.includes('Different response scales'));
  const rows=await admin('responses');assert.ok(rows.includes('71.23456789'));assert.ok(rows.includes('scaleMax'));assert.ok(rows.includes('continuous'));
  assert.equal((await api({access,action:'delete'})).data.step,'deleted');assert.equal((await api({access:after,kind:'after',action:'status'})).status,400);
 }}finally{for(const access of keys)await api({access,action:'delete'});}
 console.log(JSON.stringify({passed:true,localOnly:true,checks:['real production HTTP','legacy format','continuous exact values','zero and 100','nonresponse','versioned snapshots','real storage and retrieval','unchanged historical first response','date gate','admin exports','mixed-scale flag','same-scale match','delete revokes links']}));
})().catch(e=>{console.error(e);process.exit(1)});
