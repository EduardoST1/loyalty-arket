import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureLoyaltyCatalog } from "@/lib/ensure-loyalty-catalog";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const { tenantId } = await ensureLoyaltyCatalog();

    const categorias = await prisma.categoria.findMany({
      where: {
        tenantId,
        activa: true,
      },
      orderBy: {
        orden: "asc",
      },
      select: {
        id: true,
        nombre: true,
        slug: true,
        icono: true,
        puntosBase: true,
        esTemporada: true,
      },
    });

    return NextResponse.json(categorias);
  } catch (error) {
    console.error("Error al obtener categorías:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
