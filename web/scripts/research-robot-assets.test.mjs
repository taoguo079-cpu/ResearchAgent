import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import sharp from "sharp";

const publicRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../public",
);
const manifest = JSON.parse(
  await readFile(path.join(publicRoot, "research-robot/manifest.json"), "utf8"),
);
const hash = (bytes) => createHash("sha256").update(bytes).digest("hex");

test("exact requested research actions and two companion actions preserve original native 60 fps vectors", async () => {
  assert.deepEqual(manifest.stages, {
    orchestrate: "thinking",
    search: "internet",
    filter: "checklist",
    read: "guidebook",
    analyze: "map",
    synthesize: "puzzle",
    critic: "critic",
  });
  const identities = {
    thinking: ["VAFNUpaBXfo", "Fintech Robot Thinking"],
    internet: ["VAFNUjNZleA", "Fintech Robot Searching the Internet"],
    checklist: ["VAFNUlsKKYo", "Fintech Robot Marking Its Checklist"],
    guidebook: ["VAFNUvnLNr4", "Fintech Robot Reading a Guidebook"],
    map: ["VAFNUhurvKk", "Confused Fintech Robot Looking at a Map"],
    puzzle: ["VAFNUlqiXpg", "Fintech Robot Completing a Puzzle"],
    critic: ["VAFNUkD_bjo", "Fintech Robot Giving a Rating"],
    completed: ["VAFNUqlPqbg", "Fintech Robot Relaxing"],
    flying: ["VAFNUgXwLyQ", "Fintech Robot Flying"],
    failed: ["VAFNUiv4TVw", "Fintech Robot with Error"],
  };
  assert.deepEqual(
    Object.keys(manifest.assets).sort(),
    Object.keys(identities).sort(),
  );
  assert.equal(new Set(Object.values(manifest.stages)).size, 7);
  const seenSources = new Set();
  for (const [action, spec] of Object.entries(manifest.assets)) {
    assert.deepEqual(
      [spec.assetId, spec.catalogName],
      identities[action],
      `${action}: exact independently verified catalog identity`,
    );
    const bytes = await readFile(path.join(publicRoot, spec.src.slice(1)));
    const data = JSON.parse(bytes.toString());
    assert.equal(
      hash(bytes),
      spec.sha256,
      `${action}: preserve original source bytes`,
    );
    assert.equal(data.fr, 60, `${action}: native authored frame rate`);
    assert.equal(spec.fps, data.fr);
    assert.equal(data.op - data.ip, spec.frames);
    assert.equal(spec.frames / 60, spec.duration);
    assert.equal(
      spec.frames,
      action === "flying"
        ? 365
        : action === "thinking" || action === "failed"
          ? 300
          : 360,
      `${action}: complete native cycle without truncating or duplicating frames`,
    );
    assert.equal(data.w, 1080);
    assert.equal(data.h, 1080);
    assert.ok(
      data.assets.every((asset) => !asset.p),
      `${action}: vector shapes without raster frames or external media`,
    );
    assert.ok(data.layers.length > 0);
    assert.match(
      spec.sourceUrl,
      new RegExp(
        `^https://video-public\\.canva\\.com/${spec.assetId}/v/[a-f0-9]+\\.json$`,
      ),
    );
    assert.ok(
      !seenSources.has(spec.sha256),
      `${action}: genuine distinct source`,
    );
    seenSources.add(spec.sha256);
    const poster = await readFile(
      path.join(publicRoot, spec.posterSrc.slice(1)),
    );
    assert.equal(hash(poster), spec.posterSha256);
    const metadata = await sharp(poster).metadata();
    assert.equal(metadata.format, "webp");
    assert.equal(
      metadata.hasAlpha,
      true,
      `${action}: transparent theme-safe poster`,
    );
    assert.equal(metadata.height, 900);
    assert.equal(metadata.width, spec.posterWidth);
    assert.ok(spec.crop.width > 0 && spec.crop.height > 0);
  }
});
