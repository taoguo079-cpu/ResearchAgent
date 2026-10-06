import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const webRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const output = path.join(webRoot, "public/research-robot");
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
// Original URLs observed in saved Canva source designs, never guessed from GIF hashes.
const sources = {
  thinking: {
    id: "VAFNUpaBXfo",
    name: "Fintech Robot Thinking",
    url: "https://video-public.canva.com/VAFNUpaBXfo/v/8aaa588ba7.json",
  },
  internet: {
    id: "VAFNUjNZleA",
    name: "Fintech Robot Searching the Internet",
    url: "https://video-public.canva.com/VAFNUjNZleA/v/ba0ab58d9c.json",
  },
  checklist: {
    local: "brand-robot/filter.lottie.json",
    id: "VAFNUlsKKYo",
    name: "Fintech Robot Marking Its Checklist",
    url: "https://video-public.canva.com/VAFNUlsKKYo/v/9d94422403.json",
  },
  guidebook: {
    id: "VAFNUvnLNr4",
    name: "Fintech Robot Reading a Guidebook",
    url: "https://video-public.canva.com/VAFNUvnLNr4/v/f4d4ccae02.json",
  },
  map: {
    id: "VAFNUhurvKk",
    name: "Confused Fintech Robot Looking at a Map",
    url: "https://video-public.canva.com/VAFNUhurvKk/v/5d72fe1c6f.json",
  },
  puzzle: {
    id: "VAFNUlqiXpg",
    name: "Fintech Robot Completing a Puzzle",
    url: "https://video-public.canva.com/VAFNUlqiXpg/v/7bdc9895ca.json",
  },
  critic: {
    id: "VAFNUkD_bjo",
    name: "Fintech Robot Giving a Rating",
    url: "https://video-public.canva.com/VAFNUkD_bjo/v/8dd068f92a.json",
  },
  completed: {
    id: "VAFNUqlPqbg",
    name: "Fintech Robot Relaxing",
    url: "https://video-public.canva.com/VAFNUqlPqbg/v/49745dce15.json",
  },
  flying: {
    id: "VAFNUgXwLyQ",
    name: "Fintech Robot Flying",
    url: "https://video-public.canva.com/VAFNUgXwLyQ/v/21ffaf3189.json",
  },
  failed: {
    id: "VAFNUiv4TVw",
    name: "Fintech Robot with Error",
    url: "https://video-public.canva.com/VAFNUiv4TVw/v/9662a94ba5.json",
  },
};
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  headless: true,
  ...(process.platform === "win32"
    ? {
        executablePath:
          process.env.PLAYWRIGHT_CHROME_PATH ??
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
      }
    : {}),
});
const page = await browser.newPage();
const player = await readFile(
  path.join(webRoot, "node_modules/lottie-web/build/player/lottie.js"),
  "utf8",
);
const assets = {};
try {
  for (const [action, source] of Object.entries(sources)) {
    const destination = path.join(output, `${action}.lottie.json`);
    let bytes;
    if (source.local)
      bytes = await readFile(path.join(webRoot, "public", source.local));
    else {
      try {
        bytes = await readFile(destination);
      } catch {
        const response = await fetch(source.url);
        if (!response.ok)
          throw new Error(
            `${action}: source fetch failed (${response.status})`,
          );
        bytes = Buffer.from(await response.arrayBuffer());
        await writeFile(destination, bytes);
      }
    }
    const data = JSON.parse(bytes.toString());
    if (
      data.fr !== 60 ||
      data.w !== 1080 ||
      data.h !== 1080 ||
      data.op <= data.ip ||
      data.assets.some((asset) => asset.p)
    )
      throw new Error(
        `${action}: expected original standalone 1080px native60fps vectors`,
      );
    await page.setContent(
      '<div id="robot" style="width:1080px;height:1080px"></div>',
    );
    await page.addScriptTag({ content: player });
    const rendered = await page.evaluate(async (animationData) => {
      const animation = window.lottie.loadAnimation({
        container: document.querySelector("#robot"),
        renderer: "svg",
        animationData,
        autoplay: false,
        loop: false,
      });
      if (!animation.isLoaded)
        await new Promise((resolve) =>
          animation.addEventListener("DOMLoaded", resolve),
        );
      const svg = document.querySelector("#robot > svg");
      let left = Infinity,
        top = Infinity,
        right = -Infinity,
        bottom = -Infinity;
      // Inspect every native frame; no interpolated raster frames enter production.
      for (let frame = 0; frame < animation.totalFrames; frame++) {
        animation.goToAndStop(frame, true);
        const bounds = svg.getBBox();
        left = Math.min(left, bounds.x);
        top = Math.min(top, bounds.y);
        right = Math.max(right, bounds.x + bounds.width);
        bottom = Math.max(bottom, bounds.y + bounds.height);
      }
      const crop = {
        left: Math.floor(left) - 6,
        top: Math.floor(top) - 6,
        width: Math.ceil(right) - Math.floor(left) + 12,
        height: Math.ceil(bottom) - Math.floor(top) + 12,
      };
      animation.goToAndStop(Math.floor(animation.totalFrames / 2), true);
      svg.setAttribute(
        "viewBox",
        `${crop.left} ${crop.top} ${crop.width} ${crop.height}`,
      );
      svg.setAttribute("width", String(crop.width));
      svg.setAttribute("height", String(crop.height));
      return { crop, svg: svg.outerHTML };
    }, data);
    const poster = await sharp(Buffer.from(rendered.svg))
      .resize({ height: 900 })
      .webp({ lossless: true })
      .toBuffer();
    const posterMetadata = await sharp(poster).metadata();
    await writeFile(path.join(output, `${action}-poster.webp`), poster);
    assets[action] = {
      src: source.local
        ? `/${source.local}`
        : `/research-robot/${action}.lottie.json`,
      posterSrc: `/research-robot/${action}-poster.webp`,
      fps: data.fr,
      frames: data.op - data.ip,
      duration: (data.op - data.ip) / data.fr,
      width: data.w,
      height: data.h,
      crop: rendered.crop,
      posterWidth: posterMetadata.width,
      posterHeight: posterMetadata.height,
      assetId: source.id,
      catalogName: source.name,
      sourceUrl: source.url,
      sha256: sha256(bytes),
      posterSha256: sha256(poster),
    };
    console.log(
      `${action}: original ${data.fr}fps / ${data.op - data.ip}frames / ${assets[action].duration}s`,
    );
  }
  await writeFile(
    path.join(output, "manifest.json"),
    JSON.stringify(
      {
        schemaVersion: 1,
        sourceDesignId: "DAHWvvAA1Ik",
        sourceDesignIds: ["DAHWvvAA1Ik", "DAHXKMM-7bU"],
        renderer: "lottie-svg",
        stages: {
          orchestrate: "thinking",
          search: "internet",
          filter: "checklist",
          read: "guidebook",
          analyze: "map",
          synthesize: "puzzle",
          critic: "critic",
        },
        assets,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
}
