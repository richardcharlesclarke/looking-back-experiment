'use client';
// Question presentation and navigation follow Study One's FestivalParticipant / FestivalForm.
// Study Two retains its own draft status, before/after matching and durable API.
import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight} from 'lucide-react';
import Link from 'next/link';
import {VectorDecoration} from '../looking-back/VectorDecoration';
import SpeakerQuestion from './SpeakerQuestion';
import SpeakerInformation from './SpeakerInformation';
import {PARTICIPATION} from '@/lib/study-two/participation';
import {SAMPLE,SPEAKER_PANEL,instrumentVersion,questions,type Answer,type Question,type Wave} from '@/lib/study-two/instrument';
import type {SavedPerson} from '@/lib/study-two/types';
import './speaker-reference.css';
const role='speaker';
const newAccess=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
async function request(body:Record<string,unknown>):Promise<SavedPerson>{
 let response:Response;try{response=await fetch('/study-two/api',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store'});}catch{throw new Error('We could not connect. Check your connection and try again.');}
 const data=await response.json().catch(()=>{throw new Error('We could not complete that request. Please try again.');});
 if(!response.ok)throw Object.assign(new Error(data.error||'We could not complete that request. Please try again.'),{status:response.status});return data;
}
function answerError(q:Question,value:Answer|undefined){
 if(value===undefined||value==='')return q.optional?null:'Choose an answer or select “Prefer not to answer”.';
 if(typeof value==='object')return value.missing==='prefer_not'||(q.optional&&value.missing==='skipped')||value.missing===q.cannot?null:'Choose a response for this question.';
 if(q.type==='text')return typeof value==='string'&&value.length<=3000?null:'Write up to 3,000 characters, or choose to skip.';
 return typeof value==='number'&&Number.isFinite(value)&&value>=(q.min??0)&&value<=(q.max??100)&&(q.type!=='rating'||Number.isInteger(value))?null:'Choose a value on this scale.';
}
async function currentKey(oldKey:string){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode('study-two-research-consent-v1:'+oldKey))),b=>b.toString(16).padStart(2,'0')).join('');}
export default function SpeakerParticipant({wave}:{wave:Wave}){
 const [run,setRun]=useState<SavedPerson|null>(null),[access,setAccess]=useState(''),[loaded,setLoaded]=useState(false),[invalid,setInvalid]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[copied,setCopied]=useState(false),[agree,setAgree]=useState(false),[withdrawalOpen,setWithdrawalOpen]=useState(false);
 const studyInformation=useRef<HTMLDialogElement>(null);
 useEffect(()=>{let cancelled=false;async function load(){
  let key=new URLSearchParams(location.hash.slice(1)).get('access')??'';try{if(!key)key=localStorage.getItem('study-two-return:speaker')??'';}catch{}
  if(key){setAccess(key);try{
   let saved=await request({action:'status',access:key,role});
   if(!saved.consent&&!saved.collectionVersion&&!saved.withdrawnAt){const next=await currentKey(key);try{const newer=await request({action:'status',access:next,role});if(newer.priorRecordId===saved.id||newer.withdrawnAt){saved=newer;key=next;}}catch(e){if((e as Error&{status?:number}).status!==404)throw e;}}
   if(!cancelled){setRun(saved);setAccess(key);history.replaceState(null,'',`${location.pathname}#access=${key}`);try{localStorage.setItem('study-two-return:speaker',key);}catch{}}
  }catch(e){if(!cancelled){let pending=false;try{pending=localStorage.getItem('study-two-pending:speaker')===key;}catch{}if(!(pending&&(e as Error&{status?:number}).status===404)){setInvalid(true);setError((e as Error).message);}}}
  }else if(wave==='post'){setInvalid(true);setError('Use the personal link from your before questionnaire to continue after the panel.');}
  if(!cancelled)setLoaded(true);
 }void load();return()=>{cancelled=true;};},[wave]);
 const information=run?.consent?.information??PARTICIPATION;
 const earlierRecord=Boolean(run&&!run.consent&&!run.collectionVersion&&!run.withdrawnAt);
 const needsInformation=!run?.consent&&(wave==='pre'||earlierRecord);
 const beforeRequired=wave==='post'&&run&&!run.forms.pre?.completedAt&&!earlierRecord;
 const form=run?.forms[wave],screen=!loaded?'loading':invalid?'invalid':run?.withdrawnAt?'withdrawn':beforeRequired?'before-required':needsInformation?'information':!form?'intro':form.completedAt?'complete':'form';
 useEffect(()=>{if(loaded){if(screen!=='form')window.scrollTo({top:0});document.querySelector<HTMLElement>('.s2-speaker h1')?.focus({preventScroll:true});}},[loaded,screen]);
 async function begin(){
  setBusy(true);setError('');let key=access||newAccess();
  try{
   const consent={agree,informationVersion:information.version,consentKind:'research'};let saved:SavedPerson;
   if(earlierRecord){const next=await currentKey(key);saved=await request({action:'join',access:key,nextAccess:next,role,...consent});key=next;}
   else if(run){saved=run;if(needsInformation)saved=await request({action:'consent',access:key,role,...consent});saved=await request({action:'start',access:key,role,wave,instrumentVersion:saved.instrumentVersion});}
   else{setAccess(key);history.replaceState(null,'',`${location.pathname}#access=${key}`);try{localStorage.setItem('study-two-pending:speaker',key);localStorage.setItem('study-two-return:speaker',key);}catch{}saved=await request({action:'enrol',access:key,role,instrumentVersion:instrumentVersion(role),...consent});}
   try{localStorage.removeItem('study-two-pending:speaker');localStorage.setItem('study-two-return:speaker',key);}catch{}
   setAccess(key);setRun(saved);if(earlierRecord&&wave==='post'){location.assign(`/study-two/speaker/before#access=${key}`);return;}
   history.replaceState(null,'',`${location.pathname}#access=${key}`);window.scrollTo({top:0});
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 async function withdraw(){setBusy(true);setError('');try{const saved=await request({action:'withdraw',access,role,confirm:true});setRun(saved);setWithdrawalOpen(false);try{if(localStorage.getItem('study-two-return:speaker')===access)localStorage.removeItem('study-two-return:speaker');for(const w of ['pre','post']){localStorage.removeItem(`study-two-speaker-draft:${run?.instrumentVersion}:${access}:${w}`);localStorage.removeItem(`study-two-speaker-draft:${run?.instrumentVersion}:${access}:${w}:unmerged`);}}catch{}}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 async function copyLink(){try{await navigator.clipboard.writeText(`${location.origin}${location.pathname}#access=${access}`);setCopied(true);}catch{setError('Copy the address from your browser to keep your personal link.');}}
 const panel=run?.panel??SPEAKER_PANEL,items=run?.questionnaires[wave]??questions(SPEAKER_PANEL,role,wave);
 const panelDetails=run&&![SAMPLE.title,SPEAKER_PANEL.title].includes(panel.title)?<section className="s1-information"><h2>{panel.title}</h2><p>{panel.proposition}</p>{run.speakerId&&<p>Questionnaire for {panel.speakers.find(s=>s.id===run.speakerId)?.name}.</p>}</section>:null;
 return <main className="s1-participant s2-speaker">
  <header className="topbar"><button type="button" className="s1-about-button" aria-haspopup="dialog" onClick={()=>studyInformation.current?.showModal()}>About this study</button></header>
  <dialog ref={studyInformation} className="s1-about-dialog" aria-labelledby="s2-about-title"><div className="s1-about-heading"><h2 id="s2-about-title">About this study</h2><button type="button" className="secondary" onClick={()=>studyInformation.current?.close()}>Close</button></div><SpeakerInformation information={information}/></dialog>
  {!loaded?<section className="stage s1-card" role="status"><p>Opening questionnaire…</p></section>
   :invalid?<section className="stage s1-card"><h1 tabIndex={-1}>Personal link could not be opened</h1><p role="alert">{error}</p><p>Use your original personal return link. Your existing answers have not been changed.</p><p><a href={`mailto:${PARTICIPATION.contactEmail}`}>Contact Beau Lotto</a> if you need help.</p></section>
   :run?.withdrawnAt?<section className="stage s1-card"><h1 tabIndex={-1}>Your answers have been withdrawn</h1><p>Both sets of answers for this questionnaire have been removed from the active study store. You can close this page.</p></section>
   :beforeRequired?<section className="stage s1-card"><h1 tabIndex={-1}>Start with your before questionnaire</h1><p>Complete your before questionnaire privately before any briefing. After the panel, return using this same personal link.</p><Link className="primary" href={`/study-two/speaker/before#access=${access}`}>Open my before questionnaire</Link></section>
   :needsInformation?<section className="stage s1-card"><p className="eyebrow">Study Two · Panel speakers</p><h1 tabIndex={-1}>Before you begin</h1><p className="s1-lead">Read what taking part involves before opening the questions.</p>{panelDetails}{earlierRecord&&<p>Your earlier answers are saved separately. Begin a new questionnaire to take part under the study information below.</p>}<SpeakerInformation information={information}/><label className="s1-check"><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/><span>{information.consentText}</span></label><div className="s2-actions"><button className="primary" disabled={busy||!agree} onClick={begin}>{busy?'Opening…':'Begin before the panel'}<ArrowRight size={18} aria-hidden="true"/></button></div></section>
   :!form?<section className="stage s1-card"><p className="eyebrow">Panel speakers · {wave==='pre'?'Before':'After'} the conversation</p><h1 tabIndex={-1}>{wave==='pre'?'Before the conversation':'After the conversation'}</h1><p className="s1-lead">{wave==='pre'?'Answer privately before receiving any panel briefing.':'Answer privately now that this panel’s conversation is over.'} Think about the same panel and issue throughout.</p>{panelDetails}<p>There are {items.length} questions, including {items.filter(q=>q.type==='text').length} written responses. You can decline any question.</p><button className="primary" disabled={busy} onClick={begin}>{busy?'Opening…':'Begin questionnaire'}<ArrowRight size={18} aria-hidden="true"/></button></section>
   :form.completedAt?<section className="stage s1-card"><h1 tabIndex={-1}>Thank you. Your answers are saved.</h1><p className="s1-lead">{wave==='pre'?'Your before answers are saved. Follow the facilitator’s briefing, take part in the panel, then return here promptly afterwards.':'Both sets of answers are saved for this panel. You can close this page.'}</p>{wave==='pre'&&<p><Link href={`/study-two/speaker/after#access=${access}`}>Your questionnaire for after the panel →</Link></p>}<p>Keep your personal link to return on another device.</p>{wave==='post'&&<p>Your before and after answers help us understand how panellists experience disagreement. You do not need to have reached agreement or changed your position.</p>}<p>Questions about the study? <a href={`mailto:${information.contactEmail}`}>Contact Beau Lotto</a>.</p></section>
   :run?<SpeakerForm key={`${access}:${wave}:${run.instrumentVersion}`} access={access} wave={wave} run={run} onComplete={saved=>setRun(current=>current?.withdrawnAt?current:saved)}/>:null}
  {withdrawalOpen&&<section className="s2-withdrawal s1-information" role="region" aria-label="Withdraw your answers"><h2>Withdraw your answers?</h2><p>This removes both your before and after answers for this questionnaire from the active study store. It cannot be undone.</p><div className="s2-actions"><button className="secondary" disabled={busy} onClick={()=>setWithdrawalOpen(false)}>Keep my answers</button><button className="primary" disabled={busy} onClick={withdraw}>{busy?'Removing…':'Withdraw both sets of answers'}</button></div></section>}
  {error&&!invalid&&<p className="s1-error" role="alert">{error}</p>}
  <footer className="bf-footer"><span>Study Two · Panel speakers</span>{access&&run&&!run.withdrawnAt&&<button className="s1-skip-email" onClick={copyLink}>{copied?'Personal link copied':'Copy my return link'}</button>}{run?.consent&&!run.withdrawnAt&&<button className="s1-skip-email" onClick={()=>{setWithdrawalOpen(true);}}>Withdraw my answers</button>}</footer>
 </main>;
}
function SpeakerForm({access,wave,run,onComplete}:{access:string;wave:Wave;run:SavedPerson;onComplete:(run:SavedPerson)=>void}){
 const initial=run.forms[wave]!,items=run.questionnaires[wave];
 const [answers,setAnswers]=useState<Record<string,Answer>>(initial.answers),[page,setPage]=useState(initial.page),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[storageOK,setStorageOK]=useState(true),[invalidId,setInvalidId]=useState(''),[direction,setDirection]=useState<'forward'|'back'>('forward'),[revision,setRevision]=useState(initial.revision);
 const heading=useRef<HTMLHeadingElement>(null),errorSummary=useRef<HTMLParagraphElement>(null),serverRevision=useRef(initial.revision),queue=useRef<Promise<void>>(Promise.resolve()),syncFailed=useRef(false);
 const draft=`study-two-speaker-draft:${run.instrumentVersion}:${access}:${wave}`;
 const pageIndex=Math.min(page,items.length-1),item=items[pageIndex];
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(draft)||'null');if(saved?.answers&&Number.isInteger(saved.page)&&saved.page>=0&&saved.page<items.length){if(saved.revision===initial.revision){setAnswers(saved.answers);setPage(saved.page);}else{localStorage.setItem(`${draft}:unmerged`,JSON.stringify(saved));}}}catch{setStorageOK(false);}setLoaded(true);},[draft,initial.revision,items.length]);
 useEffect(()=>{if(!loaded)return;try{localStorage.setItem(draft,JSON.stringify({answers,page,revision}));}catch{setStorageOK(false);}},[draft,loaded,answers,page,revision]);
 useEffect(()=>{heading.current?.focus({preventScroll:true});},[page,loaded]);
 useEffect(()=>{if(error)errorSummary.current?.focus();},[error]);
 function save(nextAnswers:Record<string,Answer>,target:number,complete=false){
  const task=queue.current.then(async()=>{
   if(syncFailed.current)throw new Error('Progress could not be saved. Keep your personal link and reload this page before continuing. Your browser draft is retained.');
   const payload={action:'save',access,role,wave,instrumentVersion:run.instrumentVersion,revision:serverRevision.current,answers:nextAnswers,page:target,complete};
   let saved:SavedPerson;
   try{saved=await request(payload);}catch(e){
    // A lost acknowledgement must not overwrite newer data. Recover only this exact save.
    const current=await request({action:'status',access,role}).catch(()=>null),f=current?.forms[wave];
    const canonical=(a:Record<string,Answer>)=>{const normal={...a};if(complete)for(const q of items)if(q.optional&&(normal[q.id]===undefined||normal[q.id]===''))normal[q.id]={missing:'skipped'};return JSON.stringify(Object.fromEntries(Object.entries(normal).sort(([a],[b])=>a.localeCompare(b))));};
    if(current&&f&&f.page===target&&Boolean(f.completedAt)===complete&&canonical(f.answers)===canonical(nextAnswers))saved=current;else{syncFailed.current=true;throw e;}
   }
   serverRevision.current=saved.forms[wave]!.revision;setRevision(serverRevision.current);
   if(complete){try{localStorage.removeItem(draft);}catch{}onComplete(saved);}
  });
  queue.current=task.catch(()=>{});return task;
 }
 function goBack(){setDirection('back');setPage(pageIndex-1);setError('');setInvalidId('');window.scrollTo({top:0});void save(answers,pageIndex-1).catch(e=>setError((e as Error).message));}
 async function next(){let invalid=answerError(item,answers[item.id])?item:undefined;if(!invalid&&pageIndex===items.length-1)invalid=items.find(q=>answerError(q,answers[q.id]));if(invalid){setInvalidId(invalid.id);setError(`${invalid.prompt} ${answerError(invalid,answers[invalid.id])}`);setPage(items.indexOf(invalid));return;}setInvalidId('');setError('');if(pageIndex<items.length-1){setDirection('forward');setPage(pageIndex+1);window.scrollTo({top:0});void save(answers,pageIndex+1).catch(e=>setError((e as Error).message));return;}setBusy(true);try{await save(answers,pageIndex,true);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
 return <section className="stage ratings-stage s1-card s1-form" aria-busy={busy}><div className="ratings-stage-deco" aria-hidden="true"><VectorDecoration className="ratings-v1" src="/vector-decoration/profile-vector-new-1.svg" delay="0s" drawDuration="22s" stroke="#F4F3F4" activateImmediately/><VectorDecoration className="ratings-v2" src="/vector-decoration/profile-vector-new-2-open.svg" delay="0s" stroke="#F4F3F4" variant="profile-2-hero"/></div><p className="eyebrow">Panel speakers · {wave==='pre'?'Before':'After'} the conversation</p><div className="step-header s1-step-header"><h1 ref={heading} tabIndex={-1}>{item.section}</h1><p>Think about the issue being discussed. Answer for how you see things now. {wave==='pre'?'Complete this privately before any panel briefing.':'Answer privately now that the conversation is over.'}</p></div><div className="rating-focus-header"><span>Question {pageIndex+1} of {items.length}</span><progress className="s1-progress" value={pageIndex+1} max={items.length} aria-label={`Questionnaire progress: question ${pageIndex+1} of ${items.length}`}/></div><SpeakerQuestion key={item.id} item={item} value={answers[item.id]} index={pageIndex} invalid={invalidId===item.id} motionDirection={direction} onChange={value=>{if(!busy){setAnswers(a=>({...a,[item.id]:value}));setError('');setInvalidId('');}}}/>{error&&<p ref={errorSummary} tabIndex={-1} className="s1-error" role="alert">{error}{invalidId&&<> <a href={`#question-${invalidId}`} onClick={e=>{e.preventDefault();document.getElementById(`question-${invalidId}`)?.focus();}}>Go to question</a></>}</p>}<nav className="actions bf-nav" aria-label="Questionnaire navigation"><button className="secondary" disabled={pageIndex===0||busy||syncFailed.current} onClick={goBack}><ArrowLeft size={18} aria-hidden="true"/>Back</button>{!storageOK&&<span>Keep this page open; draft cannot be saved</span>}<button className="primary" disabled={busy||!loaded||syncFailed.current} onClick={next}>{busy?'Saving…':pageIndex<items.length-1?'Continue':'Save my answers'}{!busy&&<ArrowRight size={18} aria-hidden="true"/>}</button></nav></section>;
}
