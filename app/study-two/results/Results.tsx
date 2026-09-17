'use client';
import Link from 'next/link';
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {SPEAKER_VERSION} from '@/lib/study-two/instrument';
import type {SavedPerson} from '@/lib/study-two/types';
import {answerText,beforeStatus,resultGroup,orderedRespondents,type ResultGroup} from '@/lib/study-two/results';
const date=(value?:string)=>value?`${new Date(value).toLocaleString('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'})} (UK time)`:'—';
export default function Results(){
 const [records,setRecords]=useState<SavedPerson[]>([]),[authenticated,setAuthenticated]=useState(false),[password,setPassword]=useState(''),[busy,setBusy]=useState(true),[error,setError]=useState(''),[loadedAt,setLoadedAt]=useState(''),[group,setGroup]=useState<ResultGroup>('research'),[selectedId,setSelectedId]=useState('');
 const load=useCallback(async()=>{
  setBusy(true);setError('');
  try{
   const response=await fetch('/study-two/api/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'export'}),cache:'no-store'});
   if(response.status===401){setAuthenticated(false);setRecords([]);setLoadedAt('');return;}
   if(!response.ok)throw new Error('Saved results could not be loaded. Please try again.');
   const data=await response.json();setRecords(data.records.filter((r:SavedPerson)=>r.role==='speaker'));setLoadedAt(data.exportedAt);setAuthenticated(true);
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 },[]);
 useEffect(()=>{void load();},[load]);
 async function login(event:FormEvent){
  event.preventDefault();setBusy(true);setError('');
  try{
   const response=await fetch('/api/admin/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password}),cache:'no-store'});
   setPassword('');
   if(!response.ok)throw new Error(response.status===401?'That password was not accepted. Use the existing study admin password.':'Sign-in is unavailable. Please try again.');
   await load();
  }catch(e){setError((e as Error).message);}finally{setBusy(false);}
 }
 const filtered=orderedRespondents(records,group);
 const selected=filtered.find(r=>r.id===selectedId)??filtered[0];
 const count=(kind:ResultGroup)=>records.filter(r=>resultGroup(r)===kind).length;
 return <main className="s1-participant s2-results"><header className="topbar"><Link className="mark" href="/">Evolvable studies</Link><Link href="/study-two/review">Organiser tools and exports</Link></header><section className="stage s1-card"><p className="eyebrow">Study Two · Results</p><h1>Panel speakers — before the panel</h1><p>Current published speaker BEFORE questionnaire · 21 questions.</p><p className="s2-version">Instrument: {SPEAKER_VERSION}</p>
 {!authenticated?<form onSubmit={login} className="s2-results-login"><h2>Sign in to view results</h2><p>Use your existing study admin password. Your results open here after sign-in.</p><label htmlFor="results-password">Admin password</label><input id="results-password" type="password" name="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/><button className="primary" disabled={busy}>{busy?'Connecting…':'Sign in and view results'}</button></form>:<>
 <div className="s2-results-toolbar"><button className="secondary" onClick={()=>void load()} disabled={busy}>{busy?'Refreshing…':'Refresh results'}</button><span>Last retrieved: {date(loadedAt)}</span></div>
 <label htmlFor="record-group">Show records</label><select id="record-group" value={group} onChange={e=>{setGroup(e.target.value as ResultGroup);setSelectedId('');}}><option value="research">Current · consented, non-test ({count('research')})</option><option value="test">Current · test / demo ({count('test')})</option><option value="other">Current · no research consent ({count('other')})</option><option value="historical">Historical / different questionnaire ({count('historical')})</option></select>
 <p>“Non-test” is the stored classification; it does not verify that a respondent is an external participant. Each entry is a respondent record, not a verified unique person.</p>
 <p role="status">{filtered.length} records · {filtered.filter(r=>beforeStatus(r)==='Complete').length} complete · {filtered.filter(r=>beforeStatus(r)==='Partial').length} partial · {filtered.filter(r=>beforeStatus(r)==='No saved answers').length} with no saved answers</p>
 {!filtered.length&&<p>No records in this group.</p>}
 {group==='historical'&&<p><strong>Historical or different questionnaires.</strong> These records do not match the current published version and frozen 21-question instrument. They are excluded from the default view.</p>}
 <div className="s2-results-layout"><nav aria-label="Respondents" className="s2-respondents">{filtered.map((record,index)=><button className="secondary" key={record.id} aria-pressed={selected?.id===record.id} onClick={()=>setSelectedId(record.id)}><strong>Respondent {index+1}</strong><span>{beforeStatus(record)} · {Object.keys(record.forms.pre?.answers??{}).length}/{record.questionnaires.pre.length} saved</span><span>{date(record.forms.pre?.completedAt??record.forms.pre?.updatedAt??record.createdAt)}</span></button>)}</nav>
 {selected&&<article className="s2-result"><h2>Respondent {filtered.indexOf(selected)+1} · {beforeStatus(selected)}</h2><p>{selected.isTest?'System-labelled test / demo':selected.consent?.kind==='research'?'Consented, non-test':'No research consent recorded'}{group==='historical'?' · Historical / different instrument':''}</p><dl><dt>Started</dt><dd>{date(selected.forms.pre?.startedAt)}</dd><dt>Last saved</dt><dd>{date(selected.forms.pre?.updatedAt)}</dd><dt>Completed</dt><dd>{date(selected.forms.pre?.completedAt)}</dd></dl><div className="s2-table-wrap"><table><caption>Saved BEFORE answers · {selected.questionnaires.pre.length} questions</caption><thead><tr><th scope="col">#</th><th scope="col">Question</th><th scope="col">Saved answer</th></tr></thead><tbody>{selected.questionnaires.pre.map((question,index)=><tr key={question.id}><td>{index+1}</td><th scope="row">{question.prompt}</th><td className="s2-saved-answer">{answerText(question,selected.forms.pre?.answers[question.id])}</td></tr>)}</tbody></table></div></article>}</div>
 <p>Partial records contain the last successful server save. Edits still only in someone’s browser are not shown. <Link href="/study-two/review">CSV and JSON exports remain available in organiser tools.</Link></p>
 </>}{error&&<p role="alert" className="s1-error">{error}</p>}</section></main>;
}
