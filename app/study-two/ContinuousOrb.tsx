'use client';
import { useRef, useState, type CSSProperties } from 'react';
import type { Question } from '@/lib/study-two/instrument';
function responseBand(value:number,max=100){return Math.min(4,Math.max(0,Math.floor(value/max*5)));}

// Adapted from Looking Back's AlignmentOrbControl / RatingFocusPanel and
// ConflictBench's OrbScale. Reuses their actual rating-* CSS and orb artwork.
// Unlike those controls, this instrument never rounds or snaps a 0–100 drag.
export default function ContinuousOrb({ item, value, onChange }: {item:Question;value:number|null;onChange:(value:number)=>void}) {
  const lane=useRef<HTMLDivElement>(null),thumb=useRef<HTMLButtonElement>(null);
  const [dragging,setDragging]=useState(false),[labelMotion,setLabelMotion]=useState(false);
  const max=item.max??100, n=value??max/2, percent=n/max*100;
  const bands=(item.bands??[item.low??'Not at all','A little','Somewhat','Quite a lot',item.high??'Extremely']).map(band=>band.replace(/ now$/, ''));
  const selected=value===null?null:responseBand(value,max);
  const label=selected===null?'Choose a position':bands[selected];
  function fromPointer(clientX:number){
    const rect=lane.current?.getBoundingClientRect();
    if(!rect)return n;
    const raw=Math.max(0,Math.min(max,(clientX-rect.left)/rect.width*max));
    return item.type==='continuous'?raw:Math.round(raw*10)/10;
  }
  return <div className="alignment-orb-control s1-continuous">
    <p className="s1-orb-instruction" id={`scale-help-${item.id}`}>Choose a label or drag the circle to the position that fits.</p>
    <div className="s1-response-readout"><p aria-live="polite">{label}</p><span aria-hidden="true">{value===null?'No response selected':`${Number(value.toFixed(1))} / ${max}`}</span></div>
    <div className="rating-orb-field"
      onPointerDown={e=>{if(e.button!==0)return;setLabelMotion(false);e.currentTarget.setPointerCapture(e.pointerId);thumb.current?.focus({preventScroll:true});setDragging(true);onChange(fromPointer(e.clientX));}}
      onPointerMove={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))onChange(fromPointer(e.clientX));}}
      onPointerUp={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId)){onChange(fromPointer(e.clientX));e.currentTarget.releasePointerCapture(e.pointerId);}setDragging(false);}}
      onPointerCancel={e=>{if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);setDragging(false);}}>
      <div className="s1-band-zones" aria-hidden="true">{bands.map((b,i)=><i key={b} className={selected===i?'active':''}/>)}</div>
      <div className="rating-orb-lane" ref={lane}>
        <button ref={thumb} type="button" role="slider" aria-label={item.prompt} aria-describedby={`scale-help-${item.id}`} aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={max} aria-valuenow={n} aria-valuetext={value===null?'No response selected':`${value} out of ${max}; ${label}`}
          className={`rating-orb-thumb${labelMotion&&value!==null?' label-motion':''}${dragging?' dragging':''}${value===null?' unselected':''}`}
          style={{'--rating-thumb-size':`${44+percent*.12}px`,'--rating-orb-position':`${percent}%`} as CSSProperties}
          onKeyDown={e=>{
            const direction=['ArrowRight','ArrowUp'].includes(e.key)?1:['ArrowLeft','ArrowDown'].includes(e.key)?-1:0;
            if(direction||['Home','End','PageUp','PageDown'].includes(e.key)){
              e.preventDefault();setLabelMotion(false);
              const step=max===100?1:.1;
              const next=e.key==='Home'?0:e.key==='End'?max:e.key==='PageUp'?n+max/10:e.key==='PageDown'?n-max/10:n+direction*step*(e.shiftKey?10:1);
              onChange(Math.max(0,Math.min(max,Number(next.toFixed(10)))));
            }
          }}/>
      </div>
    </div>
    <div className="rating-scale" role="group" aria-label="Response bands">{bands.map((band,i)=><button type="button" key={band} className={`rating-scale-option${selected===i?' active':''}`} aria-label={band} aria-pressed={selected===i} onClick={()=>{setLabelMotion(true);onChange((i+.5)/bands.length*max);}}><span className="s1-band-label-long">{band.endsWith(' true of me')?<><span>{band.replace(' true of me','')}</span><span>true of me</span></>:band}</span><span className="s1-band-label-short" aria-hidden="true">{band.replace(' true of me','')}</span></button>)}</div>
  </div>;
}
