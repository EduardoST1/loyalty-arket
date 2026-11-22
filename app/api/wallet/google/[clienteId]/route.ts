import { tenantProgram } from "@/lib/tenant";
import { requestTenantSlug } from "@/lib/tenant";
import { denyCustomerAccess } from "@/lib/customer-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isGoogleConfigured } from "@/lib/wallet-config";
import {
  createGoogleWalletSaveUrl,
  googleCredentialsPresent,
} from "@/lib/wallet-google";

/**
 * GET /api/wallet/google/{clienteId}
 * Genera el pass en Google Wallet y redirige al "Add to Google Wallet".
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    const { clienteId: clienteIdRaw } = await params;
    const clienteId = parseInt(clienteIdRaw, 10);

    if (Number.isNaN(clienteId)) {
      return NextResponse.json(
        { error: "ID de cliente inválido" },
        { status: 400 }
      );
    }

    const denied = denyCustomerAccess(request, clienteId);
    if (denied) return denied;

    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, activo: true, tenant: { slug: requestTenantSlug(request), activo: true } },
      include: {
        tenant: true,
        logrosDesbloqueados: {
          where: { desbloqueado: true },
          include: { logro: true },
          take: 3,
          orderBy: { fechaDesbloqueado: "desc" },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    if (!isGoogleConfigured() || !googleCredentialsPresent()) {
      return NextResponse.json(
        {
          error: "Google Wallet no configurado",
          message:
            "Faltan credenciales. Sigue los pasos de Google Cloud + Pay Console.",
          instructions: {
            step1: "Crear proyecto en Google Cloud Console",
            step2: "Habilitar Google Wallet API",
            step3: "Crear Service Account y descargar JSON a certificates/",
            step4: "Registrarte como Issuer en pay.google.com/business/console",
            step5: "Agregar la Service Account como usuario del Issuer",
            step6: "Llenar GOOGLE_* en .env",
            guide: "/docs/08-sistemas-core/08-sistema-wallet/03-setup-guide.md",
          },
        },
        { status: 503 }
      );
    }

    const saveUrl = await createGoogleWalletSaveUrl({
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
    }, tenantProgram(cliente.tenant));

    return NextResponse.redirect(saveUrl);
  } catch (error) {
    console.error("Error generando pass de Google:", error);
    return NextResponse.json({ error: "No se pudo emitir la tarjeta" }, { status: 503 });
  }
}
