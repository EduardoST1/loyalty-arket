import { connect, type ClientHttp2Session } from "node:http2";
import { prisma } from "@/lib/prisma";
import { appleWalletConfig } from "@/lib/wallet-apple-config";

function sendUpdate(session: ClientHttp2Session, token: string, topic: string) {
  return new Promise<{ status: number; reason?: string }>((resolve, reject) => {
    const request = session.request({
      ":method": "POST", ":path": `/3/device/${token}`,
      "apns-topic": topic, "apns-priority": "5", "apns-expiration": "0",
      "content-type": "application/json",
    });
    let status = 0;
    let payload = "";
    request.setEncoding("utf8");
    request.on("response", headers => { status = Number(headers[":status"]); });
    request.on("data", chunk => { payload += chunk; });
    request.on("error", reject);
    request.on("end", () => {
      if (!payload) return resolve({ status });
      try {
        resolve({ status, reason: JSON.parse(payload).reason });
      } catch {
        resolve({ status });
      }
    });
    request.end("{}");
  });
}

export async function notifyAppleWallet(clienteId: number) {
  const config = appleWalletConfig();
  if (!config) return;
  const devices = await prisma.walletDevice.findMany({
    where: { clienteId, tipo: "apple", passTypeId: config.passTypeIdentifier },
    select: { id: true, pushToken: true },
  });
  if (!devices.length) return;
  const { signerCert, signerKey, signerKeyPassphrase, wwdr } = config.certificates;
  const client = connect("https://api.push.apple.com", {
    cert: `${signerCert.toString()}\n${wwdr.toString()}`,
    key: signerKey, passphrase: signerKeyPassphrase,
  });
  client.on("error", () => {});
  const deadline = setTimeout(() => client.destroy(new Error("APNs timeout")), 4000);
  try {
    const results = await Promise.allSettled(devices.map(async device => {
      const { status, reason } = await sendUpdate(client, device.pushToken, config.passTypeIdentifier);
      if (status === 410 || (status === 400 && reason === "BadDeviceToken")) {
        await prisma.walletDevice.deleteMany({ where: { id: device.id, pushToken: device.pushToken } });
      } else if (status !== 200) {
        throw new Error(`APNs HTTP ${status}`);
      }
    }));
    if (results.some(result => result.status === "rejected")) console.warn("Apple Wallet: algunas notificaciones fallaron.");
  } finally {
    clearTimeout(deadline);
    client.close();
  }
}
