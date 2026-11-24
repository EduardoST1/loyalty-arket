"use client";

import { useActionState } from "react";
import { saveBusiness, signIn } from "./actions";

export type BusinessForm = {
  slug: string; nombre: string; clubName: string | null; tagline: string | null;
  logoUrl: string | null; primaryColor: string; secondaryColor: string;
  stampGoal: number; stampReward: string; googleClass: string | null; plan: string;
};

const fieldStyle = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 font-normal";
const buttonStyle = "rounded-lg bg-slate-900 px-5 py-3 font-semibold text-white disabled:opacity-50";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, {});
  return <form action={action} className="mt-8 space-y-4">
    <label className="block font-medium">Contraseña de administración
      <input type="password" autoComplete="current-password" name="password" required maxLength={256} className={fieldStyle} />
    </label>
    {state.error && <p role="alert" className="text-red-700">{state.error}</p>}
    <button className={buttonStyle} disabled={pending}>{pending ? "Entrando…" : "Entrar"}</button>
  </form>;
}

export function TenantForm({ business }: { business?: BusinessForm }) {
  const [state, action, pending] = useActionState(saveBusiness, {});
  return <form action={action} className="grid gap-4 sm:grid-cols-2">
    {business && <input type="hidden" name="existing" value={business.slug} />}
    <label className="font-medium">Nombre del negocio
      <input name="name" defaultValue={business?.nombre} className={fieldStyle} required maxLength={120} />
    </label>
    <label className="font-medium">Identificador para el enlace
      <input name="slug" defaultValue={business?.slug} readOnly={!!business} className={fieldStyle} placeholder="mi-negocio" required maxLength={48} pattern="[a-z0-9]+(-[a-z0-9]+)*" />
    </label>
    <label className="font-medium">Nombre del programa
      <input name="clubName" defaultValue={business?.clubName || business?.nombre} className={fieldStyle} required maxLength={120} />
    </label>
    <label className="font-medium">Paquete
      <select name="plan" defaultValue={business?.plan || "lealtad"} className={fieldStyle}><option value="lealtad">Solo lealtad</option><option value="web">Página web + lealtad</option></select>
    </label>
    <label className="font-medium">Lema opcional
      <input name="tagline" defaultValue={business?.tagline || ""} className={fieldStyle} maxLength={120} />
    </label>
    <label className="font-medium">Logo opcional
      <input type="url" name="logo" defaultValue={business?.logoUrl || ""} className={fieldStyle} placeholder="https://…" maxLength={191} />
      <span className="mt-1 block text-xs font-normal text-slate-600">PNG recomendado de 1024 × 1024 px. Si queda vacío, se muestran las iniciales.</span>
    </label>
    <label className="font-medium">Color principal
      <input type="color" name="color" defaultValue={business?.primaryColor || "#203044"} className="mt-1 block h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1" />
    </label>
    <label className="font-medium">Color de texto
      <input type="color" name="accent" defaultValue={business?.secondaryColor || "#FFFFFF"} className="mt-1 block h-10 w-full cursor-pointer rounded-lg border border-slate-300 bg-white p-1" />
    </label>
    <label className="font-medium">Sellos para el canje
      <input type="number" name="stampGoal" min={2} max={20} defaultValue={business?.stampGoal || 6} required className={fieldStyle} />
    </label>
    <label className="font-medium">Recompensa
      <input name="reward" defaultValue={business?.stampReward} required maxLength={120} className={fieldStyle} />
    </label>
    <label className="font-medium">PIN de caja
      <input type="password" name="staffPin" inputMode="numeric" autoComplete="new-password" minLength={8} maxLength={16} required={!business} placeholder={business ? "Vacío para conservar el actual" : "De 8 a 16 dígitos"} className={fieldStyle} />
    </label>
    <label className="font-medium">Sufijo de la clase de Google Wallet
      <input name="googleClass" defaultValue={business?.googleClass || ""} maxLength={100} placeholder="Opcional, se configura en Google" className={fieldStyle} />
    </label>
    <label className="font-medium">Logo para Apple Wallet
      <input type="file" name="appleLogo" accept="image/png,image/jpeg" className={fieldStyle} />
      <span className="mt-1 block text-xs font-normal text-slate-600">PNG o JPG de hasta 500 KB. El pase muestra el nombre del programa si no subes un logo.</span>
    </label>
    {business && <label className="flex items-center gap-2 self-center text-sm">
      <input type="checkbox" name="removeAppleLogo" /> Quitar el logo de Apple Wallet
    </label>}
    {state.error && <p role="alert" className="text-red-700 sm:col-span-2">{state.error}</p>}
    <div className="sm:col-span-2"><button disabled={pending} className={buttonStyle}>{pending ? "Guardando…" : business ? "Guardar cambios" : "Dar de alta negocio"}</button></div>
  </form>;
}
