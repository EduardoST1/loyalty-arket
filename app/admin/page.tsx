import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { tenantProgram } from "@/lib/tenant";
import { WALLET_CONFIG, isGoogleConfigured } from "@/lib/wallet-config";
import { LoginForm, TenantForm } from "./forms";
import { signOut } from "./actions";
import { hasAdminSession } from "./session";

export const dynamic = "force-dynamic";

export default async function Admin({ searchParams }: { searchParams: Promise<{ negocio?: string; guardado?: string }> }) {
  if (!await hasAdminSession()) return <main className="min-h-screen bg-slate-50 px-6 py-20 text-slate-900">
    <section className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8">
      <p className="mb-3 text-sm font-semibold text-slate-600">Arket Loyalty</p>
      <h1 className="text-3xl font-bold">Administración</h1>
      {(process.env.ARKET_ADMIN_PASSWORD?.length || 0) >= 20 ? <LoginForm /> :
        <p className="mt-4 text-slate-700">Configura ARKET_ADMIN_PASSWORD en el servidor para habilitar el acceso.</p>}
    </section>
  </main>;
  const { negocio, guardado } = await searchParams;
  const businesses = await prisma.tenant.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      slug: true, nombre: true, clubName: true, tagline: true, logoUrl: true, primaryColor: true,
      secondaryColor: true, stampGoal: true, stampReward: true, googleClass: true, plan: true,
    },
  });
  const current = businesses.find(row => row.slug === negocio);
  const program = current ? tenantProgram(current) : null;
  return <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
    <div className="mx-auto max-w-6xl">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div><p className="text-sm font-semibold text-slate-600">Arket Loyalty</p><h1 className="text-4xl font-bold">Negocios</h1></div>
        <form action={signOut}><button className="rounded-lg border border-slate-300 px-4 py-2">Cerrar sesión</button></form>
      </header>
      <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
        <aside className="rounded-2xl border border-slate-200 bg-white p-5">
          <Link href="/admin" className="mb-4 inline-block font-semibold text-teal-700">+ Nuevo negocio</Link>
          <ul className="space-y-2">{businesses.map(row => <li key={row.slug}>
            <Link className={`block rounded-lg px-3 py-2 ${row.slug === negocio ? "bg-slate-100 font-semibold" : "hover:bg-slate-50"}`} href={`/admin?negocio=${row.slug}`}>
              {row.nombre}<span className="block text-xs text-slate-600">{row.plan === "web" ? "Página web + lealtad" : "Solo lealtad"}</span>
            </Link>
          </li>)}</ul>
          {!businesses.length && <p className="text-sm text-slate-600">Todavía no hay negocios.</p>}
        </aside>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8">
          <h2 className="mb-5 text-2xl font-bold">{current ? current.nombre : "Alta de negocio"}</h2>
          {current && <div className="mb-6 flex flex-wrap gap-3">
            <Link href={`/n/${current.slug}/registro`} className="rounded-lg bg-teal-50 px-4 py-2 font-semibold text-teal-800">Registro de clientes</Link>
            <Link href={`/n/${current.slug}/login`} className="rounded-lg bg-teal-50 px-4 py-2 font-semibold text-teal-800">Acceso a caja</Link>
          </div>}
          {guardado === "1" && current && <p role="status" className="mb-4 text-teal-800">Negocio guardado.</p>}
          <TenantForm key={current?.slug || "new"} business={current && program ? {
            ...current, stampGoal: program.goal, stampReward: program.reward,
            googleClass: current.googleClass ?? (program.isPilot && isGoogleConfigured() ? WALLET_CONFIG.google.classId : null),
          } : undefined} />
        </section>
      </div>
    </div>
  </main>;
}
