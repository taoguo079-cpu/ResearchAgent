# Native research and companion animations

Research heroes, Zen mode and the floating companion share original **60 fps, 1080 × 1080 Lottie SVG vectors**. The requested catalog identities were checked with the Canva connector. Their original JSON URLs were observed in saved Canva documents; GIF thumbnail hashes were never used to invent vector URLs.

| Research phase | Exact catalog action                    | Canva asset ID | Native cycle     |
| -------------- | --------------------------------------- | -------------- | ---------------- |
| Planning       | Fintech Robot Thinking                  | VAFNUpaBXfo    | 300 frames / 5 s |
| Search         | Fintech Robot Searching the Internet    | VAFNUjNZleA    | 360 frames / 6 s |
| Filter         | Fintech Robot Marking Its Checklist     | VAFNUlsKKYo    | 360 frames / 6 s |
| Read           | Fintech Robot Reading a Guidebook       | VAFNUvnLNr4    | 360 frames / 6 s |
| Analyze        | Confused Fintech Robot Looking at a Map | VAFNUhurvKk    | 360 frames / 6 s |
| Synthesize     | Fintech Robot Completing a Puzzle       | VAFNUlqiXpg    | 360 frames / 6 s |
| Critic         | Fintech Robot Giving a Rating           | VAFNUkD_bjo    | 360 frames / 6 s |

The companion has only two actions: **Fintech Robot Relaxing** (`completed`, VAFNUqlPqbg) at rest, and **Fintech Robot Flying** (`flying`, VAFNUgXwLyQ) while grabbed or moving after release. Relaxing has 360 native frames / 6 s. Flying has **365 native frames / 6.083333333333333 s**: the Canva catalog rounds this to 6 s, but the original vector cycle is preserved without truncation. These companion actions do not follow research phase transitions.

Research completion can use Relaxing, while failed/interrupted research uses Fintech Robot with Error (`failed`, VAFNUiv4TVw, 300 frames / 5 s). The extra failure pose belongs to the research hero, not the companion's two-action contract. Cancellation preserves the current research phase pose.

Sources are the user's [original design](https://www.canva.com/design/DAHWvvAA1Ik/edit) and the isolated [ResearchAgent · 60fps sources collection](https://www.canva.com/design/DAHXKMM-7bU/AonYjIvByw1AH6cruJRM-Q/edit). The collection holds Internet, Guidebook and Confused Map so acquiring their original vector URLs did not alter the original design. Every source URL, catalog identity, complete cycle, byte checksum and fixed crop appears in `manifest.json`. Checklist reuses the existing original vector in `../brand-robot`; entry-page source assets remain intact.

`node web/scripts/build-research-robot-assets.mjs` downloads observed original URLs only when local source files are absent. It rejects non-60-fps sources, raster dependencies and invalid dimensions, renders every native frame to calculate a fixed union crop, and creates lossless transparent 900 px posters from the middle vector frame. It requires the project's Playwright, Lottie and Sharp dependencies, and uses the installed Chrome path configured for browser tests on Windows. Native JSON files remain byte-for-byte source copies and must not be reformatted.

`node --test web/scripts/research-robot-assets.test.mjs` checks the exact seven phase mappings and catalog identities, companion source identities, original 60 fps/frame/duration metadata, hashes, distinct standalone vectors and high resolution transparent posters in one asset contract test.

Runtime requests use local assets. The shared player enables vector subframes and pauses when hidden, offscreen or explicitly paused. Reduced motion, user static/reduced preferences, request failures and renderer errors retain the high resolution poster. The verified 60 fps value is the source's authored rate; display cadence depends on the browser and display.
