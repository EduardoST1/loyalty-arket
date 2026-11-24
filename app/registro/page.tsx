"use client";

import { useTenantView } from "@/lib/tenant-view";

import { TenantLogo } from "@/components/brand/TenantLogo";
import Link from "next/link";
import { useEffect, useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { SiteNav } from "@/components/brand/SiteNav";
import { SiteFooter } from "@/components/brand/SiteFooter";

export default function RegistroPage() {
  const router = useRouter();
  const { tenant, link, api, goal, reward, clubName } = useTenantView();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [maxBirthday, setMaxBirthday] = useState("2010-12-31");

  useEffect(() => {
    setMaxBirthday(new Date().toISOString().slice(0, 10));
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const data = {
      aceptoTerminos: formData.get("terminos") !== null,
      nombre: formData.get("nombre") as string,
      telefono: formData.get("telefono") as string,
      fechaCumpleanos: formData.get("cumpleanos") as string,
      codigoReferido: (formData.get("referido") as string) || undefined,
    };

    try {
      const response = await fetch(api("/api/clientes/registro"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        let detail = "";
        try {
          const err = await response.json();
          detail = err.detail ? ` (${err.detail})` : "";
          throw new Error((err.message || "Error al registrar") + detail);
        } catch (parseErr) {
          if (
            parseErr instanceof Error &&
            parseErr.message !== "Error al registrar"
          ) {
            throw parseErr;
          }
          throw new Error(`Error al registrar (HTTP ${response.status})`);
        }
      }

      const result = await response.json();
      if (!result?.id) {
        throw new Error("Registro incompleto: no se recibió ID de cliente");
      }
      const qs = new URLSearchParams({ clienteId: String(result.id) });
      if (result.existing) qs.set("recovered", "1");
      router.push(link(`/wallet?${qs.toString()}`));
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error desconocido";
      setError(
        msg.includes("Failed to fetch") || msg.includes("NetworkError")
          ? "Se cortó la conexión con el servidor. Espera 10s e intenta de nuevo."
          : msg
      );
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dulza-cream-light">
      <SiteNav />

      <div className="mx-auto max-w-xl px-4 pb-16 pt-28 md:pt-28">
        <div className="mb-8 text-center">
          <div className="relative mx-auto mb-4 h-20 w-20">
            <TenantLogo className="h-full max-w-full object-contain" />
          </div>
          <h1 className="font-display text-4xl font-black text-dulza-chocolate">
            {tenant ? `Únete a ${clubName}` : "Únete al club"}
          </h1>
          <p className="mt-2 text-dulza-chocolate-dark/70">
            {tenant?.tagline || "30 segundos. Sin app. Directo a tu Wallet."}
          </p>
          <p className="mt-2 text-xs text-dulza-chocolate-dark/55">
            Si ya tienes tarjeta, ábrela desde el navegador donde te registraste.
          </p>
        </div>

        <div className="dulza-card p-8 md:p-10">
          {error && (
            <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="nombre"
                className="mb-2 block text-sm font-semibold text-dulza-chocolate"
              >
                Nombre completo
              </label>
              <input
                type="text"
                id="nombre"
                name="nombre"
                required
                minLength={3}
                placeholder="María López"
                disabled={loading}
                className="w-full rounded-2xl border-2 border-dulza-cream bg-white px-4 py-3.5 outline-none transition focus:border-dulza-jade focus:ring-4 focus:ring-dulza-jade/10"
              />
            </div>

            <div>
              <label
                htmlFor="telefono"
                className="mb-2 block text-sm font-semibold text-dulza-chocolate"
              >
                Teléfono
              </label>
              <input
                type="tel"
                id="telefono"
                name="telefono"
                required
                pattern="[0-9]{10}"
                placeholder="4421234567"
                disabled={loading}
                className="w-full rounded-2xl border-2 border-dulza-cream bg-white px-4 py-3.5 outline-none transition focus:border-dulza-jade focus:ring-4 focus:ring-dulza-jade/10"
              />
            </div>

            <div>
              <label
                htmlFor="cumpleanos"
                className="mb-2 block text-sm font-semibold text-dulza-chocolate"
              >
                Cumpleaños
              </label>
              <input
                type="date"
                id="cumpleanos"
                name="cumpleanos"
                required
                disabled={loading}
                max={maxBirthday}
                className="w-full rounded-2xl border-2 border-dulza-cream bg-white px-4 py-3.5 outline-none transition focus:border-dulza-jade focus:ring-4 focus:ring-dulza-jade/10"
              />
            </div>

            <div>
              <label
                htmlFor="referido"
                className="mb-2 block text-sm font-semibold text-dulza-chocolate"
              >
                Código de referido{" "}
                <span className="font-normal text-dulza-chocolate-dark/50">
                  (opcional)
                </span>
              </label>
              <input
                type="text"
                id="referido"
                name="referido"
                placeholder="CODIGO1234"
                disabled={loading}
                className="w-full rounded-2xl border-2 border-dulza-cream bg-white px-4 py-3.5 uppercase outline-none transition focus:border-dulza-jade focus:ring-4 focus:ring-dulza-jade/10"
              />
            </div>

            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="terminos"
                name="terminos"
                required
                disabled={loading}
                className="mt-1 h-5 w-5 rounded border-dulza-cream text-dulza-jade"
              />
              <label
                htmlFor="terminos"
                className="text-sm text-dulza-chocolate-dark"
              >
                Acepto los{" "}
                <Link
                  href={link("/terminos")}
                  className="font-semibold text-dulza-jade hover:underline"
                >
                  términos
                </Link>{" "}
                y la{" "}
                <Link
                  href={link("/privacidad")}
                  className="font-semibold text-dulza-jade hover:underline"
                >
                  privacidad
                </Link>
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-dulza-jade py-4 font-bold text-white transition hover:bg-dulza-jade-light disabled:opacity-50"
            >
              {loading ? "Creando tu cuenta..." : "Crear mi tarjeta"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center">
          <Link
            href={link("/")}
            className="text-sm font-medium text-dulza-jade hover:underline"
          >
            ← Volver al inicio
          </Link>
        </p>
      </div>
      <SiteFooter />
    </div>
  );
}
