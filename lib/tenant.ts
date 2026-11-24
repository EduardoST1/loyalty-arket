import { prisma } from "@/lib/prisma";
import { BRAND } from "@/lib/brand";
import { STAMP_GOAL, STAMP_REWARD } from "@/lib/stamps";

export function requestTenantSlug(request: { nextUrl: { searchParams: URLSearchParams } }) {
  return request.nextUrl.searchParams.get("negocio") ?? BRAND.tenantSlug;
}

export function activeTenant(slug: string) {
  return prisma.tenant.findUnique({ where: { slug, activo: true } });
}

export function tenantProgram(tenant: { slug: string; stampGoal: number; stampReward: string; clubName: string | null; googleClass: string | null; nombre?: string }) {
  const isPilot = tenant.slug === BRAND.tenantSlug && !tenant.clubName && !tenant.googleClass;
  return {
    goal: isPilot ? STAMP_GOAL : tenant.stampGoal,
    reward: isPilot ? STAMP_REWARD : tenant.stampReward,
    googleClass: tenant.googleClass,
    isPilot,
    slug: tenant.slug,
    brand: tenant.nombre,
    clubName: tenant.clubName,
  };
}
