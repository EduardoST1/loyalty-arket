import { PrismaClient } from "@prisma/client";

/** Hostinger Node apps auth against 127.0.0.1; "localhost" often fails. */
function normalizeHost(host: string): string {
  const h = host.trim().toLowerCase();
  if (!h || h === "localhost") return "127.0.0.1";
  return host.trim();
}

/**
 * Prefer DB_* parts (Hostinger) over a stale DATABASE_URL.
 */
function resolveDatabaseUrl(): string | undefined {
  const user = process.env.DB_USER?.trim();
  const password = (process.env.DB_PASSWORD ?? "").trim();
  const host = normalizeHost(process.env.DB_HOST || "127.0.0.1");
  const port = process.env.DB_PORT?.trim() || "3306";
  const name = process.env.DB_NAME?.trim();

  if (user && name) {
    const encUser = encodeURIComponent(user);
    const encPass = encodeURIComponent(password);
    return `mysql://${encUser}:${encPass}@${host}:${port}/${name}`;
  }

  if (process.env.DATABASE_URL?.trim()) {
    return process.env.DATABASE_URL.trim().replace(
      /@localhost(?=[:/])/i,
      "@127.0.0.1"
    );
  }

  return undefined;
}

const resolvedUrl = resolveDatabaseUrl();
if (resolvedUrl) {
  process.env.DATABASE_URL = resolvedUrl;
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
