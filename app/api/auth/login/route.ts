import { BRAND } from "@/lib/brand";
import { activeTenant, requestTenantSlug } from "@/lib/tenant";
import { allowLoginAttempt, verifyAccessCode } from "@/lib/access-code";
import { NextRequest, NextResponse } from "next/server";
import {
  staffCookieName,
  staffSessionScope,
  checkBaristaPin,
  signBaristaSession,
} from "@/lib/barista-session";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { pin?: string };
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";
    const slug = requestTenantSlug(request);
    const scoped = request.nextUrl.searchParams.has("negocio");
    const ip = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
    if (!allowLoginAttempt(`staff:${ip}`)) {
      return NextResponse.json({ message: "Demasiados intentos. Intenta en unos minutos." }, { status: 429 });
    }
    const tenant = await activeTenant(slug);
    const valid = tenant && pin.length <= 16 && (tenant.staffPinHash
      ? scoped && await verifyAccessCode(pin, tenant.staffPinHash)
      : slug === BRAND.tenantSlug && checkBaristaPin(pin));
    if (!valid || !tenant) {
      return NextResponse.json({ message: "PIN incorrecto" }, { status: 401 });
    }

    const token = signBaristaSession({ ok: true, at: Date.now(), scope: scoped ? staffSessionScope(tenant) : undefined });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(staffCookieName(scoped ? slug : undefined), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 7 * 24 * 60 * 60,
    });
    return res;
  } catch {
    return NextResponse.json({ message: "Error de autenticación" }, { status: 500 });
  }
}
