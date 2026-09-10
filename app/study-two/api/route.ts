import {proxyStudyTwo,responseHeaders} from '@/lib/study-two/server';
export const dynamic='force-dynamic';
export async function POST(request:Request){return proxyStudyTwo(request);}
export async function GET(){
 try{if(!process.env.STUDY_TWO_API_URL)throw new Error('Unavailable');const response=await fetch(`${process.env.STUDY_TWO_API_URL}/health`,{cache:'no-store',signal:AbortSignal.timeout(5000)});return new Response(await response.text(),{status:response.status,headers:{...responseHeaders,'Content-Type':'application/json'}});}catch{return Response.json({ok:false},{status:503,headers:responseHeaders});}
}
