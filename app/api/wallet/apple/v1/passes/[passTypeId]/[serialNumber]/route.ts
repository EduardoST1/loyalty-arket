import { NextResponse } from "next/server";
import { applePassResponse, authorizedAppleCard } from "@/lib/wallet-apple";

type Context = { params: Promise<{ passTypeId: string; serialNumber: string }> };

export async function GET(request: Request, { params }: Context) {
  const { passTypeId, serialNumber } = await params;
  const auth = await authorizedAppleCard(request, passTypeId, serialNumber);
  if (!auth.card) return new NextResponse(null, { status: auth.status });
  try {
    // Regenerate from the current balance. HTTP dates have less precision than the balance changes.
    return await applePassResponse(auth.card);
  } catch {
    return new NextResponse(null, { status: 503 });
  }
}
