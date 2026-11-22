import { denyCustomerAccess } from "@/lib/customer-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const clienteId = parseInt(id);

    if (isNaN(clienteId)) {
      return NextResponse.json(
        { error: "ID de cliente inválido" },
        { status: 400 }
      );
    }

    const denied = denyCustomerAccess(request, clienteId);
    if (denied) return denied;

    // Obtener logros desbloqueados del cliente
    const logrosDesbloqueados = await prisma.clienteLogro.findMany({
      where: {
        clienteId,
      },
      include: {
        logro: {
          select: {
            id: true,
            nombre: true,
            slug: true,
            descripcion: true,
            icono: true,
            color: true,
            tipo: true,
            puntosRecompensa: true,
          },
        },
      },
      orderBy: {
        fechaDesbloqueado: "desc",
      },
    });

    // Obtener total de logros disponibles para calcular progreso
    const cliente = await prisma.cliente.findUnique({
      where: { id: clienteId },
      select: { tenantId: true },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    const totalLogros = await prisma.logro.count({
      where: {
        tenantId: cliente.tenantId,
        activo: true,
      },
    });

    return NextResponse.json({
      logros: logrosDesbloqueados.map(cl => ({
        ...cl.logro,
        fechaDesbloqueo: cl.fechaDesbloqueado,
      })),
      total: logrosDesbloqueados.length,
      disponibles: totalLogros,
      progreso: Math.round((logrosDesbloqueados.length / totalLogros) * 100),
    });
  } catch (error) {
    console.error("Error al obtener logros:", error);
    return NextResponse.json(
      { error: "Error al obtener logros" },
      { status: 500 }
    );
  }
}
