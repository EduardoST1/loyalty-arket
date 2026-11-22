import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { activeTenant, tenantProgram } from "@/lib/tenant";
import { verifyBaristaSessionToken, staffCookieName, staffSessionScope } from "@/lib/barista-session";
import { BusinessScreen } from "./screen";
import { appleWalletConfig } from "@/lib/wallet-apple-config";
import { googleEnabledFor } from "@/lib/wallet-google";

export default async function TenantScreen({ params }: { params: Promise<{ slug: string; screen: string }> }) {
  const { slug, screen } = await params;
  if (!["registro", "wallet", "login", "barista", "terminos", "privacidad"].includes(screen)) notFound();
  const tenant = await activeTenant(slug);
  if (!tenant) notFound();
  if (screen === "barista") {
    const token = (await cookies()).get(staffCookieName(slug))?.value;
    if (!verifyBaristaSessionToken(token, staffSessionScope(tenant))) redirect(`/n/${slug}/login`);
  }
  const program = tenantProgram(tenant);
  return <BusinessScreen screen={screen} tenant={{
    slug, name: tenant.nombre, clubName: tenant.clubName || tenant.nombre,
    tagline: tenant.tagline || "Acumula sellos y canjea recompensas",
    logo: tenant.logoUrl, color: tenant.primaryColor, accent: tenant.secondaryColor,
    goal: program.goal, reward: program.reward, google: googleEnabledFor(program), apple: !!appleWalletConfig(),
  }} />;
}
