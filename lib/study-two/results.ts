import type {Answer,Question} from './instrument';
import type {SavedPerson} from './types';
export type ResultGroup='research'|'test'|'other';
export function resultGroup(record:SavedPerson):ResultGroup {
 if(record.isTest)return 'test';
 return record.consent?.kind==='research'?'research':'other';
}
export function beforeStatus(record:SavedPerson){
 const form=record.forms.pre;
 return form?.completedAt?'Complete':Object.keys(form?.answers??{}).length?'Partial':'No saved answers';
}
export function answerText(question:Question,answer:Answer|undefined):string {
 if(answer===undefined)return 'Unanswered — not saved';
 if(typeof answer==='object')return ({prefer_not:'Prefer not to answer',skipped:'Skipped',cannot_assess:'Cannot assess',cannot_estimate:'Cannot estimate',dont_know:'Don’t know'})[answer.missing]??`Missing: ${answer.missing}`;
 if(typeof answer==='string')return answer===''?'Empty text response':answer;
 const range=`${question.min??0}–${question.max??100}`;
 const bands=question.bands;
 const band=question.type==='continuous'&&bands?.length?bands[Math.min(bands.length-1,Math.max(0,Math.floor(answer/(question.max??100)*bands.length)))]:undefined;
 return `${answer} (scale ${range})${band?` — ${band}`:''}`;
}
