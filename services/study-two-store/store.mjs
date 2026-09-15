import {PARTICIPATION,COLLECTION_OPEN,RESEARCH_DELETE_AT} from './participation.mjs';
import {mkdir,readFile,open,rename} from 'node:fs/promises';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {instrumentVersion,SAMPLE,SPEAKER_PANEL,questions} from './instrument.mjs';
export class StudyError extends Error {constructor(message,status=400){super(message);this.status=status;}}
const fail=(message,status=400)=>{throw new StudyError(message,status);};
const hash=s=>createHash('sha256').update(s).digest('hex');
const keyValid=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s);
const object=s=>s!==null&&typeof s==='object'&&!Array.isArray(s);
const canonical=s=>JSON.stringify(Object.fromEntries(Object.entries(s).sort(([a],[b])=>a.localeCompare(b))));
function checkRole(role){if(!['speaker','audience'].includes(role))fail('This questionnaire role is not recognised.');}
function checkWave(wave){if(!['pre','post'].includes(wave))fail('This questionnaire timing is not recognised.');}
function panelInput(raw){
 if(!object(raw))fail('Panel details are missing.');
 for(const [key,max] of [['title',150],['proposition',500]])if(typeof raw[key]!=='string'||!raw[key].trim()||raw[key].length>max)fail('Check the panel title and central claim.');
 if(!Array.isArray(raw.speakers)||raw.speakers.length<2||raw.speakers.length>8)fail('Use between two and eight speakers.');
 const speakers=raw.speakers.map(s=>{if(!object(s)||typeof s.id!=='string'||!/^[a-zA-Z0-9_-]{1,80}$/.test(s.id)||typeof s.name!=='string'||!s.name.trim()||s.name.length>100)fail('Check the speaker details.');return {id:s.id,name:s.name.trim()};});
 if(new Set(speakers.map(s=>s.id)).size!==speakers.length||new Set(speakers.map(s=>s.name.toLowerCase())).size!==speakers.length)fail('Each speaker needs a distinct name and identifier.');
 const panel={title:raw.title.trim(),proposition:raw.proposition.trim(),speakers};return {id:'panel-'+hash(JSON.stringify(panel)).slice(0,24),...panel};
}
export function validateAnswers(items,raw,complete){
 if(!object(raw))fail('Answers must be an object.');
 if(Object.keys(raw).some(id=>!items.some(q=>q.id===id)))fail('An answer does not belong to this questionnaire.');
 const answers={};
 for(const q of items){let value=raw[q.id];
  if(value===undefined||(q.type==='text'&&value==='')){if(!complete)continue;if(q.optional)value={missing:'skipped'};else fail('Answer each question or choose “Prefer not to answer”.');}
  if(object(value)){
   const permitted=['prefer_not',...(q.optional?['skipped']:[]),...(q.cannot?[q.cannot]:[])];
   if(Object.keys(value).length!==1||!permitted.includes(value.missing))fail('This missing-answer choice does not fit the question.');
   answers[q.id]={missing:value.missing};continue;
  }
  if(q.type==='rating'){if(typeof value!=='number'||!Number.isInteger(value)||value<q.min||value>q.max)fail('A numeric answer is outside its response scale.');}
  else if(q.type==='continuous'){if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>q.max)fail('A numeric answer is outside its response scale.');}
  else if(q.type==='single'){if(typeof value!=='string'||!q.options.includes(value))fail('Choose one of the listed answers.');}
  else if(typeof value!=='string'||value.length>3000)fail('A written answer is too long or invalid.');
  answers[q.id]=value;
 }
 return answers;
}
const publicRecord=p=>({id:p.id,panel:p.panel,role:p.role,speakerId:p.speakerId,instrumentVersion:p.instrumentVersion,isTest:p.isTest,testLabel:p.testLabel,createdAt:p.createdAt,forms:p.forms,questionnaires:p.questionnaires,...(p.participation?{participation:p.participation}:{}),...(p.consent?{consent:p.consent}:{}),...(p.priorRecordId?{priorRecordId:p.priorRecordId}:{}),...(p.panelContext?{panelContext:p.panelContext}:{}),...(p.collectionVersion?{collectionVersion:p.collectionVersion}:{})});
export const nextParticipantKey=access=>hash('study-two-research-consent-v1:'+access);
const withdrawnRecord=t=>({id:'withdrawn',role:t.role,withdrawnAt:t.at,panel:SPEAKER_PANEL,forms:{},questionnaires:{pre:[],post:[]}});
export async function createStore(directory,{collectionOpen=COLLECTION_OPEN,now=()=>new Date()}={}){
 await mkdir(directory,{recursive:true,mode:0o700});
 const filename=path.join(directory,'state.json');let queue=Promise.resolve();
 const timestamp=()=>now().toISOString();
 const collectionAvailable=()=>collectionOpen&&now().getTime()<Date.parse(RESEARCH_DELETE_AT);
 async function read(){try{return JSON.parse(await readFile(filename,'utf8'));}catch(e){if(e.code==='ENOENT')return {schema:1,storeId:randomUUID(),people:[]};throw e;}}
 async function publish(data){
  const temp=path.join(directory,randomUUID()+'.tmp'),f=await open(temp,'wx',0o600);
  try{await f.writeFile(JSON.stringify(data));await f.sync();}finally{await f.close();}
  await rename(temp,filename);const dir=await open(directory,'r');try{await dir.sync();}finally{await dir.close();}
 }
 function retain(data){
  const count=data.people.length;data.people=data.people.filter(p=>!p.consent?.information?.retentionUntil||Date.parse(p.consent.information.retentionUntil)>now().getTime());
  let changed=count!==data.people.length;
  if(data.withdrawals){const n=data.withdrawals.length;data.withdrawals=data.withdrawals.filter(t=>Date.parse(t.retentionUntil)>now().getTime());changed||=n!==data.withdrawals.length;}
  return changed;
 }
 function transaction(fn,write=true){const task=async()=>{const data=await read();if(data.schema!==1||!Array.isArray(data.people))throw new Error('Unsupported or damaged Study Two storage.');const changed=retain(data);const result=await fn(data);if(write||changed)await publish(data);return result;};const result=queue.then(task,task);queue=result.catch(()=>{});return result;}
 await transaction(()=>{});
 function identify(data,b){if(!keyValid(b.access))fail('Open your private return link.',401);const p=data.people.find(p=>p.accessHash===hash(b.access));if(!p)fail('This private link is not recognised. Please use your original link.',404);if(p.role!==b.role)fail('Use the private link for your questionnaire role.',403);return p;}
 function consent(p,b){
  if(!collectionAvailable())fail('The study is not accepting new participation at the moment.',409);
  if(b.agree!==true||b.informationVersion!==PARTICIPATION.version||b.consentKind!=='research')fail('Read the study information and confirm that you agree to take part.',409);
  if(p.participation||(!p.collectionVersion&&!p.consent))fail('Open the current study information before joining.',409);
  p.consent??={kind:'research',informationVersion:PARTICIPATION.version,acceptedAt:timestamp(),text:PARTICIPATION.consentText,information:structuredClone(PARTICIPATION)};
 }
 function requireParticipation(p){
  if(p.collectionVersion&&!p.consent)fail('Read the study information and agree before beginning.',409);
  if(p.participation&&!p.participation.acknowledgement)fail('Open the updated participant information before beginning.',409);
 }
 function start(p,wave){requireParticipation(p);checkWave(wave);if(wave==='post'&&!p.forms.pre?.completedAt)fail('Complete the before questionnaire first, then use its personal after-panel link.',409);p.forms[wave]??={answers:{},page:0,revision:0,startedAt:timestamp()};}
 function person(b,panel,speakerId,panelContext){return {id:randomUUID(),accessHash:hash(b.access),panel,role:b.role,speakerId,panelContext,instrumentVersion:instrumentVersion(b.role),isTest:b.role==='audience'||b.isTest===true,...(typeof b.testLabel==='string'?{testLabel:b.testLabel.slice(0,100)}:{}),createdAt:timestamp(),...(b.role==='speaker'?{collectionVersion:PARTICIPATION.version}:{}),questionnaires:{pre:questions(panel,b.role,'pre',speakerId),post:questions(panel,b.role,'post',speakerId)},forms:{}};}
 return {
  health:()=>transaction(data=>({ok:true,study:'two',storeId:data.storeId,storage:'persistent-volume',realCollection:collectionAvailable()}),false),
  runRetention:()=>transaction(()=>{}),
  async action(b,admin=false){
   if(!object(b))fail('Invalid request.');
   if(b.action==='export'){if(!admin)fail('Administrator access required.',403);return transaction(data=>({schema:1,exportedAt:timestamp(),records:data.people.map(publicRecord)}),false);}
   if(b.action==='enrol'||b.action==='prepare')return transaction(data=>{
    checkRole(b.role);if(!keyValid(b.access))fail('A secure personal key is required.');
    if(b.instrumentVersion!==instrumentVersion(b.role))fail('Reopen the current questionnaire before starting.',409);
    if(data.withdrawals?.some(t=>t.accessHash===hash(b.access)))fail('This questionnaire has been withdrawn. Use a new invitation to begin again.',409);
    const existing=data.people.find(p=>p.accessHash===hash(b.access));if(existing){if(existing.role!==b.role)fail('This personal key already belongs to another role.',409);return publicRecord(existing);}
    if(b.action==='prepare'&&!admin)fail('Administrator access required.',403);
    if(b.action==='enrol'&&(b.panel!==undefined||b.speakerId!==undefined))fail('Use the panel details from your invitation.');
    const panel=panelInput(b.action==='prepare'?b.panel:b.role==='speaker'?SPEAKER_PANEL:SAMPLE);
    const speakerId=b.role==='speaker'&&b.action==='prepare'?b.speakerId:undefined;
    if(b.role==='speaker'&&b.action==='prepare'&&!panel.speakers.some(s=>s.id===speakerId))fail('Choose a speaker from this panel.');
    const p=person(b,panel,speakerId,b.action==='prepare'?'invitation':'unspecified');
    if(b.action==='enrol'){if(b.role==='speaker')consent(p,b);start(p,'pre');}data.people.push(p);return publicRecord(p);
   });
   checkRole(b.role);
   return transaction(data=>{
    if(!keyValid(b.access))fail('Open your private return link.',401);
    const tombstone=data.withdrawals?.find(t=>t.accessHash===hash(b.access));
    if(tombstone){if(tombstone.role!==b.role)fail('Use the private link for your questionnaire role.',403);if(['status','withdraw'].includes(b.action))return withdrawnRecord(tombstone);fail('These answers have been withdrawn.',409);}
    const p=identify(data,b);if(b.action==='status')return publicRecord(p);
    if(b.action==='join'){
     if(p.role!=='speaker'||p.consent||p.collectionVersion)fail('Use this questionnaire’s original participant link.',409);
     if(b.nextAccess!==nextParticipantKey(b.access))fail('Use the new personal link provided by this page.',409);
     const accessHash=hash(b.nextAccess);if(data.withdrawals?.some(t=>t.accessHash===accessHash))fail('This questionnaire has been withdrawn.',409);
     const existing=data.people.find(x=>x.accessHash===accessHash);if(existing){if(existing.priorRecordId!==p.id)fail('This personal link is already in use.',409);return publicRecord(existing);}
     const fresh=person({...b,access:b.nextAccess},structuredClone(p.panel),p.speakerId,p.panelContext??(p.panel.title===SPEAKER_PANEL.title||p.panel.title===SAMPLE.title?'unspecified':'invitation'));fresh.priorRecordId=p.id;consent(fresh,b);start(fresh,'pre');data.people.push(fresh);return publicRecord(fresh);
    }
    if(b.action==='consent'){consent(p,b);return publicRecord(p);}
    // Frozen review acknowledgements remain honest and usable by cached older clients.
    if(b.action==='acknowledge'){
     const info=p.participation?.information;if(!info||info.status!=='review'||b.agree!==true||b.informationVersion!==info.version||b.acknowledgementKind!=='review')fail('Open the updated participant information.',409);
     p.participation.acknowledgement??={kind:'review',informationVersion:info.version,acceptedAt:timestamp(),text:info.acknowledgementText};return publicRecord(p);
    }
    if(b.action==='withdraw'){
     if(b.confirm!==true)fail('Confirm that you want to withdraw both sets of answers.',409);
     const tombstone={accessHash:p.accessHash,role:p.role,at:timestamp(),retentionUntil:p.consent?.information.retentionUntil??RESEARCH_DELETE_AT};
     data.people=data.people.filter(x=>x.id!==p.id);data.withdrawals??=[];data.withdrawals.push(tombstone);return withdrawnRecord(tombstone);
    }
    checkWave(b.wave);if(b.instrumentVersion!==p.instrumentVersion)fail('Use your original questionnaire version.',409);
    if(b.action==='start'){start(p,b.wave);return publicRecord(p);}
    if(b.action!=='save')fail('Unknown questionnaire request.');requireParticipation(p);
    if(!p.forms[b.wave])fail('Open this questionnaire before saving.');
    const form=p.forms[b.wave],items=p.questionnaires[b.wave],complete=b.complete===true;
    if(typeof b.complete!=='boolean')fail('Choose whether this is a draft or completed response.');const answers=validateAnswers(items,b.answers,complete);
    if(form.completedAt){if(complete&&canonical(form.answers)===canonical(answers))return {...publicRecord(p),duplicate:true};fail('This questionnaire is already saved. Its completed answers have not been changed.',409);}
    if(!Number.isInteger(b.revision)||b.revision!==form.revision){if(canonical(form.answers)===canonical(answers)&&form.page===b.page)return {...publicRecord(p),duplicate:true};fail('Newer progress is already saved. Reopen your private link before continuing.',409);}
    if(!Number.isInteger(b.page)||b.page<0||b.page>=items.length)fail('Invalid questionnaire page.');
    p.forms[b.wave]={...form,answers,page:b.page,revision:form.revision+1,updatedAt:timestamp(),...(complete?{completedAt:timestamp()}: {})};return publicRecord(p);
   },b.action!=='status');
  }
 };
}
