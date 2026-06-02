import { createHmac, timingSafeEqual } from "crypto";

const COOKIE_NAME = "looking_back_admin";

function secret() {
  return process.env.ADMIN_COOKIE_SECRET || "local-preview-secret";
}

export function signAdminCookie() {
  const timestamp = String(Date.now());
  const signature = createHmac("sha256", secret()).update(timestamp).digest("hex");
  return `${timestamp}.${signature}`;
}

export function verifyAdminCookie(value?: string) {
  if (!value) return false;
  const [timestamp, signature] = value.split(".");
  if (!timestamp || !signature) return false;
  const age = Date.now() - Number(timestamp);
  if (!Number.isFinite(age) || age > 1000 * 60 * 60 * 8) return false;
  const expected = createHmac("sha256", secret()).update(timestamp).digest("hex");
  if (signature.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

export { COOKIE_NAME };
