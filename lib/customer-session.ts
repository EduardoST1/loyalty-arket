import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { BRAND } from "@/lib/brand";

const COOKIE = "loyalty_customer_session";
const DURATION = 90 * 24 * 60 * 60;

function signature(payload: string) {
  const secret = process.env.CUSTOMER_SESSION_SECRET;
  if (!secret || secret.length < 32) return null;
  return createHmac("sha256", secret).update(`${BRAND.tenantSlug}:${payload}`).digest();
}

export function customerSessionsConfigured() {
  return !!signature("");
}

export function setCustomerSession(response: NextResponse, id: number) {
  const payload = `${id}.${Math.floor(Date.now() / 1000) + DURATION}`;
  const sig = signature(payload);
  if (!sig) throw new Error("Falta CUSTOMER_SESSION_SECRET");
  response.cookies.set(COOKIE, `${payload}.${sig.toString("base64url")}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURATION,
  });
}

export function getCustomerSessionId(request: NextRequest): number | null {
  const value = request.cookies.get(COOKIE)?.value;
  const match = value?.match(/^(\d+)\.(\d+)\.([A-Za-z0-9_-]{43})$/);
  if (!match || Number(match[2]) <= Date.now() / 1000) return null;
  const expected = signature(`${match[1]}.${match[2]}`);
  const provided = Buffer.from(match[3], "base64url");
  if (!expected || provided.length !== expected.length || !timingSafeEqual(provided, expected)) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function hasCustomerSession(request: NextRequest, id: number): boolean {
  return getCustomerSessionId(request) === id;
}

export function denyCustomerAccess(request: NextRequest, id: number) {
  return hasCustomerSession(request, id)
    ? null
    : NextResponse.json({ message: "Abre tu tarjeta desde el navegador donde te registraste." }, { status: 401 });
}
