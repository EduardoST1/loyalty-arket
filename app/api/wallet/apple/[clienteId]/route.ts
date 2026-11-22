import { NextRequest, NextResponse } from "next/server";
import { denyCustomerAccess } from "@/lib/customer-session";
import { requestTenantSlug } from "@/lib/tenant";
import { appleCardById, applePassResponse } from "@/lib/wallet-apple";
import { appleWalletConfig } from "@/lib/wallet-apple-config";

export async function GET(request: NextRequest, { params }: { params: Promise<{ clienteId: string }> }) {
  const { clienteId } = await params;
  const id = Number(clienteId);
  if (!/^\d+$/.test(clienteId) || id < 1 || id > 2147483647) {
    return NextResponse.json({ message: "ID de cliente inválido" }, { status: 400 });
  }
  const denied = denyCustomerAccess(request, id);
  if (denied) return denied;
  if (!appleWalletConfig()) return NextResponse.json({ message: "Apple Wallet todavía no está configurado." }, { status: 503 });
  const card = await appleCardById(id, requestTenantSlug(request));
  if (!card) return new NextResponse(null, { status: 404 });
  try {
    return await applePassResponse(card);
  } catch {
    return NextResponse.json({ message: "No se pudo firmar la tarjeta de Apple Wallet." }, { status: 503 });
  }
}
