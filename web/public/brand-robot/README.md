# Three-page vector robot animations

The entry pages use the original **1080 × 1080, 60 fps Lottie** assets loaded by the user's [Canva design](https://www.canva.com/design/DAHWvvAA1Ik/edit). These files contain native vector shapes and animation keyframes with no external image dependencies. They replace the earlier 30 fps MP4 player.

| Page     | Asset                | Canva asset ID | Complete cycle | Frames |
| -------- | -------------------- | -------------- | -------------- | ------ |
| Welcome  | `search.lottie.json` | `VAFNUvfhgpg`  | 5 s            | 300    |
| Menu     | `idle.lottie.json`   | `VAFNUvR4cu8`  | 6 s            | 360    |
| Question | `filter.lottie.json` | `VAFNUlsKKYo`  | 6 s            | 360    |

Each state's `animation` record in `manifest.json` contains the original source URL, asset ID, checksum, dimensions, frame rate and cycle length. `BrandRobot` dynamically loads the local animation and `lottie-web`, renders SVG, and enables subframes so vector poses update on each browser animation frame. Original cycles loop in the vector renderer without restarting a media decoder.

The existing fixed union crop is passed to the SVG renderer as its `viewBox`. The placement and question-page mirror preserve the illustration geometry. The poster is hidden once the transparent SVG is ready, preventing a second static robot from showing behind the moving one. Hidden pages pause; system reduced motion and user reduced/static settings show the poster without loading the player. Failed loads, mismatched frame metadata and renderer errors return to the poster. Cleanup aborts pending data loads and destroys only that illustration's renderer.

Run `node web/scripts/build-entry-robot-assets.mjs --vectors-only` from the repository root to validate/register the original local Lottie files while preserving crop geometry and posters. The files total 176,960 bytes before compression. No Canva or other external request is needed at runtime.

The earlier 30 fps MP4s and `source/canva-export.mp4` remain as archived source material for the crop and lossless posters. They are not requested by the entry-page player. Their export was prepared in a separate [robot export design](https://www.canva.com/design/DAHXCDy2YTM/edit).

Run `node web/scripts/build-entry-robot-assets.mjs` to rebuild the archived MP4 crops, posters and manifest. The script validates the original 60 fps vectors as well as the archived 30 fps export; these are distinct sources. It inspects every exported video frame for a fixed union crop and keeps a small antialiasing margin. Each lossless WebP poster comes from the corresponding MP4's first frame.

These decorative poses remain independent of research runtime state; the small floating pet continues using its separate transparent assets.

`data-word.svg`, `research-word.svg`, and `search-drawing.svg` contain isolated decorative artwork from the supplied SVG designs. Fixed lettering is served separately from `../design-text`; page controls and form fields remain HTML.
