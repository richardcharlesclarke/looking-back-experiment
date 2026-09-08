import { NextResponse } from 'next/server';
import { transaction } from '@/lib/brufest/festival/store';
import { assistantAction, assistantRows, researchRows, comparisons } from '@/lib/brufest/festival/flow';
import { csv } from '@/lib/brufest/export';
import { isAdmin, readBody, errorMessage } from '@/lib/brufest/server';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
export async function GET(request:Request) {
  if(!await isAdmin())return NextResponse.json({error:'Sign in to the research assistant workspace.'},{status:401,headers});
  const format=new URL(request.url).searchParams.get('format');
  const result=await transaction(data=>format==='research'?{people:data.research.people}:format==='comparison'?comparisons(data):format==='responses'?researchRows(data):assistantRows(data));
  if(format==='comparison'||format==='responses')return new Response(csv((result as Record<string,unknown>[]).map(row=>Object.fromEntries(Object.entries(row).map(([k,v])=>[k,typeof v==='object'&&v!==null?JSON.stringify(v):v])))),{headers:{...headers,'Content-Type':'text/csv','Content-Disposition':`attachment; filename="study-one-${format}.csv"`}});
  return NextResponse.json(result,{headers});
}
export async function POST(request:Request) {
  if(!await isAdmin())return NextResponse.json({error:'Sign in to the research assistant workspace.'},{status:401,headers});
  try{
    const origin=request.headers.get('origin');if(origin&&new URL(origin).host!==request.headers.get('host'))throw new Error('Use the assistant workspace on this website.');
    const b=await readBody(request) as Record<string,unknown>;
    await transaction(data=>assistantAction(data,b));return NextResponse.json({ok:true},{headers});
  }catch(e){return NextResponse.json({error:errorMessage(e)},{status:400,headers});}
}
