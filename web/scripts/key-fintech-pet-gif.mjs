import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

// Deterministic colour-key conversion for the user's pink-background exports.
// It keeps the original canvas, every frame, and centisecond frame durations.
const [source, destination] = process.argv.slice(2);
if (!source || !destination) {
  throw new Error(
    "Usage: node scripts/key-fintech-pet-gif.mjs <input.gif> <output-directory>",
  );
}
sharp.cache(false);
sharp.concurrency(2);
await mkdir(destination, { recursive: true });
const input = await readFile(source);
const metadata = await sharp(input, { animated: true }).metadata();
if (metadata.format !== "gif" || !metadata.pages || metadata.pages < 2) {
  throw new Error("An animated GIF is required.");
}
const width = metadata.width;
const height = metadata.pageHeight;
const frameBytes = width * height * 4;
const { data: animation } = await sharp(input, { animated: true })
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
const samples = [
  0,
  Math.floor(metadata.pages / 4),
  Math.floor(metadata.pages / 2),
  metadata.pages - 1,
];
let transparentPixels = 0;
let partialPixels = 0;
let foregroundPixels = 0;
const backgroundColors = [];
const bounds = { left: width, top: height, right: -1, bottom: -1 };

function opaqueRobot(r, g, b) {
  return (
    (r <= 90 && g >= 155 && b >= 135) ||
    (r <= 62 && g <= 65 && b <= 115) ||
    (r >= 170 && g >= 155 && b <= 70)
  );
}

for (let frame = 0; frame < metadata.pages; frame++) {
  const start = frame * frameBytes;
  const original = Buffer.from(animation.subarray(start, start + frameBytes));
  const out = animation.subarray(start, start + frameBytes);
  const background = [0, 0, 0];
  let count = 0;
  for (const y of [0, 1, height - 2, height - 1]) {
    for (let x = 0; x < width; x += 3) {
      const i = (y * width + x) * 4;
      for (let channel = 0; channel < 3; channel++)
        background[channel] += original[i + channel];
      count++;
    }
  }
  for (let channel = 0; channel < 3; channel++) background[channel] /= count;
  if (!(background[0] > 220 && background[1] < 140 && background[2] > 150)) {
    throw new Error(
      `Frame ${frame} does not have the expected flat pink background.`,
    );
  }
  backgroundColors.push(background.map(Math.round));
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const pixel = [original[i], original[i + 1], original[i + 2]];
      const distance = pixel.reduce(
        (sum, value, channel) => sum + (value - background[channel]) ** 2,
        0,
      );
      if (distance < 22 ** 2 || original[i + 3] === 0) {
        out.fill(0, i, i + 4);
        transparentPixels++;
        continue;
      }
      if (!opaqueRobot(...pixel)) {
        // Recover coverage from P = alpha * foreground + (1-alpha) * background.
        // Nearby opaque character pixels provide the foreground colour, so edges
        // are unmatted instead of retaining pink against dark/light themes.
        let best = null;
        for (let dy = -6; dy <= 6; dy++) {
          const yy = y + dy;
          if (yy < 0 || yy >= height) continue;
          for (let dx = -6; dx <= 6; dx++) {
            const xx = x + dx;
            if (xx < 0 || xx >= width) continue;
            const j = (yy * width + xx) * 4;
            const candidate = [original[j], original[j + 1], original[j + 2]];
            if (!opaqueRobot(...candidate)) continue;
            const vector = candidate.map(
              (value, channel) => value - background[channel],
            );
            const denominator = vector.reduce(
              (sum, value) => sum + value * value,
              0,
            );
            const alpha = Math.max(
              0,
              Math.min(
                1,
                vector.reduce(
                  (sum, value, channel) =>
                    sum + value * (pixel[channel] - background[channel]),
                  0,
                ) / denominator,
              ),
            );
            const error =
              pixel.reduce(
                (sum, value, channel) =>
                  sum +
                  (value - (background[channel] + alpha * vector[channel])) **
                    2,
                0,
              ) +
              0.15 * (dx * dx + dy * dy);
            if (!best || error < best.error) best = { alpha, error };
          }
        }
        if (!best)
          throw new Error(
            `Unclassified colour at frame ${frame}, (${x}, ${y}).`,
          );
        const alpha = Math.round(best.alpha * 255);
        if (alpha < 20) {
          out.fill(0, i, i + 4);
          transparentPixels++;
          continue;
        }
        out[i + 3] = alpha;
        for (let channel = 0; channel < 3; channel++) {
          out[i + channel] = Math.max(
            0,
            Math.min(
              255,
              Math.round(
                (pixel[channel] - (1 - alpha / 255) * background[channel]) /
                  (alpha / 255),
              ),
            ),
          );
        }
        if (alpha < 255) partialPixels++;
      }
      foregroundPixels++;
      bounds.left = Math.min(bounds.left, x);
      bounds.right = Math.max(bounds.right, x);
      bounds.top = Math.min(bounds.top, y);
      bounds.bottom = Math.max(bounds.bottom, y);
    }
  }
  if (samples.includes(frame)) {
    await sharp(out, { raw: { width, height, channels: 4 } })
      .png()
      .toFile(
        path.join(destination, `frame-${String(frame).padStart(3, "0")}.png`),
      );
  }
  if (frame % 30 === 0)
    console.log(`Keyed ${frame + 1}/${metadata.pages} frames`);
}
const raw = {
  width,
  height: height * metadata.pages,
  channels: 4,
  pageHeight: height,
};
const options = { delay: metadata.delay, loop: metadata.loop ?? 0 };
const webpFile = path.join(destination, "idle-transparent.webp");
const gifFile = path.join(destination, "idle-transparent.gif");
await sharp(animation, { raw })
  .webp({ ...options, lossless: true, effort: 4 })
  .toFile(webpFile);
await sharp(animation, { raw })
  .gif({ ...options, keepDuplicateFrames: true, dither: 0, effort: 7 })
  .toFile(gifFile);
const outputs = [];
for (const file of [gifFile, webpFile]) {
  const encoded = await readFile(file);
  const output = await sharp(encoded, { animated: true }).metadata();
  if (
    output.pages !== metadata.pages ||
    JSON.stringify(output.delay) !== JSON.stringify(metadata.delay) ||
    output.loop !== metadata.loop
  ) {
    throw new Error(`Frame/timing/loop mismatch: ${file}`);
  }
  // Verify the encoded alpha, not just an encoder's metadata flag.
  for (const frame of samples) {
    const decoded = await sharp(encoded, { page: frame, pages: 1 })
      .ensureAlpha()
      .raw()
      .toBuffer();
    const expected = animation.subarray(
      frame * frameBytes,
      (frame + 1) * frameBytes,
    );
    for (let i = 0; i < decoded.length; i += 4) {
      if (expected[i + 3] === 0 && decoded[i + 3] !== 0)
        throw new Error(`Opaque background in ${file}, frame ${frame}`);
      if (file === webpFile && decoded[i + 3] !== expected[i + 3])
        throw new Error(`Alpha changed in ${file}, frame ${frame}`);
    }
  }
  outputs.push({
    file: path.basename(file),
    sha256: createHash("sha256").update(encoded).digest("hex"),
    bytes: encoded.length,
    pages: output.pages,
    durationMs: output.delay.reduce((a, b) => a + b, 0),
  });
}

const crop = {
  left: Math.max(0, bounds.left - 12),
  top: Math.max(0, bounds.top - 12),
  width: bounds.right - bounds.left + 25,
  height: bounds.bottom - bounds.top + 25,
};
const tiles = [];
for (const frame of samples) {
  const original = animation.subarray(
    frame * frameBytes,
    (frame + 1) * frameBytes,
  );
  const tile = await sharp(original, { raw: { width, height, channels: 4 } })
    .extract(crop)
    .resize(256, 256, { fit: "contain", background: "#00000000" })
    .png()
    .toBuffer();
  tiles.push(tile);
}
await sharp({
  create: { width: 1024, height: 512, channels: 4, background: "#ffffff" },
})
  .composite([
    {
      input: {
        create: {
          width: 1024,
          height: 256,
          channels: 4,
          background: "#172235",
        },
      },
      top: 256,
      left: 0,
    },
    ...tiles.flatMap((input, i) => [
      { input, left: i * 256, top: 0 },
      { input, left: i * 256, top: 256 },
    ]),
  ])
  .png()
  .toFile(path.join(destination, "idle-light-dark-preview.png"));
const report = {
  source: path.resolve(source),
  sourceSha256: createHash("sha256").update(input).digest("hex"),
  method:
    "Pink colour key with local foreground alpha reconstruction; no redraw or resampling in time",
  width,
  height,
  frames: metadata.pages,
  frameDurationsMs: metadata.delay,
  durationMs: metadata.delay.reduce((a, b) => a + b, 0),
  loop: metadata.loop,
  backgroundColors: [...new Set(backgroundColors.map(JSON.stringify))].map(
    JSON.parse,
  ),
  transparentPixels,
  partialPixels,
  foregroundPixels,
  unionBounds: bounds,
  outputs,
  verified:
    "All output frame counts, individual delays, loop settings; transparent backgrounds on four sampled decoded frames; WebP sampled alpha exact",
};
await writeFile(
  path.join(destination, "processing-report.json"),
  JSON.stringify(report, null, 2) + "\n",
);
console.log(
  JSON.stringify(
    { frames: report.frames, durationMs: report.durationMs, bounds, outputs },
    null,
    2,
  ),
);
