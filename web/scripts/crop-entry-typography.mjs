import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import sharp from "sharp";

const directory = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/design-text",
);
const manifest = JSON.parse(
  await readFile(path.join(directory, "manifest.json"), "utf8"),
);
for (const [name, asset] of Object.entries(manifest.assets)) {
  const file = path.join(directory, `${name}.svg`);
  const { data, info } = await sharp(file)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  if (info.width !== 1366 || info.height !== 768) {
    throw new Error(
      `Run extract-entry-typography.py before cropping ${name}: expected the original 1366 × 768 canvas.`,
    );
  }
  let x = info.width,
    y = info.height,
    right = -1,
    bottom = -1;
  for (let offset = 0; offset < data.length; offset += 4) {
    if (!data[offset + 3]) continue;
    const column = (offset / 4) % info.width,
      row = Math.floor(offset / 4 / info.width);
    x = Math.min(x, column);
    y = Math.min(y, row);
    right = Math.max(right, column);
    bottom = Math.max(bottom, row);
  }
  if (right < 0) throw new Error(`Empty design label: ${name}`);
  const width = right - x + 1,
    height = bottom - y + 1;
  const svg = (await readFile(file, "utf8"))
    .replace('width="1366"', `width="${width}"`)
    .replace('height="768"', `height="${height}"`)
    .replace(
      'viewBox="0 0 1024.5 576"',
      `viewBox="${x * 0.75} ${y * 0.75} ${width * 0.75} ${height * 0.75}"`,
    );
  await writeFile(file, svg);
  Object.assign(asset, { x, y, width, height });
  console.log(name, { x, y, width, height });
}
await writeFile(
  path.join(directory, "manifest.json"),
  JSON.stringify(manifest, null, 2) + "\n",
);
