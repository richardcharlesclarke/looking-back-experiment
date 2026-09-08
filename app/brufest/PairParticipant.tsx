'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import Question from './Question';
import { answerError, questions } from '@/lib/brufest/instruments';
import { PAIR_VERSION, TOPICS } from '@/lib/brufest/pair-topics';
import type { Answers, Context, Wave } from '@/lib/brufest/types';
import type { ParticipantView } from '@/lib/brufest/pair-types';
import './pair-journey.css';

export const FORM_NAMES: Partial<Record<Wave,string>> = {
  screen:'Participant screening questionnaire', pre:'Questionnaire before the discussion',
  joint:'Joint discussion record', post:'Questionnaire after the discussion', partner:'Check your partner’s description',
};
const initial:ParticipantView={label:'',screenDone:false,wave:'screen',completed:[],message:'The helper uses these answers to find two willing participants with different views.',context:{study:'pairs',role:'participant',wave:'screen',screeningBank:PAIR_VERSION}};
async function request(body:Record<string,unknown>):Promise<ParticipantView> {
  const response=await fetch('/api/brufest/pairs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const data=await response.json(); if(!response.ok)throw new Error(data.error); return data;
}
export default function PairParticipant(){
  const [view,setView]=useState<ParticipantView>(initial),[access,setAccess]=useState(''),[loaded,setLoaded]=useState(false),[registered,setRegistered]=useState(false);
  const [error,setError]=useState(''),[storageNote,setStorageNote]=useState(''),[copied,setCopied]=useState(false),[origin,setOrigin]=useState('');
  const refresh=useCallback(async()=>{
    if(!access||!registered)return;
    try{setView(await request({action:'status',access}));setError('');}catch(e){setError((e as Error).message);}
  },[access,registered]);
  useEffect(()=>{
    setOrigin(location.origin);
    let key=location.hash.startsWith('#return=')?location.hash.slice(8):'';
    if(!key)try{key=localStorage.getItem('brufest-pair-return-v2')||'';}catch{setStorageNote('This browser cannot save progress. Keep this page open and save the personal return link after submitting.');}
    if(key){
      setAccess(key);request({action:'status',access:key}).then(v=>{setView(v);setRegistered(true);try{localStorage.setItem('brufest-pair-return-v2',key);}catch{}}).catch(e=>setError(e.message)).finally(()=>setLoaded(true));
    }else{
      let pending='';try{pending=localStorage.getItem('brufest-pair-pending-v2')||'';}catch{}
      const fresh=pending||(crypto.randomUUID()+crypto.randomUUID()).replaceAll('-','');
      setAccess(fresh);try{localStorage.setItem('brufest-pair-pending-v2',fresh);}catch{}setLoaded(true);
    }
  },[]);
  useEffect(()=>{if(view.wave||!registered)return;const timer=setInterval(refresh,5000);return()=>clearInterval(timer);},[refresh,view.wave,registered]);
  const personalLink=`${origin}/brufest/pairs#return=${access}`;
  async function copyLink(){try{await navigator.clipboard.writeText(personalLink);setCopied(true);}catch{setStorageNote('Copy the personal link shown below.');}}
  function downloadLink(){
    const file=new Blob([`${view.label} — Brufest discussion\n\nPERSONAL RETURN LINK\n${personalLink}\n\nKeep this link private. It opens your questionnaires. Open it on the same or another device. The volunteer number alone does not open your answers.\nThis local preview link works only on this Mac.\n`],{type:'text/plain'});
    const url=URL.createObjectURL(file),a=document.createElement('a');a.href=url;a.download=`${view.label.replaceAll(' ','-')}-return-link.txt`;a.click();URL.revokeObjectURL(url);
  }
  async function submit(wave:Wave,answers:Answers,startedAt:string){
    if(!registered){const p=await request({action:'register',access});setRegistered(true);setView(v=>({...v,label:p.label}));}
    try{localStorage.setItem('brufest-pair-return-v2',access);}catch{setStorageNote('Progress cannot be kept in this browser. Save your personal return link.');}
    history.replaceState(null,'',`/brufest/pairs#return=${access}`);
    const next=await request({action:'submit',access,wave,answers,startedAt});setView(next);window.scrollTo({top:0});
  }
  function another(){
    const key=(crypto.randomUUID()+crypto.randomUUID()).replaceAll('-','');
    setAccess(key);setRegistered(false);setView(initial);setError('');setCopied(false);
    try{localStorage.removeItem('brufest-pair-return-v2');localStorage.setItem('brufest-pair-pending-v2',key);}catch{}
    history.replaceState(null,'','/brufest/pairs');window.scrollTo({top:0});
  }
  return <main className="bf-main bf-pairs pair-journey">
    <header className="topbar"><Link className="mark" href="/">Initiatives at evolvable.me</Link><span>Brufest · Paired discussion study</span></header>
    <div className="pair-preview">Local research preview · not open for real participant responses</div>
    {!loaded?<section className="pair-wait"><p>Opening questionnaire…</p></section>:error&&!view.label?<section className="pair-wait"><h1>Return to your questionnaire</h1><p role="alert">{error}</p><p>If the link and saved browser data are both lost, ask the helper. Answers cannot safely be matched using memory of a name.</p><button className="secondary" onClick={another}>Start as a new volunteer</button></section>:<>
      {view.context&&view.wave?<PairForm key={`${access}:${view.wave}`} context={view.context} access={access} label={view.label} onSubmit={submit}/>:<section className="pair-wait">
        <p className="eyebrow">{view.label}{view.pair?` · Participant ${view.pair.member===0?'A':'B'}`:''}</p>
        <h1>{view.completed.includes('partner')?'Questionnaires complete':view.screenDone&&!view.pair?'Screening questionnaire saved':view.pair?.stage==='pre'?'Before questionnaire saved':'Your next step'}</h1>
        {view.pair&&<p className="bf-topic">{view.pair.proposition}</p>}
        <p className="pair-purpose">{view.message}</p><button className="secondary" onClick={refresh}>Check for the next step</button>
      </section>}
      {registered&&<aside className="pair-receipt">
        <h2>Your personal return link</h2><p><strong>{view.label}</strong> — show this number to the helper. Keep the link to reopen your questionnaires on this or another device.</p>
        <div className="pair-actions"><button className="secondary" onClick={copyLink}>{copied?'Link copied':'Copy personal return link'}</button><button className="secondary" onClick={downloadLink}>Save return link as a file</button></div>
        <details><summary>Link and help returning</summary><a className="pair-url" href={personalLink}>{personalLink}</a><p>No code to memorise. The link contains private access to this volunteer’s questionnaires; do not share it with a partner. If browser storage is lost, use the saved link. If both are lost, ask the helper; automatic recovery is not available.</p><p>This preview runs only on this Mac. A public address and approved participant information are required before distributing links to festival volunteers.</p></details>
      </aside>}
      {error&&<p className="pair-error" role="alert">{error}</p>}
      {storageNote&&<p className="pair-error" role="status">{storageNote}</p>}
      {registered&&!view.wave&&<details className="pair-receipt"><summary>Using a shared device with the helper</summary><p>Save the current volunteer’s return link first. The next volunteer must have their own link.</p><button className="secondary" onClick={another}>Start screening for another volunteer</button></details>}
    </>}
    <footer className="bf-footer"><span>Private questionnaires · one discussion per volunteer</span><Link href="/admin/brufest/pairs">Helper and organiser workspace</Link></footer>
  </main>;
}

function PairForm({context,access,label,onSubmit}:{context:Context;access:string;label:string;onSubmit:(w:Wave,a:Answers,t:string)=>Promise<void>}){
  const [answers,setAnswers]=useState<Answers>({}),[page,setPage]=useState(0),[busy,setBusy]=useState(false),[error,setError]=useState(''),[restored,setRestored]=useState(false),[startedAt,setStartedAt]=useState(''),[saved,setSaved]=useState(true);
  const draft=`brufest-pairs-v2:${access}:${context.session?.id||'screen'}:${context.wave}`;
  const items=questions(context,answers);
  const groups: {title:string;items:typeof items}[]=[];
  for(const q of items){const last=groups[groups.length-1];if(last?.title===q.section)last.items.push(q);else groups.push({title:q.section,items:[q]});}
  const current=groups[Math.min(page,groups.length-1)],topic=context.wave==='screen'?TOPICS[page]:undefined;
  useEffect(()=>{try{const s=JSON.parse(localStorage.getItem(draft)||'null');if(s){setAnswers(s.answers);setPage(s.page);setStartedAt(s.startedAt);}else setStartedAt(new Date().toISOString());}catch{setStartedAt(new Date().toISOString());setSaved(false);}setRestored(true);},[draft]);
  useEffect(()=>{if(!restored)return;try{localStorage.setItem(draft,JSON.stringify({answers,page,startedAt}));}catch{setSaved(false);}},[answers,page,startedAt,draft,restored]);
  async function next(){
    const invalid=current.items.find(q=>answerError(q,answers[q.id]));
    if(invalid){setError(`${invalid.prompt} ${answerError(invalid,answers[invalid.id])}`);document.getElementById(`question-${invalid.id}`)?.scrollIntoView({block:'center'});return;}
    setError('');
    if(page<groups.length-1){setPage(page+1);window.scrollTo({top:0});return;}
    setBusy(true);try{await onSubmit(context.wave,answers,startedAt);try{localStorage.removeItem(draft);}catch{}}catch(e){setError((e as Error).message);}finally{setBusy(false);}
  }
  return <section className="pair-form">
    <p className="eyebrow">{label?`${label} · `:''}{context.member!==undefined?`Participant ${context.member===0?'A':'B'} · `:''}{context.wave==='screen'?`Topic ${page+1} of ${groups.length}`:`Part ${page+1} of ${groups.length}`}</p>
    <h1>{FORM_NAMES[context.wave]}</h1>
    <p className="pair-purpose">{context.wave==='screen'?'Answer privately. The helper will use these answers to find a willing partner with a different view.':context.wave==='joint'?'Participant A enters one record for both people. Describe differences if agreement is not possible. “None identified” is a valid answer.':context.wave==='partner'?'Rate how accurately your partner described your reason. Complete this privately.':'Answer privately about the statement and your discussion partner, as things stand now.'}</p>
    {topic?<h2>{topic.title}</h2>:<><p className="bf-topic">{context.session?.proposition}</p><h2>{context.wave==='partner'?'Your partner’s description':context.wave==='joint'?'Record the discussion together':current.title==='The exchange'?'What happened during the discussion':current.title==='A final detail'?'Briefing attendance and recall':current.title}</h2></>}
    {context.partnerSummary&&<blockquote className="bf-partner">{context.partnerSummary}</blockquote>}
    {current.items.map(item=><Question key={item.id} item={item} index={items.indexOf(item)} value={answers[item.id]} onChange={v=>{setAnswers(a=>({...a,[item.id]:v}));setError('');}}/>)}
    {error&&<p className="pair-error" role="alert">{error}</p>}
    <nav className="bf-nav"><button className="secondary" disabled={!page||busy} onClick={()=>{setPage(page-1);setError('');window.scrollTo({top:0});}}>Previous questions</button><span>{saved?'Draft saved in this browser':'Keep this page open; browser cannot save draft'}</span><button className="primary" disabled={busy||!restored} onClick={next}>{busy?'Saving…':page<groups.length-1?context.wave==='screen'?'Next topic':'Next questions':context.wave==='screen'?'Save screening questionnaire':'Save questionnaire'}</button></nav>
  </section>;
}
