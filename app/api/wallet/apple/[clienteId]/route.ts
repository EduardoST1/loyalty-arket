import { requestTenantSlug } from "@/lib/tenant";
import { denyCustomerAccess } from "@/lib/customer-session";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { WALLET_CONFIG, isAppleConfigured } from "@/lib/wallet-config";

/**
 * GET /api/wallet/apple/{clienteId}
 * 
 * Genera y sirve el archivo .pkpass inicial para agregar a Apple Wallet
 * Este es el endpoint que se llama cuando el usuario hace click en "Agregar a Apple Wallet"
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ clienteId: string }> }
) {
  try {
    const { clienteId: clienteIdRaw } = await params;
    const clienteId = parseInt(clienteIdRaw);

    if (isNaN(clienteId)) {
      return NextResponse.json(
        { error: "ID de cliente inválido" },
        { status: 400 }
      );
    }

    const denied = denyCustomerAccess(request, clienteId);
    if (denied) return denied;

    // Buscar el cliente
    const cliente = await prisma.cliente.findFirst({
      where: { id: clienteId, activo: true, tenant: { slug: requestTenantSlug(request), activo: true } },
      include: {
        tenant: true,
        logrosDesbloqueados: {
          include: { logro: true },
          take: 3,
          orderBy: { fechaDesbloqueado: "desc" },
        },
      },
    });

    if (!cliente) {
      return NextResponse.json(
        { error: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si Apple Wallet está configurado
    if (!isAppleConfigured()) {
      // Si no está configurado, devolver instrucciones
      return NextResponse.json({
        error: "Apple Wallet no configurado",
        message: "Para habilitar Apple Wallet, necesitas configurar tus credenciales de Apple Developer.",
        instructions: {
          step1: "Crear Apple Developer Account ($99/año)",
          step2: "Generar certificados (ver docs/08-sistemas-core/08-sistema-wallet/03-setup-guide.md)",
          step3: "Agregar credenciales al archivo .env",
          guide: "/docs/08-sistemas-core/08-sistema-wallet/03-setup-guide.md",
        },
      }, { status: 503 });
    }

    console.log(`🍎 Generando pass de Apple Wallet para ${cliente.nombre} (ID: ${clienteId})`);

    // TODO: Cuando tengas credenciales, descomentar esto:
    //
    // import { PKPass } from 'passkit-generator';
    // 
    // const pass = await PKPass.from({
    //   model: './passes/Dulza.pass', // Carpeta con plantilla del pass
    //   certificates: {
    //     wwdr: './certificates/wwdr.pem',
    //     signerCert: WALLET_CONFIG.apple.certificates.passTypeCert,
    //     signerKey: WALLET_CONFIG.apple.certificates.passTypeCert,
    //     signerKeyPassphrase: WALLET_CONFIG.apple.certificates.passTypeCertPassword,
    //   },
    // });
    //
    // // Configurar datos del pass
    // pass.serialNumber = cliente.qrCode;
    // pass.webServiceURL = WALLET_CONFIG.apple.webServiceURL;
    // pass.authenticationToken = generateAuthToken(cliente.id); // Generar token único
    //
    // // Logo y branding
    // pass.logoText = 'Dulza Club';
    // pass.organizationName = 'Dulza';
    // pass.description = 'Tarjeta de lealtad Dulza';
    //
    // // Color de la marca (jade)
    // pass.backgroundColor = 'rgb(27, 94, 82)';
    // pass.foregroundColor = 'rgb(255, 255, 255)';
    // pass.labelColor = 'rgb(255, 255, 255)';
    //
    // // Campos del frente del pass
    // pass.headerFields = [
    //   {
    //     key: 'name',
    //     label: 'MIEMBRO',
    //     value: cliente.nombre.split(' ')[0].toUpperCase(),
    //   },
    // ];
    //
    // pass.primaryFields = [
    //   {
    //     key: 'points',
    //     label: 'Puntos',
    //     value: cliente.puntos.toString(),
    //     changeMessage: 'Tus puntos cambiaron a %@',
    //   },
    // ];
    //
    // pass.secondaryFields = [
    //   {
    //     key: 'level',
    //     label: 'Nivel',
    //     value: cliente.nivel,
    //   },
    //   {
    //     key: 'visits',
    //     label: 'Visitas',
    //     value: cliente.visitas.toString(),
    //   },
    // ];
    //
    // pass.auxiliaryFields = [
    //   {
    //     key: 'pin',
    //     label: 'Tu PIN',
    //     value: cliente.pin,
    //     textAlignment: 'PKTextAlignmentCenter',
    //   },
    // ];
    //
    // // Campos del reverso
    // pass.backFields = [
    //   {
    //     key: 'qr',
    //     label: 'Código QR',
    //     value: cliente.qrCode,
    //   },
    //   {
    //     key: 'referral',
    //     label: 'Código de Referido',
    //     value: cliente.codigoReferido,
    //   },
    // ];
    //
    // // Agregar logros si tiene
    // if (cliente.logrosDesbloqueados.length > 0) {
    //   pass.backFields.push({
    //     key: 'achievements',
    //     label: '🏆 Logros Recientes',
    //     value: cliente.logrosDesbloqueados
    //       .map(cl => `${cl.logro.icono} ${cl.logro.nombre}`)
    //       .join('\n'),
    //   });
    // }
    //
    // // Código de barras (QR)
    // pass.barcodes = [
    //   {
    //     format: 'PKBarcodeFormatQR',
    //     message: cliente.qrCode,
    //     messageEncoding: 'iso-8859-1',
    //     altText: cliente.qrCode,
    //   },
    // ];
    //
    // // Generar el archivo .pkpass
    // const buffer = pass.getAsBuffer();
    //
    // return new NextResponse(buffer, {
    //   status: 200,
    //   headers: {
    //     'Content-Type': 'application/vnd.apple.pkpass',
    //     'Content-Disposition': `attachment; filename="DulzaClub-${cliente.nombre.replace(/\s+/g, '')}.pkpass"`,
    //     'Last-Modified': new Date().toUTCString(),
    //   },
    // });

    // Por ahora, devolver JSON con los datos que tendría el pass
    return NextResponse.json({
      status: "ready_for_configuration",
      message: "Pass generado (modo simulación - configurar credenciales de Apple)",
      passData: {
        serialNumber: cliente.qrCode,
        organizationName: "Dulza",
        description: "Tarjeta de lealtad Dulza",
        logoText: "Dulza Club",
        member: cliente.nombre.split(" ")[0].toUpperCase(),
        points: cliente.puntos,
        level: cliente.nivel,
        visits: cliente.visitas,
        pin: cliente.pin,
        qrCode: cliente.qrCode,
        referralCode: cliente.codigoReferido,
        achievements: cliente.logrosDesbloqueados.map(cl => ({
          icon: cl.logro.icono,
          name: cl.logro.nombre,
        })),
      },
      instructions: "Ver docs/08-sistemas-core/08-sistema-wallet/03-setup-guide.md para configurar",
    });
  } catch (error) {
    console.error("Error generando pass de Apple:", error);
    return NextResponse.json(
      { error: "Error al generar pass" },
      { status: 500 }
    );
  }
}
