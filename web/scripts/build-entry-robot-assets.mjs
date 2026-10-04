import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ffmpeg from "ffmpeg-static";
import ffprobe from "ffprobe-static";
import sharp from "sharp";

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const output = path.join(webRoot, "public/brand-robot");
const source = path.join(output, "source/canva-export.mp4");
const sourceBytes = await readFile(source);
const sourceSha256 = createHash("sha256").update(sourceBytes).digest("hex");
const legacy = JSON.parse(
  await readFile(
    path.join(webRoot, "public/pets/fintech-robot/manifest.json"),
    "utf8",
  ),
);

function run(executable, args, maxBuffer = 10 * 1024 * 1024) {
  const result = spawnSync(executable, args, { maxBuffer, windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.toString());
  return result;
}

function inspect(file) {
  const { streams } = JSON.parse(
    run(ffprobe.path, [
      "-v",
      "error",
      "-show_streams",
      "-of",
      "json",
      file,
    ]).stdout.toString(),
  );
  const video = streams.find((stream) => stream.codec_type === "video");
  const [numerator, denominator] = video.avg_frame_rate.split("/").map(Number);
  return {
    width: video.width,
    height: video.height,
    fps: numerator / denominator,
    duration: Number(video.duration),
    frames: Number(video.nb_frames),
  };
}

const original = inspect(source);
if (
  original.width !== 1080 ||
  original.height !== 1080 ||
  original.fps !== 30 ||
  original.frames !== 510
) {
  throw new Error(
    "Expected the verified 1080 × 1080, 30 fps, 17 second three-page Canva export.",
  );
}

const actions = [
  {
    action: "search",
    start: 0,
    duration: 5,
    assetId: "VAFNUvfhgpg",
    background: "#f9fcfc",
  },
  {
    action: "idle",
    start: 5,
    duration: 6,
    assetId: "VAFNUvR4cu8",
    background: "#ffffff",
  },
  {
    action: "filter",
    start: 11,
    duration: 6,
    assetId: "VAFNUlsKKYo",
    background: "#ffffff",
  },
];
const animationSources = {
  search: "https://video-public.canva.com/VAFNUvfhgpg/v/228c55771d.json",
  idle: "https://video-public.canva.com/VAFNUvR4cu8/v/7588ef7f55.json",
  filter: "https://video-public.canva.com/VAFNUlsKKYo/v/9d94422403.json",
};

async function animationMetadata(action, duration) {
  const bytes = await readFile(path.join(output, `${action}.lottie.json`));
  const data = JSON.parse(bytes.toString());
  if (
    data.fr !== 60 ||
    data.op - data.ip !== duration * 60 ||
    data.w !== 1080 ||
    data.h !== 1080 ||
    data.assets.some((asset) => asset.p)
  )
    throw new Error(
      `Expected the complete original 60 fps vector animation: ${action}`,
    );
  return {
    src: `/brand-robot/${action}.lottie.json`,
    fps: data.fr,
    frames: data.op - data.ip,
    duration,
    width: data.w,
    height: data.h,
    assetId: actions.find((state) => state.action === action).assetId,
    sourceUrl: animationSources[action],
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

// Register vectors without re-encoding the archived MP4s or altering the crop/posters.
if (process.argv.includes("--vectors-only")) {
  const manifestFile = path.join(output, "manifest.json");
  const current = JSON.parse(await readFile(manifestFile, "utf8"));
  for (const { action, duration } of actions) {
    current.states[action].animation = await animationMetadata(
      action,
      duration,
    );
    console.log(`${action}: registered original 60 fps vector animation`);
  }
  await writeFile(manifestFile, JSON.stringify(current, null, 2) + "\n");
  process.exit(0);
}
const states = {};
await mkdir(output, { recursive: true });

for (const { action, start, duration, assetId, background } of actions) {
  const animation = await animationMetadata(action, duration);
  // Inspect every original frame. A fixed union crop prevents motion-dependent resizing.
  // RGB detection includes isolated yellow antennae and hands, unlike black-bar cropdetect.
  const previewSize = 540;
  const preview = run(
    ffmpeg,
    [
      "-v",
      "error",
      "-ss",
      String(start),
      "-i",
      source,
      "-t",
      String(duration),
      "-vf",
      `scale=${previewSize}:${previewSize}`,
      "-an",
      "-f",
      "rawvideo",
      "-pix_fmt",
      "rgb24",
      "pipe:1",
    ],
    200 * 1024 * 1024,
  ).stdout;
  let minX = previewSize,
    minY = previewSize,
    maxX = -1,
    maxY = -1;
  for (let offset = 0; offset < preview.length; offset += 3) {
    if (
      Math.min(preview[offset], preview[offset + 1], preview[offset + 2]) >= 220
    )
      continue;
    const pixel = (offset / 3) % (previewSize * previewSize);
    const x = pixel % previewSize,
      y = Math.floor(pixel / previewSize);
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  if (maxX < 0) throw new Error(`Cannot identify robot bounds: ${action}`);
  const x1 = minX * 2,
    y1 = minY * 2,
    x2 = maxX * 2 + 1,
    y2 = maxY * 2 + 1;
  const bounds = { left: x1, top: y1, width: x2 - x1 + 1, height: y2 - y1 + 1 };
  // Keep soft antialiasing outside the detection threshold; H.264 requires even dimensions.
  const left = Math.max(0, Math.floor((x1 - 8) / 2) * 2);
  const top = Math.max(0, Math.floor((y1 - 8) / 2) * 2);
  const right = Math.min(original.width, Math.ceil((x2 + 9) / 2) * 2);
  const bottom = Math.min(original.height, Math.ceil((y2 + 9) / 2) * 2);
  const crop = { left, top, width: right - left, height: bottom - top };
  const file = path.join(output, `${action}.mp4`);
  run(ffmpeg, [
    "-v",
    "error",
    "-ss",
    String(start),
    "-i",
    source,
    "-t",
    String(duration),
    "-vf",
    `crop=${crop.width}:${crop.height}:${left}:${top}`,
    "-an",
    "-c:v",
    "libx264",
    "-preset",
    "slow",
    "-crf",
    "14",
    "-pix_fmt",
    "yuv420p",
    "-color_range",
    "tv",
    "-colorspace",
    "bt709",
    "-color_trc",
    "bt709",
    "-color_primaries",
    "bt709",
    "-g",
    "30",
    "-sc_threshold",
    "0",
    "-movflags",
    "+faststart",
    "-y",
    file,
  ]);
  const metadata = inspect(file);
  if (
    metadata.frames !== duration * 30 ||
    metadata.fps !== 30 ||
    metadata.duration !== duration
  ) {
    throw new Error(`Animation frames or timing changed: ${action}`);
  }
  const poster = run(ffmpeg, [
    "-v",
    "error",
    "-i",
    file,
    "-frames:v",
    "1",
    "-f",
    "image2pipe",
    "-vcodec",
    "png",
    "pipe:1",
  ]).stdout;
  const posterFile = path.join(output, `${action}-poster.webp`);
  await sharp(poster).webp({ lossless: true }).toFile(posterFile);
  const fit = legacy.states[action].source.fit;
  states[action] = {
    animation,
    src: `/brand-robot/${action}.mp4`,
    posterSrc: `/brand-robot/${action}-poster.webp`,
    ...metadata,
    background,
    crop,
    // Preserve the previous illustration geometry while retaining native video pixels.
    placement: {
      left:
        ((fit.left - ((bounds.left - left) * fit.width) / bounds.width) /
          legacy.cell.width) *
        100,
      top:
        ((fit.top - ((bounds.top - top) * fit.height) / bounds.height) /
          legacy.cell.height) *
        100,
      width:
        ((fit.width * crop.width) / bounds.width / legacy.cell.width) * 100,
      height:
        ((fit.height * crop.height) / bounds.height / legacy.cell.height) * 100,
    },
    sha256: createHash("sha256")
      .update(await readFile(file))
      .digest("hex"),
    posterSha256: createHash("sha256")
      .update(await readFile(posterFile))
      .digest("hex"),
    source: { assetId, start, duration, bounds },
  };
  console.log(
    `${action}: ${metadata.frames} frames at ${metadata.fps} fps, ${metadata.width} × ${metadata.height}`,
  );
}

await writeFile(
  path.join(output, "manifest.json"),
  JSON.stringify(
    {
      canvas: legacy.cell,
      source: {
        file: "source/canva-export.mp4",
        sha256: sourceSha256,
        originalDesignId: "DAHWvvAA1Ik",
        exportDesignId: "DAHXCDy2YTM",
        exportedAt: "2026-10-04",
        ...original,
      },
      states,
    },
    null,
    2,
  ) + "\n",
);
