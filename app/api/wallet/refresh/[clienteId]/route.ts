import { availableStamps } from "@/lib/stamps";
import { denyCustomerAccess } from "@/lib/customer-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGoogleConfigured } from "@/lib/wallet-config";
import { updateGoogleWalletObject } from "@/lib/wallet-google";

export const dynamic = "force-dynamic";

/**
 * POST /api/wallet/refresh/{clienteId}
 * Fuerza sincronización del pass con Google Wallet y devuelve el resultado.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    const { clienteId: raw } = await params;
    const clienteId = parseInt(raw, 10);
    if (Number.isNaN(clienteId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const denied = denyCustomerAccess(request, clienteId);
    if (denied) return denied;

    if (!isGoogleConfigured()) {
      return NextResponse.json(
        { error: "Google Wallet no configurado" },
        { status: 503 }
      );
    }

    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      include: {
        logrosDesbloqueados: {
          where: { desbloqueado: true },
          include: { logro: true },
          take: 3,
          orderBy: { fechaDesbloqueado: "desc" },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });
    }

    const sync = await updateGoogleWalletObject({
      id: cliente.id,
      nombre: cliente.nombre,
      pin: cliente.pin,
      qrCode: cliente.qrCode,
      codigoReferido: cliente.codigoReferido,
      puntos: cliente.puntos,
      visitas: cliente.visitas,
      sellosCanjeados: cliente.sellosCanjeados,
      nivel: cliente.nivel,
      logros: cliente.logrosDesbloqueados.map((cl) => ({
        icono: cl.logro.icono,
        nombre: cl.logro.nombre,
      })),
    });

    return NextResponse.json({
      clienteId,
      visitas: cliente.visitas,
      puntos: cliente.puntos,
      sellosEnCiclo: availableStamps(cliente),
      sync,
    });
  } catch (error) {
    console.error("wallet refresh:", error);
    return NextResponse.json(
      { error: "No se pudo actualizar la tarjeta" },
      { status: 500 }
    );
  }
}
