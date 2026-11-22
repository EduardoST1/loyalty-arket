"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { STAMP_REWARD } from "@/lib/stamps";

interface StampCardProps {
  visitas: number;
  visitasMeta?: number;
  puntos: number;
  nivel: string;
  nombre?: string;
  showQrAction?: boolean;
  onShowQr?: () => void;
  qrVisible?: boolean;
  qrCode?: string;
  pin?: string;
}

export function StampCard({
  visitas,
  visitasMeta = 6,
  puntos,
  nivel,
  nombre,
  showQrAction,
  onShowQr,
  qrVisible,
  qrCode,
  pin,
}: StampCardProps) {
  const [qr, setQr] = useState<{ value: string; image: string } | null>(null);
  useEffect(() => {
    if (!qrVisible || !qrCode) return;
    let active = true;
    QRCode.toDataURL(qrCode, { width: 200, margin: 2 }).then((image) => {
      if (active) setQr({ value: qrCode, image });
    }).catch(() => {});
    return () => { active = false; };
  }, [qrVisible, qrCode]);
  const restantes = Math.max(visitasMeta - visitas, 0);
  const progreso = Math.min((visitas / visitasMeta) * 100, 100);

  return (
    <div className="overflow-hidden rounded-3xl bg-gradient-to-br from-dulza-jade to-dulza-jade-light p-6 text-white shadow-phone" style={{ background: "var(--brand-primary)", color: "var(--brand-secondary)" }}>
      <div className="mb-4 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-white/80">
        <span>Tarjeta de lealtad</span>
        <span className="rounded-full bg-white/20 px-3 py-1 text-[10px]">
          {nivel}
        </span>
      </div>

      {nombre && (
        <p className="mb-1 font-display text-2xl font-bold">Hey {nombre.split(" ")[0]}!</p>
      )}

      <div className="mb-1 font-display text-5xl font-black tracking-tight">
        {visitas} <span className="text-3xl text-white/70">/ {visitasMeta}</span>
      </div>

      <p className="mb-5 text-sm text-white/90">
        {restantes === 0
          ? `Ya puedes canjear: ${STAMP_REWARD}.`
          : `Solo ${restantes} visita${restantes === 1 ? "" : "s"} para canjear.`}
      </p>

      <div className="mb-5">
        <div className="mb-2 flex justify-between text-xs font-semibold uppercase tracking-wide text-white/80">
          <span>0</span>
          <span>{STAMP_REWARD}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-white/20">
          <div
            className="h-full rounded-full bg-white transition-all duration-700"
            style={{ width: `${progreso}%` }}
          />
        </div>
      </div>

      <div className="mb-4 flex items-center justify-between rounded-2xl bg-white/15 px-4 py-3 backdrop-blur-sm">
        <span className="text-sm font-medium text-white/90">Puntos</span>
        <span className="font-display text-2xl font-bold">{puntos}</span>
      </div>

      {showQrAction && onShowQr && (
        <button
          type="button"
          onClick={onShowQr}
          className="mb-3 w-full rounded-2xl bg-dulza-cream px-4 py-4 font-bold text-dulza-jade transition-all hover:bg-white hover:scale-[1.01]"
        >
          {qrVisible ? "Ocultar código" : "Mostrar QR / PIN"}
        </button>
      )}

      {qrVisible && (qrCode || pin) && (
        <div className="rounded-2xl bg-white/10 p-4 text-center backdrop-blur-sm">
          {pin && (
            <p className="mb-2 font-display text-4xl font-black tracking-[0.3em]">{pin}</p>
          )}
          {qr && qr.value === qrCode && (
            <img src={qr.image} alt="QR de la tarjeta" width={200} height={200} className="mx-auto rounded bg-white" />
          )}
          {qrCode && (
            <p className="break-all font-mono text-xs text-white/90">{qrCode}</p>
          )}
        </div>
      )}
    </div>
  );
}
