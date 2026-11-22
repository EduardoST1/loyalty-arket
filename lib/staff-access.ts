import { NextRequest } from "next/server";
import { activeTenant, requestTenantSlug } from "@/lib/tenant";
import { staffCookieName, staffSessionScope, verifyBaristaSessionToken } from "@/lib/barista-session";

export async function staffTenant(request: NextRequest) {
  const tenant = await activeTenant(requestTenantSlug(request));
  if (!tenant) return null;
  const scoped = request.nextUrl.searchParams.has("negocio");
  if (tenant.staffPinHash && !scoped) return null;
  const session = verifyBaristaSessionToken(request.cookies.get(staffCookieName(scoped ? tenant.slug : undefined))?.value,
    scoped ? staffSessionScope(tenant) : undefined);
  return session ? tenant : null;
}
