'use client';
import { useId, useRef, useState } from 'react';
import type { Question } from '@/lib/brufest/types';
import { CONNECTION_LABELS } from '@/lib/brufest/festival/scales';

// Seven explicit positions: a pictorial self-report, stored as an ordinal 1–7 value.
export default function ConnectionCircles({item,value,onChange}:{item:Question;value:number|null;onChange:(value:number)=>void}) {
  const uid=useId().replaceAll(':',''), gesture=useRef<{x:number;value:number;travel:number;direction:number}|null>(null);
  const [dragging,setDragging]=useState(false);
  const n=value??1, labels=item.bands??CONNECTION_LABELS;
  const distance=160-(n-1)/6*155;
  const selfX=260-distance/2, otherX=260+distance/2;
  function move(x:number) {
    const start=gesture.current;
    if(start&&Math.abs(x-start.x)>3)onChange(Math.max(1,Math.min(7,Math.round(start.value+(x-start.x)*start.direction/start.travel*6))));
  }
  return <div className="s1-circles">
    <div className="s1-circle-referents"><span><i className="s1-self-dot"/>Me</span><span><i className="s1-other-dot"/>{item.target}</span></div>
    <p className="s1-circle-drag-cue" aria-hidden="true"><svg viewBox="0 0 28 16" fill="none"><path d="M2 8h24M7 3 2 8l5 5M21 3l5 5-5 5"/></svg>Drag either circle</p>
    <div className={`s1-circle-stage${dragging?' is-dragging':''}${value===null?' is-unanswered':''}`} role="slider" tabIndex={0}
      aria-label={item.prompt} aria-valuemin={1} aria-valuemax={7} aria-valuenow={n} aria-valuetext={value===null?'No response selected':`${labels[n-1]}, position ${n} of 7`} aria-describedby={`circles-help-${uid}`} aria-orientation="horizontal"
      onPointerDown={e=>{if(e.button!==0)return;e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.focus({preventScroll:true});gesture.current={x:e.clientX,value:n,travel:e.currentTarget.getBoundingClientRect().width*77.5/520,direction:e.clientX<e.currentTarget.getBoundingClientRect().left+e.currentTarget.getBoundingClientRect().width/2?1:-1};setDragging(true);}}
      onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))move(e.clientX);}}
      onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){move(e.clientX);e.currentTarget.releasePointerCapture(e.pointerId);}gesture.current=null;setDragging(false);}}
      onPointerCancel={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);gesture.current=null;setDragging(false);}}
      onKeyDown={e=>{const delta=['ArrowRight','ArrowUp','PageUp'].includes(e.key)?1:['ArrowLeft','ArrowDown','PageDown'].includes(e.key)?-1:0;if(delta||['Home','End','Enter',' '].includes(e.key)){e.preventDefault();onChange(e.key==='Home'?1:e.key==='End'?7:Math.max(1,Math.min(7,n+delta)));}}}>
      <svg viewBox="0 0 520 190" aria-hidden="true">
        <defs>
          <radialGradient id={`self-${uid}`}><stop stopColor="#f1dbc3" stopOpacity=".7"/><stop offset="1" stopColor="#e2c5a5" stopOpacity=".22"/></radialGradient>
          <radialGradient id={`other-${uid}`}><stop stopColor="#bcd7cf" stopOpacity=".72"/><stop offset="1" stopColor="#a6c9be" stopOpacity=".25"/></radialGradient>
        </defs>
        <circle className="s1-self-ring" cx={selfX} cy="95" r="70" fill={`url(#self-${uid})`} stroke="#826c52" strokeWidth="1.8"/>
        <circle className="s1-other-ring" cx={otherX} cy="95" r="70" fill={`url(#other-${uid})`} stroke="#426e61" strokeWidth="1.8"/>
      </svg>
    </div>
    <p className="s1-circle-readout" aria-live="polite">{value===null?'Choose how connected you feel':labels[n-1]}</p>
    <p className="s1-circle-help" id={`circles-help-${uid}`}>Drag the large circles together or apart.<br/>Click or tap a picture below to choose. <span className="s1-circle-keyboard-help">You can also use the arrow keys.</span></p>
    <div className="s1-circle-choices" role="group" aria-label="Connection pictures">
      {labels.map((label,i)=><button type="button" key={label} aria-label={`${i+1} — ${label}`} aria-pressed={value===i+1} onClick={()=>onChange(i+1)}>
        <svg viewBox="0 0 64 40" aria-hidden="true"><circle cx="21" cy="20" r="13"/><circle cx={49-i*27/6} cy="20" r="13"/></svg><span aria-hidden="true">{i+1}</span>
      </button>)}
    </div>
    <div className="s1-circle-ends" aria-hidden="true"><span>Not at all connected</span><span>Extremely connected</span></div>
  </div>;
}
