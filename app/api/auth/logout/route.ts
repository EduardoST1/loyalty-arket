import { NextRequest, NextResponse } from "next/server";
import { staffCookieName } from "@/lib/barista-session";

export async function POST(request: NextRequest) {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(staffCookieName(request.nextUrl.searchParams.get("negocio") || undefined), "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
