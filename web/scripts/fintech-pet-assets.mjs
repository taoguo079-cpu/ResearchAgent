import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

export const FINTECH_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public/pets/fintech-robot",
);
export const WEB_ROOT = "/pets/fintech-robot/";
export const CELL = Object.freeze({ width: 192, height: 208 });
export const COLUMNS = 12;
export const PADDING = 12;
// GIF durations use centiseconds; tolerate at most two boundary time units.
export const DURATION_TOLERANCE_MS = 20;
export const REQUIRED_ASSETS = Object.freeze({
  idle: "Fintech Robot Waving",
  orchestrate: "Fintech Robot Looking for a Location",
  search: "Fintech Robot Doing Research",
  filter: "Fintech Robot Marking Its Checklist",
  read: "Fintech Robot Looking Through Its Phone Contacts",
  analyze: "Fintech Robot Thinking",
  synthesize: "Fintech Robot Completing a Puzzle",
  critic: "Fintech Robot Giving a Rating",
  dragging: "Fintech Robot Flying",
  completed: "Fintech Robot Raising Its Hands",
  failed: "Fintech Robot with Error",
});
export const LIBRARY_NAMES = new Set([
  ...Object.values(REQUIRED_ASSETS),
  "Confused Fintech Robot Looking at a Map",
  "Fintech Robot Holding a Welcome Sign",
  "Fintech Robot Juggling Balls",
  "Fintech Robot Running",
  "Fintech Robot with a Hammer",
  "Fintech Robot Relaxing",
  "Fintech Robot Searching the Internet",
  "Fintech Robot in Confusion",
  "Fintech Robot Hitting the Target",
  "Fintech Robot with a Shopping Cart",
  "Fintech Robot with Award",
  "Relaxed Fintech Robot",
]);

export function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function equalVisibleRgba(left, right) {
  if (left.length !== right.length) return false;
  for (let index = 0; index < left.length; index += 4) {
    if (left[index + 3] !== right[index + 3]) return false;
    if (left[index + 3] === 0) continue;
    if (
      left[index] !== right[index] ||
      left[index + 1] !== right[index + 1] ||
      left[index + 2] !== right[index + 2]
    )
      return false;
  }
  return true;
}

export function sourceFilePath(root, file) {
  assert(
    typeof file === "string" &&
      /^source\/[A-Za-z0-9][A-Za-z0-9._-]*\.gif$/i.test(file),
    `Source path must be source/<filename>.gif: ${String(file)}`,
  );
  return path.join(root, ...file.split("/"));
}

export function generatedFilePath(root, src) {
  assert(
    typeof src === "string" && src.startsWith(WEB_ROOT),
    `Invalid asset URL: ${src}`,
  );
  const relative = src.slice(WEB_ROOT.length);
  assert(
    relative.length > 0 &&
      relative
        .split("/")
        .every(
          (part) =>
            /^[A-Za-z0-9._-]+$/.test(part) && part !== "." && part !== "..",
        ),
    `Unsafe asset URL: ${src}`,
  );
  return path.join(root, ...relative.split("/"));
}

export function validateSourceIndex(index) {
  assert(
    index.schemaVersion === 1,
    "source-index.json schemaVersion must be 1",
  );
  assert(index.origin?.provider === "Canva", "Source provider must be Canva");
  assert(
    index.origin?.exportMethod === "transparent GIF",
    "Export method must be transparent GIF",
  );
  assert(
    typeof index.exportedAt === "string" &&
      Number.isFinite(Date.parse(index.exportedAt)),
    "Record the actual export date in exportedAt",
  );
  assert(
    Array.isArray(index.assets),
    "source-index.json must contain an assets array",
  );
  const names = new Set();
  const ids = new Set();
  const hashes = new Set();
  const files = new Set();
  for (const asset of index.assets) {
    assert(
      LIBRARY_NAMES.has(asset.name),
      `Not a selected Fintech Robot asset: ${asset.name}`,
    );
    const suppliedExport = asset.attributionStatus === "user-supplied-export";
    assert(
      (typeof asset.assetId === "string" &&
        /^[A-Za-z0-9_-]{8,}$/.test(asset.assetId)) ||
        (suppliedExport &&
          asset.assetId === null &&
          typeof asset.originalFile === "string" &&
          /^\d+\.gif$/.test(asset.originalFile)),
      `${asset.name}: record the actual Canva asset ID or an explicitly attributed user export`,
    );
    assert(
      typeof asset.sha256 === "string" && /^[a-f0-9]{64}$/.test(asset.sha256),
      `${asset.name}: record the original GIF SHA-256`,
    );
    assert(
      (Number.isInteger(asset.originalDurationMs) &&
        asset.originalDurationMs > 0 &&
        asset.originalDurationMs <= 120000) ||
        (suppliedExport &&
          asset.originalDurationMs === null &&
          Number.isInteger(asset.exportDurationMs) &&
          asset.exportDurationMs > 0 &&
          asset.exportDurationMs <= 120000),
      `${asset.name}: record a verified Canva duration or the supplied export duration`,
    );
    sourceFilePath(FINTECH_ROOT, asset.file);
    for (const [set, value, label] of [
      [names, asset.name, "name"],
      [ids, asset.assetId, "asset ID"],
      [hashes, asset.sha256, "source hash"],
      [files, asset.file, "file"],
    ]) {
      if (label === "asset ID" && value === null) continue;
      assert(!set.has(value), `${asset.name}: duplicate ${label}`);
      set.add(value);
    }
  }
  const missing = Object.entries(REQUIRED_ASSETS).filter(
    ([, name]) => !names.has(name),
  );
  assert(
    missing.length === 0,
    `Missing required exports:\n${missing.map(([state, name]) => `  ${state}: ${name}`).join("\n")}`,
  );
  return index;
}

export function frameBounds(data, width, height) {
  assert(data.length === width * height * 4, "Expected an RGBA frame");
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;
  let transparent = false;
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha < 255) transparent = true;
      if (alpha === 0) continue;
      left = Math.min(left, x);
      top = Math.min(top, y);
      right = Math.max(right, x);
      bottom = Math.max(bottom, y);
    }
  }
  return { left, top, right, bottom, transparent, empty: right < 0 };
}

export function mergeBounds(bounds) {
  const visible = bounds.filter((value) => !value.empty);
  assert(visible.length > 0, "The animation is entirely transparent");
  const left = Math.min(...visible.map((value) => value.left));
  const top = Math.min(...visible.map((value) => value.top));
  const right = Math.max(...visible.map((value) => value.right));
  const bottom = Math.max(...visible.map((value) => value.bottom));
  return { left, top, width: right - left + 1, height: bottom - top + 1 };
}

export function fitBounds(bounds) {
  const scale = Math.min(
    (CELL.width - PADDING * 2) / bounds.width,
    (CELL.height - PADDING * 2) / bounds.height,
  );
  const width = Math.max(1, Math.round(bounds.width * scale));
  const height = Math.max(1, Math.round(bounds.height * scale));
  return {
    width,
    height,
    left: Math.floor((CELL.width - width) / 2),
    top: Math.floor((CELL.height - height) / 2),
  };
}

export function validateTiming(delays, pages, name) {
  assert(
    Array.isArray(delays) && delays.length === pages,
    `${name}: GIF must include one duration for every frame`,
  );
  assert(
    delays.every((delay) => Number.isInteger(delay) && delay > 0),
    `${name}: GIF durations must be positive milliseconds`,
  );
  return [...delays];
}

async function decodeFrame(buffer, frame) {
  return sharp(buffer, { page: frame, pages: 1 })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
}

export async function inspectSource(root, asset) {
  const buffer = await readFile(sourceFilePath(root, asset.file));
  assert(
    sha256(buffer) === asset.sha256,
    `${asset.name}: source checksum does not match source-index.json`,
  );
  const metadata = await sharp(buffer, { animated: true }).metadata();
  const pages = metadata.pages ?? 1;
  const width = metadata.width;
  const height = metadata.pageHeight ?? metadata.height;
  assert(
    metadata.format === "gif",
    `${asset.name}: source must be a GIF export`,
  );
  assert(
    pages >= 2 && pages <= 600,
    `${asset.name}: expected a complete animation with 2–600 frames`,
  );
  assert(
    Number.isInteger(width) &&
      Number.isInteger(height) &&
      width > 0 &&
      height > 0 &&
      width <= 4096 &&
      height <= 4096,
    `${asset.name}: unsupported GIF canvas dimensions`,
  );
  const delays = validateTiming(metadata.delay, pages, asset.name);
  const durationMs = delays.reduce((sum, delay) => sum + delay, 0);
  assert(
    Math.abs(
      durationMs - (asset.originalDurationMs ?? asset.exportDurationMs),
    ) <= DURATION_TOLERANCE_MS,
    `${asset.name}: exported duration ${durationMs} ms differs from original Canva duration or recorded export duration ${asset.originalDurationMs ?? asset.exportDurationMs} ms by more than ${DURATION_TOLERANCE_MS} ms; export the complete clip`,
  );
  const bounds = [];
  const frameHashes = new Set();
  for (let frame = 0; frame < pages; frame += 1) {
    const decoded = await decodeFrame(buffer, frame);
    assert(
      decoded.info.width === width && decoded.info.height === height,
      `${asset.name}/${frame}: frame dimensions changed`,
    );
    const frameBox = frameBounds(decoded.data, width, height);
    assert(
      frameBox.transparent,
      `${asset.name}/${frame}: opaque background; export with transparency enabled`,
    );
    if (!frameBox.empty) {
      assert(
        frameBox.left > 0 &&
          frameBox.top > 0 &&
          frameBox.right < width - 1 &&
          frameBox.bottom < height - 1,
        `${asset.name}/${frame}: artwork touches the source edge; export with more space around the entire robot and its props`,
      );
    }
    bounds.push(frameBox);
    frameHashes.add(sha256(decoded.data));
  }
  assert(frameHashes.size >= 2, `${asset.name}: frames do not animate`);
  const crop = mergeBounds(bounds);
  return {
    asset,
    buffer,
    pages,
    width,
    height,
    delays,
    durationMs,
    crop,
    fit: fitBounds(crop),
    uniqueFrames: frameHashes.size,
  };
}

export async function readSources(root = FINTECH_ROOT) {
  let index;
  try {
    index = validateSourceIndex(
      JSON.parse(await readFile(path.join(root, "source-index.json"), "utf8")),
    );
  } catch (error) {
    if (error.code === "ENOENT") {
      throw new Error(
        `Original Canva exports are not available. Add a completed source-index.json under ${root}. Missing required originals:\n${Object.entries(
          REQUIRED_ASSETS,
        )
          .map(([state, name]) => `  source/${state}.gif — ${name}`)
          .join("\n")}\nSee README.md; the existing pet remains unchanged.`,
      );
    }
    throw error;
  }
  const sources = new Map();
  for (const asset of index.assets) {
    try {
      sources.set(asset.name, await inspectSource(root, asset));
    } catch (error) {
      if (error.code === "ENOENT")
        throw new Error(
          `Missing original export: ${asset.file} (${asset.name}). The existing pet remains unchanged.`,
        );
      throw error;
    }
  }
  return { index, sources };
}

export async function renderCell(source, frame) {
  const cropped = await sharp(source.buffer, { page: frame, pages: 1 })
    .ensureAlpha()
    .extract(source.crop)
    .resize(source.fit.width, source.fit.height, {
      fit: "fill",
      kernel: "lanczos3",
    })
    .png()
    .toBuffer();
  return sharp({
    create: {
      ...CELL,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: cropped, left: source.fit.left, top: source.fit.top }])
    .png()
    .toBuffer();
}

export async function encodeAtlas(frames) {
  assert(frames.length > 0, "Cannot encode an empty atlas");
  const width = COLUMNS * CELL.width;
  const height = Math.ceil(frames.length / COLUMNS) * CELL.height;
  const pixels = Buffer.alloc(width * height * 4);
  for (let frame = 0; frame < frames.length; frame += 1) {
    const cell = await sharp(frames[frame])
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    assert(
      cell.info.width === CELL.width && cell.info.height === CELL.height,
      "Unexpected atlas cell dimensions",
    );
    const left = (frame % COLUMNS) * CELL.width;
    const top = Math.floor(frame / COLUMNS) * CELL.height;
    for (let row = 0; row < CELL.height; row += 1) {
      const start = row * CELL.width * 4;
      cell.data.copy(
        pixels,
        ((top + row) * width + left) * 4,
        start,
        start + CELL.width * 4,
      );
    }
  }
  // Copy final RGBA cells instead of compositing their antialiased alpha a second time.
  return sharp(pixels, { raw: { width, height, channels: 4 } })
    .webp({ lossless: true, effort: 6 })
    .toBuffer();
}

export async function validateGeneratedManifest(
  manifest,
  resolveAsset,
  sourceData,
) {
  assert(
    manifest.schemaVersion === 2 && manifest.id === "fintech-robot",
    "Expected the Fintech Robot v2 manifest",
  );
  assert(
    manifest.cell?.width === CELL.width &&
      manifest.cell?.height === CELL.height,
    "Unexpected pet cell size",
  );
  assert(
    Object.keys(manifest.states ?? {}).length ===
      Object.keys(REQUIRED_ASSETS).length,
    "Manifest must include exactly the 11 existing states",
  );
  const seenAtlases = new Set();
  const seenHashes = new Set();
  for (const [state, name] of Object.entries(REQUIRED_ASSETS)) {
    const spec = manifest.states[state];
    const source = sourceData.sources.get(name);
    assert(spec && source, `${state}: state or source missing`);
    assert(!seenAtlases.has(spec.src), `${state}: duplicate atlas`);
    seenAtlases.add(spec.src);
    assert(spec.source?.name === name, `${state}: source name mismatch`);
    const atlasHash = await validateGeneratedAction(
      state,
      spec,
      source,
      resolveAsset,
    );
    assert(
      !seenHashes.has(atlasHash),
      `${state}: atlas duplicates another action`,
    );
    seenHashes.add(atlasHash);
  }
  assert(
    manifest.previewSrc === manifest.states.idle.posterSrc,
    "Preview must use the new idle poster",
  );
  await readFile(resolveAsset(manifest.qa.overviewSrc));
  await readFile(resolveAsset(manifest.qa.sourcesSrc));
}

export async function validateGeneratedAction(
  state,
  spec,
  source,
  resolveAsset,
) {
  assert(
    spec.columns === COLUMNS &&
      spec.rows === Math.ceil(source.pages / COLUMNS) &&
      spec.frameCount === source.pages,
    `${state}: grid or frame count does not match original GIF`,
  );
  assert(
    JSON.stringify(spec.frameDurationsMs) === JSON.stringify(source.delays),
    `${state}: GIF frame durations changed`,
  );
  assert(
    spec.posterFrame === Math.floor(source.pages / 2),
    `${state}: static frame must be the middle frame`,
  );
  assert(
    state === "completed"
      ? spec.loop === false && spec.repeat === 2
      : spec.loop === true && spec.repeat === undefined,
    `${state}: playback behavior changed`,
  );
  assert(
    spec.source?.name === source.asset.name &&
      spec.source.assetId === source.asset.assetId &&
      spec.source.file === source.asset.file &&
      spec.source.sha256 === source.asset.sha256 &&
      spec.source.originalDurationMs === source.asset.originalDurationMs &&
      spec.source.exportDurationMs === source.asset.exportDurationMs &&
      spec.source.originalFile === source.asset.originalFile &&
      spec.source.attributionStatus === source.asset.attributionStatus,
    `${state}: source attribution mismatch`,
  );
  assert(
    spec.source.durationMs === source.durationMs &&
      spec.source.durationToleranceMs === DURATION_TOLERANCE_MS,
    `${state}: source duration mismatch`,
  );
  assert(
    JSON.stringify(spec.source.crop) === JSON.stringify(source.crop) &&
      JSON.stringify(spec.source.fit) === JSON.stringify(source.fit),
    `${state}: fixed animation crop/scale mismatch`,
  );
  const atlasBuffer = await readFile(resolveAsset(spec.src));
  const posterBuffer = await readFile(resolveAsset(spec.posterSrc));
  const atlasHash = sha256(atlasBuffer);
  assert(
    atlasHash === spec.sha256 && sha256(posterBuffer) === spec.posterSha256,
    `${state}: generated checksum mismatch`,
  );
  const atlas = await sharp(atlasBuffer)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  assert(
    atlas.info.width === COLUMNS * CELL.width &&
      atlas.info.height === spec.rows * CELL.height,
    `${state}: atlas dimensions are invalid`,
  );
  const metadata = await sharp(atlasBuffer).metadata();
  assert(
    metadata.format === "webp" &&
      metadata.hasAlpha &&
      (metadata.pages ?? 1) === 1,
    `${state}: atlas must be a static transparent WebP sprite sheet`,
  );
  for (let frame = 0; frame < spec.rows * COLUMNS; frame += 1) {
    const cell = await sharp(atlasBuffer)
      .extract({
        left: (frame % COLUMNS) * CELL.width,
        top: Math.floor(frame / COLUMNS) * CELL.height,
        ...CELL,
      })
      .ensureAlpha()
      .raw()
      .toBuffer();
    const bounds = frameBounds(cell, CELL.width, CELL.height);
    if (frame >= spec.frameCount) {
      assert(bounds.empty, `${state}/${frame}: unused cell is not transparent`);
      continue;
    }
    if (!bounds.empty)
      assert(
        bounds.left >= PADDING &&
          bounds.top >= PADDING &&
          bounds.right < CELL.width - PADDING &&
          bounds.bottom < CELL.height - PADDING,
        `${state}/${frame}: artwork crosses the safety padding`,
      );
    const expected = await sharp(await renderCell(source, frame))
      .ensureAlpha()
      .raw()
      .toBuffer();
    assert(
      equalVisibleRgba(expected, cell),
      `${state}/${frame}: sprite differs from the corresponding original GIF frame`,
    );
    if (frame === spec.posterFrame) {
      const poster = await sharp(posterBuffer)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      assert(
        poster.info.width === CELL.width &&
          poster.info.height === CELL.height &&
          equalVisibleRgba(poster.data, cell),
        `${state}: poster must match the middle animation frame`,
      );
    }
  }
  return atlasHash;
}
