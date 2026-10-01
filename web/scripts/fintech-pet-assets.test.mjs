import test from "node:test";
import assert from "node:assert/strict";
import { mkdir, mkdtemp, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import sharp from "sharp";

import {
  CELL,
  COLUMNS,
  DURATION_TOLERANCE_MS,
  PADDING,
  REQUIRED_ASSETS,
  encodeAtlas,
  equalVisibleRgba,
  fitBounds,
  frameBounds,
  generatedFilePath,
  inspectSource,
  mergeBounds,
  renderCell,
  sha256,
  sourceFilePath,
  validateGeneratedAction,
  validateSourceIndex,
  validateTiming,
} from "./fintech-pet-assets.mjs";

function rgba(width, height, x, y) {
  const data = Buffer.alloc(width * height * 4);
  data.set([20, 120, 150, 255], (y * width + x) * 4);
  return data;
}

function index() {
  return {
    schemaVersion: 1,
    origin: { provider: "Canva", exportMethod: "transparent GIF" },
    exportedAt: "2026-10-01T10:00:00Z",
    // Metadata-only fixtures exercise validation; they are never written as sources.
    assets: Object.entries(REQUIRED_ASSETS).map(([state, name], number) => ({
      name,
      assetId: `test-id-${number}`,
      file: `source/${state}.gif`,
      sha256: number.toString(16).padStart(64, "0"),
      originalDurationMs: 5000,
    })),
  };
}

test("a single union crop preserves different frame positions", () => {
  const first = frameBounds(rgba(10, 10, 2, 3), 10, 10);
  const second = frameBounds(rgba(10, 10, 7, 6), 10, 10);
  assert.deepEqual(mergeBounds([first, second]), {
    left: 2,
    top: 3,
    width: 6,
    height: 4,
  });
  assert.throws(
    () => mergeBounds([frameBounds(Buffer.alloc(400), 10, 10)]),
    /entirely transparent/,
  );
});

test("fixed fitting keeps wide, tall and square props within the safety border", () => {
  for (const [width, height] of [
    [1000, 200],
    [200, 1000],
    [700, 700],
  ]) {
    const fit = fitBounds({ width, height });
    assert.ok(fit.left >= PADDING && fit.top >= PADDING);
    assert.ok(fit.left + fit.width <= CELL.width - PADDING);
    assert.ok(fit.top + fit.height <= CELL.height - PADDING);
    assert.ok(Math.abs(fit.width / fit.height / (width / height) - 1) < 0.02);
  }
});

test("GIF delays are copied without dropping irregular frame durations", () => {
  assert.deepEqual(validateTiming([30, 120, 70], 3, "test"), [30, 120, 70]);
  assert.throws(() => validateTiming([30, 0, 70], 3, "test"), /positive/);
  assert.throws(() => validateTiming([30, 70], 3, "test"), /every frame/);
});

test("source index requires all eleven independent actions and authentic metadata fields", () => {
  assert.equal(validateSourceIndex(index()).assets.length, 11);
  const missing = index();
  missing.assets = missing.assets.slice(0, 2);
  assert.throws(
    () => validateSourceIndex(missing),
    /search: Fintech Robot Doing Research/,
  );
  const duplicate = index();
  duplicate.assets[1].assetId = duplicate.assets[0].assetId;
  assert.throws(() => validateSourceIndex(duplicate), /duplicate asset ID/);
  const pending = index();
  pending.assets[0].sha256 = null;
  assert.throws(() => validateSourceIndex(pending), /original GIF SHA-256/);
});

test("source and output paths cannot escape their resource directory", () => {
  assert.throws(
    () => sourceFilePath("D:/test", "source/../../pet.gif"),
    /Source path/,
  );
  assert.throws(() => sourceFilePath("D:/test", "D:/other.gif"), /Source path/);
  assert.throws(
    () =>
      generatedFilePath(
        "D:/test",
        "/pets/fintech-robot/../research-bot/a.webp",
      ),
    /Unsafe/,
  );
  assert.throws(
    () => generatedFilePath("D:/test", "/pets/research-bot/a.webp"),
    /Invalid/,
  );
});

test("supplied numbered exports allow explicitly unknown catalog metadata without inventing IDs", () => {
  const supplied = index();
  for (const [i, asset] of supplied.assets.entries()) {
    asset.assetId = null;
    asset.originalDurationMs = null;
    asset.originalFile = `${i + 2}.gif`;
    asset.attributionStatus = "user-supplied-export";
    asset.exportDurationMs = 6000;
  }
  assert.equal(validateSourceIndex(supplied).assets.length, 11);
  supplied.assets[0].attributionStatus = undefined;
  assert.throws(() => validateSourceIndex(supplied), /actual Canva asset ID/);
});

test("lossless comparison ignores invisible RGB but requires identical visible pixels and alpha", () => {
  assert.ok(
    equalVisibleRgba(
      Buffer.from([255, 255, 255, 0, 1, 2, 3, 255]),
      Buffer.from([0, 0, 0, 0, 1, 2, 3, 255]),
    ),
  );
  assert.equal(
    equalVisibleRgba(Buffer.from([1, 2, 3, 128]), Buffer.from([1, 2, 3, 129])),
    false,
  );
  assert.equal(
    equalVisibleRgba(Buffer.from([1, 2, 3, 255]), Buffer.from([1, 4, 3, 255])),
    false,
  );
});

test("Sharp lossless WebP preserves semitransparent antialiased edge pixels", async () => {
  // A geometric encoding fixture, unrelated to robot artwork and never written to disk.
  const png = await sharp(
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32"><circle cx="15.4" cy="16.7" r="10.2" fill="#11b1b7" fill-opacity=".7"/></svg>',
    ),
  )
    .png()
    .toBuffer();
  const original = await sharp(png).ensureAlpha().raw().toBuffer();
  const webp = await sharp(png).webp({ lossless: true }).toBuffer();
  const decoded = await sharp(webp).ensureAlpha().raw().toBuffer();
  assert.ok(equalVisibleRgba(original, decoded));
  assert.ok(
    original.some(
      (value, index) => index % 4 === 3 && value > 0 && value < 255,
    ),
  );
});

test("real GIF decoding retains irregular durations and movement across a second atlas row", async () => {
  const directory = await mkdtemp(
    path.join(os.tmpdir(), "fintech-assets-test-"),
  );
  try {
    await mkdir(path.join(directory, "source"));
    const width = 24;
    const height = 24;
    const delays = Array.from(
      { length: 13 },
      (_, frame) => [30, 70, 110, 40][frame % 4],
    );
    const inputs = [];
    for (let frame = 0; frame < delays.length; frame += 1) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><rect x="${3 + (frame % 9)}" y="${3 + Math.floor(frame / 3)}" width="5" height="5" fill="#10b5bc"/></svg>`;
      inputs.push(await sharp(Buffer.from(svg)).png().toBuffer());
    }
    // Test-only moving geometry, never a Canva source or production character.
    const gif = await sharp({
      create: {
        width,
        height: height * delays.length,
        pageHeight: height,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      },
    })
      .composite(
        inputs.map((input, frame) => ({ input, left: 0, top: frame * height })),
      )
      .gif({ delay: delays, loop: 0, dither: 0 })
      .toBuffer();
    await writeFile(path.join(directory, "source", "test-geometry.gif"), gif);
    const asset = {
      name: "TEST ONLY moving geometry",
      assetId: "test-only-fixture",
      file: "source/test-geometry.gif",
      sha256: sha256(gif),
      originalDurationMs: delays.reduce((sum, delay) => sum + delay, 0),
    };
    const source = await inspectSource(directory, asset);
    assert.deepEqual(source.delays, delays);
    assert.equal(source.pages, 13);
    assert.deepEqual(source.crop, { left: 3, top: 3, width: 13, height: 9 });
    const frames = [];
    for (let frame = 0; frame < source.pages; frame += 1)
      frames.push(await renderCell(source, frame));
    const atlas = await encodeAtlas(frames);
    const poster = await sharp(frames[6]).webp({ lossless: true }).toBuffer();
    await writeFile(path.join(directory, "atlas.webp"), atlas);
    await writeFile(path.join(directory, "poster.webp"), poster);
    const spec = {
      src: "atlas.webp",
      posterSrc: "poster.webp",
      columns: COLUMNS,
      rows: 2,
      frameCount: 13,
      frameDurationsMs: delays,
      loop: true,
      posterFrame: 6,
      sha256: sha256(atlas),
      posterSha256: sha256(poster),
      source: {
        ...asset,
        crop: source.crop,
        fit: source.fit,
        durationMs: source.durationMs,
        durationToleranceMs: DURATION_TOLERANCE_MS,
      },
    };
    await validateGeneratedAction("test-geometry", spec, source, (file) =>
      path.join(directory, file),
    );
    await assert.rejects(
      () =>
        validateGeneratedAction(
          "test-geometry",
          { ...spec, frameDurationsMs: delays.map(() => 40) },
          source,
          (file) => path.join(directory, file),
        ),
      /frame durations changed/,
    );
    await assert.rejects(
      () =>
        inspectSource(directory, {
          ...asset,
          originalDurationMs: asset.originalDurationMs + 1000,
        }),
      /complete clip/,
    );
  } finally {
    const resolvedDirectory = await realpath(directory);
    const resolvedTemp = await realpath(os.tmpdir());
    assert.equal(path.dirname(resolvedDirectory), resolvedTemp);
    assert.ok(
      path.basename(resolvedDirectory).startsWith("fintech-assets-test-"),
    );
    await rm(resolvedDirectory, { recursive: true, force: true });
  }
});
