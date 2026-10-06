---
name: ResearchAgent workspace extension
description: Factual handoff for the remaining pages within the existing entry design.
colors:
  page: "#ffffff"
  ink: "#2a245e"
  accent: "#1f80ff"
  mint: "#d5eee5"
  workspace-action: "#146be0"
  workspace-action-hover: "#0f5fd0"
  workspace-action-active: "#0b51b9"
  dark-page: "#1f1f1f"
  dark-action: "#ffce47"
  dark-mint: "#203931"
  dark-ink: "#e7e4ff"
rounded:
  control: "10px"
  panel: "16px"
spacing:
  small: "8px"
  field: "16px"
  section: "24px"
  large: "32px"
---

# ResearchAgent frontend handoff

## Overview

This work extends the established homepage, research menu, and new-research page into history, settings, task execution, report, papers, evidence, replay, and the missing-page state. It preserves their white canvas, purple type, blue actions, mint surfaces, rounded controls, and existing robot artwork. This is a record of the implemented extension, not a replacement identity or a product brief.

The incumbent references are `components/entry/entry.module.css`, `components/research/research-entry.module.css`, and `styles/entry.css`. Shared workspace values live in `styles/tokens.css`; page-specific composition lives in CSS modules. Existing entry overrides retain their original values.

The `/workspace` menu brings the homepage's Research Agent title and original “Data is power” vector lettering into the research entry. `components/entry/research-menu-page.module.css` pairs the title and short localized tagline with direct research/history actions and an 800px idle robot at the desktop acceptance size. AGENT uses the original Data blue, `#58b7ff`. The original pixel Data and thin-serif is power artwork sits above the buttons; its visible lettering is optically aligned to compensate for the different SVG whitespace. The lower workflow strip and the two explanatory paragraphs were removed at the user's request. Settings has a visible header label. The welcome route and entry transitions continue to lead into this menu. Menu controls use the accessible blue action shade `#146be0`.

The final menu revision passed one existing component test, two focused entry browser tests, TypeScript, translation parity, and scoped ESLint. The remaining-workspace desktop browser test also passed during this review cycle. The old fixed 500 × 95 menu-lettering assertions were updated to check reachable, non-overlapping controls against the new layout. [The frontend audit](FRONTEND_AUDIT.md) records the whole-frontend review and remaining improvements; its findings do not imply a full accessibility certification.

## Colors

White surfaces and purple text carry the light theme. Mint highlights the active task, current stage, settings model section, and history empty state. Blue remains the global accent and focus color.

Workspace primary actions use the darker action shade from the existing blue palette so white button labels meet a contrast ratio of at least 4.5:1. `WorkspacePage`, `ResearchShell`, and the missing-page root scope this action/hover/active mapping through semantic properties; it does not replace the entry-page accent. The existing dark theme retains charcoal surfaces and yellow actions, with dark mint surfaces and pale purple workspace ink.

## Typography

`styles/entry.css` supplies the existing local Cormorant Garamond, Quicksand, and Silkscreen fonts. History and settings titles reuse the entry serif treatment; Chinese history titles use the rounded fallback treatment. Quicksand appears in the task brand, stage headings, replay headings, and recovery states. Body and report text use the shared Geist/Inter stack with PingFang SC, Microsoft YaHei, and system fallbacks.

Body text defaults to 14px with a 1.5 line height. History rows use 18px titles and 13px summaries; longer text wraps, with list summaries limited to two lines. Settings titles are 48px. Report and evidence content retain their semantic headings, citation links, and readable line spacing.

## Layout

Desktop acceptance is **1366 × 768**, as specified in the root `AGENTS.md`. Mobile page matching, mobile calibration, and mobile screenshot acceptance are outside this request. Existing responsive safeguards are retained.

History and settings share `WorkspacePage`: a full-width top navigation with back-to-menu, history, settings, theme, and language controls, followed by a centered 1120px content region. Settings uses a model column and a preferences column. Its preference save/reset row stays in normal document flow, allowing translated content and validation messages to expand safely.

`ResearchShell` uses a 222px task sidebar, flexible central region, and 310px context panel (48px when collapsed). The center owns its scroll region; the follow-up composer sits below it as a non-shrinking footer. Report, papers, replay, and task modules adapt to their available container width. The report table of contents and central paper detail use side-by-side placement only when the report container reaches 920px; otherwise they remain in normal content flow.

## Elevation & Depth

Workspace depth primarily comes from surface tones and borders. Floating controls and dialogs share `--shadow-float`; light mode uses `0 12px 32px rgb(23 23 23 / 12%)`, and dark mode uses the corresponding black shadow at 40% opacity. State transitions use the shared 150ms/180ms motion values. Reduced-motion preferences remove nonessential animation and transitions.

## Shapes

Panels use gently rounded 16px corners. Fields generally use 8–12px corners; primary page actions and selected utility controls use pill shapes. History is a divided list rather than a grid of raised cards. Settings sections use a thin purple outline, with mint reserved for the model section.

## Components

- **Navigation:** `components/shell/workspace-page.tsx` and `research-shell.tsx` provide the two page compositions. Active links have an explicit current-page state; keyboard focus remains visible.
- **History:** `components/history/history.module.css` styles query, status filter, sort, localized date metadata, and row actions. Rename/delete dialogs keep failures visible, prevent duplicate pending requests, and close after success. Loading, no-match, empty, and retry states remain distinct.
- **Settings:** `components/settings/settings-page.module.css` styles independent DeepSeek-key and preference forms. Preference validation requires 3–15 papers and at least one source. The companion preview uses the native Relaxing poster from `public/research-robot/manifest.json`.
- **Live task:** `components/research/workspace-task.module.css` styles stages, current-stage summary, plan, conversation, composer, connection warning, and recovery states. `TaskEventsProvider` and `TaskCancellationProvider` remain shared at the shell; visual changes preserve one task event stream and shared cancellation behavior.
- **Report and papers:** `components/report/report-view.module.css`, `report-document.module.css`, and `components/papers/papers.module.css` cover tabs, document reading, citations, paper filtering, and paper detail.
- **Evidence and replay:** `components/evidence/evidence.module.css` and `components/replay/replay.module.css` style selected citation evidence, linked paper details, playback controls, stage selection, events, and event inspection. Pending evidence is distinguished from unsupported historical evidence.
- **Missing page:** `components/shell/not-found.module.css` reuses the established title, action, and robot language.

Existing entry `BrandRobot` uses `public/brand-robot/manifest.json`, which records the Canva source and animation metadata. The research hero and companion share the verified native vector assets in `public/research-robot/manifest.json`. The 22 old companion source/QA GIF files have been removed; historical atlases and build tools are inactive. `pet:build`, `pet:validate`, and `pet:test-assets` target the native asset pipeline.

## Task hero and Zen mode

The live research center uses a large stage robot beside two initially closed native disclosure panels: the current stage and research plan. The progress indicator lives in the fixed follow-up footer. The follow-up form is initially collapsed; its lower-right arrow opens it and moves focus to the question field. Collapsing or entering Zen preserves the draft, pending request, conversation and task subscription.

The header's Zen button expands the animation across the canvas. Only the stage progress, robot and exit control remain visible. Escape and the exit control restore the existing sidebar/context settings and return focus to the Zen button. Zen is scoped to the current task and is not persisted; the global companion, including its settings launcher, is hidden and paused during Zen.

`components/research/research-stage-robot.tsx` maps planning to **Fintech Robot Thinking**, search to **Fintech Robot Searching the Internet**, filtering to **Fintech Robot Marking Its Checklist**, reading to **Fintech Robot Reading a Guidebook**, and analysis to **Confused Fintech Robot Looking at a Map**. Synthesis keeps Fintech Robot Completing a Puzzle and review keeps Fintech Robot Giving a Rating. Sources, original frame counts, hashes, full-animation crop bounds and mappings are recorded in `public/research-robot/manifest.json` and `README.md`.

`components/robot/native-robot-animation.tsx` is shared by the hero and companion. The companion has only two actions: Relaxing while stationary and Flying while grabbed, dragged, or moving after release. Flying preserves its complete 365-frame cycle at native **60fps**. `features/pet/pet-physics.ts` reuses the main homepage's Rapier body setup, release velocity, gravity, collision and sleep rules through `features/welcome/rigid-toy-physics.ts` and `toy-physics.ts`. A released companion falls, rebounds against viewport boundaries and returns to Relaxing after settling. Hidden/Zen companions stop their physics loop; system reduced motion keeps dragging but skips inertial flight after release.

The player verifies source frame rate, frame count and dimensions before display, pauses hidden/offscreen animation, and shows a transparent high-resolution poster for reduced-motion/static preferences or failed loading. Source metadata is 60fps; actual display cadence depends on the browser and device.

Desktop acceptance remains 1366 × 768. The targeted scenario is `e2e/research-focus.spec.ts`, using a mocked running task to check default folding, live filtering-to-reading advancement, retained draft, Zen exit/focus, reduced-motion fallback, no page errors, and one task event stream. Chinese and English collapsed/expanded captures were inspected; the hero uses the available center height so opening the follow-up does not clip the robot. `scripts/research-robot-assets.test.mjs` verifies native metadata and checksums for every stage asset.

This task revision passed that one browser scenario, one strict asset validation, the nine existing shell component checks, TypeScript, translation parity and scoped ESLint. A fresh independent design review confirmed the normal, Zen and Chinese expanded layouts. The full test suite and production build were not rerun for this revision, following the user's request to keep tests minimal. These checks are separate from the earlier broad workspace validation below.

## Do's and Don'ts

- **Do** reuse semantic tokens and the existing entry fonts, robots, and navigation destinations when extending the workspace.
- **Do** preserve translated labels, pending/error states, keyboard focus, long-content wrapping, and independent form behavior.
- **Do** size secondary reading panels against the central container so the task sidebar and context panel cannot squeeze the document.
- **Don't** broaden the scoped workspace action shade into the incumbent entry overrides or treat the settings save row as an overlay.

The desktop capture workflow is `e2e/workspace-design.spec.ts`; evidence is stored in `../.impeccable/review/`, including selected evidence and expanded replay. Validation passed: 226 unit/component tests, 28 browser tests across the relevant suites, TypeScript, ESLint, translation parity, and the final production build. Changed-file Prettier checks passed; repository-wide `format:check` still reports existing unrelated warnings.

The Impeccable context and detector launchers were each attempted once and returned `cache_directory_failed`; those tools were unavailable. A fresh independent review identified overlap, an opaque dark-theme preview, pending-versus-legacy evidence copy, and primary-label contrast issues. Its final ship verdict confirmed all four fixes as resolved, with no observed regressions from that fix batch. This verdict is scoped to those four findings and the supplemental selected-evidence and expanded-replay captures.
