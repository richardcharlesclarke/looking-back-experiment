import { NextResponse } from "next/server";
import { COOKIE_NAME, signAdminCookie } from "@/lib/admin";

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production" && (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_COOKIE_SECRET)) return NextResponse.json({error:"Sign-in is not configured."},{status:503});
  const origin=request.headers.get('origin'),host=request.headers.get('x-forwarded-host')??request.headers.get('host');
  if(origin&&new URL(origin).host!==host)return NextResponse.json({error:'Use this website to sign in.'},{status:403});
  const { password } = (await request.json()) as { password?: string };
  const expected = process.env.ADMIN_PASSWORD || "admin";
  if (password !== expected) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true }, {headers:{"Cache-Control":"no-store"}});
  response.cookies.set(COOKIE_NAME, signAdminCookie(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return response;
}
