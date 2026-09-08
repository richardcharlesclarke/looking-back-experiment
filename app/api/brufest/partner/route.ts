import { NextResponse } from "next/server";
import { partnerText, transact } from "@/lib/brufest/store";
import { readBody, errorMessage } from "@/lib/brufest/server";
export async function POST(request: Request) {
  try {
    const b = (await readBody(request)) as {
      sessionId: string;
      memberCode: string;
      participantToken: string;
    };
    const summary = await transact((state) => {
      const s = state.sessions.find(
        (s) => s.id === b.sessionId && s.study === "pairs",
      );
      if (!s) return null;
      return partnerText(
        state,
        s,
        s.memberCodes.indexOf(b.memberCode),
        b.participantToken,
      );
    });
    return NextResponse.json(
      { summary },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
