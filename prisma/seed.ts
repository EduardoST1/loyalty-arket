import { prisma } from "../lib/prisma";
import { STAMP_GOAL, STAMP_REWARD, STAMP_REWARD_SLUG } from "../lib/stamps";

async function main() {
  const slug = process.env.TENANT_SLUG || "mi-negocio";
  const nombre = process.env.NEXT_PUBLIC_BRAND_NAME || "Tu Negocio";

  const tenant = await prisma.tenant.upsert({
    where: { slug },
    update: { nombre },
    create: {
      nombre,
      slug,
      primaryColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#54433A",
      secondaryColor: process.env.NEXT_PUBLIC_SECONDARY_COLOR || "#F5E6D3",
    },
  });

  const canjes = [
    { nombre: STAMP_REWARD, slug: STAMP_REWARD_SLUG, icono: "🎁", costoPuntos: 0, orden: 0 },
    {
      nombre: "Producto gratis",
      slug: "producto-gratis",
      icono: "🎁",
      costoPuntos: 100,
      orden: 1,
    },
    {
      nombre: "Descuento especial",
      slug: "descuento",
      icono: "💸",
      costoPuntos: 50,
      orden: 2,
    },
  ];

  for (const c of canjes) {
    await prisma.tipoCanje.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: c.slug } },
      update: c.slug === STAMP_REWARD_SLUG ? { nombre: c.nombre } : {},
      create: {
        tenantId: tenant.id,
        nombre: c.nombre,
        slug: c.slug,
        icono: c.icono,
        costoPuntos: c.costoPuntos,
        orden: c.orden,
        activo: true,
      },
    });
  }

  const logros = [
    {
      nombre: "Primera visita",
      slug: "primera-visita",
      descripcion: "Registra tu primera visita",
      tipo: "VISITAS" as const,
      meta: 1,
      puntosRecompensa: 10,
      icono: "🎉",
    },
    {
      nombre: "Cliente frecuente",
      slug: "cliente-frecuente",
      descripcion: `Acumula ${STAMP_GOAL} visitas`,
      tipo: "VISITAS" as const,
      meta: STAMP_GOAL,
      puntosRecompensa: 25,
      icono: "⭐",
    },
  ];

  for (const l of logros) {
    await prisma.logro.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: l.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        nombre: l.nombre,
        slug: l.slug,
        descripcion: l.descripcion,
        tipo: l.tipo,
        meta: l.meta,
        puntosRecompensa: l.puntosRecompensa,
        icono: l.icono,
        activo: true,
        visible: true,
      },
    });
  }

  console.log(`Seed OK — tenant #${tenant.id} (${tenant.slug})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
