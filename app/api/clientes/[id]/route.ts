import { requestTenantSlug } from "@/lib/tenant";
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
        { message: "ID de cliente inválido" },
        { status: 400 }
      );
    }

    const denied = denyCustomerAccess(request, clienteId);
    if (denied) return denied;

    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, activo: true, tenant: { slug: requestTenantSlug(request), activo: true } },
      select: {
        id: true,
        nombre: true,
        telefono: true,
        qrCode: true,
        pin: true,
        codigoReferido: true,
        puntos: true,
        visitas: true,
        sellosCanjeados: true,
        nivel: true,
        fechaCumpleanos: true,
        fechaRegistro: true,
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { message: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(cliente);
  } catch (error) {
    console.error("Error al obtener cliente:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
