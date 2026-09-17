import 'server-only';
import {createHmac} from 'node:crypto';
import {organiserAuthenticated,privateHeaders} from './auth';
const formats=['research','responses','comparison','contacts','overview'];
export async function studyOneRequest(request:Request){
 if(!await organiserAuthenticated())return Response.json({error:'Sign in to the study workspace.'},{status:401,headers:privateHeaders});
 const secret=process.env.STUDY_ONE_ADMIN_COOKIE_SECRET;
 if(!secret)return Response.json({error:'Study One access is not configured.'},{status:503,headers:privateHeaders});
 const base=process.env.STUDY_ONE_ADMIN_URL??'https://study-one-review-study-one-review.up.railway.app';
 const format=new URL(request.url).searchParams.get('format')??'contacts';
 if(!formats.includes(format))return Response.json({error:'Unknown export.'},{status:400,headers:privateHeaders});
 const timestamp=String(Date.now()),cookie=timestamp+'.'+createHmac('sha256',secret).update(timestamp).digest('hex');
 let body:string|undefined;
 if(request.method==='POST'){
  if(format!=='contacts')return Response.json({error:'Use the administration action endpoint.'},{status:400,headers:privateHeaders});
  const origin=request.headers.get('origin'),host=request.headers.get('x-forwarded-host')??request.headers.get('host');
  if(origin&&new URL(origin).host!==host)return Response.json({error:'Use this workspace.'},{status:403,headers:privateHeaders});
  body=await request.text();if(body.length>16000)return Response.json({error:'Request too large.'},{status:413,headers:privateHeaders});
  try{const value=JSON.parse(body);if(!['sent','failed','stop','replace_link','prepare_demo','delete_person'].includes(value.action))throw new Error();}catch{return Response.json({error:'Unknown administration action.'},{status:400,headers:privateHeaders});}
 }
 try{
  const response=await fetch(base+'/api/brufest/festival/assistant'+(['contacts','overview'].includes(format)?'':'?format='+format),{method:request.method,headers:{cookie:'looking_back_admin='+cookie,...(body?{'Content-Type':'application/json'}:{})},body,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(15000)});
  if(!response.ok)return Response.json({error:response.status===400?(await response.json()).error:'Study One could not be reached. Try again shortly.'},{status:response.status,headers:privateHeaders});
  if(format==='overview'){const rows=await response.json();return Response.json(rows.map(({id,email,permission,contactChoiceSaved,delivery,sentAt,contactRetained}:{id:string;email:string|null;permission:boolean;contactChoiceSaved:boolean;delivery:string;sentAt?:string;contactRetained:boolean})=>({id,email,permission,contactChoiceSaved,delivery,sentAt,contactRetained})),{headers:privateHeaders});}
  return new Response(await response.text(),{status:200,headers:{...privateHeaders,'Content-Type':response.headers.get('content-type')??'application/json',...(format==='research'?{'Content-Disposition':'attachment; filename="study-one-research.json"'}:{}),...(response.headers.get('content-disposition')?{'Content-Disposition':response.headers.get('content-disposition')!}:{})}});
 }catch{return Response.json({error:'Study One could not be reached. Try again shortly.'},{status:503,headers:privateHeaders});}
}
