"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { hashAccessCode, allowLoginAttempt } from "@/lib/access-code";
import { STAMP_REWARD_SLUG } from "@/lib/stamps";
import { BRAND } from "@/lib/brand";
import { tenantProgram } from "@/lib/tenant";
import { isGoogleConfigured } from "@/lib/wallet-config";
import { hasAdminSession, loginAdmin, logoutAdmin } from "./session";

export type AdminResult = { error?: string };

export async function signIn(_: AdminResult, form: FormData): Promise<AdminResult> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",").at(-1)?.trim() || "unknown";
  if (!allowLoginAttempt(`admin:${ip}`)) return { error: "Demasiados intentos. Intenta en unos minutos." };
  const password = String(form.get("password") || "");
  if (password.length > 256 || !await loginAdmin(password)) return { error: "Contraseña incorrecta." };
  redirect("/admin");
}

export async function signOut() {
  await logoutAdmin();
  redirect("/admin");
}

export async function saveBusiness(_: AdminResult, form: FormData): Promise<AdminResult> {
  if (!await hasAdminSession()) return { error: "Tu sesión venció. Vuelve a iniciar sesión." };
  const field = (key: string) => String(form.get(key) || "").trim();
  const existing = field("existing");
  const slug = existing || field("slug").toLowerCase();
  const staffPin = field("staffPin");
  const stampGoal = Number(field("stampGoal"));
  const data = {
    nombre: field("name"),
    clubName: field("clubName"),
    tagline: field("tagline") || null,
    logoUrl: field("logo") || null,
    primaryColor: field("color"),
    secondaryColor: field("accent"),
    stampGoal,
    stampReward: field("reward"),
    googleClass: field("googleClass") || null,
    plan: field("plan"),
  };
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) || slug.length > 48) return { error: "Usa un enlace corto con letras, números y guiones." };
  if (!data.nombre || !data.clubName || !data.stampReward ||
      [data.nombre, data.clubName, data.tagline, data.stampReward].some(value => (value?.length || 0) > 120)) {
    return { error: "Completa nombre, programa y recompensa. Límite de 120 caracteres por campo." };
  }
  if (![data.primaryColor, data.secondaryColor].every(color => /^#[0-9a-f]{6}$/i.test(color))) return { error: "Selecciona dos colores válidos." };
  if (!Number.isInteger(stampGoal) || stampGoal < 2 || stampGoal > 20) return { error: "La meta debe estar entre 2 y 20 sellos." };
  if (!["lealtad", "web"].includes(data.plan)) return { error: "Selecciona un paquete." };
  if (data.logoUrl && (data.logoUrl.length > 191 || !URL.canParse(data.logoUrl) || new URL(data.logoUrl).protocol !== "https:")) return { error: "El logo debe tener una URL HTTPS de hasta 191 caracteres." };
  if (data.googleClass && (!/^[A-Za-z0-9._-]{1,100}$/.test(data.googleClass) ||
      data.googleClass.startsWith(`${process.env.GOOGLE_WALLET_ISSUER_ID}.`))) return { error: "Escribe solo el sufijo de la clase de Google Wallet." };
  if (data.googleClass && slug !== BRAND.tenantSlug && data.googleClass === process.env.GOOGLE_LOYALTY_CLASS_ID) {
    return { error: "Esa clase está reservada para el programa piloto." };
  }
  if ((!existing || staffPin) && !/^\d{8,16}$/.test(staffPin)) return { error: "El PIN de caja debe tener entre 8 y 16 dígitos." };
  const pinChange = staffPin ? { staffPinHash: await hashAccessCode(staffPin) } : {};
  try {
    await prisma.$transaction(async tx => {
      const current = existing ? await tx.tenant.findUnique({ where: { slug } }) : null;
      if (existing && !current) throw new Error("Este negocio ya no existe.");
      const priorClass = current?.googleClass ||
        (current && tenantProgram(current).isPilot && isGoogleConfigured() ? process.env.GOOGLE_LOYALTY_CLASS_ID : null);
      if (current && priorClass && priorClass !== data.googleClass &&
          await tx.cliente.count({ where: { tenantId: current.id } })) {
        throw new Error("Conserva el identificador de la clase para las tarjetas existentes.");
      }
      if (current && tenantProgram(current).goal !== stampGoal &&
          await tx.visita.count({ where: { tenantId: current.id } })) {
        throw new Error("La meta ya está en uso. Conserva el número de sellos del programa.");
      }
      const tenant = current
        ? await tx.tenant.update({ where: { id: current.id }, data: { ...data, ...pinChange } })
        : await tx.tenant.create({ data: { slug, ...data, ...pinChange } });
      await tx.tipoCanje.upsert({
        where: { tenantId_slug: { tenantId: tenant.id, slug: STAMP_REWARD_SLUG } },
        update: { nombre: data.stampReward, activo: true },
        create: { tenantId: tenant.id, slug: STAMP_REWARD_SLUG, nombre: data.stampReward, costoPuntos: 0 },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") return { error: "El enlace o la clase de Google Wallet ya están asignados." };
      if (error.code === "P2034") return { error: "El negocio cambió durante el guardado. Intenta de nuevo." };
    }
    return { error: error instanceof Prisma.PrismaClientKnownRequestError ? "No se pudo guardar el negocio." :
      error instanceof Error && /^(Este negocio|Conserva|La meta)/.test(error.message) ? error.message : "No se pudo guardar el negocio." };
  }
  redirect(`/admin?negocio=${slug}&guardado=1`);
}
