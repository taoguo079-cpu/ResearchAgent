import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import {
  FINTECH_ROOT,
  REQUIRED_ASSETS,
  sha256,
  validateSourceIndex,
} from "./fintech-pet-assets.mjs";

const folder = process.argv[2];
if (!folder)
  throw new Error("Supply the folder containing 2.gif through 12.gif");
await mkdir(path.join(FINTECH_ROOT, "source"), { recursive: true });
const assets = [];
let modified = 0;
for (const [i, [state, name]] of Object.entries(REQUIRED_ASSETS).entries()) {
  const originalFile = `${i + 2}.gif`;
  const originalPath = path.resolve(folder, originalFile);
  const bytes = await readFile(originalPath);
  const metadata = await sharp(bytes, { animated: true }).metadata();
  if (metadata.format !== "gif" || metadata.pages < 2)
    throw new Error(`${originalFile} is not an animation`);
  modified = Math.max(modified, (await stat(originalPath)).mtimeMs);
  const asset = {
    name,
    assetId: state === "search" ? "VAFNUvfhgpg" : null,
    attributionStatus: "user-supplied-export",
    nameBasis: "user-declared-file-order",
    originalFile,
    file: `source/${state}.gif`,
    sha256: sha256(bytes),
    originalDurationMs: state === "search" ? 5000 : null,
    exportDurationMs: metadata.delay.reduce((a, b) => a + b, 0),
    ...(state === "completed"
      ? {
          appearanceNote:
            "User assigned 11.gif: sunglasses and relaxed/celebratory pose; does not depict the planned raised-hands pose. Catalog identity unverified.",
        }
      : {}),
    ...(state === "failed"
      ? {
          appearanceNote:
            "User assigned 12.gif: gears and repair/troubleshooting pose; catalog identity unverified.",
        }
      : {}),
  };
  const target = path.join(FINTECH_ROOT, asset.file);
  // Preserve any different earlier source instead of overwriting it silently.
  try {
    const old = await readFile(target);
    if (sha256(old) !== asset.sha256) {
      await mkdir(path.join(FINTECH_ROOT, "archive"), { recursive: true });
      await writeFile(
        path.join(
          FINTECH_ROOT,
          "archive",
          `${state}-${sha256(old).slice(0, 16)}.gif`,
        ),
        old,
        { flag: "wx" },
      );
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  await writeFile(target, bytes);
  assets.push(asset);
}
const index = validateSourceIndex({
  schemaVersion: 1,
  origin: {
    provider: "Canva",
    exportMethod: "transparent GIF",
    suppliedBy: "user",
    suppliedFolder: path.resolve(folder),
    mapping:
      "2–12 match the plan's 11 states in order, explicitly confirmed by the user",
  },
  exportedAt: new Date(modified).toISOString(),
  exportedAtBasis:
    "latest local source file modification time; Canva export timestamp not independently verified",
  importedAt: new Date().toISOString(),
  assets,
});
await writeFile(
  path.join(FINTECH_ROOT, "source-index.json"),
  JSON.stringify(index, null, 2) + "\n",
);
console.log(
  `Imported ${assets.length} original transparent exports without changing their bytes.`,
);
