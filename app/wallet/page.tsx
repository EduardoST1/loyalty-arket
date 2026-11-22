"use client";

import { useTenantView } from "@/lib/tenant-view";

import { TenantLogo } from "@/components/brand/TenantLogo";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { StampCard } from "@/components/brand/StampCard";
import { availableStamps } from "@/lib/stamps";
import { WalletButtons } from "@/components/brand/WalletButtons";

interface Cliente {
  id: number;
  nombre: string;
  qrCode: string;
  pin: string;
  codigoReferido: string;
  puntos: number;
  visitas: number;
  sellosCanjeados: number;
  nivel: string;
  telefono: string;
}

interface Logro {
  id: number;
  nombre: string;
  descripcion: string;
  icono: string;
  color: string;
  tipo: string;
  puntosRecompensa: number;
  fechaDesbloqueo: string;
}

interface LogrosData {
  logros: Logro[];
  total: number;
  disponibles: number;
  progreso: number;
}

export default function WalletPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-dulza-cream">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-dulza-jade border-t-transparent" />
        </div>
      }
    >
      <WalletPageContent />
    </Suspense>
  );
}

function WalletPageContent() {
  const { tenant, link, api, goal, reward, clubName } = useTenantView();
  const searchParams = useSearchParams();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const clienteId = searchParams.get("clienteId") || sessionId;
  const recovered = searchParams.get("recovered") === "1";

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [logros, setLogros] = useState<LogrosData | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [qrVisible, setQrVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"home" | "rewards">("home");
  const [showRecoveredBanner, setShowRecoveredBanner] = useState(recovered);
  const [walletMsg, setWalletMsg] = useState<string | null>(null);
  const [appleReady, setAppleReady] = useState(false);
  const showApple = tenant?.apple ?? appleReady;
  const showGoogle = !tenant || tenant.google;

  useEffect(() => {
    if (tenant) return;
    const controller = new AbortController();
    fetch("/api/wallet/status", { signal: controller.signal })
      .then(res => res.ok ? res.json() : null)
      .then(status => { if (status?.apple) setAppleReady(true); })
      .catch(() => {});
    return () => controller.abort();
  }, [tenant]);

  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (clienteId) return;
    const controller = new AbortController();
    fetch(api("/api/clientes/session"), { signal: controller.signal })
      .then(async (res) => {
        if (!res.ok) throw new Error("Abre tu tarjeta desde el navegador donde te registraste.");
        const { id } = await res.json();
        setSessionId(String(id));
      })
      .catch((err: Error) => {
        if (controller.signal.aborted) return;
        setError(err.message);
        setLoading(false);
      });
    return () => controller.abort();
  }, [clienteId]);

  useEffect(() => {
    if (!clienteId) return;

    const cargarDatos = () => {
      if (!isFirstLoad.current) setSyncing(true);

      fetch(api(`/api/clientes/${clienteId}`))
        .then(async (res) => {
          if (!res.ok) throw new Error((await res.json()).message || "Cliente no encontrado");
          return res.json();
        })
        .then((data) => setCliente(data))
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });

      fetch(api(`/api/clientes/${clienteId}/logros`))
        .then((res) => {
          if (!res.ok) throw new Error("Error al cargar logros");
          return res.json();
        })
        .then((data) => {
          setLogros(data);
          setLoading(false);
          setSyncing(false);
          isFirstLoad.current = false;
        })
        .catch((err) => {
          console.error("Error al cargar logros:", err);
          setLoading(false);
          setSyncing(false);
        });
    };

    cargarDatos();
    const interval = setInterval(cargarDatos, 15000);
    return () => clearInterval(interval);
  }, [clienteId]);

  const handleAddToGoogleWallet = () => {
    window.location.href = api(`/api/wallet/google/${clienteId}`);
  };

  const handleRefreshGooglePass = async () => {
    if (!clienteId) return;
    setWalletMsg("Actualizando pass en Google…");
    try {
      const res = await fetch(api(`/api/wallet/refresh/${clienteId}`), {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.sync?.ok) {
        throw new Error(json.sync?.error || json.error || "No se pudo actualizar");
      }
      setWalletMsg(
        `Listo · ${json.sellosEnCiclo}/${goal} sellos · ${json.puntos} pts. Si en el teléfono no cambia, quita el pass y vuelve a “Add to Google Wallet”.`
      );
    } catch (err) {
      setWalletMsg(
        err instanceof Error ? err.message : "Error al actualizar Google Wallet"
      );
    }
  };

  const handleCopyReferralCode = async () => {
    if (!cliente?.codigoReferido) return;
    try {
      await navigator.clipboard.writeText(cliente.codigoReferido);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      setCopiedCode(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dulza-cream-light">
        <div className="text-center">
          <div className="relative mx-auto mb-6 h-24 w-24 animate-bounce">
            <TenantLogo className="h-full max-w-full object-contain" />
          </div>
          <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-4 border-dulza-jade border-t-transparent" />
          <p className="font-medium text-dulza-chocolate">Preparando tu tarjeta...</p>
        </div>
      </div>
    );
  }

  if (error || !cliente) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dulza-cream-light p-4">
        <div className="dulza-card max-w-md p-10 text-center">
          <p className="mb-6 text-lg font-medium text-red-600">{error || "Error desconocido"}</p>
          <Link href={link("/registro")} className="dulza-pill bg-dulza-jade text-white hover:bg-dulza-jade-light">
            Volver al registro
          </Link>
        </div>
      </div>
    );
  }

  const nombreSeguro = (cliente.nombre || "Amigo").trim() || "Amigo";
  const iniciales = nombreSeguro
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase() || "AL";

  return (
    <div className="min-h-screen bg-dulza-cream-light pb-24">
      <div className="mx-auto max-w-lg px-4 py-6">
        {/* App header */}
        <div className="mb-6 flex items-center justify-between">
          <Link href={link("/")} className="relative h-10 w-28">
            <TenantLogo className="h-full max-w-full object-contain object-left" />
          </Link>
          <div className="flex items-center gap-3">
            {syncing && (
              <span className="rounded-full bg-dulza-jade/10 px-3 py-1 text-xs font-semibold text-dulza-jade">
                Sync...
              </span>
            )}
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-dulza-jade text-sm font-bold text-white">
              {iniciales}
            </span>
          </div>
        </div>

        {activeTab === "home" ? (
          <>
            {showRecoveredBanner && (
              <div className="mb-4 rounded-2xl border border-dulza-jade/30 bg-dulza-jade/10 px-4 py-3 text-sm text-dulza-chocolate">
                <p className="font-semibold text-dulza-jade">
                  Ya tenías tarjeta · PIN {cliente.pin}
                </p>
                <p className="mt-1 text-dulza-chocolate-dark/80">
                  Abrimos tu cuenta existente. No creamos otra.
                </p>
                <button
                  type="button"
                  className="mt-2 text-xs font-semibold text-dulza-jade underline"
                  onClick={() => setShowRecoveredBanner(false)}
                >
                  Entendido
                </button>
              </div>
            )}

            <div className="mb-2">
              <h1 className="font-display text-3xl font-black text-dulza-chocolate">
                Hey {nombreSeguro.split(/\s+/)[0]}!
              </h1>
              <p className="text-dulza-chocolate-dark/70">
                ¿Listo para tu próxima visita?
              </p>
              <p className="mt-1 text-sm font-semibold text-dulza-chocolate-dark/60">
                Tu ID en caja: PIN <span className="tracking-widest text-dulza-jade">{cliente.pin}</span>
              </p>
            </div>

            <div className="mb-6">
              <StampCard
                visitas={availableStamps(cliente)}
                visitasMeta={goal}
                reward={reward}
                puntos={Number(cliente.puntos) || 0}
                nivel={cliente.nivel || "BRONCE"}
                showQrAction
                onShowQr={() => setQrVisible((v) => !v)}
                qrVisible={qrVisible}
                qrCode={cliente.qrCode}
                pin={cliente.pin}
              />
            </div>

            {(showApple || showGoogle) && <WalletButtons
              onApple={showApple ? () => { window.location.href = api(`/api/wallet/apple/${clienteId}`); } : undefined}
              onGoogle={showGoogle ? handleAddToGoogleWallet : undefined}
            />}

            {showGoogle && <button
              type="button"
              onClick={() => void handleRefreshGooglePass()}
              className="mt-3 w-full rounded-2xl border-2 border-dulza-jade/40 bg-white px-4 py-3 text-sm font-semibold text-dulza-jade"
            >
              Forzar actualización en Google Wallet
            </button>}
            {walletMsg && (
              <p className="mt-2 rounded-xl bg-dulza-cream px-3 py-2 text-xs text-dulza-chocolate-dark">
                {walletMsg}
              </p>
            )}

            <div className="mt-6 rounded-3xl bg-white p-5 shadow-card">
              <h3 className="mb-2 font-display text-lg font-bold text-dulza-chocolate">
                Invita a un amigo
              </h3>
              <p className="mb-4 text-sm text-dulza-chocolate-dark/70">
                Comparte <strong>{cliente.codigoReferido}</strong> y ambos ganan 50 puntos
              </p>
              <button
                type="button"
                onClick={handleCopyReferralCode}
                className="w-full rounded-2xl bg-dulza-cream px-4 py-3 font-semibold text-dulza-chocolate transition hover:bg-dulza-cookie/30"
              >
                {copiedCode ? "¡Copiado!" : "Copiar código"}
              </button>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <h2 className="font-display text-3xl font-black text-dulza-chocolate">Tus logros</h2>

            {logros && (
              <>
                <div className="rounded-3xl bg-white p-5 shadow-card">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-semibold text-dulza-chocolate-dark/70">Progreso</span>
                    <span className="rounded-full bg-dulza-jade px-3 py-1 text-sm font-bold text-white">
                      {logros.total}/{logros.disponibles}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-dulza-cream">
                    <div
                      className="h-full rounded-full bg-dulza-jade transition-all"
                      style={{ width: `${logros.progreso}%` }}
                    />
                  </div>
                </div>

                {logros.total > 0 ? (
                  <div className="grid grid-cols-2 gap-3">
                    {logros.logros.map((logro) => (
                      <div
                        key={logro.id}
                        className="rounded-2xl border-2 bg-white p-4 text-center shadow-sm"
                        style={{ borderColor: `${logro.color}40` }}
                      >
                        <div className="mb-2 text-4xl">{logro.icono}</div>
                        <p className="font-bold text-sm text-dulza-chocolate">{logro.nombre}</p>
                        <p className="mt-1 text-xs text-dulza-chocolate-dark/60">{logro.descripcion}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-3xl bg-white p-10 text-center shadow-card">
                    <p className="font-display text-xl font-bold text-dulza-chocolate">Aún no tienes logros</p>
                    <p className="mt-2 text-sm text-dulza-chocolate-dark/70">Visita y empieza a desbloquearlos</p>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Bottom nav estilo app */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-dulza-cream bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg justify-around px-4 py-3">
          {[
            { id: "home" as const, label: "Inicio", icon: "⌂" },
            { id: "rewards" as const, label: "Logros", icon: "★" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center gap-1 text-xs font-semibold transition ${
                activeTab === tab.id ? "text-dulza-jade" : "text-dulza-chocolate-dark/50"
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}
