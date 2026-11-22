import fs from "fs";
import path from "path";

/**
 * CONFIGURACIÓN DE WALLET
 *
 * Credenciales vía env (Hostinger) o archivo local en /certificates.
 */

export const WALLET_CONFIG = {
  apple: {
    passTypeId: process.env.APPLE_PASS_TYPE_ID || "pass.com.negocio.loyalty",
    teamId: process.env.APPLE_TEAM_ID || "",
    certificates: {
      passTypeCert: process.env.APPLE_PASS_CERT_PATH || "",
      passTypeCertPassword: process.env.APPLE_PASS_CERT_PASSWORD || "",
      apnsKey: process.env.APPLE_APNS_KEY_PATH || "",
      apnsKeyId: process.env.APPLE_APNS_KEY_ID || "",
    },
    apns: {
      production: process.env.NODE_ENV === "production",
      topic: process.env.APPLE_PASS_TYPE_ID || "pass.com.negocio.loyalty",
    },
    webServiceURL:
      process.env.APPLE_WEB_SERVICE_URL ||
      "https://tu-dominio.com/api/wallet/apple",
  },

  google: {
    issuerId: process.env.GOOGLE_WALLET_ISSUER_ID || "",
    serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || "",
    serviceAccountKeyPath:
      process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
      "./certificates/google-wallet-credentials.json",
    classId: process.env.GOOGLE_LOYALTY_CLASS_ID || "loyalty_class",
  },
};

export function isAppleConfigured(): boolean {
  return !!(
    WALLET_CONFIG.apple.teamId &&
    WALLET_CONFIG.apple.certificates.passTypeCert
  );
}

function googleKeyFileExists(): boolean {
  try {
    const raw = WALLET_CONFIG.google.serviceAccountKeyPath;
    const keyPath = path.isAbsolute(raw) ? raw : path.join(process.cwd(), raw);
    return fs.existsSync(keyPath);
  } catch {
    return false;
  }
}

export function isGoogleConfigured(): boolean {
  if (
    !WALLET_CONFIG.google.issuerId?.trim() ||
    !WALLET_CONFIG.google.serviceAccountEmail?.trim()
  ) {
    return false;
  }
  // Hostinger borra /certificates en cada deploy → usar env BASE64.
  // Local: el JSON en disco alcanza.
  return !!(
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON_BASE64?.trim() ||
    process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim() ||
    googleKeyFileExists()
  );
}
