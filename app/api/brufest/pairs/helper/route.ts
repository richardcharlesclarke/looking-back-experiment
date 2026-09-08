import { NextResponse } from 'next/server';
import { readBody, errorMessage, isAdmin } from '@/lib/brufest/server';
import { preview, ready, transact } from '@/lib/brufest/store';
import { advancePair, createPair, pairAdminView, stopPair } from '@/lib/brufest/pair-flow';
export const dynamic = 'force-dynamic';
export async function GET() {
  if (!await isAdmin()) return NextResponse.json({error:'Please sign in.'},{status:401});
  return NextResponse.json(await transact(s=>({...pairAdminView(s),preview:preview()})),{headers:{'Cache-Control':'no-store'}});
}
export async function POST(request:Request) {
  if (!await isAdmin()) return NextResponse.json({error:'Please sign in.'},{status:401});
  if (!ready()) return NextResponse.json({error:'Participant collection is not open.'},{status:503});
  try {
    const b=await readBody(request) as Record<string,unknown>;
    await transact(s=>{
      if(b.action==='pair') return createPair(s,b);
      if(b.action==='advance') return advancePair(s,b.id,b.note);
      if(b.action==='stop') return stopPair(s,b.id,b.note);
      if(b.action==='notes') {
        const r=s.pairs?.find(r=>r.id===b.id);
        if(!r || typeof b.note!=='string' || b.note.length>3000)throw new Error('Enter a short note.');
        r.notes=b.note; return;
      }
      throw new Error('Unknown action.');
    });
    return NextResponse.json({ok:true});
  }catch(e){return NextResponse.json({error:errorMessage(e)},{status:400});}
}
