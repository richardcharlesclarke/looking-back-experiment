import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { CONTINUOUS_INSTRUMENT_VERSION, CONFLICT_INSTRUMENT_VERSION, isPerspectivesInstrument } from './scales';
import { validateAnswers } from '../instruments';
import { FESTIVAL_VERSION, FIRST_INSTRUMENT_VERSION, INFORMATION, INFORMATION_VERSION, CONSENT_TEXT, FOLLOWUP_TEXT, PERMISSION_VERSION, PROGRAMME_VERSION, FIRST_CLOSES_AT, SECOND_OPENS_AT, STUDY_ONE_APPROVED, ORIGINAL_INFORMATION_VERSION, ORIGINAL_INFORMATION, PREVIOUS_INFORMATION_VERSION, PREVIOUS_INFORMATION } from './content';
import type { Contact, Data, Person, View, Wave } from './types';
const now = () => new Date().toISOString();
export const digest = (s:string) => createHash('sha256').update(s).digest('hex');
const keyValid = (key:unknown):key is string => typeof key==='string' && /^[a-f0-9]{64}$/.test(key);
export function context(wave:Wave, responseInstrument?:string) { return {study:'festival' as const,role:'attendee' as const,wave,festivalVersion:FESTIVAL_VERSION,responseInstrument}; }
export function submissionInstrument(wave:Wave, requested:unknown) {
  const legacy=wave==='pre'?FIRST_INSTRUMENT_VERSION:FESTIVAL_VERSION;
  // Requests from already-open legacy pages have no version field. Keep their original scale.
  if(requested===undefined || requested===legacy) return legacy;
  if(typeof requested==='string' && isPerspectivesInstrument(requested)) return requested;
  if(requested===CONTINUOUS_INSTRUMENT_VERSION) return CONTINUOUS_INSTRUMENT_VERSION;
  throw new Error('This questionnaire version is not supported. Reopen your personal link.');
}
// A saved baseline owns its follow-up instrument. Never invent new baseline responses.
export function participantInstrument(p:Person, wave:Wave) {
  const baseline=p.responses.find(r=>r.wave==='pre')?.instrumentVersion;
  if(baseline) return baseline===FIRST_INSTRUMENT_VERSION && wave==='post' ? FESTIVAL_VERSION : baseline;
  return p.questionnaireInstrument ?? CONTINUOUS_INSTRUMENT_VERSION;
}
export function enrol(data:Data,b:Record<string,unknown>):{p:Person;c:Contact} {
  if (!keyValid(b.access)) throw new Error('Please reopen the first questionnaire.');
  const old=data.contacts.contacts.find(c=>c.firstHash===digest(b.access as string));
  if(old) return {p:data.research.people.find(p=>p.id===old.personId)!,c:old};
  const originalInformation=b.informationVersion===ORIGINAL_INFORMATION_VERSION && !isPerspectivesInstrument(typeof b.instrumentVersion==='string'?b.instrumentVersion:undefined);
  const previousInformation=b.informationVersion===PREVIOUS_INFORMATION_VERSION && b.instrumentVersion!==CONFLICT_INSTRUMENT_VERSION;
  if(b.agree!==true || (b.informationVersion!==INFORMATION_VERSION&&!originalInformation&&!previousInformation)) throw new Error('Read the study information and select the agreement before starting.');
  const consentVersion=originalInformation?ORIGINAL_INFORMATION_VERSION:previousInformation?PREVIOUS_INFORMATION_VERSION:INFORMATION_VERSION;
  const consentInformation=originalInformation?ORIGINAL_INFORMATION:previousInformation?PREVIOUS_INFORMATION:INFORMATION;
  if(STUDY_ONE_APPROVED && Date.now()>=Date.parse(FIRST_CLOSES_AT)) throw new Error('The first questionnaire is now closed.');
  const questionnaireInstrument=b.instrumentVersion===undefined?undefined:submissionInstrument('pre',b.instrumentVersion);
  const p:Person={...(questionnaireInstrument?{questionnaireInstrument}:{}),id:randomUUID(),createdAt:now(),isTest:!STUDY_ONE_APPROVED,consent:{at:now(),version:consentVersion,text:CONSENT_TEXT,information:structuredClone(consentInformation),beforeExposureConfirmed:typeof b.beforeExposure==='boolean'?b.beforeExposure:null},responses:[]};
  const c:Contact={personId:p.id,firstHash:digest(b.access),afterKey:randomBytes(32).toString('hex'),email:null,permission:false,delivery:'not_sent',events:[]};
  data.research.people.push(p);data.contacts.contacts.push(c);return {p,c};
}
export function identify(data:Data,key:unknown,kind:unknown) {
  if(!keyValid(key)||!['first','after'].includes(String(kind))) throw new Error('Open your saved personal link.');
  const c=data.contacts.contacts.find(c=>kind==='first'?c.firstHash===digest(key):c.afterKey===key);
  const p=c&&data.research.people.find(p=>p.id===c.personId);
  if(!c||!p)throw new Error('This personal link is not recognised. Use the link in your follow-up email or ask the research assistant to resend it. Do not start a new first questionnaire to recover an existing response.');
  return {p,c};
}
export function view(p:Person,c:Contact,kind:string):View {
  const completed=p.responses.map(r=>r.wave);
  const result:View={responseInstrument:participantInstrument(p,kind==='after'?'post':'pre'),id:p.id,mode:'study',step:'waiting',message:'Your first questionnaire is saved. Attend the festival as normal. The research assistant will email your personal second-questionnaire link if you agreed to follow-up.',contactChoiceSaved:!!c.contactChoiceSaved,permission:c.permission,email:c.email,completed};
  if(c.delivery==='stopped')return {...result,step:'stopped',message:'Follow-up contact has stopped. Your email address has been removed from the contact list. Previously submitted research answers have not been deleted.'};
  if(completed.includes('post'))return {...result,step:'complete',message:'Both questionnaires are saved and matched. Thank you for taking part.'};
  if(kind==='after'&&!completed.includes('pre'))throw new Error('No first questionnaire is linked to this invitation. Contact the research assistant; do not supply a retrospective first response.');
  if(!completed.includes('pre'))return {...result,step:'pre',message:'Complete the first questionnaire before attending festival activities.'};
  if(!c.contactChoiceSaved&&kind==='first')return {...result,step:'contact',message:'Would you like to receive the questionnaire after the festival?'};
  if(kind==='after') {
    if(!c.permission) return {...result,message:'No permission for a second-questionnaire invitation is recorded.'};
    if((p.isTest&&c.demoAfterOpen)||(!p.isTest&&Date.now()>=Date.parse(SECOND_OPENS_AT)))return {...result,step:'post',message:'Answer for yourself, now that the festival is over.'};
    return {...result,message:p.isTest?'This demonstration follow-up has not been opened by the research assistant yet.':'The questionnaire after the festival opens on 21 September 2026.'};
  }
  return result;
}
export function submit(p:Person,c:Contact,kind:string,b:Record<string,unknown>) {
  const wave=b.wave as Wave;
  if(!['pre','post'].includes(wave))throw new Error('Choose the current questionnaire.');
  if((wave==='pre'&&kind!=='first')||(wave==='post'&&kind!=='after'))throw new Error('Use the personal link for this questionnaire.');
  if(p.responses.some(r=>r.wave===wave))return {duplicate:true};
  const v=view(p,c,kind);if(v.step!==wave)throw new Error('This questionnaire is not open.');
  if(wave==='pre'&&!p.isTest&&Date.now()>=Date.parse(FIRST_CLOSES_AT))throw new Error('The first questionnaire is now closed.');
  const instrumentVersion=submissionInstrument(wave,b.instrumentVersion);
  if((wave==='post'||p.questionnaireInstrument)&&instrumentVersion!==participantInstrument(p,wave))throw new Error('Please reopen your personal link to continue with your questionnaire.');
  const checked=validateAnswers(context(wave,instrumentVersion),b.answers);
  if(typeof b.startedAt!=='string'||!Number.isFinite(Date.parse(b.startedAt))||Date.parse(b.startedAt)>Date.now()+60000)throw new Error('Questionnaire start time is invalid.');
  p.responses.push({id:randomUUID(),wave,answers:checked.answers,questions:checked.questions,instrumentVersion,programmeVersion:PROGRAMME_VERSION,startedAt:b.startedAt,completedAt:now()});
  return {duplicate:false};
}
export function saveContact(data:Data,p:Person,c:Contact,b:Record<string,unknown>) {
  if(!p.responses.some(r=>r.wave==='pre'))throw new Error('Complete the first questionnaire before choosing follow-up.');
  if(typeof b.permission!=='boolean')throw new Error('Choose whether to receive the second questionnaire.');
  if(b.permission) {
    if(typeof b.email!=='string'||b.email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(b.email.trim()))throw new Error('Enter a valid email address.');
    const email=b.email.trim().toLowerCase();
    if(p.isTest&&!/^[^@]+@(example\.com|example\.org|example\.net)$/.test(email))throw new Error('This review accepts invented example.com, example.org or example.net addresses only.');
    // Never merge questionnaires by email. Resolve duplicate contacts privately with the assistant.
    if(data.contacts.contacts.some(x=>x.personId!==p.id&&x.email===email))throw new Error('This address cannot be added to another study response. Use your existing personal link, or ask the research assistant to check your saved contact record.');
    c.email=email;c.permission=true;c.permissionAt=now();c.permissionVersion=PERMISSION_VERSION;c.permissionText=FOLLOWUP_TEXT;
    if(c.delivery==='stopped')c.delivery='not_sent';
  }else{c.email=null;c.permission=false;c.delivery='stopped';}
  c.contactChoiceSaved=true;c.events.push({at:now(),action:b.permission?'Follow-up permission saved':'Follow-up declined; email removed'});
}
export function stopContact(c:Contact) {c.email=null;c.permission=false;c.delivery='stopped';c.events.push({at:now(),action:'Participant stopped follow-up; email removed'});}
export function deleteParticipant(data:Data,personId:string):View {
  const found=data.research.people.some(p=>p.id===personId);
  if(!found)throw new Error('Participant not found.');
  data.research.people=data.research.people.filter(p=>p.id!==personId);
  data.contacts.contacts=data.contacts.contacts.filter(c=>c.personId!==personId);
  return {id:personId,mode:'study',step:'deleted',message:'Your saved study answers and contact details have been removed.',contactChoiceSaved:false,permission:false,email:null,completed:[]};
}
export function assistantAction(data:Data,b:Record<string,unknown>) {
  const p=data.research.people.find(p=>p.id===b.id),c=data.contacts.contacts.find(c=>c.personId===b.id);
  if(!p)throw new Error('Participant not found.');
  if(b.action==='delete_person') {
    const expected=c?.email||p.id;
    if(b.confirmDelete!==expected)throw new Error('Type the displayed deletion confirmation exactly.');
    deleteParticipant(data,p.id);return;
  }
  if(!c)throw new Error('This contact record has reached its retention date and has been deleted.');
  if(b.action==='stop'){stopContact(c);return;}
  if(!c.permission||!c.email||!p.responses.some(r=>r.wave==='pre'))throw new Error('A saved first questionnaire and follow-up permission are required.');
  if(b.action==='prepare_demo') {if(!p.isTest)throw new Error('Only demonstration records can bypass the festival date.');c.demoAfterOpen=true;c.events.push({at:now(),action:'Demonstration follow-up opened'});return;}
  if(b.action==='replace_link') {if(b.confirmEmail!==c.email)throw new Error('Confirm the saved email address before replacing the link.');c.afterKey=randomBytes(32).toString('hex');c.delivery='not_sent';delete c.sentAt;c.events.push({at:now(),action:'Personal link replaced; old link revoked'});return;}
  if(b.action==='sent'||b.action==='failed') {
    if((p.isTest&&!c.demoAfterOpen)||(!p.isTest&&Date.now()<Date.parse(SECOND_OPENS_AT)))throw new Error('The follow-up is not open yet.');
    if(typeof b.note!=='string'||b.note.trim().length<5||b.note.length>500)throw new Error('Record a short delivery note from the external mail system. Do not include questionnaire answers.');
    c.delivery=b.action;c.deliveryNote=b.note.trim();if(b.action==='sent')c.sentAt=now();c.events.push({at:now(),action:`Assistant marked ${b.action}`});return;
  }
  throw new Error('Unknown assistant action.');
}
export function assistantRows(data:Data) {
  return data.research.people.map(p=>{const c=data.contacts.contacts.find(c=>c.personId===p.id);const pre=p.responses.find(r=>r.wave==='pre'),post=p.responses.find(r=>r.wave==='post');return {id:p.id,isTest:p.isTest,firstInstrumentVersion:pre?.instrumentVersion??null,secondInstrumentVersion:post?.instrumentVersion??null,firstSaved:pre?.completedAt??null,secondSaved:post?.completedAt??null,permission:c?.permission??false,email:c?.email??null,delivery:c?.delivery??'stopped' as const,sentAt:c?.sentAt??null,deliveryNote:c?.deliveryNote??'',events:c?.events??[],afterKey:c?.permission&&pre?c.afterKey:null,afterOpen:p.isTest?!!c?.demoAfterOpen:Date.now()>=Date.parse(SECOND_OPENS_AT),contactChoiceSaved:!!c?.contactChoiceSaved,contactRetained:!!c};});
}
export function researchRows(data:Data) {
  return data.research.people.flatMap(p=>p.responses.flatMap(r=>r.questions.map(q=>({participantId:p.id,isTest:p.isTest,wave:r.wave,instrumentVersion:r.instrumentVersion,programmeVersion:r.programmeVersion,consentVersion:p.consent.version,consentAt:p.consent.at,itemId:q.id,prompt:q.prompt,responseType:q.type,scaleMin:['likert','scale','continuous','circles'].includes(q.type)?q.min:null,scaleMax:['likert','scale','continuous','circles'].includes(q.type)?q.max:null,responseBands:q.bands??null,target:q.target??null,help:q.help??null,construct:q.construct??null,options:q.options??null,value:r.answers[q.id],startedAt:r.startedAt,completedAt:r.completedAt,reverseScored:q.reverse??false}))));
}
export function comparisons(data:Data) {
  return data.research.people.flatMap(p=>{
    const pre=p.responses.find(r=>r.wave==='pre'),post=p.responses.find(r=>r.wave==='post');
    return (pre?.questions??[]).filter(q=>q.id.startsWith('E1_')&&!q.id.startsWith('E1_PRE_')).map(q=>{
      const afterQuestion=post?.questions.find(item=>item.id===q.id);
      const comparable=!!afterQuestion&&q.prompt===afterQuestion.prompt&&q.target===afterQuestion.target&&q.help===afterQuestion.help&&JSON.stringify(q.options)===JSON.stringify(afterQuestion.options)&&q.type===afterQuestion.type&&q.min===afterQuestion.min&&q.max===afterQuestion.max&&JSON.stringify(q.bands)===JSON.stringify(afterQuestion.bands);
      return {participantId:p.id,isTest:p.isTest,itemId:q.id,prompt:q.prompt,before:pre?.answers[q.id]??null,after:post?.answers[q.id]??null,matched:!!post,comparable,
        comparisonNote:!post?'No after response':comparable?'Same response scale':'Different questions or response scales; do not directly compare raw values',
        beforeInstrumentVersion:pre?.instrumentVersion??null,afterInstrumentVersion:post?.instrumentVersion??null,
        beforeResponseType:q.type,afterResponseType:afterQuestion?.type??null,beforeMin:q.min??null,beforeMax:q.max??null,afterMin:afterQuestion?.min??null,afterMax:afterQuestion?.max??null,
        reverseScored:q.reverse??false,beforeAt:pre?.completedAt??null,afterAt:post?.completedAt??null};
    });
  });
}
