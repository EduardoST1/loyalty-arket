import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { randomBytes, randomInt } from "crypto";
import { prisma } from "@/lib/prisma";
import { customerSessionsConfigured, hasCustomerSession, setCustomerSession } from "@/lib/customer-session";
import { activeTenant, requestTenantSlug } from "@/lib/tenant";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function generateQRCode(slug: string): string {
  const uuid = randomBytes(16).toString("hex");
  const prefix = slug.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12) || "LOYALTY";
  return `${prefix}-QR-${uuid}`;
}

function parseBirthday(value: string): Date | null {
  const raw = String(value).trim();
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const date = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw || date > new Date()) {
    return null;
  }
  return date;
}

export async function POST(request: NextRequest) {
  try {
    if (!customerSessionsConfigured()) {
      return NextResponse.json({ message: "Registro pendiente de configuración" }, { status: 503 });
    }
    const body = await request.json();
    const {
      nombre,
      telefono,
      fechaCumpleanos,
      codigoReferido: codigoReferidoIngresado,
      aceptoTerminos,
    } = body;

    if (aceptoTerminos !== true || typeof nombre !== "string" || !nombre.trim() || nombre.trim().length > 100 || !telefono || !fechaCumpleanos) {
      return NextResponse.json(
        { message: "Completa los campos requeridos y acepta los términos" },
        { status: 400 }
      );
    }

    const telefonoLimpio = String(telefono).replace(/\D/g, "");
    if (telefonoLimpio.length !== 10) {
      return NextResponse.json(
        { message: "El teléfono debe tener 10 dígitos" },
        { status: 400 }
      );
    }

    const birthday = parseBirthday(String(fechaCumpleanos));
    if (!birthday) {
      return NextResponse.json(
        { message: "Fecha de cumpleaños inválida" },
        { status: 400 }
      );
    }

    const slug = requestTenantSlug(request);
    const tenant = await activeTenant(slug);

    if (!tenant?.activo) {
      return NextResponse.json({ message: "El programa no está disponible" }, { status: 503 });
    }

    const existente = await prisma.cliente.findFirst({
      where: {
        tenantId: tenant.id,
        telefono: telefonoLimpio,
      },
      select: {
        id: true,
        nombre: true,
        pin: true,
        qrCode: true,
        codigoReferido: true,
        puntos: true,
        visitas: true,
        nivel: true,
      },
    });

    if (existente) {
      if (!hasCustomerSession(request, existente.id)) {
        return NextResponse.json({
          message: "Este teléfono ya tiene una tarjeta. Abre el enlace desde el navegador donde te registraste.",
        }, { status: 409 });
      }
      const response = NextResponse.json({ id: existente.id, existing: true });
      setCustomerSession(response, existente.id, request);
      return response;
    }

    let cliente;
    for (let attempt = 0; attempt < 20; attempt++) {
      try {
        cliente = await prisma.cliente.create({
          data: {
            tenantId: tenant.id,
            nombre: nombre.trim(),
            telefono: telefonoLimpio,
            fechaCumpleanos: birthday,
            qrCode: generateQRCode(slug),
            pin: String(randomInt(1000, 10000)),
            codigoReferido: randomBytes(8).toString("hex").toUpperCase(),
            puntos: 50,
          },
        });
        break;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") throw error;
        if (await prisma.cliente.findUnique({
          where: { tenantId_telefono: { tenantId: tenant.id, telefono: telefonoLimpio } },
          select: { id: true },
        })) {
          return NextResponse.json({ message: "Este teléfono ya tiene una tarjeta." }, { status: 409 });
        }
      }
    }
    if (!cliente) return NextResponse.json({ message: "No se pudo asignar un PIN de cliente." }, { status: 503 });

    if (codigoReferidoIngresado) {
      try {
        const referente = await prisma.cliente.findFirst({
          where: {
            tenantId: tenant.id,
            codigoReferido: String(codigoReferidoIngresado)
              .toUpperCase()
              .trim(),
          },
          select: { id: true },
        });

        if (referente) {
          await prisma.referido.create({
            data: {
              clienteReferenteId: referente.id,
              clienteReferidoId: cliente.id,
              completado: false,
            },
          });
        }
      } catch (refErr) {
        console.error("Referido (no bloquea registro):", refErr);
      }
    }

    try {
      await prisma.puntoHistorial.create({
        data: {
          clienteId: cliente.id,
          tipo: "GANADO",
          cantidad: 50,
          saldoPrevio: 0,
          saldoNuevo: 50,
          origenTipo: "MANUAL",
          descripcion: "Puntos de bienvenida",
          fechaVencimiento: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
    } catch (histErr) {
      console.error("Historial puntos (no bloquea registro):", histErr);
    }

    const response = NextResponse.json({ id: cliente.id }, { status: 201 });
    setCustomerSession(response, cliente.id, request);
    return response;
  } catch (error) {
    console.error("Error al registrar cliente:", error);
    return NextResponse.json(
      {
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
