import { createHmac, createHash, timingSafeEqual } from "crypto";

export const BARISTA_SESSION_COOKIE = "loyalty_barista_session";

export function staffCookieName(slug?: string) {
  return slug ? `${BARISTA_SESSION_COOKIE}_${slug}` : BARISTA_SESSION_COOKIE;
}

export function staffSessionScope(tenant: { slug: string; staffPinHash: string | null }) {
  const version = createHash("sha256").update(tenant.staffPinHash || "").digest("hex");
  return `${tenant.slug}:${version}`;
}

function secret(): string | null {
  const value = process.env.BARISTA_SESSION_SECRET;
  return value && value.length >= 32 ? value : null;
}

export function signBaristaSession(payload: { ok: true; at: number; scope?: string }): string {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const key = secret();
  if (!key) throw new Error("Falta BARISTA_SESSION_SECRET");
  const sig = createHmac("sha256", key).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function verifyBaristaSessionToken(
  token: string | undefined | null, scope?: string
): { ok: true; at: number } | null {
  if (!token || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const key = secret();
  if (!key) return null;
  const expected = createHmac("sha256", key).update(body).digest("base64url");
  try {
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as {
      ok?: boolean;
      at?: number;
      scope?: string;
    };
    if (!data.ok || data.scope !== scope || typeof data.at !== "number") return null;
    // 7 días
    if (Date.now() - data.at > 7 * 24 * 60 * 60 * 1000) return null;
    return { ok: true, at: data.at };
  } catch {
    return null;
  }
}

export function checkBaristaPin(pin: string): boolean {
  const expected = process.env.BARISTA_PIN?.trim();
  if (!expected || expected.length < 6) return false;
  const a = Buffer.from(pin.trim());
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
