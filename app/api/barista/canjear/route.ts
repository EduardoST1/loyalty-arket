import { staffTenant } from "@/lib/staff-access";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { triggerPassUpdateOnEvent } from "@/lib/wallet-push";

import { tenantProgram } from "@/lib/tenant";
import { availableStamps, STAMP_REWARD_SLUG } from "@/lib/stamps";

export async function POST(request: NextRequest) {
  try {
    const tenant = await staffTenant(request);
    if (!tenant) return NextResponse.json({ message: "Sesión de caja requerida" }, { status: 401 });
    const body = await request.json();
    const { clienteId, tipoCanjeId } = body;

    if (!Number.isSafeInteger(clienteId) || !Number.isSafeInteger(tipoCanjeId)) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    // Buscar el cliente
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, activo: true, tenantId: tenant.id },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // Buscar el tipo de canje
    const tipoCanje = await prisma.tipoCanje.findFirst({
      where: {
        id: tipoCanjeId,
        tenantId: cliente.tenantId,
        activo: true,
      },
    });

    if (!tipoCanje) {
      return NextResponse.json(
        { error: "Canje no encontrado" },
        { status: 404 }
      );
    }

    const sellosGastados = tipoCanje.slug === STAMP_REWARD_SLUG ? tenantProgram(tenant).goal : 0;
    if (sellosGastados > availableStamps(cliente)) {
      return NextResponse.json({ error: "Sellos insuficientes" }, { status: 400 });
    }
    if (cliente.puntos < tipoCanje.costoPuntos) {
      return NextResponse.json(
        {
          error: "Puntos insuficientes",
          puntosActuales: cliente.puntos,
          puntosRequeridos: tipoCanje.costoPuntos,
        },
        { status: 400 }
      );
    }

    const saldoPrevio = cliente.puntos;
    const saldoNuevo = saldoPrevio - tipoCanje.costoPuntos;

    const resultado = await prisma.$transaction(async (tx) => {
      const actualizados = await tx.cliente.updateMany({
        where: {
          id: cliente.id,
          puntos: cliente.puntos,
          sellosCanjeados: cliente.sellosCanjeados,
        },
        data: { puntos: saldoNuevo, sellosCanjeados: { increment: sellosGastados } },
      });
      if (!actualizados.count) return null;

      const canje = await tx.canje.create({
        data: {
          clienteId: cliente.id,
          tipoCanjeId: tipoCanje.id,
          puntosGastados: tipoCanje.costoPuntos,
          validado: true,
          fechaValidacion: new Date(),
        },
      });
      if (tipoCanje.costoPuntos > 0) {
        await tx.puntoHistorial.create({
          data: {
            clienteId: cliente.id,
            tipo: "GASTADO",
            cantidad: tipoCanje.costoPuntos,
            saldoPrevio,
            saldoNuevo,
            origenTipo: "CANJE",
            origenId: canje.id,
            descripcion: `Canje: ${tipoCanje.nombre}`,
          },
        });
      }
      return canje;
    });
    if (!resultado) {
      return NextResponse.json({ error: "La tarjeta cambió. Vuelve a buscar al cliente." }, { status: 409 });
    }

    // Notificar actualización a wallets
    await triggerPassUpdateOnEvent(cliente.id, "canje");

    return NextResponse.json({
      success: true,
      canje: {
        id: resultado.id,
        sellosGastados,
        tipoCanje: tipoCanje.nombre,
        puntosGastados: tipoCanje.costoPuntos,
      },
      cliente: {
        puntosAcumulados: saldoNuevo,
        sellosCanjeados: cliente.sellosCanjeados + sellosGastados,
      },
    });
  } catch (error) {
    console.error("Error al procesar canje:", error);
    return NextResponse.json(
      { error: "Error al procesar canje" },
      { status: 500 }
    );
  }
}
