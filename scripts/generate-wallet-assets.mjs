/**
 * Pre-genera assets PNG para Google Wallet (logo, wide header, sellos circulares 0–6).
 * Uso: node scripts/generate-wallet-assets.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const outDir = path.join(root, "public", "wallet");
const tazminPath = path.join(root, "public", "tazmin-wallet.png");
const isotipoPath = path.join(outDir, "isotipo-z.png");

const CREAM = "#F5E6D3";
const MUTED = "#C4B5A5";
const COOKIE = "#D4A574";

const STRIP_W = 1032;
const STRIP_H = 280;
const STAMP_GAP = 22;
const STAMP_SIZE = 100;
const STAMP_TOP = 78;
const Z_ICON_SIZE = 58;

fs.mkdirSync(outDir, { recursive: true });

function stampPositions(total = 6) {
  const rowW = total * STAMP_SIZE + (total - 1) * STAMP_GAP;
  const startX = (STRIP_W - rowW) / 2;
  return Array.from({ length: total }, (_, i) => ({
    left: Math.round(startX + i * (STAMP_SIZE + STAMP_GAP)),
    top: STAMP_TOP,
  }));
}

function stampStripSvg(filled, total = 6) {
  const restantes = total - filled;
  const hint =
    restantes === 0
      ? "¡Bebida gratis lista!"
      : `${restantes} visita${restantes === 1 ? "" : "s"} más → bebida gratis`;

  let stamps = "";
  for (let i = 0; i < total; i++) {
    const { left, top } = stampPositions(total)[i];
    const isFilled = i < filled;
    const inner = isFilled
      ? `<circle cx="50" cy="50" r="42" fill="${CREAM}"/>`
      : `<circle cx="50" cy="50" r="40.5" fill="none" stroke="${MUTED}" stroke-width="3.5"/><text x="50" y="58" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="700" fill="${MUTED}">${i + 1}</text>`;
    stamps += `
    <svg x="${left}" y="${top}" width="${STAMP_SIZE}" height="${STAMP_SIZE}" viewBox="0 0 100 100">
      ${inner}
    </svg>`;
  }

  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${STRIP_W}" height="${STRIP_H}" viewBox="0 0 ${STRIP_W} ${STRIP_H}">
  <rect width="${STRIP_W}" height="${STRIP_H}" rx="28" fill="#2A211C"/>
  <text x="48" y="48" font-family="Arial, sans-serif" font-size="22" font-weight="700" letter-spacing="2" fill="${MUTED}">SELLOS</text>
  <text x="${STRIP_W - 48}" y="48" text-anchor="end" font-family="Arial, sans-serif" font-size="22" font-weight="700" fill="${COOKIE}">${filled} / ${total}</text>
  ${stamps}
  <text x="${STRIP_W / 2}" y="${STRIP_H - 28}" text-anchor="middle" font-family="Arial, sans-serif" font-size="20" fill="${COOKIE}">${hint}</text>
</svg>`);
}

async function loadZIcon() {
  if (!fs.existsSync(isotipoPath)) return null;
  return sharp(isotipoPath)
    .resize(Z_ICON_SIZE, Z_ICON_SIZE, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

function wideHeaderSvg(width = 1280, height = 480) {
  return Buffer.from(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="none"/>
  <text x="500" y="175" font-family="Arial, sans-serif" font-size="52" font-weight="700" letter-spacing="8" fill="${MUTED}">DULZA</text>
  <text x="500" y="310" font-family="Georgia, serif" font-size="132" font-weight="700" fill="${CREAM}">Dulza Club</text>
</svg>`);
}

async function main() {
  console.log("Generating wallet assets (isotipo Z stamps)…");

  if (fs.existsSync(tazminPath)) {
    await sharp(tazminPath)
      .resize(720, 720, {
        fit: "contain",
        background: { r: 61, g: 46, b: 40, alpha: 1 },
      })
      .png()
      .toFile(path.join(outDir, "program-logo.png"));
  }

  const textLayer = await sharp(wideHeaderSvg()).ensureAlpha().png().toBuffer();
  const composites = [{ input: textLayer, left: 0, top: 0 }];
  if (fs.existsSync(tazminPath)) {
    const taz = await sharp(tazminPath)
      .resize(420, 420, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .ensureAlpha()
      .png()
      .toBuffer();
    composites.unshift({ input: taz, left: 36, top: 30 });
  }
  await sharp({
    create: {
      width: 1280,
      height: 480,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite(composites)
    .png()
    .toFile(path.join(outDir, "wide-logo.png"));

  const zIcon = await loadZIcon();
  const zOffset = Math.round((STAMP_SIZE - Z_ICON_SIZE) / 2);

  for (let filled = 0; filled <= 6; filled++) {
    let base = await sharp(stampStripSvg(filled)).png().toBuffer();
    if (zIcon && filled > 0) {
      const overlays = [];
      for (let i = 0; i < filled; i++) {
        const pos = stampPositions(6)[i];
        overlays.push({
          input: zIcon,
          left: pos.left + zOffset,
          top: pos.top + zOffset,
        });
      }
      base = await sharp(base).composite(overlays).png().toBuffer();
    }
    await sharp(base).toFile(path.join(outDir, `sellos-${filled}.png`));
  }

  console.log("OK → public/wallet/");
  for (const f of fs.readdirSync(outDir).sort()) {
    console.log(`  ${f} (${fs.statSync(path.join(outDir, f)).size} bytes)`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
