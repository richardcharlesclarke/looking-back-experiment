'use client';
// Study One app/brufest/Question.tsx, continuous + no-voice writing branches.
// Adaptations: Study Two types/optional field; frozen historical rating records remain seven-point.
import ContinuousOrb from './ContinuousOrb';
import type {Answer,Question} from '@/lib/study-two/instrument';
export default function SpeakerQuestion({item,value,onChange,index,invalid=false,motionDirection='forward'}:{item:Question;value:Answer|undefined;onChange:(value:Answer)=>void;index:number;invalid?:boolean;motionDirection?:'forward'|'back'}){
 const missing=(choice:string)=>typeof value==='object'&&value.missing===choice;
 if(item.type==='text')return <div className={`bf-question bf-written rating-widget rating-widget-${motionDirection}`} id={`question-${item.id}`} tabIndex={-1} aria-invalid={invalid||undefined}>
  <label className="s1-field"><span>{String(index+1).padStart(2,'0')} {item.prompt}{item.optional?' (optional)':''}</span><textarea rows={4} maxLength={3000} value={typeof value==='string'?value:''} onChange={e=>onChange(e.target.value)}/></label>
  <div className="bf-skip"><button type="button" aria-pressed={missing('prefer_not')} onClick={()=>onChange({missing:'prefer_not'})}>Prefer not to answer</button></div>
 </div>;
 return <fieldset className={`bf-question rating-widget rating-widget-${motionDirection} ${value===undefined?'bf-unanswered':''}`} id={`question-${item.id}`} tabIndex={-1} aria-invalid={invalid||undefined}>
  <legend><span className="bf-q-number">{String(index+1).padStart(2,'0')}</span><span>{item.prompt}</span></legend>
  {item.type==='continuous'&&<ContinuousOrb item={item} value={typeof value==='number'?value:null} onChange={onChange}/>}
  {item.type==='rating'&&<><p>1 = {item.low} · 7 = {item.high}</p><div className="bf-options" role="group" aria-label="Agreement from 1 to 7">{Array.from({length:7},(_,i)=>i+1).map(n=><button type="button" key={n} aria-label={`${n}${n===1?' — '+item.low:n===7?' — '+item.high:''}`} aria-pressed={value===n} className={value===n?'selected':''} onClick={()=>onChange(n)}>{n}</button>)}</div></>}
  <div className="bf-skip"><button type="button" aria-pressed={missing('prefer_not')} onClick={()=>onChange({missing:'prefer_not'})}>Prefer not to answer</button>{item.cannot&&<button type="button" aria-pressed={missing(item.cannot)} onClick={()=>onChange({missing:item.cannot!})}>{item.cannot==='dont_know'?'I don’t know / not enough information':item.cannot==='cannot_estimate'?'Cannot estimate':'Cannot assess'}</button>}</div>
 </fieldset>;
}
