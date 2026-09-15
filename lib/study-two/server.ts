import {cookies} from 'next/headers';
import {COOKIE_NAME,verifyAdminCookie} from '@/lib/admin';
export const responseHeaders={'Cache-Control':'no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow'};
export async function proxyStudyTwo(request:Request,admin=false){
 try{
  const origin=request.headers.get('origin');
  const expectedHost=request.headers.get('x-forwarded-host')??request.headers.get('host')??new URL(request.url).host;
  if(origin&&new URL(origin).host!==expectedHost&&origin!=='https://experiments.evolvable.me')return Response.json({error:'Open the questionnaire from its own website.'},{status:403,headers:responseHeaders});
  if(admin){
   if(process.env.NODE_ENV==='production'&&(!process.env.ADMIN_COOKIE_SECRET||!process.env.ADMIN_PASSWORD))return Response.json({error:'Protected study access is not configured.'},{status:503,headers:responseHeaders});
   if(!verifyAdminCookie((await cookies()).get(COOKIE_NAME)?.value))return Response.json({error:'Sign in to the protected workspace first.'},{status:401,headers:responseHeaders});
  }
  if(!request.headers.get('content-type')?.includes('application/json'))return Response.json({error:'A JSON request is required.'},{status:415,headers:responseHeaders});
  const reader=request.body?.getReader();if(!reader)throw new Error('Missing request body.');
  let size=0;const chunks:Uint8Array[]=[];
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>65536){await reader.cancel();return Response.json({error:'Request too large.'},{status:413,headers:responseHeaders});}chunks.push(value);}
  let body:Record<string,unknown>;try{body=JSON.parse(Buffer.concat(chunks).toString());}catch{return Response.json({error:'Invalid JSON request.'},{status:400,headers:responseHeaders});}
  const allowed=admin?['export','prepare']:['enrol','status','start','save','acknowledge'];
  if(!body||!allowed.includes(String(body.action)))return Response.json({error:'Unknown request.'},{status:400,headers:responseHeaders});
  const base=process.env.STUDY_TWO_API_URL,key=process.env.STUDY_TWO_SERVICE_KEY;
  if(!base||!key)return Response.json({error:'Saving is temporarily unavailable. Please try again shortly.'},{status:503,headers:responseHeaders});
  const result=await fetch(`${base}/actions`,{method:'POST',headers:{'Content-Type':'application/json','x-study-two-service-key':key,...(admin?{'x-study-two-admin':'true'}:{})},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(15000)});
  return new Response(await result.text(),{status:result.status,headers:{...responseHeaders,'Content-Type':'application/json'}});
 }catch{return Response.json({error:'Your answers could not be saved. Keep this page open and try again.'},{status:503,headers:responseHeaders});}
}
