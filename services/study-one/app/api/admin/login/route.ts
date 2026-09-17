import { NextResponse } from "next/server";
import { COOKIE_NAME, signAdminCookie } from "@/lib/admin";

export async function POST(request: Request) {
  const { password } = (await request.json()) as { password?: string };
  const expected = process.env.ADMIN_PASSWORD || "admin";
  if (password !== expected) {
    return NextResponse.json({ error: "Invalid password." }, { status: 401 });
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_NAME, signAdminCookie(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  return response;
}
