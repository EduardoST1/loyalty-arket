import { NextResponse } from "next/server";
import { isGoogleConfigured } from "@/lib/wallet-config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ configured: isGoogleConfigured() });
}
