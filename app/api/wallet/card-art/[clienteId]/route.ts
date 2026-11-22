import { requestTenantSlug } from "@/lib/tenant";
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
 * GET /api/wallet/card-art/{clienteId}
 * PNG público que Google Wallet descarga como heroImage.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    const { clienteId: raw } = await params;
    const clienteId = parseInt(raw, 10);
    if (Number.isNaN(clienteId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const denied = denyCustomerAccess(request, clienteId);
    if (denied) return denied;

    const sp = request.nextUrl.searchParams;
    // Query override para cache-busting sin DB (Google cachea por URL)
    const puntosQ = sp.get("puntos");
    const nivelQ = sp.get("nivel");
    const sellosQ = sp.get("sellos");

    let puntos = puntosQ != null ? parseInt(puntosQ, 10) : NaN;
    let nivel = nivelQ || "";
    let sellos = sellosQ != null ? parseInt(sellosQ, 10) : NaN;

    if (
      Number.isNaN(puntos) ||
      !nivel ||
      Number.isNaN(sellos)
    ) {
      const cliente = await prisma.cliente.findFirst({
        where: { id: clienteId, activo: true, tenant: { slug: requestTenantSlug(request), activo: true } },
        select: { puntos: true, nivel: true, visitas: true },
      });
      if (!cliente) {
        return NextResponse.json({ error: "No encontrado" }, { status: 404 });
      }
      if (Number.isNaN(puntos)) puntos = cliente.puntos;
      if (!nivel) nivel = cliente.nivel;
      if (Number.isNaN(sellos)) sellos = sellosCount(cliente.visitas);
    }

    const png = await renderCardArtPng({
      puntos,
      nivel,
      sellos,
    });

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=60, must-revalidate",
      },
    });
  } catch (error) {
    console.error("card-art error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error" },
      { status: 500 }
    );
  }
}
