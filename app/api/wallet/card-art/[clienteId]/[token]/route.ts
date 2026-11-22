import { denyCustomerAccess } from "@/lib/customer-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderCardArtPng } from "@/lib/wallet-pass-image";

export const dynamic = "force-dynamic";

function sellosCount(visitas: number, meta = 6): number {
  const enCiclo = visitas % meta;
  return enCiclo === 0 && visitas > 0 ? meta : enCiclo;
}

/**
 * GET /api/wallet/card-art/{clienteId}/{token}
 * token = s{sellos}-p{puntos}-n{nivel}  (path cambia → Google no usa caché vieja)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string; token: string }> }
) {
  try {
    const { clienteId: raw, token } = await params;
    const clienteId = parseInt(raw, 10);
    if (Number.isNaN(clienteId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const denied = denyCustomerAccess(request, clienteId);
    if (denied) return denied;

    const m =
      /^s(\d+)-p(\d+)(?:-n([A-Za-z]+))?(?:-v\d+)?(?:\.png)?$/i.exec(token);
    let sellos = m ? parseInt(m[1], 10) : NaN;
    let puntos = m ? parseInt(m[2], 10) : NaN;
    let nivel = m?.[3] ? decodeURIComponent(m[3]) : "";

    if (Number.isNaN(puntos) || Number.isNaN(sellos) || !nivel) {
      const cliente = await prisma.cliente.findUnique({
        where: { id: clienteId },
        select: { puntos: true, nivel: true, visitas: true },
      });
      if (!cliente) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      }
      if (Number.isNaN(puntos)) puntos = cliente.puntos;
      if (Number.isNaN(sellos)) sellos = sellosCount(cliente.visitas);
      if (!nivel) nivel = cliente.nivel;
    }

    const png = await renderCardArtPng({ puntos, nivel, sellos });

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=60, must-revalidate",
      },
    });
  } catch (error) {
    console.error("card-art token error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}
