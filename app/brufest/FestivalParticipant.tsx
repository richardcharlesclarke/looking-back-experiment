'use client';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { VectorDecoration } from '../looking-back/VectorDecoration';
import { CONTINUOUS_INSTRUMENT_VERSION, CONFLICT_INSTRUMENT_VERSION, isContinuousInstrument } from '@/lib/brufest/festival/scales';
import { useEffect, useRef, useState } from 'react';
import Question from './Question';
import { answerError, questions } from '@/lib/brufest/instruments';
import { CONSENT_TEXT, EVOLVABLE_URL, FESTIVAL_VERSION, FOLLOWUP_TEXT, INFORMATION, INFORMATION_VERSION, STUDY_ONE_ADMIN_URL, STUDY_ONE_API_PATH, STUDY_ONE_PUBLIC_PATH, showEvolvableInvitation } from '@/lib/brufest/festival/content';
import type { View, Wave } from '@/lib/brufest/festival/types';
import type { Answers } from '@/lib/brufest/types';
import './study-one-participant.css';
const STORAGE='study-one-first-link-v2';
const fresh=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
async function request(body:Record<string,unknown>):Promise<View>{
  let r:Response;
  try{r=await fetch(STUDY_ONE_API_PATH,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});}catch{throw new Error('We could not connect. Check your connection and try again.');}
  const d=await r.json().catch(()=>{throw new Error('We could not complete that request. Please try again.');});
  if(!r.ok)throw new Error(d.error || 'We could not complete that request. Please try again.');
  return d;
}
export default function FestivalParticipant(){
  const [access,setAccess]=useState(''),[kind,setKind]=useState<'first'|'after'>('first'),[view,setView]=useState<View|null>(null),[loaded,setLoaded]=useState(false),[registered,setRegistered]=useState(false),[invalidLink,setInvalidLink]=useState(false);
  const [review,setReview]=useState(false),[reviewFresh,setReviewFresh]=useState(false),[reviewFinished,setReviewFinished]=useState(false),[reviewPage,setReviewPage]=useState<number|undefined>(),[reviewVisit,setReviewVisit]=useState(0);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[agree,setAgree]=useState(false),[storageNote,setStorageNote]=useState('');
  useEffect(()=>{
    const params=new URLSearchParams(location.search);
    if(params.get('preview')==='1'){
      const wave=params.get('wave')==='post'?'post':'pre';
      if(params.get('step')==='connection-close'){
        const page=questions({study:'festival',role:'attendee',wave,festivalVersion:FESTIVAL_VERSION,responseInstrument:CONFLICT_INSTRUMENT_VERSION},{}).findIndex(q=>q.id==='E1_CONNECTION_CLOSE');
        setReviewPage(Math.max(0,page));setReviewFresh(true);
      }
      setReview(true);setAccess('preview-only');setKind('first');setView(previewView(wave));setLoaded(true);return;
    }
    const hash=new URLSearchParams(location.hash.slice(1));
    const linkKind=hash.has('after')?'after':'first';setKind(linkKind);
    let key=hash.get(linkKind)||'';
    if(!key&&linkKind==='first')try{key=localStorage.getItem(STORAGE)||'';}catch{setStorageNote('Your browser cannot save progress. Keep this page open.');}
    if(key){setAccess(key);request({action:'status',access:key,kind:linkKind}).then(v=>{setView(v);setRegistered(true);}).catch(e=>{setError(e.message);setInvalidLink(true);}).finally(()=>setLoaded(true));}
    else {let pending='';try{pending=localStorage.getItem('study-one-pending-v2')||'';}catch{}const next=pending||fresh();setAccess(next);try{localStorage.setItem('study-one-pending-v2',next);}catch{}setLoaded(true);}
  },[]);
  useEffect(()=>{const changed=()=>location.reload();window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed);},[]);
  function connectionPage(wave:Wave){return Math.max(0,questions({study:'festival',role:'attendee',wave,festivalVersion:FESTIVAL_VERSION,responseInstrument:CONFLICT_INSTRUMENT_VERSION},{}).findIndex(q=>q.id==='E1_CONNECTION_CLOSE'));}
  function previewView(wave:Wave):View{return {id:'preview-only',mode:'study',step:wave,message:'',contactChoiceSaved:false,permission:false,email:null,completed:[],responseInstrument:CONFLICT_INSTRUMENT_VERSION};}
  function openPreview(wave:Wave,page=0){setReviewFresh(false);setReviewFinished(false);setReviewPage(page);setReviewVisit(n=>n+1);setView(previewView(wave));history.replaceState(null,'',`${STUDY_ONE_PUBLIC_PATH}?preview=1&wave=${wave}`);window.scrollTo({top:0});}
  async function start(){setBusy(true);setError('');try{const v=await request({action:'enrol',access,agree,informationVersion:INFORMATION_VERSION,instrumentVersion:CONFLICT_INSTRUMENT_VERSION});setView(v);setRegistered(true);history.replaceState(null,'',`${STUDY_ONE_PUBLIC_PATH}#first=${access}`);try{localStorage.setItem(STORAGE,access);}catch{setStorageNote('Your browser cannot save progress. Keep this page open.');}window.scrollTo({top:0});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function act(body:Record<string,unknown>){const v=await request({...body,access,kind});if(body.action==='delete'){try{localStorage.removeItem(STORAGE);localStorage.removeItem('study-one-pending-v2');}catch{}history.replaceState(null,'',STUDY_ONE_PUBLIC_PATH);}setView(v);window.scrollTo({top:0});}
  async function remove(){if(!window.confirm('Remove your saved answers and contact details? This cannot be undone.'))return;setBusy(true);setError('');try{await act({action:'delete'});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const screen = view?.step || (invalidLink ? 'invalid' : 'intro');
  useEffect(() => {
    if (loaded) document.querySelector<HTMLElement>('.s1-participant h1')?.focus({ preventScroll: true });
  }, [loaded, screen]);
  return <main className="s1-participant"><header className="topbar"><a className="mark" href="https://experiments.evolvable.me">Initiatives at evolvable.me</a><a href={EVOLVABLE_URL}>Explore evolvable.me</a></header>
    {review&&<aside className="s1-preview-bar" aria-label="Questionnaire preview"><p>Preview only · No study responses are sent.</p><div><button onClick={()=>openPreview('pre')}>Before Big Brue</button><button onClick={()=>openPreview('post')}>After Big Brue</button><button onClick={()=>openPreview('pre',connectionPage('pre'))}>Connection questions</button></div></aside>}
    {review&&reviewFinished?<section className="stage s1-card"><h1 tabIndex={-1}>Preview complete</h1><p>Nothing has been submitted. Use the preview buttons above to explore either questionnaire.</p></section>:!loaded?<section className="stage s1-card" role="status" aria-live="polite"><p>Opening questionnaire…</p></section>:error&&!registered&&invalidLink?<section className="stage s1-card"><h1 tabIndex={-1}>Personal link could not be opened</h1><p role="alert">{error}</p><p>Use the original email link or ask the research assistant to resend it. Your answers will not be matched by guessing a code.</p></section>:!view?<section className="stage s1-card">
      <p className="eyebrow">Before Big Brue</p><h1 tabIndex={-1}>How We Disagree</h1><p className="s1-lead">A study of how people approach conflict before and after Big Brue. Read about taking part below.</p>
      {INFORMATION.map(p=><div className="s1-information" key={p.title}><h2>{p.title}</h2><p>{p.text}</p></div>)}
      <label className="s1-check"><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/><span>{CONSENT_TEXT}</span></label>
      <button className="primary" disabled={busy||!agree} onClick={start}>{busy?'Opening…':'Begin before Big Brue'}<ArrowRight size={18} aria-hidden="true"/></button>
    </section>:view.step==='pre'||view.step==='post'?<FestivalForm key={`${access}:${view.step}:${view.responseInstrument}:${reviewVisit}`} initialPage={review?reviewPage:undefined} persistDraft={!reviewFresh} access={access} wave={view.step} instrument={view.responseInstrument??CONTINUOUS_INSTRUMENT_VERSION} onSubmit={async(wave,answers,startedAt)=>{if(review){setReviewFinished(true);window.scrollTo({top:0});return;}await act({action:'submit',wave,answers,startedAt,instrumentVersion:view.responseInstrument??CONTINUOUS_INSTRUMENT_VERSION});}}/>:view.step==='contact'?<ContactForm onSubmit={(permission,email)=>act({action:'contact',permission,email})}/>:<section className="stage s1-card">
      <h1 tabIndex={-1}>{view.step==='deleted'?'Your study data has been removed':view.step==='complete'?'Thank you — both sets of answers are saved':view.step==='stopped'?'Your follow-up choice is saved':'Your answers before Big Brue are saved'}</h1><p className="s1-lead">{view.message}</p>
      {view.permission&&<p>Your follow-up email address: <strong>{view.email}</strong>.</p>}
      {view.step==='waiting'&&kind==='after'&&<button className="secondary" onClick={()=>act({action:'status'}).catch(e=>setError(e.message))}>Check if I can begin</button>}
      {((view.step==='waiting'&&kind==='first')||(view.step==='stopped'&&view.completed.includes('pre')&&!view.completed.includes('post')))&&<details key={`${view.step}:${view.permission}`}><summary>{view.permission?'Correct the follow-up email or change permission':'Add an email for follow-up'}</summary><ContactForm embedded key={`${view.step}:${view.permission}`} initialEmail={view.email||''} onSubmit={(permission,email)=>act({action:'contact',permission,email})}/></details>}
      {(view.step==='complete'||view.step==='stopped'||(view.step==='waiting'&&kind==='first'))&&<p>{view.step==='complete'?'You’re all done. You can close this page.':showEvolvableInvitation(view.step,kind,view.completed)?'Your questionnaire is complete. You can close this page.':"You're finished for now. You can close this page."}</p>}
      {showEvolvableInvitation(view.step,kind,view.completed)&&<aside className="s1-optional-next" aria-label="Optional next step"><h2>Optional: explore Evolvable</h2><p>If you would like to explore how you approach different situations before Big Brue, you can also try Evolvable.</p><a href={EVOLVABLE_URL} target="_blank" rel="noreferrer">Explore Evolvable</a></aside>}
      {view.step!=='deleted'&&<details><summary>Remove my study data</summary><p>This removes your saved answers, email address and personal links. It cannot be undone.</p><button className="secondary" disabled={busy} onClick={remove}>Remove my study data</button></details>}
    </section>}
    {error&&!invalidLink&&<p className="s1-error" role="alert">{error}</p>}{storageNote&&<p className="s1-error">{storageNote}</p>}
    <footer className="bf-footer"><span>How We Disagree · Big Brue</span><a href={STUDY_ONE_ADMIN_URL}>Study team sign in</a></footer>
  </main>;
}
function ContactForm({onSubmit,initialEmail='',embedded=false}:{embedded?:boolean;onSubmit:(permission:boolean,email:string)=>Promise<void>;initialEmail?:string}){
  const [email,setEmail]=useState(initialEmail),[permission,setPermission]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const errorRef=useRef<HTMLParagraphElement>(null);
  useEffect(()=>{if(error)errorRef.current?.focus();},[error]);
  async function save(yes:boolean){setBusy(true);setError('');try{await onSubmit(yes,email);setPermission(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  const Heading = embedded ? 'h2' : 'h1';
  return <section className={embedded ? 's1-contact-edit' : 'stage s1-card'} aria-busy={busy}><Heading tabIndex={-1}>Stay in touch for after Big Brue</Heading><p>Your first answers are saved. Giving an email is optional. If you agree, the research assistant will email a personal link after the festival. The link will match your answers automatically.</p><label className="s1-field">Email address<input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="s1-check"><input type="checkbox" checked={permission} onChange={e=>setPermission(e.target.checked)}/><span>{FOLLOWUP_TEXT}</span></label><div className="s1-actions"><button className="primary" disabled={busy||!permission||!email} onClick={()=>save(true)}>{busy?'Saving…':'Save my follow-up choice'}</button><button className="s1-skip-email" disabled={busy} onClick={()=>save(false)}>Finish without email follow-up</button></div>{error&&<p ref={errorRef} tabIndex={-1} role="alert" className="s1-error">{error}</p>}</section>;
}
function FestivalForm({access,wave,instrument,initialPage,persistDraft=true,onSubmit}:{access:string;wave:Wave;instrument:string;initialPage?:number;persistDraft?:boolean;onSubmit:(wave:Wave,answers:Answers,startedAt:string)=>Promise<void>}){
  const [answers,setAnswers]=useState<Answers>({}),[page,setPage]=useState(0),[startedAt,setStartedAt]=useState(''),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[storageOK,setStorageOK]=useState(true);
  const [direction,setDirection]=useState<'forward'|'back'>('forward');
  const heading = useRef<HTMLHeadingElement>(null);
  const errorSummary = useRef<HTMLParagraphElement>(null);
  const [invalidId,setInvalidId]=useState('');
  useEffect(()=>{heading.current?.focus({preventScroll:true});},[page,loaded]);
  useEffect(()=>{if(error)errorSummary.current?.focus();},[error]);
  const draft=`study-one-draft:${instrument}:${access}:${wave}`;
  const items=questions({study:'festival',role:'attendee',wave,festivalVersion:FESTIVAL_VERSION,responseInstrument:instrument},answers);
  const pages=items.map(q=>({title:q.section,items:[q]}));
  const pageIndex=Math.min(page,pages.length-1);
  const current=pages[pageIndex];
  useEffect(()=>{if(!persistDraft){setPage(initialPage??0);setStartedAt(new Date().toISOString());setLoaded(true);return;}try{const old=JSON.parse(localStorage.getItem(draft)||(!isContinuousInstrument(instrument)?localStorage.getItem(`study-one-draft:${access}:${wave}`):null)||'null');if(old?.answers&&typeof old.page==='number'){setAnswers(old.answers);setPage(initialPage??old.page);setStartedAt(old.startedAt);}else {setPage(initialPage??0);setStartedAt(new Date().toISOString());}}catch{setStartedAt(new Date().toISOString());setStorageOK(false);}setLoaded(true);},[draft,access,wave,instrument,initialPage,persistDraft]);
  useEffect(()=>{if(!loaded||!persistDraft)return;try{localStorage.setItem(draft,JSON.stringify({answers,page,startedAt}));}catch{setStorageOK(false);}},[draft,loaded,answers,page,startedAt,persistDraft]);
  async function next(){let invalid=current.items.find(q=>answerError(q,answers[q.id]));if(!invalid&&pageIndex===pages.length-1)invalid=items.find(q=>answerError(q,answers[q.id]));if(invalid){setInvalidId(invalid.id);setError(`${invalid.prompt} ${answerError(invalid,answers[invalid.id])}`);setPage(pages.findIndex(p=>p.items.includes(invalid!)));return;}setInvalidId('');setError('');if(pageIndex<pages.length-1){setDirection('forward');setPage(pageIndex+1);window.scrollTo({top:0});return;}setBusy(true);try{await onSubmit(wave,answers,startedAt);if(persistDraft)try{localStorage.removeItem(draft);}catch{}}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <section className="stage ratings-stage s1-card s1-form" aria-busy={busy}><div className="ratings-stage-deco" aria-hidden="true">
            <VectorDecoration
              className="ratings-v1"
              src="/vector-decoration/profile-vector-new-1.svg"
              delay="0s"
              drawDuration="22s"
              stroke="#F4F3F4"
              activateImmediately
            />
            <VectorDecoration
              className="ratings-v2"
              src="/vector-decoration/profile-vector-new-2-open.svg"
              delay="0s"
              stroke="#F4F3F4"
              variant="profile-2-hero"
            />
          </div><p className="eyebrow">How We Disagree · {wave==='pre'?'Before Big Brue':'After Big Brue'}</p><div className="step-header s1-step-header"><h1 ref={heading} tabIndex={-1}>{current.title}</h1><p>{wave==='pre'?'Answer for yourself before attending any festival activities.':'Answer for yourself now that the festival is over.'}</p></div><div className="rating-focus-header"><span>Question {pageIndex+1} of {pages.length}</span><progress className="s1-progress" value={pageIndex+1} max={pages.length} aria-label={`Questionnaire progress: question ${pageIndex+1} of ${pages.length}`}/></div>{current.items.map(item=><Question motionDirection={direction} invalid={invalidId===item.id} allowVoice={false} key={item.id} item={item} value={answers[item.id]} index={items.indexOf(item)} onChange={v=>{setAnswers(a=>({...a,[item.id]:v}));setError('');setInvalidId('');}}/>)}{error&&<p ref={errorSummary} tabIndex={-1} className="s1-error" role="alert">{error}{invalidId&&<> <a href={`#question-${invalidId}`} onClick={e=>{e.preventDefault();document.getElementById(`question-${invalidId}`)?.focus();}}>Go to question</a></>}</p>}<nav className="actions bf-nav" aria-label="Questionnaire navigation"><button className="secondary" disabled={pageIndex===0||busy} onClick={()=>{setDirection('back');setPage(pageIndex-1);setError('');window.scrollTo({top:0});}}><ArrowLeft size={18} aria-hidden="true"/>Back</button>{!storageOK&&<span>Keep this page open; draft cannot be saved</span>}<button className="primary" disabled={busy||!loaded} onClick={next}>{busy?'Saving…':pageIndex<pages.length-1?'Continue':'Save my answers'}{!busy&&<ArrowRight size={18} aria-hidden="true"/>}</button></nav></section>;
}
