import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/wallet/apple/v1/devices/{deviceLibraryId}/registrations/{passTypeId}/{serialNumber}
 * 
 * Registra un dispositivo para recibir push notifications cuando el pass se actualice
 * Apple llama a este endpoint cuando el usuario agrega el pass a su wallet
 */
export async function POST(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      deviceLibraryId: string;
      passTypeId: string;
      serialNumber: string;
    }>;
  }
) {
  try {
    const { deviceLibraryId, passTypeId, serialNumber } = await params;
    const body = await request.json();
    const { pushToken } = body;

    if (!pushToken) {
      return NextResponse.json(
        { error: "Missing pushToken" },
        { status: 400 }
      );
    }

    // Verificar que el pass existe y obtener el cliente
    const cliente = await prisma.cliente.findFirst({
      where: { qrCode: serialNumber },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Pass not found" },
        { status: 404 }
      );
    }

    // Registrar o actualizar el dispositivo
    await prisma.walletDevice.upsert({
      where: {
        deviceLibraryId_passTypeId_serialNumber: {
          deviceLibraryId,
          passTypeId,
          serialNumber,
        },
      },
      update: {
        pushToken,
        updatedAt: new Date(),
      },
      create: {
        clienteId: cliente.id,
        deviceLibraryId,
        pushToken,
        tipo: "apple",
        passTypeId,
        serialNumber,
      },
    });

    console.log(`✅ Dispositivo Apple registrado: ${deviceLibraryId} para pass ${serialNumber}`);

    return NextResponse.json({ status: "registered" }, { status: 201 });
  } catch (error) {
    console.error("Error registrando dispositivo Apple:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/wallet/apple/v1/devices/{deviceLibraryId}/registrations/{passTypeId}/{serialNumber}
 * 
 * Desregistra un dispositivo (cuando el usuario elimina el pass de su wallet)
 */
export async function DELETE(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{
      deviceLibraryId: string;
      passTypeId: string;
      serialNumber: string;
    }>;
  }
) {
  try {
    const { deviceLibraryId, passTypeId, serialNumber } = await params;

    await prisma.walletDevice.deleteMany({
      where: {
        deviceLibraryId,
        passTypeId,
        serialNumber,
      },
    });

    console.log(`🗑️  Dispositivo Apple desregistrado: ${deviceLibraryId}`);

    return NextResponse.json({ status: "unregistered" }, { status: 200 });
  } catch (error) {
    console.error("Error desregistrando dispositivo Apple:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
