import { prisma } from "../lib/prisma";
import { BRAND } from "../lib/brand";
import { checkPreparedGoogleClass } from "../lib/wallet-google";
import { STAMP_REWARD_SLUG } from "../lib/stamps";

async function main() {
  const { TENANT_SLUG, CUSTOMER_SESSION_SECRET, BARISTA_SESSION_SECRET, BARISTA_PIN } = process.env;
  if (!TENANT_SLUG || TENANT_SLUG === "dulza") throw new Error("Configura un TENANT_SLUG propio del piloto.");
  if (!CUSTOMER_SESSION_SECRET || CUSTOMER_SESSION_SECRET.length < 32 ||
      !BARISTA_SESSION_SECRET || BARISTA_SESSION_SECRET.length < 32 ||
      CUSTOMER_SESSION_SECRET === BARISTA_SESSION_SECRET) {
    throw new Error("Configura dos secretos de sesión distintos de al menos 32 caracteres.");
  }
  if (!/^\d{8,}$/.test(BARISTA_PIN || "")) throw new Error("Configura un PIN de caja de al menos ocho dígitos.");

  const tenant = await prisma.tenant.findUnique({
    where: { slug: BRAND.tenantSlug },
    select: { id: true, activo: true },
  });
  if (!tenant?.activo) throw new Error("Ejecuta la inicialización del piloto antes de validarlo.");
  const reward = await prisma.tipoCanje.findUnique({
    where: { tenantId_slug: { tenantId: tenant.id, slug: STAMP_REWARD_SLUG } },
  });
  if (!reward?.activo) throw new Error("Falta inicializar la recompensa de sellos.");
  console.log("Base del piloto, negocio y recompensa verificados.");

  if (process.argv.includes("--google")) {
    if (!process.env.NEXT_PUBLIC_APP_URL?.startsWith("https://")) {
      throw new Error("Configura la URL HTTPS pública del piloto.");
    }
    await checkPreparedGoogleClass();
    console.log("Acceso de lectura a la clase aprobada de Google Wallet verificado.");
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Error al validar el piloto");
  process.exitCode = 1;
}).finally(() => prisma.$disconnect());
