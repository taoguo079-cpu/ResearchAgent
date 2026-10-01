import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  FINTECH_ROOT,
  generatedFilePath,
  readSources,
  sha256,
  validateGeneratedManifest,
} from "./fintech-pet-assets.mjs";

try {
  const sourceData = await readSources();
  const manifest = JSON.parse(
    await readFile(path.join(FINTECH_ROOT, "manifest.json"), "utf8"),
  );
  if (
    manifest.sourceIndexSha256 !==
    sha256(await readFile(path.join(FINTECH_ROOT, "source-index.json")))
  )
    throw new Error(
      "Source index checksum changed; rebuild the verified assets",
    );
  await validateGeneratedManifest(
    manifest,
    (src) => generatedFilePath(FINTECH_ROOT, src),
    sourceData,
  );
  console.log(
    "Validated 11 distinct Fintech Robot actions, original frame timing, alpha, padding, posters, source checksums and conversion fidelity.",
  );
} catch (error) {
  console.error(`Fintech pet validation stopped: ${error.message}`);
  process.exitCode = 1;
}
