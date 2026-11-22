import { tenantProgram } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { isGoogleConfigured } from "./wallet-config";
import { notifyAppleWallet } from "./wallet-apple-push";
import {
  updateGoogleWalletObject,
  type WalletSyncResult,
} from "./wallet-google";

export type PassUpdateResult = {
  google: WalletSyncResult | null;
};

/**
 * Envía push / actualiza wallets registradas del cliente.
 */
export async function notifyPassUpdate(
  clienteId: number
): Promise<PassUpdateResult> {
  const result: PassUpdateResult = { google: null };

  const apple = notifyAppleWallet(clienteId).catch(() => {
    console.warn("Apple Wallet: no se pudo notificar la actualización.");
  });
  try {
    if (isGoogleConfigured()) {
      const cliente = await prisma.cliente.findUnique({
        where: { id: clienteId },
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

      if (cliente) {
        result.google = await updateGoogleWalletObject({
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
        if (result.google.ok) {
          console.log(`🟢 Google Wallet actualizado para cliente ${clienteId}`);
        } else {
          console.error(
            `🔴 Google Wallet falló para cliente ${clienteId}:`,
            result.google.error
          );
        }
      } else {
        result.google = { ok: false, error: "Cliente no encontrado" };
      }
    } else {
      result.google = {
        ok: false,
        error:
          "Faltan credenciales Google (GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 en Hostinger)",
      };
    }

  } catch (error) {
    console.error("Error al enviar push notifications:", error);
    if (!result.google) {
      result.google = {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  await apple;
  return result;
}

export async function triggerPassUpdateOnEvent(
  clienteId: number,
  event: "visita" | "logro" | "canje" | "nivel"
): Promise<PassUpdateResult> {
  console.log(`🔔 Evento "${event}" - Actualizando pass del cliente ${clienteId}`);
  return notifyPassUpdate(clienteId);
}
