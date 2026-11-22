import { availableStamps, STAMP_GOAL, STAMP_REWARD } from "@/lib/stamps";
import fs from "fs";
import path from "path";
import { GoogleAuth } from "google-auth-library";
import jwt from "jsonwebtoken";
import { WALLET_CONFIG, isGoogleConfigured } from "@/lib/wallet-config";

type ServiceAccount = {
  client_email: string;
  private_key: string;
  [key: string]: unknown;
};

export type GoogleClientePass = {
  id: number;
  nombre: string;
  pin: string;
  qrCode: string;
  codigoReferido: string;
  puntos: number;
  visitas: number;
  sellosCanjeados: number;
  nivel: string;
  logros?: Array<{ icono: string; nombre: string }>;
};

function resolveKeyPath(): string {
  const raw = WALLET_CONFIG.google.serviceAccountKeyPath;
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
}

function isServiceAccount(value: unknown): value is ServiceAccount {
  return !!(
    value &&
    typeof value === "object" &&
    typeof (value as ServiceAccount).client_email === "string" &&
    typeof (value as ServiceAccount).private_key === "string"
  );
}

function normalizePrivateKey(sa: ServiceAccount): ServiceAccount {
  if (sa.private_key.includes("\\n")) {
    sa.private_key = sa.private_key.replace(/\\n/g, "\n");
  }
  return sa;
}

function unescapeOnce(s: string): string {
  let out = "";
  for (let i = 0; i < s.length; i++) {
    if (s[i] === "\\" && i + 1 < s.length) {
      const n = s[i + 1];
      // Do NOT unescape \n/\t/\r here — JSON.parse needs those sequences intact
      if (n === '"' || n === "'" || n === "{" || n === "}" || n === "\\") {
        out += n;
        i += 1;
        continue;
      }
    }
    out += s[i];
  }
  return out;
}

/** Prefer BASE64 on Hostinger — avoids broken escaping of JSON in .env panels. */
export function parseServiceAccountJsonEnv(raw: string): ServiceAccount {
  let s = raw.trim();

  // Base64 payload (no { at start)
  if (!s.startsWith("{") && !s.startsWith("'") && !s.startsWith('"') && !s.startsWith("\\")) {
    try {
      const decoded = Buffer.from(s, "base64").toString("utf8");
      if (decoded.trim().startsWith("{")) {
        s = decoded.trim();
      }
    } catch {
      /* not base64 */
    }
  }

  for (let i = 0; i < 3; i++) {
    if (
      (s.startsWith("'") && s.endsWith("'")) ||
      (s.startsWith('"') && s.endsWith('"'))
    ) {
      s = s.slice(1, -1).trim();
    } else break;
  }

  for (let attempt = 0; attempt < 12; attempt++) {
    try {
      let parsed: unknown = JSON.parse(s);
      let guard = 0;
      while (typeof parsed === "string" && guard++ < 6) {
        parsed = JSON.parse(parsed);
      }
      if (isServiceAccount(parsed)) {
        return normalizePrivateKey(parsed);
      }
    } catch {
      /* try unescape */
    }

    const next = unescapeOnce(s);
    if (next === s) break;
    s = next;
  }

  // Last resort: slice from first { to last }
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start >= 0 && end > start) {
    const slice = s.slice(start, end + 1);
    try {
      const parsed = JSON.parse(slice);
      if (isServiceAccount(parsed)) return normalizePrivateKey(parsed);
    } catch {
      /* fall through */
    }
  }

  throw new Error("GOOGLE_SERVICE_ACCOUNT_JSON inválido");
}

function loadServiceAccount(): ServiceAccount {
  // Hostinger: a veces pegan el JSON crudo en la var *_BASE64
  const b64OrJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64?.trim();
  if (b64OrJson) {
    if (b64OrJson.startsWith("{")) {
      return parseServiceAccountJsonEnv(b64OrJson);
    }
    const decoded = Buffer.from(b64OrJson, "base64").toString("utf8");
    return parseServiceAccountJsonEnv(decoded);
  }

  const fromEnv = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim();
  if (fromEnv) {
    return parseServiceAccountJsonEnv(fromEnv);
  }

  const keyPath = resolveKeyPath();
  if (!fs.existsSync(keyPath)) {
    throw new Error(
      `No se encontró el JSON de Google. Define GOOGLE_SERVICE_ACCOUNT_JSON_BASE64 en Hostinger.`
    );
  }
  return JSON.parse(fs.readFileSync(keyPath, "utf8")) as ServiceAccount;
}

function getAuth() {
  const sa = loadServiceAccount();
  return new GoogleAuth({
    credentials: sa,
    scopes: ["https://www.googleapis.com/auth/wallet_object.issuer"],
  });
}

function usesPreparedClass() {
  return process.env.GOOGLE_WALLET_CLASS_MODE === "prepared";
}

function classId() {
  const { issuerId, classId: suffix } = WALLET_CONFIG.google;
  if (usesPreparedClass()) {
    if (!/^\d+$/.test(issuerId) || !/^[A-Za-z0-9._-]+$/.test(suffix) ||
        suffix === "loyalty_class" || suffix.startsWith(`${issuerId}.`)) {
      throw new Error("Configura el Issuer ID y el sufijo de una clase propia del negocio");
    }
  }
  return `${issuerId}.${suffix}`;
}

function objectId(qrCode: string) {
  const safe = qrCode.replace(/[^A-Za-z0-9._-]/g, "_");
  if (usesPreparedClass()) return `${classId()}.${safe}`;
  return `${WALLET_CONFIG.google.issuerId}.${safe}`;
}

/** Public HTTPS base for Wallet images (Google fetches these URLs). */
function walletPublicBase(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.GOOGLE_WALLET_ORIGIN ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

const WALLET_ASSET_VERSION = "12";

function resourceUrl(base: string, resourceId: string) {
  return `${base}/${encodeURIComponent(resourceId)}`;
}

function nivelDisplay(nivel: string): string {
  const upper = (nivel || "Bronce").trim().toUpperCase();
  const map: Record<string, string> = {
    BRONCE: "Bronce",
    PLATA: "Plata",
    ORO: "Oro",
    DIAMANTE: "Diamante",
  };
  return map[upper] ?? "Bronce";
}

function walletApiErrorMessage(err: unknown): string {
  const data = (err as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === "object") {
    const msg =
      (data as { error?: { message?: string } }).error?.message ||
      (data as { error?: string }).error;
    if (typeof msg === "string" && msg) return msg;
  }
  return err instanceof Error ? err.message : String(err);
}

function explainInvalidResourceId(resourceId: string): string {
  const issuer = WALLET_CONFIG.google.issuerId;
  const sa =
    WALLET_CONFIG.google.serviceAccountEmail ||
    "(revisa GOOGLE_SERVICE_ACCOUNT_EMAIL)";
  return [
    `Google rechazó el Class ID "${resourceId}".`,
    "Casi siempre es el Issuer ID o permisos de la service account, no el nombre de la clase.",
    `1) En https://pay.google.com/business/console abre Google Wallet API y copia el Issuer ID exacto (debe coincidir con GOOGLE_WALLET_ISSUER_ID=${issuer || "(vacío)"}).`,
    `2) En Users / Usuarios agrega como Admin: ${sa}`,
    "3) Confirma que el acceso a Google Wallet API esté aprobado (no solo solicitado).",
    "4) GOOGLE_LOYALTY_CLASS_ID solo debe ser el sufijo (ej. dulza_loyalty_class), sin el Issuer ID delante.",
  ].join(" ");
}

async function ensureLoyaltyClass() {
  const auth = getAuth();
  const client = await auth.getClient();
  const id = classId();
  const base =
    "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass";

  if (usesPreparedClass()) {
    const { data } = await client.request<{ reviewStatus?: string }>({
      url: resourceUrl(base, id),
      method: "GET",
    });
    if (data.reviewStatus !== "APPROVED") {
      throw new Error("La clase de Google Wallet debe estar aprobada");
    }
    return id;
  }

  const logoUri =
    process.env.GOOGLE_WALLET_LOGO_URL ||
    `${walletPublicBase()}/wallet/program-logo.png?v=${WALLET_ASSET_VERSION}`;
  const wideLogoUri =
    process.env.GOOGLE_WALLET_WIDE_LOGO_URL ||
    `${walletPublicBase()}/wallet/wide-logo.png?v=${WALLET_ASSET_VERSION}`;
  const home = walletPublicBase();

  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || "Tu Negocio";
  const clubName = process.env.NEXT_PUBLIC_CLUB_NAME || "Club de Lealtad";

  const loyaltyClass = {
    id,
    issuerName: brandName,
    programName: clubName,
    programLogo: {
      sourceUri: { uri: logoUri },
      contentDescription: {
        defaultValue: { language: "es-MX", value: brandName },
      },
    },
    // Android: branding arriba (sustituye header). Evitamos heroImage:
    // Google lo pinta debajo del QR y no se puede subir.
    wideProgramLogo: {
      sourceUri: { uri: wideLogoUri },
      contentDescription: {
        defaultValue: { language: "es-MX", value: clubName },
      },
    },
    accountNameLabel: "Nombre de miembro",
    accountIdLabel: "PIN",
    rewardsTierLabel: "Nivel",
    reviewStatus: "UNDER_REVIEW",
    hexBackgroundColor: "#3D2E28",
    homepageUri: {
      uri: home,
      description: `Abrir ${clubName}`,
    },
    linksModuleData: {
      uris: [
        {
          uri: `${home}/wallet`,
          description: "Mi tarjeta",
          id: "wallet",
        },
        {
          uri: home,
          description: brandName,
          id: "home",
        },
      ],
    },
    textModulesData: [
      {
        id: "programa",
        header: "Cómo funciona",
        body: `Cada visita suma un sello. Canjea ${STAMP_GOAL} sellos por: ${STAMP_REWARD}.`,
      },
    ],
  };

  try {
    const existing = await client.request({
      url: resourceUrl(base, id),
      method: "GET",
    });
    const prev = (existing.data || {}) as Record<string, unknown>;
    // PUT reemplaza el recurso y limpia heroImage viejo (PATCH lo dejaría abajo del QR)
    const { heroImage: _drop, ...restPrev } = prev;
    await client.request({
      url: resourceUrl(base, id),
      method: "PUT",
      data: {
        ...restPrev,
        ...loyaltyClass,
        reviewStatus:
          prev.reviewStatus === "APPROVED"
            ? "APPROVED"
            : loyaltyClass.reviewStatus,
      },
    });
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response
      ?.status;
    const apiMsg = walletApiErrorMessage(err);

    if (status === 404) {
      try {
        await client.request({
          url: base,
          method: "POST",
          data: loyaltyClass,
        });
      } catch (createErr: unknown) {
        const createMsg = walletApiErrorMessage(createErr);
        if (/invalid resource id/i.test(createMsg)) {
          throw new Error(explainInvalidResourceId(id));
        }
        throw createErr;
      }
    } else if (/invalid resource id/i.test(apiMsg)) {
      throw new Error(explainInvalidResourceId(id));
    } else {
      throw err;
    }
  }

  return id;
}

function buildLoyaltyObject(cliente: GoogleClientePass) {
  const sellosLlenos = availableStamps(cliente);
  const restantes = Math.max(0, STAMP_GOAL - sellosLlenos);
  const rewardLabel = STAMP_REWARD;

  const textModulesData = [
    {
      id: "referido",
      header: "Código de referido",
      body: cliente.codigoReferido,
    },
    {
      id: "progreso",
      header: "Progreso",
      body:
        restantes === 0
          ? `Ya puedes canjear ${rewardLabel}. Muestra tu PIN o QR en caja.`
          : `Faltan ${restantes} visita${restantes === 1 ? "" : "s"} para canjear ${rewardLabel}.`,
    },
  ];

  if (cliente.logros && cliente.logros.length > 0) {
    textModulesData.push({
      id: "logros",
      header: "Logros recientes",
      body: cliente.logros
        .slice(0, 3)
        .map((l) => `${l.icono} ${l.nombre}`)
        .join(" · "),
    });
  }

  return {
    id: objectId(cliente.qrCode),
    classId: classId(),
    state: "ACTIVE" as const,
    accountName: cliente.nombre,
    accountId: cliente.pin,
    loyaltyPoints: {
      label: "Puntos",
      balance: { int: cliente.puntos },
    },
    secondaryLoyaltyPoints: {
      label: "Sellos",
      balance: { string: `${sellosLlenos}/${STAMP_GOAL}` },
    },
    // Solo texto — nunca una imagen de nivel (evita BRONCE-V9.PNG / "?").
    rewardsTier: nivelDisplay(cliente.nivel),
    barcode: {
      type: "QR_CODE" as const,
      value: cliente.qrCode,
      alternateText: `PIN ${cliente.pin}`,
    },
    textModulesData,
    ...(!usesPreparedClass() ? { hexBackgroundColor: "#3D2E28" } : {}),
  };
}

export type WalletSyncResult = { ok: true } | { ok: false; error: string };

async function upsertLoyaltyObject(
  loyaltyObject: ReturnType<typeof buildLoyaltyObject>
) {
  const auth = getAuth();
  const client = await auth.getClient();
  const base =
    "https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject";
  const url = resourceUrl(base, loyaltyObject.id);

  try {
    await client.request({ url, method: "GET" });
    // PUT limpia heroImage / imageModules viejos que mostraban el nivel bugeado.
    await client.request({
      url,
      method: "PUT",
      data: {
        ...loyaltyObject,
        notifyPreference: "NOTIFY_ON_UPDATE",
      },
    });
  } catch (err: unknown) {
    const status = (err as { response?: { status?: number } })?.response
      ?.status;
    if (status === 404) {
      await client.request({
        url: base,
        method: "POST",
        data: loyaltyObject,
      });
    } else {
      throw err;
    }
  }
}

function buildSaveUrl(
  loyaltyObject: ReturnType<typeof buildLoyaltyObject>
): string {
  const serviceAccount = loadServiceAccount();
  const origin =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.GOOGLE_WALLET_ORIGIN ||
    "http://localhost:3000";

  const claims = {
    iss: serviceAccount.client_email,
    aud: "google",
    typ: "savetowallet",
    origins: [origin],
    payload: {
      loyaltyObjects: [
        {
          id: loyaltyObject.id,
          classId: loyaltyObject.classId,
        },
      ],
    },
  };

  const token = jwt.sign(claims, serviceAccount.private_key, {
    algorithm: "RS256",
  });

  return `https://pay.google.com/gp/v/save/${token}`;
}

export async function checkPreparedGoogleClass() {
  if (!usesPreparedClass() || !isGoogleConfigured()) {
    throw new Error("Configura el emisor, la cuenta de servicio y la clase preparada de Arket.");
  }
  try {
    await ensureLoyaltyClass();
  } catch {
    throw new Error("Google Wallet no confirmó una clase aprobada. Revisa la clase y los permisos del emisor.");
  }
}

export async function createGoogleWalletSaveUrl(
  cliente: GoogleClientePass
): Promise<string> {
  if (!isGoogleConfigured()) {
    throw new Error("Google Wallet no configurado");
  }

  await ensureLoyaltyClass();
  const loyaltyObject = buildLoyaltyObject(cliente);
  await upsertLoyaltyObject(loyaltyObject);
  return buildSaveUrl(loyaltyObject);
}

export async function updateGoogleWalletObject(
  cliente: GoogleClientePass
): Promise<WalletSyncResult> {
  if (!isGoogleConfigured()) {
    return { ok: false, error: "Google Wallet no configurado" };
  }
  try {
    const loyaltyObject = buildLoyaltyObject(cliente);
    await upsertLoyaltyObject(loyaltyObject);
    return { ok: true };
  } catch (err) {
    console.error("Error actualizando Google Wallet:", err);
    return { ok: false, error: "No se pudo actualizar Google Wallet" };
  }
}

export function googleCredentialsPresent(): boolean {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64?.trim()) return true;
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()) return true;
  if (!isGoogleConfigured()) return false;
  try {
    return fs.existsSync(resolveKeyPath());
  } catch {
    return false;
  }
}
