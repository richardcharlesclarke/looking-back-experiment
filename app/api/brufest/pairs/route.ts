import { NextResponse } from 'next/server';
import { ready, preview, transact } from '@/lib/brufest/store';
import { readBody, errorMessage } from '@/lib/brufest/server';
import { identify, participantView, registerVolunteer, submitPairAnswers } from '@/lib/brufest/pair-flow';
import { PAIR_TOPICS_APPROVED } from '@/lib/brufest/pair-topics';
export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const b = await readBody(request) as Record<string, unknown>;
    if (!['status','register','submit'].includes(String(b.action))) throw new Error('Unknown action.');
    if (b.action !== 'status' && (!ready() || (process.env.NODE_ENV === 'production' && !PAIR_TOPICS_APPROVED))) return NextResponse.json({ error: 'This research preview is not open for real participant responses. Topic wording and participant information require approval.' }, { status: 503 });
    const result = await transact(s => {
      const p = b.action === 'register' ? registerVolunteer(s,b.access,preview()) : identify(s,b.access);
      if (b.action === 'submit') submitPairAnswers(s,p,b.wave,b.answers,b.startedAt);
      return participantView(s,p);
    });
    return NextResponse.json(result, { headers: { 'Cache-Control':'no-store' } });
  } catch(e) { return NextResponse.json({ error:errorMessage(e) }, { status:400 }); }
}
