import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";

/** Categorías de ejemplo — edítalas para tu negocio. */
const CATEGORIAS_SEED = [
  { nombre: "Producto A", slug: "producto-a", icono: "☕", puntos: 5, orden: 1, temporada: false },
  { nombre: "Producto B", slug: "producto-b", icono: "🍪", puntos: 3, orden: 2, temporada: false },
  { nombre: "Producto C", slug: "producto-c", icono: "🍵", puntos: 7, orden: 3, temporada: false },
  { nombre: "Temporada 1", slug: "temporada-1", icono: "⭐", puntos: 8, orden: 4, temporada: true },
] as const;

/**
 * Asegura tenant + categorías base (útil en deploys sin seed).
 */
export async function ensureLoyaltyCatalog(): Promise<{ tenantId: number }> {
  const tenant = await prisma.tenant.upsert({
    where: { slug: BRAND.tenantSlug },
    update: {},
    create: {
      nombre: BRAND.name,
      slug: BRAND.tenantSlug,
      primaryColor: BRAND.primaryColor,
      secondaryColor: BRAND.secondaryColor,
    },
  });

  const temporadaInicio = new Date();
  const temporadaFin = new Date();
  temporadaFin.setMonth(temporadaFin.getMonth() + 3);

  for (const cat of CATEGORIAS_SEED) {
    await prisma.categoria.upsert({
      where: { tenantId_slug: { tenantId: tenant.id, slug: cat.slug } },
      update: {},
      create: {
        tenantId: tenant.id,
        nombre: cat.nombre,
        slug: cat.slug,
        icono: cat.icono,
        puntosBase: cat.puntos,
        orden: cat.orden,
        activa: true,
        esTemporada: cat.temporada,
        temporadaInicio: cat.temporada ? temporadaInicio : null,
        temporadaFin: cat.temporada ? temporadaFin : null,
      },
    });
  }

  return { tenantId: tenant.id };
}
