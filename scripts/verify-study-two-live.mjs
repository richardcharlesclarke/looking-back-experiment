import {randomBytes,createHash} from 'node:crypto';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {INFORMATION_VERSION} from '../services/study-two-store/participation.mjs';
import {instrumentVersion} from '../services/study-two-store/instrument.mjs';
const [mode='seed',proofPath='/tmp/study-two-live-persistence-proof.json',base='https://experiments.evolvable.me']=process.argv.slice(2);
async function api(body,expected=200){const response=await fetch(base+'/study-two/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await response.json();assert.equal(response.status,expected,data.error??'Unexpected status');return data;}
const health=await (await fetch(base+'/study-two/api')).json();assert.equal(health.ok,true);
const digest=a=>createHash('sha256').update(JSON.stringify(a)).digest('hex');
const answers=items=>Object.fromEntries(items.map(q=>[q.id,q.type==='rating'?1:q.type==='continuous'?0:q.type==='single'?q.options[0]:q.optional?{missing:'skipped'}:'Synthetic verification response']));
if(mode==='seed'){
 const file=await fs.open(proofPath,'wx',0o600);await file.close();const proof={health,records:[]};
 for(const role of ['speaker','audience']){
  const access=randomBytes(32).toString('hex'),common={access,role,instrumentVersion:instrumentVersion(role)};
  let p=await api({...common,action:'enrol',agree:true,informationVersion:INFORMATION_VERSION,consentKind:'research',isTest:true,testLabel:'QA speaker 21 before 25 after 2026-09-15'});assert(p.isTest);const id=p.id;
  assert.equal((await api({...common,action:'enrol'})).id,id);
  await api({...common,action:'start',wave:'post'},409);
  for(const wave of ['pre','post']){
   if(wave==='post')p=await api({...common,action:'start',wave});
   const payload={...common,action:'save',wave,revision:0,page:p.questionnaires[wave].length-1,complete:true,answers:answers(p.questionnaires[wave])};p=await api(payload);
   assert.equal((await api(payload)).duplicate,true);assert(p.forms[wave].completedAt);
  }
  await api({...common,action:'status',role:role==='speaker'?'audience':'speaker'},403);
  proof.records.push({access,role,id,panelId:p.panel.id,instrumentVersion:p.instrumentVersion,pre:digest(p.forms.pre),post:digest(p.forms.post)});
  await fs.writeFile(proofPath,JSON.stringify(proof),{mode:0o600});
 }
 await api({action:'export'},400);
 const adminResponse=await fetch(base+'/study-two/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'export'})});assert.equal(adminResponse.status,401);
 console.log(JSON.stringify({verified:'two roles saved with matching IDs, zeros, idempotent completion and access controls',storeId:health.storeId,instanceId:health.instanceId,recordIds:proof.records.map(r=>r.id)}));
}else{
 const proof=JSON.parse(await fs.readFile(proofPath,'utf8'));assert.equal(health.storeId,proof.health.storeId,'Persistent store identity changed');
 if(mode==='verify-restart')assert.notEqual(health.instanceId,proof.health.instanceId,'Store process did not restart');
 for(const r of proof.records){const p=await api({action:'status',access:r.access,role:r.role});assert.equal(p.id,r.id);assert.equal(p.panel.id,r.panelId);assert.equal(p.instrumentVersion,r.instrumentVersion);assert.equal(digest(p.forms.pre),r.pre);assert.equal(digest(p.forms.post),r.post);}
 console.log(JSON.stringify({verified:mode,storeId:health.storeId,instanceId:health.instanceId,unchangedCompletedRecords:proof.records.length}));
}
