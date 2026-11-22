import { NextRequest, NextResponse } from "next/server";
import { Nivel } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { verificarLogros } from "@/lib/logros";
import { triggerPassUpdateOnEvent } from "@/lib/wallet-push";
import { ensureLoyaltyCatalog } from "@/lib/ensure-loyalty-catalog";

const PUNTOS_POR_VISITA = 5;


function calcularNivel(puntosHistoricos: number): Nivel {
  if (puntosHistoricos >= 1000) return "DIAMANTE";
  if (puntosHistoricos >= 500) return "ORO";
  if (puntosHistoricos >= 200) return "PLATA";
  return "BRONCE";
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clienteId } = body;
    let categorias: number[] = Array.isArray(body.categorias)
      ? body.categorias.filter((x: unknown) => typeof x === "number")
      : [];

    if (!Number.isSafeInteger(Number(clienteId)) || Number(clienteId) <= 0) {
      return NextResponse.json(
        { message: "Falta el ID del cliente" },
        { status: 400 }
      );
    }

    const { tenantId } = await ensureLoyaltyCatalog();
    const cliente = await prisma.cliente.findFirst({
      where: { id: Number(clienteId), tenantId, activo: true },
    });

    if (!cliente) {
      return NextResponse.json(
        { message: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    if (categorias.length === 0) {
      const cafe = await prisma.categoria.findFirst({
        where: { tenantId: cliente.tenantId, slug: "cafe", activa: true },
        select: { id: true },
      });
      if (cafe) categorias = [cafe.id];
    }

    const nuevasVisitas = cliente.visitas + 1;

    let puntosGanados = PUNTOS_POR_VISITA;

    const categoriasData =
      categorias.length > 0
        ? await prisma.categoria.findMany({
            where: {
              id: { in: categorias },
              tenantId: cliente.tenantId,
              activa: true,
            },
          })
        : [];

    const puntosCategorias = categoriasData.reduce(
      (sum, cat) => sum + cat.puntosBase,
      0
    );
    puntosGanados += puntosCategorias;

    const nuevosPuntos = cliente.puntos + puntosGanados;
    const nuevoNivel = calcularNivel(nuevosPuntos);

    const resultado = await prisma.$transaction(async (tx) => {
      const clienteActualizado = await tx.cliente.updateMany({
        where: { id: cliente.id, visitas: cliente.visitas, puntos: cliente.puntos },
        data: {
          visitas: nuevasVisitas,
          puntos: nuevosPuntos,
          nivel: nuevoNivel,
          ultimaVisita: new Date(),
        },
      });

      if (!clienteActualizado.count) return null;
      const visita = await tx.visita.create({
        data: {
          clienteId: cliente.id,
          tenantId: cliente.tenantId,
          fecha: new Date(),
          puntosVisita: PUNTOS_POR_VISITA,
          puntosCategorias: puntosCategorias,
        },
      });

      for (const categoriaId of categoriasData.map((c) => c.id)) {
        await tx.visitaCategoria.create({
          data: {
            visitaId: visita.id,
            categoriaId,
          },
        });
      }

      await tx.puntoHistorial.create({
        data: {
          clienteId: cliente.id,
          tipo: "GANADO",
          cantidad: puntosGanados,
          saldoPrevio: cliente.puntos,
          saldoNuevo: nuevosPuntos,
          origenTipo: "VISITA",
          origenId: visita.id,
          descripcion: `Visita #${nuevasVisitas}`,
          fechaVencimiento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });

      return true;
    });

    if (!resultado) return NextResponse.json({ message: "La tarjeta cambió. Vuelve a buscar al cliente." }, { status: 409 });
    const logrosDesbloqueados = await verificarLogros(cliente.id).catch(() => []);
    const walletSync = await triggerPassUpdateOnEvent(cliente.id, "visita");

    return NextResponse.json({
      visitas: nuevasVisitas,
      puntosGanados,
      totalPuntos: nuevosPuntos,
      nivel: nuevoNivel,
      logrosDesbloqueados,
      walletSync,
    });
  } catch (error) {
    console.error("Error al registrar visita:", error);
    return NextResponse.json(
      {
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
