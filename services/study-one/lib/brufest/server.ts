import { cookies } from "next/headers";
import { COOKIE_NAME, verifyAdminCookie } from "@/lib/admin";
export async function isAdmin() {
  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.ADMIN_PASSWORD || !process.env.ADMIN_COOKIE_SECRET)
  )
    return false;
  return verifyAdminCookie((await cookies()).get(COOKIE_NAME)?.value);
}
export async function readBody(request: Request) {
  const text = await request.text();
  if (text.length > 150000) throw new Error("Response is too large.");
  return JSON.parse(text) as unknown;
}
export const errorMessage = (e: unknown) =>
  e instanceof Error ? e.message : "Something went wrong. Please try again.";
