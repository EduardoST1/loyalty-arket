import { NextRequest, NextResponse } from "next/server";
import {
  BARISTA_SESSION_COOKIE,
  checkBaristaPin,
  signBaristaSession,
} from "@/lib/barista-session";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { pin?: string };
    const pin = typeof body.pin === "string" ? body.pin.trim() : "";
    if (!pin || !checkBaristaPin(pin)) {
      return NextResponse.json({ message: "PIN incorrecto" }, { status: 401 });
    }

    const token = signBaristaSession({ ok: true, at: Date.now() });
    const res = NextResponse.json({ ok: true });
    res.cookies.set(BARISTA_SESSION_COOKIE, token, {
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
