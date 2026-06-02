import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE_NAME, verifyAdminCookie } from "@/lib/admin";
import { listSubmissions } from "@/lib/store";

export async function GET() {
  const cookieStore = await cookies();
  if (!verifyAdminCookie(cookieStore.get(COOKIE_NAME)?.value)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return NextResponse.json({ submissions: await listSubmissions() });
}
