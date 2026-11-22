import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const name = "arket_admin_session";
const lifetime = 8 * 60 * 60;
const digest = (value: string) => createHash("sha256").update(value).digest();

function token(expiry: string) {
  const secret = process.env.ARKET_ADMIN_PASSWORD;
  if (!secret || secret.length < 20) return null;
  return createHmac("sha256", secret).update(`arket-admin:${expiry}`).digest("hex");
}

export async function hasAdminSession() {
  const value = (await cookies()).get(name)?.value;
  const match = /^(\d+)\.([a-f0-9]{64})$/.exec(value || "");
  if (!match || Number(match[1]) <= Date.now() / 1000) return false;
  const expected = token(match[1]);
  return !!expected && timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(match[2], "hex"));
}

export async function loginAdmin(password: string) {
  const configured = process.env.ARKET_ADMIN_PASSWORD;
  const expiry = String(Math.floor(Date.now() / 1000) + lifetime);
  const signed = token(expiry);
  if (!configured || !signed || !timingSafeEqual(digest(configured), digest(password))) return false;
  (await cookies()).set(name, `${expiry}.${signed}`, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/admin", maxAge: lifetime,
  });
  return true;
}

export async function logoutAdmin() {
  (await cookies()).set(name, "", { path: "/admin", maxAge: 0 });
}
