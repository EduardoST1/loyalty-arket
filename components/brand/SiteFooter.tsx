"use client";

import { useTenantView } from "@/lib/tenant-view";
import Link from "next/link";

export function SiteFooter() {
  const { name: brand, link } = useTenantView();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-dulza-chocolate-dark py-10 text-white/70">
      <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-8">
        <p>
          © {year} {brand} — Loyalty Kit
        </p>
        <div className="flex flex-wrap justify-center gap-6 text-sm">
          <Link href={link("/registro")} className="hover:text-white">
            Registro
          </Link>
          <Link href={link("/wallet")} className="hover:text-white">
            Wallet
          </Link>
          <Link href={link("/barista")} className="hover:text-white">
            Caja
          </Link>
        </div>
      </div>
    </footer>
  );
}
