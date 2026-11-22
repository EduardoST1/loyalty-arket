import Link from "next/link";

export default function HomePage() {
  const brand = process.env.NEXT_PUBLIC_BRAND_NAME || "Tu Negocio";
  const club = process.env.NEXT_PUBLIC_CLUB_NAME || "Club de Lealtad";
  const tagline =
    process.env.NEXT_PUBLIC_BRAND_TAGLINE ||
    "Registro de clientes, sellos y wallet digital.";

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-dulza-cream-light via-[#efe4d4] to-[#d9ebe6]">
      <div className="mx-auto flex min-h-screen max-w-3xl flex-col justify-center px-6 py-16">
        <p className="font-display text-sm font-semibold uppercase tracking-[0.2em] text-dulza-jade">
          Loyalty Kit
        </p>
        <h1 className="mt-4 font-display text-5xl font-extrabold leading-tight text-dulza-chocolate md:text-6xl">
          {brand}
        </h1>
        <p className="mt-3 text-xl text-dulza-coffee">{club}</p>
        <p className="mt-4 max-w-xl text-base text-dulza-chocolate/80">{tagline}</p>

        <div className="mt-10 flex flex-wrap gap-3">
          <Link
            href="/registro"
            className="rounded-full bg-dulza-jade px-6 py-3 font-semibold text-white hover:bg-dulza-jade-light"
          >
            Registro
          </Link>
          <Link
            href="/wallet"
            className="rounded-full border border-dulza-chocolate/20 bg-white px-6 py-3 font-semibold text-dulza-chocolate hover:bg-dulza-cream"
          >
            Wallet
          </Link>
          <Link
            href="/barista"
            className="rounded-full border border-dulza-chocolate/20 bg-white px-6 py-3 font-semibold text-dulza-chocolate hover:bg-dulza-cream"
          >
            Barista
          </Link>
        </div>
      </div>
    </main>
  );
}
