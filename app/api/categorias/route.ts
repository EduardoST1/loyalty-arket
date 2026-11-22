import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { staffTenant } from "@/lib/staff-access";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const tenant = await staffTenant(request);
    if (!tenant) return NextResponse.json({ message: "Sesión de caja requerida" }, { status: 401 });
    const tenantId = tenant.id;

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
