import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { PKPass } from "passkit-generator";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { appleWalletConfig } from "@/lib/wallet-apple-config";
import { availableStamps } from "@/lib/stamps";
import { tenantProgram } from "@/lib/tenant";

type AppleCard = NonNullable<Awaited<ReturnType<typeof appleCardById>>>;

export function appleCardById(id: number, slug?: string) {
  return prisma.cliente.findFirst({
    where: { id, activo: true, tenant: { ...(slug ? { slug } : {}), activo: true } },
    select: {
      id: true, nombre: true, qrCode: true, pin: true, visitas: true, sellosCanjeados: true, updatedAt: true,
      tenant: { select: {
        slug: true, nombre: true, clubName: true, stampGoal: true, stampReward: true, googleClass: true,
        primaryColor: true, secondaryColor: true, appleLogo: true, updatedAt: true,
      } },
    },
  });
}

export function appleSerial(card: { id: number; qrCode: string }) {
  return `a-${card.id}-${createHash("sha256").update(card.qrCode).digest("hex").slice(0, 24)}`;
}

export function validAppleDevice(device: string) {
  return /^[A-Za-z0-9_-]{1,191}$/.test(device);
}

export function appleChangedAt(card: { updatedAt: Date; tenant: { updatedAt: Date } }) {
  return Math.max(card.updatedAt.getTime(), card.tenant.updatedAt.getTime());
}

function authToken(secret: string, passType: string, serial: string) {
  return createHmac("sha256", secret).update(`apple-wallet:${passType}:${serial}`).digest("hex");
}

export async function authorizedAppleCard(request: Request, passType: string, serial: string) {
  const config = appleWalletConfig();
  if (!config || config.passTypeIdentifier !== passType) return { status: 404 } as const;
  const actual = /^ApplePass ([a-f0-9]{64})$/.exec(request.headers.get("authorization") || "")?.[1];
  if (!actual) return { status: 401 } as const;
  const expected = authToken(config.authSecret, passType, serial);
  if (!timingSafeEqual(Buffer.from(actual, "hex"), Buffer.from(expected, "hex"))) return { status: 401 } as const;
  const id = Number(/^a-(\d{1,10})-[a-f0-9]{24}$/.exec(serial)?.[1]);
  if (!Number.isSafeInteger(id) || id < 1 || id > 2147483647) return { status: 404 } as const;
  const card = await appleCardById(id);
  return card && appleSerial(card) === serial ? { card, status: 200 } as const : { status: 404 } as const;
}

function hex(value: string, fallback: string) {
  return /^#[0-9A-Fa-f]{6}$/.test(value) ? value : fallback;
}

function rgb(value: string) {
  const channels = [1, 3, 5].map(offset => parseInt(value.slice(offset, offset + 2), 16));
  return `rgb(${channels.join(", ")})`;
}

function initialsIcon(initials: string, background: string, foreground: string) {
  const safe = initials.replace(/[&<>"']/g, character => `&#${character.codePointAt(0)};`);
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96">
    <rect width="96" height="96" rx="18" fill="${background}"/>
    <text x="48" y="51" dominant-baseline="middle" text-anchor="middle" fill="${foreground}" font-size="38" font-family="sans-serif" font-weight="700">${safe}</text>
  </svg>`);
}

export async function applePassResponse(card: AppleCard) {
  const config = appleWalletConfig();
  if (!config) return new NextResponse(null, { status: 503 });
  const program = tenantProgram(card.tenant);
  const serialNumber = appleSerial(card);
  const background = hex(card.tenant.primaryColor, "#203044");
  const foreground = hex(card.tenant.secondaryColor, "#FFFFFF");
  const initials = card.tenant.nombre.trim().split(/\s+/).slice(0, 2).map(word => Array.from(word)[0]).join("").toUpperCase();
  const icon = initialsIcon(initials, background, foreground);
  const assets: Record<string, Buffer> = {};
  await Promise.all([1, 2, 3].map(async scale => {
    const suffix = scale === 1 ? "" : `@${scale}x`;
    assets[`icon${suffix}.png`] = await sharp(icon).resize(38 * scale).png().toBuffer();
    if (card.tenant.appleLogo) {
      assets[`logo${suffix}.png`] = await sharp(card.tenant.appleLogo).resize(160 * scale, 50 * scale).png().toBuffer();
    }
  }));
  const pass = new PKPass({ ...assets, "pass.json": Buffer.from("{}") }, config.certificates, {
    serialNumber,
    passTypeIdentifier: config.passTypeIdentifier,
    teamIdentifier: config.teamIdentifier,
    organizationName: card.tenant.nombre,
    description: program.clubName || `Tarjeta de lealtad de ${card.tenant.nombre}`,
    logoText: program.clubName || card.tenant.nombre,
    backgroundColor: rgb(background), foregroundColor: rgb(foreground), labelColor: rgb(foreground),
    webServiceURL: config.webServiceURL,
    authenticationToken: authToken(config.authSecret, config.passTypeIdentifier, serialNumber),
  });
  pass.type = "storeCard";
  pass.primaryFields.push({ key: "stamps", label: "SELLOS", value: `${availableStamps(card)} / ${program.goal}` });
  pass.secondaryFields.push({ key: "member", label: "TITULAR", value: card.nombre },
    { key: "pin", label: "PIN DE CLIENTE", value: card.pin });
  pass.backFields.push({ key: "reward", label: "Recompensa", value: program.reward });
  pass.setBarcodes({ format: "PKBarcodeFormatQR", message: card.qrCode, messageEncoding: "iso-8859-1", altText: `PIN ${card.pin}` });
  return new NextResponse(new Uint8Array(pass.getAsBuffer()), {
    headers: {
      "Content-Type": "application/vnd.apple.pkpass",
      "Content-Disposition": 'attachment; filename="arket-loyalty.pkpass"',
      "Cache-Control": "private, no-store",
      "Last-Modified": new Date(appleChangedAt(card)).toUTCString(),
    },
  });
}
