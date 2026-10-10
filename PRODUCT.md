# ResearchAgent

## Platform

Web: Next.js / TypeScript frontend, FastAPI / LangGraph backend. This work targets the Next.js app.

## Audience and job

Researchers using a local academic workspace in Chinese or English. Ask a research question, inspect a persistent research run, read a cited synthesis, verify papers and evidence, and ask follow-up questions.

## Product truth

A single active research run per instance. Research settings select 3–15 papers and academic sources. Preserve persistent tasks, cancellation, retry/recovery, SSE replay, report export, history management, DeepSeek API configuration, and report-grounded follow-up.
The three entry routes are the welcome page, workspace menu, and research question composer. Existing locale routes and session-scoped welcome memory remain compatible.

## Approved design commitments

User-approved 2026-10-06: Swiss International Typographic Style across the entire frontend, fixed cream theme, black #000000 / cream #FAF9F4 / red #DA291C, local Inter 400 and 700, 12-column grid. All text left aligned. Remove robot, decorative animation, and floating pet presentation. Preserve old research preference storage; old theme/pet settings do not alter presentation.
Desktop acceptance is 1366 × 768. Mobile screenshot matching is excluded.

User-approved 2026-10-09: select typography option A, Source Han Sans CN for Chinese, and increase the welcome-page right-column description to 20px. Preserve local Inter for Latin, the two weights (400/700), and the existing hierarchy elsewhere. Chinese fonts are self-hosted as WOFF2 with their SIL license; the derivative family is named Research Agent Han to respect Adobe's reserved font name.

User-approved Canvas optimization, 2026-10-10 (supersedes the earlier SVG rendering and per-tick timing): keep the native `a-waves` Web Component, Perlin noise, existing polylines and 8px CSS transform dot. Use transparent Canvas 2D with bounded batches of eight independent polylines, drawing the complete field per native requestAnimationFrame callback; no FPS cap, skipped frames, GSAP ticker limit or distant 30fps branch. Retain 10px line spacing, 32px sampling, 0.1px coordinate rounding, endpoint rules, 1px #AAA9A3 strokes, 32/16px noise amplitudes and the full-width header/footer divider band. Keep the original cream, black right-column copy, typography, grid, content and red #DA291C NEXT. Normalize 0.1 easing and pointer speed against elapsed time; use a fractional power of the original 60Hz spring matrix (tension .005, friction .925, strength 2, limit ±100px), substeps at most 16.7ms and a 50ms elapsed-time guard. This 60Hz reference calibrates motion, not rendering frequency. Keep last movement direction while residual force decays. GSAP handles the original edge-staggered entrance through a paused timeline manually advanced by the same rAF; partial polyline arc length replaces DrawSVG. DPR backing scale is capped at 2 and reacts to resolution changes. Retain passive foreground input, reduced-motion static contours, touch exclusion, hidden/offscreen suspension and complete resource cleanup. Canvas unavailability leaves the foreground usable. No new dependencies, controls, copy, API or route changes. Desktop acceptance is 1366 × 768; source, Chrome measurements, screenshots and finish review are in docs/frontend-swiss/home-waves.md.

Homepage restoration, 2026-10-10: revert the compact redesign and preserve the previous 12-column composition and full-width divider band. The intermediate SVG version drew local groups every tick and the remaining background about 30 times per second. That rendering strategy is superseded by the Canvas optimization above; the restored layout remains.
