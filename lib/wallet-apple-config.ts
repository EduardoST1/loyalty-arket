import { createPrivateKey, X509Certificate } from "node:crypto";

function pem(name: string) {
  const value = process.env[name]?.trim();
  if (!value) return Buffer.alloc(0);
  return Buffer.from(value, "base64");
}

function readConfig() {
  const passTypeIdentifier = process.env.APPLE_PASS_TYPE_ID?.trim() || "";
  const teamIdentifier = process.env.APPLE_TEAM_ID?.trim() || "";
  const authSecret = process.env.APPLE_PASS_AUTH_SECRET || "";
  const signerCert = pem("APPLE_SIGNER_CERT_PEM_BASE64");
  const signerKey = pem("APPLE_SIGNER_KEY_PEM_BASE64");
  const wwdr = pem("APPLE_WWDR_PEM_BASE64");
  const signerKeyPassphrase = process.env.APPLE_SIGNER_KEY_PASSPHRASE;
  const publicUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "");
  const webServiceURL = process.env.APPLE_WEB_SERVICE_URL?.replace(/\/+$/, "") ||
    (publicUrl ? `${publicUrl}/api/wallet/apple` : "");
  if (!/^pass\.[A-Za-z0-9.-]+$/.test(passTypeIdentifier) || !/^[A-Z0-9]{10}$/.test(teamIdentifier) ||
      authSecret.length < 32 || !signerCert.length || !signerKey.length || !wwdr.length) return null;
  try {
    const url = new URL(webServiceURL);
    if (url.protocol !== "https:" || url.username || url.password || url.search || url.hash) return null;
    const certificate = new X509Certificate(signerCert);
    const intermediate = new X509Certificate(wwdr);
    const key = createPrivateKey({ key: signerKey, passphrase: signerKeyPassphrase });
    if (!certificate.checkPrivateKey(key) || !certificate.verify(intermediate.publicKey)) return null;
    if (!certificate.subject.split("\n").includes(`UID=${passTypeIdentifier}`) ||
        !certificate.subject.split("\n").includes(`OU=${teamIdentifier}`)) return null;
    return {
      passTypeIdentifier, teamIdentifier, authSecret, webServiceURL,
      certificates: { signerCert, signerKey, wwdr, signerKeyPassphrase },
      validFrom: Date.parse(certificate.validFrom),
      validUntil: Math.min(Date.parse(certificate.validTo), Date.parse(intermediate.validTo)),
    };
  } catch {
    return null;
  }
}

let config: ReturnType<typeof readConfig> | undefined;

export function appleWalletConfig() {
  if (config === undefined) config = readConfig();
  const now = Date.now();
  return config && config.validFrom <= now && now < config.validUntil ? config : null;
}
