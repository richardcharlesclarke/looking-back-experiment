import { NextResponse } from "next/server";
import {
  changeStage,
  makeSession,
  seedDemo,
  transact,
} from "@/lib/brufest/store";
import { readBody, errorMessage, isAdmin } from "@/lib/brufest/server";
import { csv, exportRows } from "@/lib/brufest/export";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  const format = new URL(request.url).searchParams.get("format");
  const state = await transact((s) => {
    seedDemo(s);
    return structuredClone(s);
  });
  if (format === "csv")
    return new Response(csv(exportRows(state)), {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": 'attachment; filename="brufest-responses.csv"',
        "Cache-Control": "no-store",
      },
    });
  if (format === "json") {
    const safe = {
      ...state,
      volunteers: state.volunteers?.map(({ access, ...p }) => { void access; return p; }),
      sessions: state.sessions.map(({ memberCodes, ...s }) => {
        void memberCodes;
        return s;
      }),
    };
    return new Response(JSON.stringify(safe, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": 'attachment; filename="brufest-data.json"',
        "Cache-Control": "no-store",
      },
    });
  }
  return NextResponse.json(state, { headers: { "Cache-Control": "no-store" } });
}
export async function POST(request: Request) {
  if (!(await isAdmin()))
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  try {
    const b = (await readBody(request)) as Record<string, unknown>;
    const result = await transact((s) => {
      if (b.action === "stage") return changeStage(s, b.id, b.stage);
      if (b.action === "create") {
        const session = makeSession(b, s);
        s.sessions.push(session);
        return session;
      }
      if (b.action === "fidelity") {
        const session = s.sessions.find((x) => x.id === b.id);
        if (!session || typeof b.note !== "string" || b.note.length > 3000)
          throw new Error("Enter a short delivery note.");
        session.fidelity = b.note;
        return session;
      }
      throw new Error("Unknown action.");
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
