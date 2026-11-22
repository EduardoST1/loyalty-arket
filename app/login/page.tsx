"use client";

import { FormEvent, useState, Suspense } from "react";
import { useRouter } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        setError(data.message || "PIN incorrecto");
        return;
      }
      router.replace("/barista");
    } catch {
      setError("No se pudo iniciar sesión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-dulza-cream-light px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-4xl border border-dulza-cream bg-white p-8 shadow-card"
      >
        <h1 className="font-display text-2xl font-bold text-dulza-chocolate">
          Acceso barista
        </h1>
        <p className="mt-2 text-sm text-dulza-coffee">
          Ingresa el PIN del personal para registrar visitas y canjes.
        </p>
        <label className="mt-6 block text-sm font-semibold text-dulza-chocolate">
          PIN
          <input
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            className="mt-2 w-full rounded-2xl border border-dulza-cream bg-dulza-cream-light px-4 py-3 text-lg tracking-widest outline-none focus:border-dulza-jade"
            placeholder="••••"
          />
        </label>
        {error && (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !pin}
          className="mt-6 w-full rounded-full bg-dulza-jade px-5 py-3 font-semibold text-white transition hover:bg-dulza-jade-light disabled:opacity-50"
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="min-h-screen bg-dulza-cream-light" />}>
      <LoginForm />
    </Suspense>
  );
}
