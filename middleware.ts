import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  BARISTA_SESSION_COOKIE,
  verifyBaristaSessionToken,
} from "@/lib/barista-session";

/**
 * Gate de sesión barista (PIN) — sin dependencia del POS/caja de Dulza.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api/wallet/apple/v1/")) {
    return NextResponse.json({ message: "Apple Wallet pendiente" }, { status: 404 });
  }
  const res = NextResponse.next();

  if (pathname.startsWith("/_next/static")) {
    res.headers.set("Cache-Control", "public, max-age=31536000, immutable");
    return res;
  }

  res.headers.set(
    "Cache-Control",
    "private, no-store, no-cache, max-age=0, must-revalidate"
  );

  const token = request.cookies.get(BARISTA_SESSION_COOKIE)?.value;
  const session = verifyBaristaSessionToken(token);

  const needsBaristaApi =
    pathname.startsWith("/api/barista/") || pathname === "/api/barista";

  if (needsBaristaApi && !request.nextUrl.searchParams.has("negocio") && !session) {
    return NextResponse.json(
      { message: "Sesión de barista requerida" },
      { status: 401 }
    );
  }

  if (pathname === "/barista" || pathname.startsWith("/barista/")) {
    if (!session) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("next", "/barista");
      return NextResponse.redirect(url);
    }
  }

  return res;
}

export const config = {
  runtime: "nodejs",
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
