import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/wallet/apple/v1/devices/{deviceLibraryId}/registrations/{passTypeId}
 * 
 * Devuelve lista de serial numbers de passes que este dispositivo debe actualizar
 * Apple llama a este endpoint periódicamente para verificar si hay actualizaciones
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ deviceLibraryId: string; passTypeId: string }> }
) {
  try {
    const { deviceLibraryId, passTypeId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const passesUpdatedSince = searchParams.get("passesUpdatedSince");

    // Obtener todos los passes registrados en este dispositivo
    let devices = await prisma.walletDevice.findMany({
      where: {
        deviceLibraryId,
        passTypeId,
        tipo: "apple",
      },
      select: {
        serialNumber: true,
        updatedAt: true,
      },
    });

    // Si se proporciona passesUpdatedSince, filtrar solo los actualizados después de esa fecha
    if (passesUpdatedSince) {
      const sinceDate = new Date(passesUpdatedSince);
      devices = devices.filter(d => d.updatedAt > sinceDate);
    }

    const serialNumbers = devices.map(d => d.serialNumber);
    const lastUpdated = devices.length > 0
      ? Math.max(...devices.map(d => d.updatedAt.getTime()))
      : Date.now();

    console.log(`📋 Apple solicitó passes actualizados para dispositivo ${deviceLibraryId}: ${serialNumbers.length} encontrados`);

    return NextResponse.json({
      serialNumbers,
      lastUpdated: new Date(lastUpdated).toISOString(),
    });
  } catch (error) {
    console.error("Error obteniendo serial numbers:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
