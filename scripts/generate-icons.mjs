// Generates the PWA PNG icons from the SVG source at build time.
// The PNGs are binary, so they cannot be pushed through the repo's
// text-only push tool — instead the SVG (plain text) lives in the repo
// and this script renders the PNGs during `npm run build` (prebuild)
// on Vercel and locally. The manifest references the generated files.
import sharp from "sharp";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "public", "icons", "icon.svg");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

for (const size of [192, 512]) {
  await sharp(src, { density: 144 })
    .resize(size, size)
    .png()
    .toFile(join(outDir, `icon-${size}.png`));
  console.log(`icon-${size}.png generated`);
}
