import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export async function hashAccessCode(value: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(value, salt, 32) as Buffer;
  return `${salt}:${hash.toString("hex")}`;
}

export async function verifyAccessCode(value: string, stored: string) {
  const match = /^([a-f0-9]{32}):([a-f0-9]{64})$/.exec(stored);
  if (!match) return false;
  const hash = await scrypt(value, match[1], 32) as Buffer;
  return timingSafeEqual(hash, Buffer.from(match[2], "hex"));
}

const attempts = new Map<string, { count: number; expiry: number }>();

export function allowLoginAttempt(key: string) {
  const now = Date.now();
  for (const [name, value] of attempts) {
    if (value.expiry <= now) attempts.delete(name);
  }
  const entry = attempts.get(key);
  if (entry) return ++entry.count <= 12;
  if (attempts.size >= 5000) return false;
  attempts.set(key, { count: 1, expiry: now + 5 * 60 * 1000 });
  return true;
}
