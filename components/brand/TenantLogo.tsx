"use client";

import { useTenantView } from "@/lib/tenant-view";

export function TenantLogo({ className }: { className?: string }) {
  const { logo, name } = useTenantView();
  if (logo) return <img src={logo} alt={name} className={className} />;
  const initials = name.split(/\s+/).slice(0, 2).map(word => word[0]).join("").toUpperCase();
  return <span aria-label={name} className="inline-flex rounded-lg px-3 py-2 font-bold"
    style={{ background: "var(--brand-primary)", color: "var(--brand-secondary)" }}>{initials}</span>;
}
