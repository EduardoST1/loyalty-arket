"use client";

import { TenantLogo } from "./TenantLogo";
import { useTenantView } from "@/lib/tenant-view";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/registro", label: "Registro" },
  { href: "/wallet", label: "Wallet" },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  const { tenant, link: businessLink } = useTenantView();

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-dulza-cream/60 bg-dulza-cream-light/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5 md:px-8">
        <Link href={businessLink("/")} className="flex items-center gap-3">
          <div className="relative h-10 w-28 sm:h-12 sm:w-36">
            <TenantLogo className="h-full max-w-full object-contain object-left" />
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.filter(link => !tenant || link.href !== "/").map((link) => (
            <Link
              key={link.href}
              href={businessLink(link.href)}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                isActive(businessLink(link.href))
                  ? "bg-dulza-jade text-white"
                  : "text-dulza-chocolate hover:bg-dulza-cream"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href={businessLink("/barista")}
            className="ml-1 rounded-full border border-dulza-chocolate/15 px-3 py-2 text-sm font-semibold text-dulza-coffee hover:bg-dulza-cream"
          >
            Caja
          </Link>
        </nav>
      </div>
    </header>
  );
}
