export type Answer=number|string|string[]|{missing:string};
export type Question={id:string;prompt:string;type:string;min?:number;max?:number;low?:string;high?:string;bands?:string[];options?:string[];help?:string;target?:string;reverse?:boolean};
export type ResponseWave={answers:Record<string,Answer>;questions:Question[];instrumentVersion:string;startedAt?:string;completedAt?:string};
export type Person={id:string;createdAt:string;isTest:boolean;questionnaireInstrument?:string;responses:ResponseWaveWithKind[]};
export type ResponseWaveWithKind=ResponseWave&{wave:'pre'|'post'};
export const date=(value?:string)=>value?new Date(value).toLocaleString('en-GB',{timeZone:'Europe/London',dateStyle:'medium',timeStyle:'short'})+' UK':'Not saved';
export function answerText(value:Answer|undefined){if(value===undefined)return 'Not saved';if(Array.isArray(value))return value.join('; ');if(typeof value==='object')return ({prefer_not:'Prefer not to answer',cannot_assess:'Cannot assess',not_applicable:'Not applicable',skipped:'Skipped',dont_know:'Don’t know',cannot_estimate:'Cannot estimate'} as Record<string,string>)[value.missing]??value.missing;return String(value);}
export function scaleText(q:Question){return q.min!==undefined&&q.max!==undefined?`${q.min}${q.low||q.bands?.[0]?' = '+(q.low??q.bands?.[0]):''} · ${q.max}${q.high||q.bands?.length?' = '+(q.high??q.bands?.at(-1)):''}`:q.options?.join(' · ')??'';}
export function comparable(a:Question,b?:Question){return !!b&&['prompt','type','min','max','low','high','bands','options','help','target','reverse'].every(k=>JSON.stringify(a[k as keyof Question])===JSON.stringify(b[k as keyof Question]));}
export function downloadRows(rows:unknown[][],name:string){const csv=rows.map(row=>row.map(value=>'"'+String(value??'').replace(/^[=+@\-\t\r]/,"'$&").replaceAll('"','""')+'"').join(',')).join('\r\n'),url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');a.href=url;a.download=name;a.click();URL.revokeObjectURL(url);}

export type ContactOverview={id:string;email:string|null;permission:boolean;contactChoiceSaved:boolean;delivery:string;sentAt?:string;contactRetained:boolean};
