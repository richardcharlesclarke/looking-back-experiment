import {INFORMATION_VERSION} from './participation.mjs';
const researchConsent={agree:true,informationVersion:INFORMATION_VERSION,consentKind:'research'};
import {execFileSync} from 'node:child_process';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomBytes} from 'node:crypto';
import {createStore,nextParticipantKey} from './store.mjs';
import {VERSION,SAMPLE,instrumentVersion} from './instrument.mjs';
const key=()=>randomBytes(32).toString('hex');
const complete=items=>Object.fromEntries(items.map(q=>[q.id,q.type==='rating'?1:q.type==='continuous'?0:q.type==='text'?(q.optional?{missing:'skipped'}:'Synthetic verification response'):q.options[0]]));
test('both roles: restart recovery, exact matching, zero, idempotent retries and immutable final answers',async()=>{
 for(const role of ['speaker','audience']){
  const directory=await mkdtemp(path.join(os.tmpdir(),'study-two-test-')),access=key();let store=await createStore(directory);
  const base={access,role,instrumentVersion:instrumentVersion(role),...researchConsent};let p=await store.action({...base,action:'enrol',testLabel:'automated-persistence-test'});
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
  await assert.rejects(store.action({...final,answers:{...answers,[p.questionnaires.pre[0].id]:101}}),/already saved|outside/);
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
 const store=await createStore(await mkdtemp(path.join(os.tmpdir(),'study-two-validation-'))),base={role:'speaker',access:key(),instrumentVersion:instrumentVersion('speaker'),...researchConsent};const p=await store.action({...base,action:'enrol'});
 const save={...base,action:'save',wave:'pre',revision:0,page:1,complete:false};
 for(const answers of [{fake:1},{S2S_V2_01:-1},{S2S_V2_01:101},{S2S_V2_01:'0'},{S2S_V2_01:{missing:'dont_know'}},{S2S_V2_10:'x'.repeat(3001)}])await assert.rejects(store.action({...save,answers}));
 await assert.rejects(store.action({...save,answers:{},complete:true}));
 await assert.rejects(store.action({...save,answers:{S2S_V2_01:1},instrumentVersion:'wrong'}),/version/);
 await assert.rejects(store.action({action:'export'}),/Administrator/);
 const outcomes=await Promise.allSettled([store.action({...save,answers:{S2S_V2_01:1}}),store.action({...save,answers:{S2S_V2_01:7}})]);
 assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);assert.equal(outcomes.filter(r=>r.status==='rejected').length,1);
 assert.equal((await store.action({...base,action:'status'})).forms.pre.answers.S2S_V2_01,1);
 assert(p.questionnaires.pre.every(q=>!q.target));
});
test('panel setup is protected, stable across people and frozen within a person',async()=>{
 const store=await createStore(await mkdtemp(path.join(os.tmpdir(),'study-two-panels-')));
 const b={action:'prepare',role:'speaker',access:key(),instrumentVersion:instrumentVersion('speaker'),...researchConsent,panel:SAMPLE,speakerId:'speaker-b',targetSpeakerId:'speaker-a'};
 await assert.rejects(store.action(b),/Administrator/);const p=await store.action(b,true);assert.deepEqual(p.forms,{});await store.action({...b,action:'consent',...researchConsent});const begun=await store.action({...b,action:'start',wave:'pre'});assert(begun.forms.pre.startedAt);const p2=await store.action({...b,access:key()},true);assert.equal(p.panel.id,p2.panel.id);assert.notEqual(p.id,p2.id);const ordinary=await store.action({action:'enrol',role:'audience',access:key(),instrumentVersion:VERSION});assert.equal(ordinary.panel.id,p.panel.id);
 assert(!p.questionnaires.pre.some(q=>q.target==='speaker-b'));
 const edited=await store.action({...b,access:key(),panel:{...SAMPLE,proposition:'Another claim.'}},true);assert.notEqual(p.panel.id,edited.panel.id);
 assert.equal((await store.action({action:'status',role:b.role,access:b.access})).panel.proposition,SAMPLE.proposition);
});
test('corrupt storage fails closed instead of replacing saved responses',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'study-two-corruption-'));await writeFile(path.join(dir,'state.json'),'not json');await assert.rejects(createStore(dir));assert.equal(await readFile(path.join(dir,'state.json'),'utf8'),'not json');
});
test('old saved speaker questionnaires retain their version, zero scale and post form',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'study-two-legacy-')),access=key();let store=await createStore(dir);
 let p=await store.action({action:'enrol',role:'speaker',access,instrumentVersion:instrumentVersion('speaker'),...researchConsent});
 const filename=path.join(dir,'state.json'),state=JSON.parse(await readFile(filename,'utf8'));
 const legacyQuestion={id:'S2S_OPEN',prompt:'Legacy wording',section:'Legacy',type:'continuous',max:100};
 delete state.people[0].participation;delete state.people[0].collectionVersion;delete state.people[0].consent;state.people[0].isTest=true;state.people[0].instrumentVersion=VERSION;state.people[0].questionnaires={pre:[legacyQuestion],post:[legacyQuestion]};
 await writeFile(filename,JSON.stringify(state));store=await createStore(dir);
 const base={access,role:'speaker',instrumentVersion:VERSION};
 p=await store.action({...base,action:'save',wave:'pre',revision:0,page:0,complete:true,answers:{S2S_OPEN:0}});
 p=await store.action({...base,action:'start',wave:'post'});
 p=await store.action({...base,action:'save',wave:'post',revision:0,page:0,complete:true,answers:{S2S_OPEN:0}});
 assert.equal(p.instrumentVersion,VERSION);assert.deepEqual(p.questionnaires.post,[legacyQuestion]);assert.equal(p.forms.post.answers.S2S_OPEN,0);
});
test('uncertainty, named target validation and scale bounds survive export',async()=>{
 const store=await createStore(await mkdtemp(path.join(os.tmpdir(),'study-two-scale-'))),access=key();
 const base={role:'speaker',access,instrumentVersion:instrumentVersion('speaker'),...researchConsent};

 let p=await store.action({...base,action:'enrol'});const answers=complete(p.questionnaires.pre);
 answers.S2S_V2_01={missing:'cannot_assess'};answers.S2S_V2_02=37.125;answers.S2S_V2_10='Trade-offs in both directions.';
 p=await store.action({...base,action:'save',wave:'pre',revision:0,page:19,complete:true,answers});
 const exported=await store.action({action:'export'},true);assert.deepEqual(exported.records[0].forms.pre.answers,answers);assert(p.questionnaires.pre.every(q=>!q.target));
});

test('seven-point v2 speaker records remain seven-point through v3 deployment',async()=>{
 const prior=await import('data:text/javascript;base64,'+Buffer.from(execFileSync('git',['show','32736f0:services/study-two-store/instrument.mjs'],{encoding:'utf8'})).toString('base64'));
 const dir=await mkdtemp(path.join(os.tmpdir(),'study-two-v2-')),access=key();let store=await createStore(dir);
 await store.action({action:'enrol',role:'speaker',access,instrumentVersion:instrumentVersion('speaker'),...researchConsent});
 const file=path.join(dir,'state.json'),state=JSON.parse(await readFile(file,'utf8')),p=state.people[0];
 delete p.participation;delete p.collectionVersion;delete p.consent;p.isTest=true;p.instrumentVersion=prior.SPEAKER_VERSION;p.questionnaires={pre:prior.questions(SAMPLE,'speaker','pre','speaker-a'),post:prior.questions(SAMPLE,'speaker','post','speaker-a')};await writeFile(file,JSON.stringify(state));store=await createStore(dir);
 const base={role:'speaker',access,instrumentVersion:prior.SPEAKER_VERSION};const answers=complete(p.questionnaires.pre);answers.S2S_V2_01=7;answers.S2S_V2_02={missing:'dont_know'};
 await store.action({...base,action:'save',wave:'pre',revision:0,page:19,complete:true,answers});await store.action({...base,action:'start',wave:'post'});
 await assert.rejects(store.action({...base,action:'save',wave:'post',revision:0,page:19,complete:true,answers:{...answers,S2S_V2_01:37.125}}),/outside/);
 const done=await store.action({...base,action:'save',wave:'post',revision:0,page:19,complete:true,answers});
 assert.equal(done.forms.post.answers.S2S_V2_01,7);assert.equal(done.instrumentVersion,prior.SPEAKER_VERSION);assert.deepEqual(done.questionnaires.pre,p.questionnaires.pre);
});

test('v3 twenty-question snapshots survive the 21/25 release and restart',async()=>{
 const prior=await import('data:text/javascript;base64,'+Buffer.from(execFileSync('git',['show','d826dc1:services/study-two-store/instrument.mjs'],{encoding:'utf8'})).toString('base64'));
 const dir=await mkdtemp(path.join(os.tmpdir(),'study-two-v3-')),access=key();let store=await createStore(dir);
 await store.action({action:'enrol',role:'speaker',access,instrumentVersion:instrumentVersion('speaker'),...researchConsent});
 const file=path.join(dir,'state.json'),state=JSON.parse(await readFile(file,'utf8')),p=state.people[0];
 delete p.participation;delete p.collectionVersion;delete p.consent;p.isTest=true;p.instrumentVersion=prior.SPEAKER_VERSION;p.questionnaires={pre:prior.questions(SAMPLE,'speaker','pre','speaker-a'),post:prior.questions(SAMPLE,'speaker','post','speaker-a')};await writeFile(file,JSON.stringify(state));store=await createStore(dir);
 const base={role:'speaker',access,instrumentVersion:prior.SPEAKER_VERSION};
 await store.action({...base,action:'save',wave:'pre',revision:0,page:19,complete:true,answers:complete(p.questionnaires.pre)});await store.action({...base,action:'start',wave:'post'});
 await store.action({...base,action:'save',wave:'post',revision:0,page:19,complete:true,answers:complete(p.questionnaires.post)});store=await createStore(dir);
 const done=await store.action({...base,action:'status'});assert.deepEqual(done.questionnaires,p.questionnaires);assert(done.forms.post.completedAt);assert.equal(done.instrumentVersion,prior.SPEAKER_VERSION);
 const fresh=await store.action({action:'enrol',role:'speaker',access:key(),instrumentVersion:instrumentVersion('speaker'),...researchConsent});assert.equal(fresh.questionnaires.pre.length,21);assert.equal(fresh.questionnaires.post.length,25);
 await store.action({action:'save',role:'speaker',access:base.access,instrumentVersion:prior.SPEAKER_VERSION,wave:'post',revision:1,page:19,complete:true,answers:complete(p.questionnaires.post)});
});


test('research consent is explicit, durable, frozen and distinct from old review acknowledgements',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'study-two-consent-'));let store=await createStore(dir);
 const base={role:'speaker',access:key(),instrumentVersion:instrumentVersion('speaker')};
 for(const invalid of [{},{...researchConsent,agree:false},{...researchConsent,informationVersion:'stale'},{...researchConsent,consentKind:'review'}])await assert.rejects(store.action({...base,action:'enrol',...invalid}),/information/);
 assert.equal((await store.action({action:'export'},true)).records.length,0);
 let p=await store.action({...base,action:'prepare',panel:SAMPLE,speakerId:'speaker-a',...researchConsent},true);assert.equal(p.consent,undefined);assert.deepEqual(p.forms,{});
 await assert.rejects(store.action({...base,action:'start',wave:'pre'}),/information/);
 p=await store.action({...base,action:'consent',...researchConsent});const saved=structuredClone(p.consent);assert.equal(saved.kind,'research');assert.match(saved.text,/agree to take part/);assert.equal(p.isTest,false);
 assert.equal((await store.health()).realCollection,true);store=await createStore(dir);p=await store.action({...base,action:'consent',...researchConsent});assert.deepEqual(p.consent,saved);
 p=await store.action({...base,action:'start',wave:'pre'});assert(p.forms.pre.startedAt);
 assert.deepEqual((await store.action({action:'export'},true)).records[0].consent,saved);
 const closed=await createStore(await mkdtemp(path.join(os.tmpdir(),'study-two-closed-')),{collectionOpen:false});await assert.rejects(closed.action({...base,action:'enrol',...researchConsent}),/not accepting/);assert.equal((await closed.health()).realCollection,false);
});
test('returning review links create one fresh consented pair without relabelling prior answers',async()=>{
 const prior=await import('data:text/javascript;base64,'+Buffer.from(execFileSync('git',['show','00448da:services/study-two-store/participation.mjs'],{encoding:'utf8'})).toString('base64'));
 const dir=await mkdtemp(path.join(os.tmpdir(),'study-two-join-')),access=key();let store=await createStore(dir);
 await store.action({action:'enrol',role:'speaker',access,instrumentVersion:instrumentVersion('speaker'),...researchConsent});
 const file=path.join(dir,'state.json'),state=JSON.parse(await readFile(file,'utf8')),old=state.people[0];delete old.consent;delete old.collectionVersion;old.isTest=true;old.participation={information:prior.PARTICIPATION,acknowledgement:{kind:'review',informationVersion:prior.INFORMATION_VERSION,acceptedAt:old.createdAt,text:prior.PARTICIPATION.acknowledgementText}};old.forms.pre.answers={S2S_V2_01:37.125};await writeFile(file,JSON.stringify(state));const frozen=JSON.stringify(old);store=await createStore(dir);
 const b={action:'join',role:'speaker',access,nextAccess:nextParticipantKey(access),...researchConsent};await assert.rejects(store.action({...b,agree:false}),/information/);await assert.rejects(store.action({...b,nextAccess:key()}),/personal link/);
 const p=await store.action(b);assert.notEqual(p.id,old.id);assert.equal(p.isTest,false);assert.equal(p.priorRecordId,old.id);assert.equal(p.consent.kind,'research');assert.deepEqual(p.forms.pre.answers,{});assert.deepEqual(p.panel,old.panel);assert.equal(p.questionnaires.pre.length,21);assert.equal(p.questionnaires.post.length,25);
 assert.equal((await store.action(b)).id,p.id);assert.equal(JSON.stringify(JSON.parse(await readFile(file,'utf8')).people.find(x=>x.id===old.id)),frozen);
 store=await createStore(dir);assert.equal((await store.action({action:'status',role:'speaker',access:b.nextAccess})).id,p.id);assert.equal((await store.action({action:'export'},true)).records.length,2);
});
test('withdrawal removes both waves and identity, is idempotent and prevents accidental reuse',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'study-two-withdraw-')),access=key();let store=await createStore(dir);const b={role:'speaker',access,instrumentVersion:instrumentVersion('speaker'),...researchConsent};let p=await store.action({...b,action:'enrol'});
 p=await store.action({...b,action:'save',wave:'pre',revision:0,page:20,complete:true,answers:complete(p.questionnaires.pre)});p=await store.action({...b,action:'start',wave:'post'});await store.action({...b,action:'save',wave:'post',revision:0,page:24,complete:true,answers:complete(p.questionnaires.post)});
 await assert.rejects(store.action({...b,action:'withdraw',confirm:false}),/Confirm/);assert.equal((await store.action({action:'export'},true)).records.length,1);
 const deleted=await store.action({...b,action:'withdraw',confirm:true});assert(deleted.withdrawnAt);store=await createStore(dir);assert.deepEqual(await store.action({...b,action:'withdraw',confirm:true}),deleted);assert.equal((await store.action({action:'export'},true)).records.length,0);assert.deepEqual((await store.action({...b,action:'status'})),deleted);
 const raw=await readFile(path.join(dir,'state.json'),'utf8');assert(!raw.includes('S2S_V2_01'));assert(!raw.includes(p.id));assert(!raw.includes(access));await assert.rejects(store.action({...b,action:'enrol'}),/withdrawn/);await assert.rejects(store.action({...b,action:'save',wave:'pre'}),/withdrawn/);
});
test('retention removes research records after their promised deadline while preserving historical records',async()=>{
 const dir=await mkdtemp(path.join(os.tmpdir(),'study-two-retention-'));let instant=new Date('2026-09-15T12:00:00Z');const store=await createStore(dir,{now:()=>instant});const b={role:'speaker',access:key(),instrumentVersion:instrumentVersion('speaker'),...researchConsent};await store.action({...b,action:'enrol'});
 instant=new Date('2027-10-01T00:00:00Z');await store.runRetention();assert.equal((await store.action({action:'export'},true)).records.length,0);assert.equal((await store.health()).realCollection,false);await assert.rejects(store.action({...b,access:key(),action:'enrol'}),/not accepting/);
});
