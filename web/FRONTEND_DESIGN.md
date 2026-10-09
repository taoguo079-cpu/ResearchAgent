---
name: ResearchAgent Swiss frontend
description: Handoff for the shipped Swiss International Typographic Style frontend.
colors:
  paper: "#FAF9F4"
  ink: "#000000"
  accent: "#DA291C"
rounded:
  control: "0px"
  panel: "0px"
grid:
  columns: 12
  margin: "48px"
  gutter: "24px"
acceptance:
  width: 1366
  height: 768
---

# ResearchAgent Swiss frontend handoff

## Shipped system

The current Next.js frontend implements the user-approved Swiss International Typographic Style. The release branch is `轻量化前端`. This document replaces the earlier white/purple/blue/mint workspace-extension handoff; that visual system, its dark theme and its animated robot presentation are retired.

The active design sources are [the root design system](../DESIGN.md), [the product brief](../PRODUCT.md) and [the frontend surface record](../.impeccable/surfaces/frontend.md). Semantic tokens live in `styles/tokens.css`; local Inter and Chinese fonts are declared in `app/globals.css`; page compositions use CSS modules. [The final validation record and tracked screenshots](../docs/frontend-swiss/README.md) provide the release evidence.

The three entry routes remain the welcome page (`/`), workspace menu (`/workspace`) and question composer (`/research/new`), with their existing locale routes. NEXT stores tab-scoped welcome completion and opens the menu; subsequent visits in the same tab skip the welcome page. Entry navigation dispatches immediately while retaining duplicate-click protection and timeout recovery.

## Palette, type and controls

Only black `#000000`, cream paper `#FAF9F4` and signal red `#DA291C` are used. The theme is fixed to paper even when the browser prefers dark mode or old theme preferences remain in storage. Red communicates primary actions, active states, errors, citations and focus; text and functional icons also identify each state.

Inter Regular (400) and Bold (700) are self-hosted in `public/fonts/inter/`. Chinese uses the user-selected Source Han Sans CN, packaged as WOFF2 under the derivative family name Research Agent Han in `public/fonts/source-han-sans/`. Both families retain their source records and SIL Open Font Licenses. PingFang SC, Microsoft YaHei and sans-serif remain fallbacks. No runtime external font request is required. All text is left aligned, with an uneven right edge.

| Type role                                   | Desktop size  |
| ------------------------------------------- | ------------- |
| Two-line welcome brand                      | 144px, bold   |
| Welcome right-column description            | 20px, regular |
| Menu, composer, history and settings titles | 96px, bold    |
| Research stage, report and Zen titles       | 64px, bold    |
| Body and question input                     | 14px, regular |
| Labels, dates, counts and numbered metadata | 12px, regular |

Controls have square corners and flat fills. Sections use 1px structural rules; keyboard focus uses a visible red outline. There are no shadows, gradients, textures or decorative illustrations. Loading feedback uses paper-and-rule placeholders and status text. Disabled controls retain readable ink instead of faded text. Functional SVG icons communicate actions and states.

Robot artwork, old vector lettering, opening animation and the floating companion are not mounted or requested by the active pages. Legacy theme/pet preferences do not alter presentation; saved research defaults remain compatible. Inactive legacy asset tools are not a requirement for running or validating the shipped frontend.

## Desktop composition

Desktop acceptance is **1366 × 768**, with 48px outside margins, 24px gutters and twelve equal columns. Nested layouts use CSS subgrid to inherit the same alignment. Mobile visual matching and mobile screenshot acceptance are outside this release's approved scope; existing smaller-screen safeguards remain implementation fallbacks.

| Surface             | Composition and retained behavior                                                                                                                                                        |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Welcome             | Two-line Research Agent spans columns 1–9; supporting copy spans 10–12; NEXT remains at the lower left.                                                                                  |
| Menu                | Description spans 1–3; ruled navigation rows span 5–12. Visible indexes 01–03 accompany New research, History and Settings; decorative indexes are hidden from accessible control names. |
| Question            | Title, native multiline input and submit occupy 1–8; guidance occupies 10–12. Examples, advanced source/paper settings, validation, IME and Ctrl/Cmd + Enter remain available.           |
| Research and report | Navigation/body/evidence use 2/7/3 columns. Closing navigation gives 9/3; closing evidence gives 2/10; closing both gives a twelve-column body.                                          |
| History             | Search, filters, sorting and ruled rows align titles, dates, statuses and rename/delete actions to inherited columns.                                                                    |
| Settings            | Section descriptions span 1–3 and fields span 5–12. Model/API configuration and research defaults are independent forms; theme and companion controls are absent.                        |

The research center owns its scroll region. The follow-up composer and numbered 01–07 stage rail remain below that region rather than obscuring report prose. Panel toggles and Zen preserve the draft, pending question, existing panel preferences and single task event subscription. Escape and the exit control leave Zen and restore keyboard focus.

The 64px report title spans the complete first header row; summary metadata and export occupy the second row. Contents and quality review are initially closed native disclosures, with partial-result status still visible. The first report paragraph remains above the persistent stage rail in the accepted English and Chinese desktop captures. Paper hover keeps authors and metadata legible on paper; replay uses a square red thumb and a black rule rather than the browser's default range styling.

## Function and compatibility

Existing API routes, schemas, task hooks, event protocol and database structure are preserved. The frontend retains:

- One active research task, input length validation, source selection and 3–15 paper settings.
- Duplicate-submission protection, stable request identity on retry, active-task conflict recovery and restoration after refresh.
- Report follow-up, citation/evidence/paper linking, export, history search/filter/sort/rename/delete, and execution replay.
- Localized labels, native disclosures, dialog focus management, visible keyboard focus and accessible control names.

A task's output language remains locked when it is created. The Chinese report acceptance capture was produced through a real Chinese demo task rather than overriding an English task's language.

## Acceptance and release evidence

The 2026-10-06 validation record includes 177 frontend unit/component tests, the existing 36 browser scenarios and one additional Chinese report-geometry scenario, plus TypeScript, ESLint, repository-wide Prettier, translation parity and production compilation. The final focused checks cover report reading, 7/9/10/12-column layouts, paper hover contrast, replay styling, follow-up, Zen/focus and SSE ownership. The independent visual disposition was `ship` after repairing the three recorded report/contrast/range findings.

The tests use an isolated offline Demo. Demo conclusions and research data in the screenshots are synthetic fixtures. Full-page history/settings images can be taller than the 768px viewport. These checks do not constitute a full WCAG certification, a mobile visual review or a real-provider/performance benchmark.

Tracked examples: [welcome](../docs/frontend-swiss/screenshots/welcome-en.png), [menu](../docs/frontend-swiss/screenshots/menu-en.png), [Chinese question](../docs/frontend-swiss/screenshots/question-zh-CN.png), [report](../docs/frontend-swiss/screenshots/report.png), [Chinese report](../docs/frontend-swiss/screenshots/report-zh.png), [both panels collapsed](../docs/frontend-swiss/screenshots/report-panels-collapsed.png), [paper hover](../docs/frontend-swiss/screenshots/papers-hover.png), and [replay inspector](../docs/frontend-swiss/screenshots/replay-inspector.png). The validation record indexes all final captures.

[The frontend audit](FRONTEND_AUDIT.md) separates the current Swiss evidence from the archived 2026-10-05 review of the retired visual system.
