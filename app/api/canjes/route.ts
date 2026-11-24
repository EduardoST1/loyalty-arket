import { NextRequest, NextResponse } from "next/server";
import { staffTenant } from "@/lib/staff-access";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const tenant = await staffTenant(request);
    if (!tenant) return NextResponse.json({ message: "Sesión de caja requerida" }, { status: 401 });
    const tenantId = tenant.id;

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
