import fs from "fs";
import path from "path";
import sharp from "sharp";

const CAFE = "#3D2E28";
const CARD = "#4A3A32";
const CREAM = "#F5E6D3";
const MUTED = "#C4B5A5";
const COOKIE = "#D4A574";

const CARD_WIDTH = 1032;
const CARD_HEIGHT = 520;
const STAMP_GAP = 22;
const STAMP_SIZE = 100;
const STAMP_TOP = 268;
const Z_ICON_SIZE = 58;

export type CardArtInput = {
  puntos: number;
  nivel: string;
  sellos: number;
  meta?: number;
};

function isotipoPath(): string {
  return path.join(process.cwd(), "public", "wallet", "isotipo-z.png");
}

function escapeXml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function stampPositions(meta = 6) {
  const rowW = meta * STAMP_SIZE + (meta - 1) * STAMP_GAP;
  const startX = (CARD_WIDTH - rowW) / 2;
  return Array.from({ length: meta }, (_, i) => ({
    left: Math.round(startX + i * (STAMP_SIZE + STAMP_GAP)),
    top: STAMP_TOP,
    size: STAMP_SIZE,
  }));
}

/** Sello circular: lleno = crema (Z se compone aparte); vacío = anillo + número. */
function stampCircleSvg(isFilled: boolean, number: number): string {
  const r = 42;
  if (isFilled) {
    return `<circle cx="50" cy="50" r="${r}" fill="${CREAM}"/>`;
  }
  return `
    <circle cx="50" cy="50" r="${r - 1.5}" fill="none" stroke="${MUTED}" stroke-width="3.5"/>
    <text x="50" y="58" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="${MUTED}">${number}</text>`;
}

/** Composición: Puntos | Nivel + sellos circulares con isotipo Z. */
export function buildCardArtSvg({
  puntos,
  nivel,
  sellos,
  meta = 6,
}: CardArtInput): string {
  const filled = Math.max(0, Math.min(meta, sellos));
  const restantes = meta - filled;
  const hint =
    restantes === 0
      ? "¡Bebida gratis lista!"
      : `${restantes} visita${restantes === 1 ? "" : "s"} más → bebida gratis`;
  const nivelLabel = escapeXml((nivel || "Bronce").toUpperCase());
  const positions = stampPositions(meta);

  let stamps = "";
  for (let i = 0; i < meta; i++) {
    const { left, top, size } = positions[i];
    const isFilled = i < filled;
    stamps += `
    <svg x="${left}" y="${top}" width="${size}" height="${size}" viewBox="0 0 100 100">
      ${stampCircleSvg(isFilled, i + 1)}
    </svg>`;
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}" viewBox="0 0 ${CARD_WIDTH} ${CARD_HEIGHT}">
  <rect width="${CARD_WIDTH}" height="${CARD_HEIGHT}" fill="${CAFE}"/>

  <rect x="36" y="28" width="468" height="140" rx="28" fill="${CARD}"/>
  <text x="70" y="78" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="2" fill="${MUTED}">PUNTOS</text>
  <text x="70" y="138" font-family="Arial, sans-serif" font-size="56" font-weight="700" fill="${CREAM}">${puntos}</text>

  <rect x="528" y="28" width="468" height="140" rx="28" fill="${CARD}"/>
  <text x="562" y="78" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="2" fill="${MUTED}">NIVEL</text>
  <text x="562" y="138" font-family="Arial, sans-serif" font-size="48" font-weight="700" fill="${CREAM}">${nivelLabel}</text>

  <rect x="36" y="192" width="960" height="292" rx="28" fill="${CARD}"/>
  <text x="70" y="236" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="2" fill="${MUTED}">SELLOS</text>
  <text x="962" y="236" text-anchor="end" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="${COOKIE}">${filled} / ${meta}</text>
  ${stamps}
  <text x="516" y="448" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="${COOKIE}">${escapeXml(hint)}</text>
</svg>`;
}

async function loadZIcon(): Promise<Buffer | null> {
  const p = isotipoPath();
  if (!fs.existsSync(p)) return null;
  return sharp(p)
    .resize(Z_ICON_SIZE, Z_ICON_SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

export async function compositeZStamps(
  base: Buffer,
  filled: number,
  meta = 6
): Promise<Buffer> {
  const zIcon = await loadZIcon();
  if (!zIcon || filled <= 0) return base;

  const offset = Math.round((STAMP_SIZE - Z_ICON_SIZE) / 2);
  const composites = [];
  for (let i = 0; i < filled; i++) {
    const pos = stampPositions(meta)[i];
    composites.push({
      input: zIcon,
      left: pos.left + offset,
      top: pos.top + offset,
    });
  }

  return sharp(base).composite(composites).png().toBuffer();
}

export async function renderCardArtPng(input: CardArtInput): Promise<Buffer> {
  const meta = input.meta ?? 6;
  const filled = Math.max(0, Math.min(meta, input.sellos));
  const svg = Buffer.from(buildCardArtSvg(input));
  const base = await sharp(svg).png().toBuffer();
  return compositeZStamps(base, filled, meta);
}
