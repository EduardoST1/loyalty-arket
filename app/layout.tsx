import type { Metadata } from "next";
import "./globals.css";
import { BRAND } from "@/lib/brand";

const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "Loyalty Kit";
const club = process.env.NEXT_PUBLIC_CLUB_NAME || "Club de Lealtad";

export const metadata: Metadata = {
  title: `${brand} — ${club}`,
  description:
    process.env.NEXT_PUBLIC_BRAND_TAGLINE ||
    "Sistema de fidelización con registro, panel barista y wallet digital.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased" style={{
        "--brand-primary": BRAND.primaryColor,
        "--brand-secondary": BRAND.secondaryColor,
      } as React.CSSProperties}>
        {children}
      </body>
    </html>
  );
}
