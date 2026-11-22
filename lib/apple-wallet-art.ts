import sharp from "sharp";

const MAX_LOGO_BYTES = 500 * 1024;

export async function prepareAppleLogo(file: File) {
  if (file.size > MAX_LOGO_BYTES) throw new Error("El logo para Apple debe pesar como máximo 500 KB.");
  const image = sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 4_194_304 });
  const { format } = await image.metadata();
  if (format !== "png" && format !== "jpeg") throw new Error("El logo para Apple debe ser PNG o JPG.");
  return image.rotate().resize(480, 150, {
    fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).png().toBuffer();
}
