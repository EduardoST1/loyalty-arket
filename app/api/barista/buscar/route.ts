import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ensureLoyaltyCatalog } from "@/lib/ensure-loyalty-catalog";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type"); // "telefono" | "qr" | "pin"
    const value = searchParams.get("value");

    if (!type || !value) {
      return NextResponse.json(
        { message: "Faltan parámetros de búsqueda" },
        { status: 400 }
      );
    }

    const { tenantId } = await ensureLoyaltyCatalog();

    let cliente;

    if (type === "telefono") {
      const telefonoLimpio = value.replace(/\D/g, "");

      if (telefonoLimpio.length !== 10) {
        return NextResponse.json(
          { message: "El teléfono debe tener 10 dígitos" },
          { status: 400 }
        );
      }

      cliente = await prisma.cliente.findFirst({
        where: {
          tenantId,
          activo: true,
          telefono: telefonoLimpio,
        },
        select: {
          id: true,
          nombre: true,
          telefono: true,
          qrCode: true,
          pin: true,
          puntos: true,
          visitas: true,
          sellosCanjeados: true,
          nivel: true,
        },
      });
    } else if (type === "pin") {
      const pinLimpio = value.replace(/\D/g, "");

      if (pinLimpio.length !== 4) {
        return NextResponse.json(
          { message: "El PIN debe tener 4 dígitos" },
          { status: 400 }
        );
      }

      cliente = await prisma.cliente.findFirst({
        where: {
          tenantId,
          activo: true,
          pin: pinLimpio,
        },
        select: {
          id: true,
          nombre: true,
          telefono: true,
          qrCode: true,
          pin: true,
          puntos: true,
          visitas: true,
          sellosCanjeados: true,
          nivel: true,
        },
      });
    } else if (type === "qr") {
      cliente = await prisma.cliente.findFirst({
        where: {
          tenantId,
          activo: true,
          qrCode: value.trim(),
        },
        select: {
          id: true,
          nombre: true,
          telefono: true,
          qrCode: true,
          pin: true,
          puntos: true,
          visitas: true,
          sellosCanjeados: true,
          nivel: true,
        },
      });
    } else {
      return NextResponse.json(
        { message: "Tipo de búsqueda inválido" },
        { status: 400 }
      );
    }

    if (!cliente) {
      return NextResponse.json(
        { message: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(cliente);
  } catch (error) {
    console.error("Error al buscar cliente:", error);
    return NextResponse.json(
      { message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
