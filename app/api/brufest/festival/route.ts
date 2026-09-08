import { NextResponse } from 'next/server';
import { transaction } from '@/lib/brufest/festival/store';
import { deleteParticipant, enrol, identify, saveContact, stopContact, submit, view } from '@/lib/brufest/festival/flow';
import { readBody, errorMessage } from '@/lib/brufest/server';
import { STUDY_ONE_PUBLIC_URL } from '@/lib/brufest/festival/content';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store','Referrer-Policy':'no-referrer'};
export async function POST(request:Request) {
  try {
    const origin=request.headers.get('origin');
    const allowedHosts=new Set([request.headers.get('host'),request.headers.get('x-forwarded-host'),new URL(STUDY_ONE_PUBLIC_URL).host]);
    if(origin&&!allowedHosts.has(new URL(origin).host))throw new Error('Use this questionnaire from its own website.');
    const b=await readBody(request) as Record<string,unknown>;
    const result=await transaction(data=>{
      if(b.action==='enrol'){const {p,c}=enrol(data,b);return view(p,c,'first');}
      const {p,c}=identify(data,b.access,b.kind);
      if(b.action==='delete')return deleteParticipant(data,p.id);
      if(b.action==='submit')submit(p,c,String(b.kind),b);
      else if(b.action==='contact')saveContact(data,p,c,b);
      else if(b.action==='stop')stopContact(c);
      else if(b.action!=='status')throw new Error('Unknown request.');
      return view(p,c,String(b.kind));
    });
    return NextResponse.json(result,{headers});
  }catch(e){return NextResponse.json({error:errorMessage(e)},{status:400,headers});}
}
