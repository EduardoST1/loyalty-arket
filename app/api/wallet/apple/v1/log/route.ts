import { NextResponse } from "next/server";
import { appleWalletConfig } from "@/lib/wallet-apple-config";

export function POST() {
  // Acknowledge Wallet diagnostics without retaining payloads that can contain pass data.
  return new NextResponse(null, { status: appleWalletConfig() ? 200 : 404 });
}
