'use client';
import Link from 'next/link';
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import type {SavedPerson} from '@/lib/study-two/types';
import {answerText,beforeStatus,resultGroup,type ResultGroup} from '@/lib/study-two/results';
const date=(value?:string)=>value?`${new Date(value).toLocaleString('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'})} (UK time)`:'—';
export default function Results(){
 const [records,setRecords]=useState<SavedPerson[]>([]),[authenticated,setAuthenticated]=useState(false),[password,setPassword]=useState(''),[busy,setBusy]=useState(true),[error,setError]=useState(''),[loadedAt,setLoadedAt]=useState(''),[group,setGroup]=useState<ResultGroup>('research');
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
 const filtered=records.filter(r=>resultGroup(r)===group).sort((a,b)=>(b.forms.pre?.updatedAt??b.createdAt).localeCompare(a.forms.pre?.updatedAt??a.createdAt));
 const count=(kind:ResultGroup)=>records.filter(r=>resultGroup(r)===kind).length;
 return <main className="s1-participant s2-results"><header className="topbar"><Link className="mark" href="/">Evolvable studies</Link><Link href="/study-two/review">Organiser tools and exports</Link></header><section className="stage s1-card"><p className="eyebrow">Study Two · Results</p><h1>Panel speakers — before the panel</h1><p>Read answers saved centrally by the speaker before questionnaire.</p>
 {!authenticated?<form onSubmit={login} className="s2-results-login"><h2>Sign in to view results</h2><p>Use your existing study admin password. Your results open here after sign-in.</p><label htmlFor="results-password">Admin password</label><input id="results-password" type="password" name="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)}/><button className="primary" disabled={busy}>{busy?'Connecting…':'Sign in and view results'}</button></form>:<>
 <div className="s2-results-toolbar"><button className="secondary" onClick={()=>void load()} disabled={busy}>{busy?'Refreshing…':'Refresh results'}</button><span>Last retrieved: {date(loadedAt)}</span></div>
 <label htmlFor="record-group">Show records</label><select id="record-group" value={group} onChange={e=>setGroup(e.target.value as ResultGroup)}><option value="research">Consented, non-test ({count('research')})</option><option value="test">Test / demo ({count('test')})</option><option value="other">Other / no research consent ({count('other')})</option></select>
 <p>“Non-test” is the stored classification; it does not verify that a respondent is an external participant. Each entry is a respondent record, not a verified unique person.</p>
 <p role="status">{filtered.length} records · {filtered.filter(r=>beforeStatus(r)==='Complete').length} complete · {filtered.filter(r=>beforeStatus(r)==='Partial').length} partial · {filtered.filter(r=>beforeStatus(r)==='No saved answers').length} with no saved answers</p>
 {!filtered.length&&<p>No records in this group.</p>}
 {filtered.map((record,index)=>{const form=record.forms.pre;return <article key={record.id} className="s2-result"><h2>Respondent {index+1} · {beforeStatus(record)}</h2><p>{group==='test'?'Test / demo':group==='research'?'Consented, non-test':'No research consent recorded'}</p><dl><dt>Started</dt><dd>{date(form?.startedAt)}</dd><dt>Last saved</dt><dd>{date(form?.updatedAt)}</dd><dt>Completed</dt><dd>{date(form?.completedAt)}</dd></dl><ol className="s2-answer-list">{record.questionnaires.pre.map(question=><li key={question.id}><h3>{question.prompt}</h3><p className="s2-saved-answer">{answerText(question,form?.answers[question.id])}</p></li>)}</ol></article>;})}
 <p>Partial records contain the last successful server save. Edits still only in someone’s browser are not shown. <Link href="/study-two/review">CSV and JSON exports remain available in organiser tools.</Link></p>
 </>}{error&&<p role="alert" className="s1-error">{error}</p>}</section></main>;
}
