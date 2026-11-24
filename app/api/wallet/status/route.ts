import { NextResponse } from "next/server";
import { appleWalletConfig } from "@/lib/wallet-apple-config";
import { isGoogleConfigured } from "@/lib/wallet-config";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ configured: isGoogleConfigured(), apple: !!appleWalletConfig() });
}
