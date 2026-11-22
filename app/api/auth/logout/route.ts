import { NextResponse } from "next/server";
import { BARISTA_SESSION_COOKIE } from "@/lib/barista-session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(BARISTA_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
  return res;
}
