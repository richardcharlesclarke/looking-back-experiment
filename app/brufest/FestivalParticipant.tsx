'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Question from './Question';
import { answerError, questions } from '@/lib/brufest/instruments';
import { CONSENT_TEXT, EVOLVABLE_URL, FESTIVAL_VERSION, FOLLOWUP_TEXT, INFORMATION, INFORMATION_VERSION, STUDY_ONE_ADMIN_URL, STUDY_ONE_API_PATH, STUDY_ONE_PUBLIC_PATH, showEvolvableInvitation } from '@/lib/brufest/festival/content';
import type { View, Wave } from '@/lib/brufest/festival/types';
import type { Answers } from '@/lib/brufest/types';
import './festival-journey.css';
const STORAGE='study-one-first-link-v2';
const fresh=()=>Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');
async function request(body:Record<string,unknown>):Promise<View>{const r=await fetch(STUDY_ONE_API_PATH,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw new Error(d.error);return d;}
export default function FestivalParticipant(){
  const [access,setAccess]=useState(''),[kind,setKind]=useState<'first'|'after'>('first'),[view,setView]=useState<View|null>(null),[loaded,setLoaded]=useState(false),[registered,setRegistered]=useState(false),[invalidLink,setInvalidLink]=useState(false);
  const [error,setError]=useState(''),[busy,setBusy]=useState(false),[agree,setAgree]=useState(false),[storageNote,setStorageNote]=useState('');
  useEffect(()=>{
    const hash=new URLSearchParams(location.hash.slice(1));
    const linkKind=hash.has('after')?'after':'first';setKind(linkKind);
    let key=hash.get(linkKind)||'';
    if(!key&&linkKind==='first')try{key=localStorage.getItem(STORAGE)||'';}catch{setStorageNote('Your browser cannot save progress. Keep this page open.');}
    if(key){setAccess(key);request({action:'status',access:key,kind:linkKind}).then(v=>{setView(v);setRegistered(true);}).catch(e=>{setError(e.message);setInvalidLink(true);}).finally(()=>setLoaded(true));}
    else {let pending='';try{pending=localStorage.getItem('study-one-pending-v2')||'';}catch{}const next=pending||fresh();setAccess(next);try{localStorage.setItem('study-one-pending-v2',next);}catch{}setLoaded(true);}
  },[]);
  useEffect(()=>{const changed=()=>location.reload();window.addEventListener('hashchange',changed);return()=>window.removeEventListener('hashchange',changed);},[]);
  async function start(){setBusy(true);setError('');try{const v=await request({action:'enrol',access,agree,informationVersion:INFORMATION_VERSION});setView(v);setRegistered(true);history.replaceState(null,'',`${STUDY_ONE_PUBLIC_PATH}#first=${access}`);try{localStorage.setItem(STORAGE,access);}catch{setStorageNote('Your browser cannot save progress. Keep this page open.');}window.scrollTo({top:0});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  async function act(body:Record<string,unknown>){const v=await request({...body,access,kind});if(body.action==='delete'){try{localStorage.removeItem(STORAGE);localStorage.removeItem('study-one-pending-v2');}catch{}history.replaceState(null,'',STUDY_ONE_PUBLIC_PATH);}setView(v);window.scrollTo({top:0});}
  async function remove(){if(!window.confirm('Remove your saved answers and contact details? This cannot be undone.'))return;setBusy(true);setError('');try{await act({action:'delete'});}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <main className="bf-main study-one"><header className="topbar"><Link href={STUDY_ONE_PUBLIC_PATH}>Big Brue · Study One</Link><span>Before and after the festival</span></header>
    {!loaded?<section className="s1-card"><p>Opening questionnaire…</p></section>:error&&!registered&&invalidLink?<section className="s1-card"><h1>Personal link could not be opened</h1><p role="alert">{error}</p><p>Use the original email link or ask the research assistant to resend it. Your answers will not be matched by guessing a code.</p></section>:!view?<section className="s1-card">
      <p className="eyebrow">First questionnaire</p><h1>First questionnaire</h1><p className="s1-lead">Read about the study, then decide whether to take part.</p>
      {INFORMATION.map(p=><div key={p.title}><h2>{p.title}</h2><p>{p.text}</p></div>)}
      <label className="s1-check"><input type="checkbox" checked={agree} onChange={e=>setAgree(e.target.checked)}/><span>{CONSENT_TEXT}</span></label>
      <button className="primary" disabled={busy||!agree} onClick={start}>{busy?'Opening…':'Start first questionnaire'}</button>
    </section>:view.step==='pre'||view.step==='post'?<FestivalForm key={`${access}:${view.step}`} access={access} wave={view.step} onSubmit={(wave,answers,startedAt)=>act({action:'submit',wave,answers,startedAt})}/>:view.step==='contact'?<ContactForm onSubmit={(permission,email)=>act({action:'contact',permission,email})}/>:<section className="s1-card">
      <h1>{view.step==='deleted'?'Study data removed':view.step==='complete'?'Both questionnaires saved':view.step==='stopped'?'Follow-up contact stopped':'First questionnaire saved'}</h1><p className="s1-lead">{view.message}</p>
      {view.permission&&<p>Your follow-up email address: <strong>{view.email}</strong>.</p>}
      {view.step==='waiting'&&kind==='after'&&<button className="secondary" onClick={()=>act({action:'status'}).catch(e=>setError(e.message))}>Check whether the questionnaire is open</button>}
      {((view.step==='waiting'&&kind==='first')||(view.step==='stopped'&&view.completed.includes('pre')&&!view.completed.includes('post')))&&<details key={`${view.step}:${view.permission}`}><summary>{view.permission?'Correct the follow-up email or change permission':'Add an email for follow-up'}</summary><ContactForm key={`${view.step}:${view.permission}`} initialEmail={view.email||''} onSubmit={(permission,email)=>act({action:'contact',permission,email})}/></details>}
      {(view.step==='complete'||view.step==='stopped'||(view.step==='waiting'&&kind==='first'))&&<p>{showEvolvableInvitation(view.step,kind,view.completed)?'Your questionnaire is complete. You can close this page.':"You're finished for now. You can close this page."}</p>}
      {showEvolvableInvitation(view.step,kind,view.completed)&&<aside className="s1-optional-next" aria-label="Optional next step"><h2>Optional: explore Evolvable</h2><p>If you would like to explore how you approach different situations before Big Brue, you can also try Evolvable.</p><a href={EVOLVABLE_URL} target="_blank" rel="noreferrer">Explore Evolvable</a></aside>}
      {view.step!=='deleted'&&<details><summary>Remove my study data</summary><p>This removes your saved answers, email address and personal links. It cannot be undone.</p><button className="secondary" disabled={busy} onClick={remove}>Remove my study data</button></details>}
    </section>}
    {error&&!invalidLink&&<p className="s1-error" role="alert">{error}</p>}{storageNote&&<p className="s1-error">{storageNote}</p>}
    <footer className="bf-footer"><span>Study One · private questionnaires</span><a href={STUDY_ONE_ADMIN_URL}>Research assistant workspace</a></footer>
  </main>;
}
function ContactForm({onSubmit,initialEmail=''}:{onSubmit:(permission:boolean,email:string)=>Promise<void>;initialEmail?:string}){
  const [email,setEmail]=useState(initialEmail),[permission,setPermission]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  async function save(yes:boolean){setBusy(true);setError('');try{await onSubmit(yes,email);setPermission(false);}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <section className="s1-card"><h1>Receive the questionnaire after the festival</h1><p>Your first answers are saved. Giving an email is optional. If you agree, the research assistant will email a personal link after the festival. The link will match your answers automatically.</p><label className="s1-field">Email address<input type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/></label><label className="s1-check"><input type="checkbox" checked={permission} onChange={e=>setPermission(e.target.checked)}/><span>{FOLLOWUP_TEXT}</span></label><div className="s1-actions"><button className="primary" disabled={busy||!permission||!email} onClick={()=>save(true)}>Save email and permission</button><button className="s1-skip-email" disabled={busy} onClick={()=>save(false)}>Continue without email follow-up</button></div>{error&&<p role="alert" className="s1-error">{error}</p>}</section>;
}
function FestivalForm({access,wave,onSubmit}:{access:string;wave:Wave;onSubmit:(wave:Wave,answers:Answers,startedAt:string)=>Promise<void>}){
  const [answers,setAnswers]=useState<Answers>({}),[page,setPage]=useState(0),[startedAt,setStartedAt]=useState(''),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[storageOK,setStorageOK]=useState(true);
  const draft=`study-one-draft:${FESTIVAL_VERSION}:${access}:${wave}`;
  const items=questions({study:'festival',role:'attendee',wave,festivalVersion:FESTIVAL_VERSION},answers);
  const pages:{title:string;items:typeof items}[]=[];for(const q of items){const last=pages[pages.length-1];if(last?.title===q.section&&last.items.length<4)last.items.push(q);else pages.push({title:q.section,items:[q]});}
  const pageIndex=Math.min(page,pages.length-1);
  const current=pages[pageIndex];
  useEffect(()=>{try{const old=JSON.parse(localStorage.getItem(draft)||'null');if(old?.answers&&typeof old.page==='number'){setAnswers(old.answers);setPage(old.page);setStartedAt(old.startedAt);}else setStartedAt(new Date().toISOString());}catch{setStartedAt(new Date().toISOString());setStorageOK(false);}setLoaded(true);},[draft]);
  useEffect(()=>{if(!loaded)return;try{localStorage.setItem(draft,JSON.stringify({answers,page,startedAt}));}catch{setStorageOK(false);}},[draft,loaded,answers,page,startedAt]);
  async function next(){let invalid=current.items.find(q=>answerError(q,answers[q.id]));if(!invalid&&pageIndex===pages.length-1)invalid=items.find(q=>answerError(q,answers[q.id]));if(invalid){setError(`${invalid.prompt} ${answerError(invalid,answers[invalid.id])}`);setPage(pages.findIndex(p=>p.items.includes(invalid!)));return;}setError('');if(pageIndex<pages.length-1){setPage(pageIndex+1);window.scrollTo({top:0});return;}setBusy(true);try{await onSubmit(wave,answers,startedAt);try{localStorage.removeItem(draft);}catch{}}catch(e){setError((e as Error).message);}finally{setBusy(false);}}
  return <section className="s1-card s1-form"><p className="eyebrow">Part {pageIndex+1} of {pages.length}</p><h1>{wave==='pre'?'First questionnaire':'Questionnaire after the festival'}</h1><p>{wave==='pre'?'Answer for yourself before attending any festival activities.':'Answer for yourself now that the festival is over.'}</p><h2>{current.title}</h2>{current.items.map(item=><Question allowVoice={false} key={item.id} item={item} value={answers[item.id]} index={items.indexOf(item)} onChange={v=>{setAnswers(a=>({...a,[item.id]:v}));setError('');}}/>)}{error&&<p className="s1-error" role="alert">{error}</p>}<nav className="bf-nav"><button className="secondary" disabled={pageIndex===0||busy} onClick={()=>{setPage(pageIndex-1);setError('');window.scrollTo({top:0});}}>Previous questions</button>{!storageOK&&<span>Keep this page open; draft cannot be saved</span>}<button className="primary" disabled={busy||!loaded} onClick={next}>{busy?'Saving…':pageIndex<pages.length-1?'Next questions':'Save questionnaire'}</button></nav></section>;
}
