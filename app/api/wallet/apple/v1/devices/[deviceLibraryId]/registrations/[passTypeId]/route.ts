import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { appleWalletConfig } from "@/lib/wallet-apple-config";
import { appleChangedAt, validAppleDevice } from "@/lib/wallet-apple";

type Context = { params: Promise<{ deviceLibraryId: string; passTypeId: string }> };

export async function GET(request: Request, { params }: Context) {
  const { deviceLibraryId, passTypeId } = await params;
  const config = appleWalletConfig();
  if (!config || config.passTypeIdentifier !== passTypeId) return new NextResponse(null, { status: 404 });
  if (!validAppleDevice(deviceLibraryId)) return new NextResponse(null, { status: 400 });
  const raw = new URL(request.url).searchParams.get("passesUpdatedSince");
  const since = raw && /^\d{1,15}$/.test(raw) ? Number(raw) : 0;
  const rows = await prisma.walletDevice.findMany({
    where: { deviceLibraryId, passTypeId, tipo: "apple", cliente: { activo: true, tenant: { activo: true } } },
    select: { serialNumber: true, createdAt: true, cliente: { select: { updatedAt: true, tenant: { select: { updatedAt: true } } } } },
  });
  const updates = rows.map(row => ({
    serial: row.serialNumber, time: Math.max(row.createdAt.getTime(), appleChangedAt(row.cliente)),
  })).filter(row => row.time > since);
  if (!updates.length) return new NextResponse(null, { status: 204 });
  const lastUpdated = updates.reduce((latest, row) => Math.max(latest, row.time), since);
  return NextResponse.json({ lastUpdated: String(lastUpdated), serialNumbers: updates.map(row => row.serial) });
}
