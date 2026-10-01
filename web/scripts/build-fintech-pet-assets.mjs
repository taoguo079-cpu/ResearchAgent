import {
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  writeFile,
} from "node:fs/promises";
import path from "node:path";

import sharp from "sharp";

import {
  CELL,
  COLUMNS,
  DURATION_TOLERANCE_MS,
  FINTECH_ROOT,
  PADDING,
  REQUIRED_ASSETS,
  WEB_ROOT,
  encodeAtlas,
  readSources,
  renderCell,
  sha256,
  validateGeneratedManifest,
} from "./fintech-pet-assets.mjs";

try {
  await build();
} catch (error) {
  console.error(`Fintech pet build stopped: ${error.message}`);
  process.exitCode = 1;
}

async function build() {
  // Complete source preflight before creating output or changing a manifest.
  const sourceData = await readSources();
  const contract = {
    version: 2,
    cell: CELL,
    columns: COLUMNS,
    padding: PADDING,
    durationToleranceMs: DURATION_TOLERANCE_MS,
    mapping: REQUIRED_ASSETS,
    sourceIndex: sourceData.index,
  };
  const buildId = sha256(JSON.stringify(contract)).slice(0, 20);
  const buildsDir = path.join(FINTECH_ROOT, "builds");
  const stageDir = path.join(buildsDir, `.staging-${buildId}-${process.pid}`);
  const outputDir = path.join(buildsDir, buildId);
  const webPrefix = `${WEB_ROOT}builds/${buildId}/`;
  await mkdir(path.join(stageDir, "posters"), { recursive: true });
  await mkdir(path.join(stageDir, "qa"), { recursive: true });
  const manifest = {
    schemaVersion: 2,
    id: "fintech-robot",
    displayName: "Fintech Robot",
    cell: CELL,
    previewSrc: `${webPrefix}posters/idle.webp`,
    states: {},
    sourceIndexSha256: sha256(
      await readFile(path.join(FINTECH_ROOT, "source-index.json")),
    ),
    qa: {
      overviewSrc: `${webPrefix}qa/overview.png`,
      sourcesSrc: `${webPrefix}SOURCES.md`,
    },
  };
  const posters = new Map();
  for (const [state, name] of Object.entries(REQUIRED_ASSETS)) {
    const source = sourceData.sources.get(name);
    const frameCount = source.pages;
    const rows = Math.ceil(frameCount / COLUMNS);
    const posterFrame = Math.floor(frameCount / 2);
    const frames = [];
    for (let frame = 0; frame < frameCount; frame += 1)
      frames.push(await renderCell(source, frame));
    const atlas = await encodeAtlas(frames);
    const poster = await sharp(frames[posterFrame])
      .webp({ lossless: true, effort: 6 })
      .toBuffer();
    await writeFile(path.join(stageDir, `${state}.webp`), atlas);
    await writeFile(path.join(stageDir, "posters", `${state}.webp`), poster);
    const animatedPreview = await sharp({
      create: {
        width: CELL.width,
        height: CELL.height * frameCount,
        pageHeight: CELL.height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(
        frames.map((input, frame) => ({
          input,
          left: 0,
          top: frame * CELL.height,
        })),
      )
      .gif({ loop: 0, delay: source.delays, effort: 7, dither: 0 })
      .toBuffer();
    await writeFile(path.join(stageDir, "qa", `${state}.gif`), animatedPreview);
    manifest.states[state] = {
      src: `${webPrefix}${state}.webp`,
      posterSrc: `${webPrefix}posters/${state}.webp`,
      columns: COLUMNS,
      rows,
      frameCount,
      frameDurationsMs: source.delays,
      loop: state !== "completed",
      ...(state === "completed" ? { repeat: 2 } : {}),
      posterFrame,
      sha256: sha256(atlas),
      posterSha256: sha256(poster),
      source: {
        ...source.asset,
        canvas: { width: source.width, height: source.height },
        durationMs: source.durationMs,
        durationToleranceMs: DURATION_TOLERANCE_MS,
        uniqueFrames: source.uniqueFrames,
        crop: source.crop,
        fit: source.fit,
      },
    };
    posters.set(state, poster);
    console.log(
      `${state}: ${frameCount} frames, ${manifest.states[state].source.durationMs} ms, ${rows} rows`,
    );
  }
  await writeFile(
    path.join(stageDir, "qa", "overview.png"),
    await overview(posters),
  );
  await writeFile(
    path.join(stageDir, "SOURCES.md"),
    sourceNotes(manifest, sourceData.index),
  );
  const serialized = `${JSON.stringify(manifest, null, 2)}\n`;
  await writeFile(path.join(stageDir, "manifest.json"), serialized);
  const resolveStaged = (src) => {
    if (!src.startsWith(webPrefix))
      throw new Error(`Unexpected staged asset URL: ${src}`);
    return path.join(stageDir, ...src.slice(webPrefix.length).split("/"));
  };
  await validateGeneratedManifest(manifest, resolveStaged, sourceData);
  try {
    await rename(stageDir, outputDir);
  } catch (error) {
    if (
      error.code !== "EEXIST" &&
      error.code !== "ENOTEMPTY" &&
      error.code !== "EPERM"
    )
      throw error;
    // Immutable prior output can be reused only when its complete manifest is identical.
    if (
      (await readFile(path.join(outputDir, "manifest.json"), "utf8")) !==
      serialized
    )
      throw new Error(
        `Existing build ${buildId} differs; no manifest was changed`,
      );
    await validateGeneratedManifest(
      manifest,
      (src) => path.join(outputDir, ...src.slice(webPrefix.length).split("/")),
      sourceData,
    );
    // Resolve both absolute paths before deleting only this generated staging directory.
    const resolvedStage = await realpath(stageDir);
    const resolvedBuilds = await realpath(buildsDir);
    if (
      path.dirname(resolvedStage) !== resolvedBuilds ||
      !path.basename(resolvedStage).startsWith(`.staging-${buildId}-`)
    )
      throw new Error("Refusing to remove an unexpected staging path");
    await rm(resolvedStage, { recursive: true, force: true });
  }
  // Resource URLs are immutable; the final manifest rename is the only activation step.
  const temporaryManifest = path.join(
    FINTECH_ROOT,
    `.manifest-${process.pid}.json`,
  );
  await writeFile(temporaryManifest, serialized);
  await rename(temporaryManifest, path.join(FINTECH_ROOT, "manifest.json"));
  console.log(
    `Validated all 11 genuine animations. Manifest: ${path.join(FINTECH_ROOT, "manifest.json")}`,
  );
}

async function overview(posters) {
  const tileWidth = 220;
  const tileHeight = 250;
  const themeWidth = tileWidth * 3;
  const heading = 46;
  const height = heading + tileHeight * 4;
  const layers = [];
  const labels = [];
  for (const [themeIndex, [theme, background, foreground]] of [
    ["Light", "#f8fafc", "#183044"],
    ["Dark", "#13212b", "#eaf4f7"],
  ].entries()) {
    const themeOffset = themeIndex * themeWidth;
    labels.push(
      `<rect x="${themeOffset}" width="${themeWidth}" height="${height}" fill="${background}"/><text x="${themeOffset + 16}" y="29" fill="${foreground}" font-size="19" font-family="Arial">Fintech Robot · ${theme}</text>`,
    );
    for (const [index, [state, input]] of [...posters].entries()) {
      const left = themeOffset + (index % 3) * tileWidth + 14;
      const top = heading + Math.floor(index / 3) * tileHeight;
      layers.push({ input, left, top });
      labels.push(
        `<text x="${left}" y="${top + CELL.height + 22}" fill="${foreground}" font-size="15" font-family="Arial">${state}</text>`,
      );
    }
  }
  const backdrop = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${themeWidth * 2}" height="${height}">${labels.join("")}</svg>`,
  );
  return sharp(backdrop).composite(layers).png().toBuffer();
}

function sourceNotes(manifest, index) {
  const lines = [
    "# Fintech Robot animation sources",
    "",
    `Exported: ${index.exportedAt}`,
    ...(index.exportedAtBasis
      ? [`Export date basis: ${index.exportedAtBasis}`]
      : []),
    `Provider: ${index.origin.provider}; method: ${index.origin.exportMethod}`,
    ...(index.origin.designUrl
      ? [`Canva export design: ${index.origin.designUrl}`]
      : []),
    "",
    "User-supplied transparent Canva GIFs are retained byte-for-byte. State labels follow the user's numbered export mapping; they do not authenticate a catalog name. Unknown Canva IDs and original catalog durations are recorded as unknown, never inferred from a file name or export duration. The supplied full GIF timing is preserved.",
    "",
    `Each complete supplied GIF is decoded with disposal handling, and all its frames use one union crop and one fixed scale. No frames are removed. Each atlas row holds 12 frames in 192 × 208 cells with at least 12 px transparent padding. WebP sprites and posters are encoded losslessly. QA GIFs are previews only; playback uses the supplied GIF timings in the manifest. Duration is compared with catalog metadata where independently verified, otherwise with the imported full-file duration, with at most ${DURATION_TOLERANCE_MS} ms tolerance. This does not independently prove that an export contains one whole catalog animation cycle.`,
    "",
    "| State | Planned catalog label | Asset ID | Supplied file | Archived GIF | Frames | Verified catalog duration ms | Export duration ms | SHA-256 |",
    "| --- | --- | --- | --- | --- | ---: | ---: | ---: | --- |",
  ];
  for (const [state, spec] of Object.entries(manifest.states))
    lines.push(
      `| ${state} | ${spec.source.name} | ${spec.source.assetId ?? "unknown"} | ${spec.source.originalFile ?? "not recorded"} | ${spec.source.file} | ${spec.frameCount} | ${spec.source.originalDurationMs ?? "unknown"} | ${spec.source.durationMs} | ${spec.source.sha256} |`,
    );
  const required = new Set(Object.values(REQUIRED_ASSETS));
  lines.push("", "## User-selected appearances", "");
  for (const [state, spec] of Object.entries(manifest.states)) {
    if (spec.source.appearanceNote)
      lines.push(`- ${state}: ${spec.source.appearanceNote}`);
  }
  const extras = index.assets.filter((asset) => !required.has(asset.name));
  lines.push("", "## Additional archived actions", "");
  if (extras.length === 0)
    lines.push("No additional exports were supplied for this build.");
  for (const asset of extras)
    lines.push(
      `- ${asset.name} (${asset.assetId}): ${asset.file}; SHA-256 ${asset.sha256}`,
    );
  lines.push(
    "",
    "The additional actions remain in the source library and do not add research states.",
    "",
  );
  return lines.join("\n");
}
