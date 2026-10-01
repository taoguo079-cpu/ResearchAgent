import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { REQUIRED_ASSETS, sha256 } from "./fintech-pet-assets.mjs";

const folder = process.argv[2];
const out = path.resolve("../artifacts/fintech-pet/import");
await mkdir(out, { recursive: true });
const records = [];
const layers = [];
for (const [i, [state, name]] of Object.entries(REQUIRED_ASSETS).entries()) {
  const originalFile = `${i + 2}.gif`;
  const buffer = await readFile(path.join(folder, originalFile));
  const m = await sharp(buffer, { animated: true }).metadata();
  const { data } = await sharp(buffer, {
    page: Math.floor(m.pages / 2),
    pages: 1,
  })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let transparent = 0;
  for (let p = 3; p < data.length; p += 4) if (data[p] === 0) transparent++;
  const record = {
    state,
    name,
    originalFile,
    sha256: sha256(buffer),
    width: m.width,
    height: m.pageHeight,
    frames: m.pages,
    durationMs: m.delay.reduce((a, b) => a + b, 0),
    delays: [...new Set(m.delay)],
    transparentFraction: transparent / (data.length / 4),
    loop: m.loop,
  };
  records.push(record);
  const png = await sharp(buffer, { page: Math.floor(m.pages / 2), pages: 1 })
    .trim({ background: "#00000000" })
    .resize(240, 240, { fit: "contain", background: "#00000000" })
    .png()
    .toBuffer();
  layers.push({
    input: png,
    left: (i % 4) * 270 + 15,
    top: Math.floor(i / 4) * 280 + 35,
  });
  console.log(JSON.stringify(record));
}
const labels = records
  .map(
    (r, i) =>
      `<text x="${(i % 4) * 270 + 15}" y="${Math.floor(i / 4) * 280 + 25}" fill="#172235" font-family="Arial" font-size="18">${r.originalFile} · ${r.state}</text>`,
  )
  .join("");
await sharp(
  Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="840"><rect width="1080" height="840" fill="#e5e9f0"/>${labels}</svg>`,
  ),
)
  .composite(layers)
  .png()
  .toFile(path.join(out, "original-actions.png"));
await writeFile(
  path.join(out, "inspection.json"),
  JSON.stringify(records, null, 2) + "\n",
);
