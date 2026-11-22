import { NextResponse } from "next/server";
import { ensureLoyaltyCatalog } from "@/lib/ensure-loyalty-catalog";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const { tenantId } = await ensureLoyaltyCatalog();

    const canjes = await prisma.tipoCanje.findMany({
      where: {
        tenantId,
        activo: true,
      },
      orderBy: {
        orden: "asc",
      },
      select: {
        id: true,
        nombre: true,
        slug: true,
        icono: true,
        costoPuntos: true,
        orden: true,
      },
    });

    return NextResponse.json(canjes);
  } catch (error) {
    console.error("Error al obtener canjes:", error);
    return NextResponse.json(
      { error: "Error al obtener canjes" },
      { status: 500 }
    );
  }
}
