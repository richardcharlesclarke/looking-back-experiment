import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {createStore} from './store.mjs';
import {VERSION,SAMPLE} from './instrument.mjs';
const key=()=>randomBytes(32).toString('hex');
const complete=items=>Object.fromEntries(items.map(q=>[q.id,q.type==='continuous'?0:q.type==='text'?{missing:'skipped'}:q.options[0]]));
test('both roles: restart recovery, exact matching, zero, idempotent retries and immutable final answers',async()=>{
 for(const role of ['speaker','audience']){
  const directory=await mkdtemp(path.join(os.tmpdir(),'study-two-test-')),access=key();let store=await createStore(directory);
  const base={access,role,instrumentVersion:VERSION};let p=await store.action({...base,action:'enrol',testLabel:'automated-persistence-test'});
  assert.equal((await store.action({...base,action:'enrol'})).id,p.id);
  await assert.rejects(store.action({...base,action:'start',wave:'post'}),/Complete the before/);
  const answers=complete(p.questionnaires.pre),draft={...base,action:'save',wave:'pre',revision:0,answers,page:1,complete:false};
  p=await store.action(draft);assert.equal(p.forms.pre.revision,1);
  assert.equal((await store.action(draft)).duplicate,true);
  const beforeStoreId=(await store.health()).storeId;store=await createStore(directory);
  assert.equal((await store.health()).storeId,beforeStoreId);
  p=await store.action({...base,action:'status'});assert.deepEqual(p.forms.pre.answers,answers);
  const final={...draft,revision:1,page:p.questionnaires.pre.length-1,complete:true};p=await store.action(final);
  assert(p.forms.pre.completedAt);assert.equal((await store.action(final)).duplicate,true);
  await assert.rejects(store.action({...final,answers:{...answers,[p.questionnaires.pre[0].id]:100}}),/already saved|outside/);
  p=await store.action({...base,action:'start',wave:'post'});
  p=await store.action({...base,action:'save',wave:'post',revision:0,page:p.questionnaires.post.length-1,complete:true,answers:complete(p.questionnaires.post)});
  for(const q of p.questionnaires.pre){const after=p.questionnaires.post.find(x=>x.id===q.id);if(after)assert.deepEqual(after,q);}
  store=await createStore(directory);const restored=await store.action({...base,action:'status'});assert.equal(restored.id,p.id);assert.equal(restored.panel.id,p.panel.id);assert(restored.forms.post.completedAt);
  await assert.rejects(store.action({...base,role:role==='speaker'?'audience':'speaker',action:'status'}),/role/);
  await assert.rejects(store.action({...base,access:key(),action:'status'}),/not recognised/);
  const exportData=await store.action({action:'export'},true);assert.equal(exportData.records.length,1);assert(!JSON.stringify(exportData).includes(access));assert(!JSON.stringify(exportData).includes('accessHash'));assert.equal(exportData.records[0].testLabel,'automated-persistence-test');
  assert(!(await readFile(path.join(directory,'state.json'),'utf8')).includes(access));
 }
});
test('reject invalid input, wrong versions, stale concurrent saves and unauthorised export',async()=>{
 const store=await createStore(await mkdtemp(path.join(os.tmpdir(),'study-two-validation-'))),base={role:'speaker',access:key(),instrumentVersion:VERSION};const p=await store.action({...base,action:'enrol'});
 const save={...base,action:'save',wave:'pre',revision:0,page:1,complete:false};
 for(const answers of [{fake:1},{S2S_OPEN:-1},{S2S_OPEN:101},{S2S_OPEN:'0'},{S2S_OPEN:{missing:'cannot_assess'}},{S2S_REASON:'x'.repeat(3001)}])await assert.rejects(store.action({...save,answers}));
 await assert.rejects(store.action({...save,answers:{},complete:true}));
 await assert.rejects(store.action({...save,answers:{S2S_OPEN:0},instrumentVersion:'wrong'}),/version/);
 await assert.rejects(store.action({action:'export'}),/Administrator/);
 const outcomes=await Promise.allSettled([store.action({...save,answers:{S2S_OPEN:0}}),store.action({...save,answers:{S2S_OPEN:50}})]);
 assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes.filter(r=>r.status==='rejected').length,1);
 assert.equal((await store.action({...base,action:'status'})).forms.pre.answers.S2S_OPEN,0);
 assert(p.questionnaires.pre.some(q=>q.target==='speaker-b'));
});
test('panel setup is protected, stable across people and frozen within a person',async()=>{
 const store=await createStore(await mkdtemp(path.join(os.tmpdir(),'study-two-panels-')));
 const b={action:'prepare',role:'speaker',access:key(),instrumentVersion:VERSION,panel:SAMPLE,speakerId:'speaker-b'};
 await assert.rejects(store.action(b),/Administrator/);const p=await store.action(b,true);const p2=await store.action({...b,access:key()},true);assert.equal(p.panel.id,p2.panel.id);assert.notEqual(p.id,p2.id);const ordinary=await store.action({action:'enrol',role:'audience',access:key(),instrumentVersion:VERSION});assert.equal(ordinary.panel.id,p.panel.id);
 assert(!p.questionnaires.pre.some(q=>q.target==='speaker-b'));
 const edited=await store.action({...b,access:key(),panel:{...SAMPLE,proposition:'Another claim.'}},true);assert.notEqual(p.panel.id,edited.panel.id);
 assert.equal((await store.action({action:'status',role:b.role,access:b.access})).panel.proposition,SAMPLE.proposition);
});
test('corrupt storage fails closed instead of replacing saved responses',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'study-two-corruption-'));await writeFile(path.join(dir,'state.json'),'not json');await assert.rejects(createStore(dir));assert.equal(await readFile(path.join(dir,'state.json'),'utf8'),'not json');
});
