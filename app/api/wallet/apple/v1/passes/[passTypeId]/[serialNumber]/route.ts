import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/wallet/apple/v1/passes/{passTypeId}/{serialNumber}
 * 
 * Devuelve el archivo .pkpass actualizado
 * Apple llama a este endpoint cuando el dispositivo necesita actualizar el pass
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ passTypeId: string; serialNumber: string }> }
) {
  try {
    const { passTypeId, serialNumber } = await params;
    
    // Verificar autenticación (Apple envía Authorization header)
    const authHeader = request.headers.get("authorization");
    // TODO: Verificar token cuando tengas credenciales configuradas

    // Buscar el cliente por serial number (qrCode)
    const cliente = await prisma.cliente.findFirst({
      where: { qrCode: serialNumber },
      include: {
        logrosDesbloqueados: {
          include: {
            logro: true,
          },
          take: 3,
          orderBy: {
            fechaDesbloqueado: "desc",
          },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Pass not found" },
        { status: 404 }
      );
    }

    console.log(`📥 Apple solicitó pass actualizado: ${serialNumber} (${cliente.nombre})`);

    // TODO: Generar .pkpass actualizado con nuevos datos
    // Por ahora, devolvemos un mensaje indicando que se generaría
    
    // Cuando tengas credenciales, usar biblioteca como 'passkit-generator':
    // 
    // import { PKPass } from 'passkit-generator';
    // 
    // const pass = new PKPass({
    //   model: './passes/Dulza.pass',
    //   certificates: {
    //     wwdr: WALLET_CONFIG.apple.certificates.wwdr,
    //     signerCert: WALLET_CONFIG.apple.certificates.passTypeCert,
    //     signerKey: WALLET_CONFIG.apple.certificates.passTypeKey,
    //     signerKeyPassphrase: WALLET_CONFIG.apple.certificates.passTypeCertPassword,
    //   },
    // });
    //
    // // Actualizar datos del pass
    // pass.primaryFields.push({
    //   key: 'points',
    //   label: 'Puntos',
    //   value: cliente.puntos.toString(),
    // });
    //
    // pass.secondaryFields.push({
    //   key: 'level',
    //   label: 'Nivel',
    //   value: cliente.nivel,
    // });
    //
    // // Agregar logros recientes
    // if (cliente.logrosDesbloqueados.length > 0) {
    //   pass.backFields.push({
    //     key: 'achievements',
    //     label: 'Logros Recientes',
    //     value: cliente.logrosDesbloqueados
    //       .map(cl => `${cl.logro.icono} ${cl.logro.nombre}`)
    //       .join('\n'),
    //   });
    // }
    //
    // const buffer = pass.getAsBuffer();
    //
    // return new NextResponse(buffer, {
    //   status: 200,
    //   headers: {
    //     'Content-Type': 'application/vnd.apple.pkpass',
    //     'Content-Disposition': `attachment; filename="${serialNumber}.pkpass"`,
    //   },
    // });

    // Por ahora, devolver JSON con los datos que se incluirían en el pass
    return NextResponse.json({
      message: "Pass actualizado (simulado - configurar credenciales)",
      data: {
        serialNumber,
        cliente: cliente.nombre,
        puntos: cliente.puntos,
        nivel: cliente.nivel,
        visitas: cliente.visitas,
        logros: cliente.logrosDesbloqueados.map(cl => ({
          nombre: cl.logro.nombre,
          icono: cl.logro.icono,
        })),
      },
    });
  } catch (error) {
    console.error("Error generando pass actualizado:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
