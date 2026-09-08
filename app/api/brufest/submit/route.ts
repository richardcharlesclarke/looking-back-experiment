import { NextResponse } from "next/server";
import { ready, saveResponse, transact } from "@/lib/brufest/store";
import { readBody, errorMessage } from "@/lib/brufest/server";
export async function POST(request: Request) {
  if (!ready())
    return NextResponse.json(
      { error: "These new studies are not open for responses yet." },
      { status: 503 },
    );
  try {
    const body = await readBody(request);
    return NextResponse.json(
      await transact((state) => saveResponse(state, body)),
    );
  } catch (e) {
    return NextResponse.json({ error: errorMessage(e) }, { status: 400 });
  }
}
