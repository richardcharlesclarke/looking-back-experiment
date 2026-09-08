import { NextResponse } from "next/server";
import { listPublic, preview, transact } from "@/lib/brufest/store";
import { readBody, errorMessage } from "@/lib/brufest/server";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const sessions = await listPublic();
    const sampleCodes =
      process.env.NODE_ENV === "development"
        ? await transact((s) =>
            Object.fromEntries(
              s.sessions
                .filter((x) => x.id.startsWith("sample-"))
                .map((x) => [x.id, x.memberCodes]),
            ),
          )
        : {};
    return NextResponse.json(
      { sessions, preview: preview(), sampleCodes },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { error: "The new studies are not open yet." },
      { status: 503 },
    );
  }
}
export async function POST(request: Request) {
  try {
    const b = (await readBody(request)) as {
      sessionId: string;
      memberCode: string;
    };
    const member = await transact((state) => {
      const s = state.sessions.find((s) => s.id === b.sessionId);
      return s?.memberCodes.indexOf(b.memberCode) ?? -1;
    });
    if (member < 0)
      throw new Error(
        "Use the private participant link from your facilitator.",
      );
    return NextResponse.json(
      { member },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
