import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authorizedAppleCard, validAppleDevice } from "@/lib/wallet-apple";

type Context = { params: Promise<{ deviceLibraryId: string; passTypeId: string; serialNumber: string }> };

export async function POST(request: Request, { params }: Context) {
  const { deviceLibraryId, passTypeId, serialNumber } = await params;
  if (!validAppleDevice(deviceLibraryId)) return new NextResponse(null, { status: 400 });
  const auth = await authorizedAppleCard(request, passTypeId, serialNumber);
  if (!auth.card) return new NextResponse(null, { status: auth.status });
  const body = await request.json().catch(() => null);
  const pushToken = body?.pushToken;
  if (typeof pushToken !== "string" || !/^[a-f0-9]{16,190}$/i.test(pushToken) || pushToken.length % 2) {
    return new NextResponse(null, { status: 400 });
  }
  const device = { deviceLibraryId, passTypeId, serialNumber };
  try {
    await prisma.walletDevice.create({ data: { ...device, tipo: "apple", pushToken, clienteId: auth.card.id } });
    return new NextResponse(null, { status: 201 });
  } catch (error) {
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
    await prisma.walletDevice.update({
      where: { deviceLibraryId_passTypeId_serialNumber: device },
      data: { pushToken },
    });
    return new NextResponse(null, { status: 200 });
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const { deviceLibraryId, passTypeId, serialNumber } = await params;
  if (!validAppleDevice(deviceLibraryId)) return new NextResponse(null, { status: 400 });
  const auth = await authorizedAppleCard(request, passTypeId, serialNumber);
  if (!auth.card) return new NextResponse(null, { status: auth.status });
  await prisma.walletDevice.deleteMany({ where: { deviceLibraryId, passTypeId, serialNumber, clienteId: auth.card.id } });
  return new NextResponse(null, { status: 200 });
}
