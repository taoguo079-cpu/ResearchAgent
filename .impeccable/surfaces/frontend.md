# Frontend replacement

Modes: Operate (workspace, form, history, settings), Read (report), with a typographic brand entry. Audience and product truth inherit PRODUCT.md. Target: web/app, related targets web/components and web/styles.

Report refinement, 2026-10-09: Report contents replace the task rail with an always-open vertical list. Opening tasks covers that list in place; closing or Escape restores directory scroll and focus. Papers and Run details restore normal task navigation. Task-scoped report navigation resets on entry and refresh without changing saved live-workspace preferences. The shared task header omits its query subtitle and ID, and locked language controls are hidden. Desktop acceptance remains 1366 × 768.

Report reading refinement, 2026-10-09: Center the 75ch prose block horizontally inside its reading area while keeping all prose left aligned. Hide the seven-stage rail across the report page; normal mode retains follow-up. Report Zen displays only Report/Papers tabs, the active report or paper list/detail, and an exit control. Hide surrounding tools, side regions, run details and conversation. Restore the normal tab, scroll and draft on exit; retain the selected paper. Live-research Zen keeps stage progress and transitions into report reading when results arrive, without reconnecting the task stream.

## Direction contract

THESIS: A research workspace whose hierarchy is explicit through typography, alignment and numbered stages.
OWN-WORLD: Black, cream and signal red, local Inter for Latin and Source Han Sans CN (Research Agent Han web derivative) for Chinese, regular/bold only, square controls, 1 px rules, no shadow, image ornament, texture or gradient.
STORY: Enter the menu, ask a precise question, inspect the live stages, verify the report's sources and ask a follow-up.
FIRST VIEWPORT: 1366 × 768, 48 px outside margins, 24 px gutters, 12 columns. Brand title 144 px spans 1–9; the welcome description in 10–12 uses 20 px regular type with 1.55 leading. Composer spans 1–8 with tips at 10–12. Workspace navigation/body/evidence spans 2/7/3, expanding by whole columns when panels close.
FORM: User-pinned Swiss Style and user-approved implementation plan of 2026-10-06, not a randomized direction. The context launcher failed; existing repository context was read directly. Signature interaction is a numbered seven-stage rail that updates without remounting the research stream. Navigation is immediate and state transitions use short color changes; reduced motion is respected.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Acceptance record — 2026-10-06

Implemented from `前端重构`, originally on `codex/swiss-style-frontend` and renamed to `轻量化前端` for the user-requested publication on 2026-10-07. Final desktop captures are published in `docs/frontend-swiss/screenshots`; they include bilingual entry, report, history and settings, and the 7/9/10/12-column workspace states. English and Chinese report prose appears above the persistent stage rail at 1366 × 768. Report navigation and detailed quality review use native disclosures; partial-result status remains visible.

Independent finish review disposition: `ship`. The three scored findings—report geometry, paper/replay contrast and the replay range palette—are resolved. Functional checks are separate: 177 unit tests, the existing 36 browser scenarios plus a Chinese report geometry scenario, typecheck, ESLint, format, i18n parity and production compilation passed. No backend/API/database changes. Mobile visual matching remains outside the approved scope.

The generated root `DESIGN.md` and `.impeccable/design.json` record the implemented system. No page imagery was generated; local Inter files retain the official SIL license and provenance.

## Typography selection — 2026-10-09

The user selected A (Source Han Sans CN) and 20 px right-column home copy after reviewing three real-font candidates. Chinese uses self-hosted regular/bold WOFF2, renamed Research Agent Han under the OFL reserved-name rule. The original character coverage and glyph designs are preserved. Latin Inter, 144 px brand lettering, existing compact UI sizes, routes and navigation behavior remain intact.

## Welcome wave adaptation — 2026-10-10

User-approved Canvas optimization, 2026-10-10 (supersedes the earlier SVG rendering and per-tick timing): keep the native `a-waves` Web Component, Perlin noise, existing polylines and 8px CSS transform dot. Use transparent Canvas 2D with bounded batches of eight independent polylines, drawing the complete field per native requestAnimationFrame callback; no FPS cap, skipped frames, GSAP ticker limit or distant 30fps branch. Retain 10px line spacing, 32px sampling, 0.1px coordinate rounding, endpoint rules, 1px #AAA9A3 strokes, 32/16px noise amplitudes and the full-width header/footer divider band. Keep the original cream, black right-column copy, typography, grid, content and red #DA291C NEXT. Normalize 0.1 easing and pointer speed against elapsed time; use a fractional power of the original 60Hz spring matrix (tension .005, friction .925, strength 2, limit ±100px), substeps at most 16.7ms and a 50ms elapsed-time guard. This 60Hz reference calibrates motion, not rendering frequency. Keep last movement direction while residual force decays. GSAP handles the original edge-staggered entrance through a paused timeline manually advanced by the same rAF; partial polyline arc length replaces DrawSVG. DPR backing scale is capped at 2 and reacts to resolution changes. Retain passive foreground input, reduced-motion static contours, touch exclusion, hidden/offscreen suspension and complete resource cleanup. Canvas unavailability leaves the foreground usable. No new dependencies, controls, copy, API or route changes. Desktop acceptance is 1366 × 768; source, Chrome measurements, screenshots and finish review are in docs/frontend-swiss/home-waves.md.

Historical SVG path batching, 2026-10-10: eight adjacent lines shared one path after DrawSVG entrance. This step preceded and is superseded by the Canvas optimization above; current rendering has no SVG path groups.

Homepage restoration, 2026-10-10: revert the compact redesign and preserve the previous 12-column composition and full-width divider band. The intermediate SVG version drew local groups every tick and the remaining background about 30 times per second. That rendering strategy is superseded by the Canvas optimization above; the restored layout remains.
