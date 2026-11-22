"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/registro", label: "Registro" },
  { href: "/wallet", label: "Wallet" },
] as const;

export function SiteNav() {
  const pathname = usePathname();
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "Club";
  const logo = process.env.NEXT_PUBLIC_LOGO_PATH || "/logo.png";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b border-dulza-cream/60 bg-dulza-cream-light/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-2.5 md:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-10 w-28 sm:h-12 sm:w-36">
            <Image
              src={logo}
              alt={brand}
              fill
              className="object-contain object-left"
              priority
            />
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                isActive(link.href)
                  ? "bg-dulza-jade text-white"
                  : "text-dulza-chocolate hover:bg-dulza-cream"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/barista"
            className="ml-1 rounded-full border border-dulza-chocolate/15 px-3 py-2 text-sm font-semibold text-dulza-coffee hover:bg-dulza-cream"
          >
            Staff
          </Link>
        </nav>
      </div>
    </header>
  );
}
