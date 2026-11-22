/**
 * Branding del negocio — cambia vía .env sin tocar código.
 */
export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "Tu Negocio",
  clubName: process.env.NEXT_PUBLIC_CLUB_NAME || "Club de Lealtad",
  tagline:
    process.env.NEXT_PUBLIC_BRAND_TAGLINE || "Acumula visitas y gana recompensas",
  tenantSlug: process.env.TENANT_SLUG || "mi-negocio",
  logoPath: process.env.NEXT_PUBLIC_LOGO_PATH || "/logo.png",
  primaryColor: process.env.NEXT_PUBLIC_PRIMARY_COLOR || "#54433A",
  secondaryColor: process.env.NEXT_PUBLIC_SECONDARY_COLOR || "#F5E6D3",
};
