---
name: ResearchAgent
description: A Swiss typographic research workspace with explicit hierarchy and evidence.
colors:
  primary: "#DA291C"
  ink: "#000000"
  paper: "#FAF9F4"
typography:
  display-brand:
    fontFamily: 'Inter, "Research Agent Han", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "144px"
    fontWeight: 700
    lineHeight: 0.95
    letterSpacing: "-0.04em"
  headline-page:
    fontFamily: 'Inter, "Research Agent Han", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "96px"
    fontWeight: 700
    letterSpacing: "-0.04em"
  headline-workspace:
    fontFamily: 'Inter, "Research Agent Han", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "64px"
    fontWeight: 700
    lineHeight: 1
    letterSpacing: "-0.03em"
  title-dialog:
    fontFamily: 'Inter, "Research Agent Han", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "32px"
    fontWeight: 700
  title-section:
    fontFamily: 'Inter, "Research Agent Han", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "24px"
    fontWeight: 700
    lineHeight: 1.2
  body:
    fontFamily: 'Inter, "Research Agent Han", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  body-home:
    fontFamily: 'Inter, "Research Agent Han", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "20px"
    fontWeight: 400
    lineHeight: 1.55
  body-research:
    fontFamily: 'Inter, "Research Agent Han", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.8
  body-report:
    fontFamily: 'Inter, "Research Agent Han", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.9
  control:
    fontFamily: 'Inter, "Research Agent Han", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "14px"
    fontWeight: 400
    lineHeight: 1.5
  metadata:
    fontFamily: 'Inter, "Research Agent Han", "PingFang SC", "Microsoft YaHei", sans-serif'
    fontSize: "12px"
    fontWeight: 400
    lineHeight: 1.5
rounded:
  square: "0px"
spacing:
  space-1: "4px"
  space-2: "8px"
  space-3: "12px"
  space-4: "16px"
  space-5: "20px"
  space-6: "24px"
  space-8: "32px"
  space-10: "40px"
  space-12: "48px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.paper}"
    typography: "{typography.control}"
    rounded: "{rounded.square}"
    padding: "0 12px"
    height: "36px"
  button-primary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-secondary:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.square}"
    padding: "0 12px"
    height: "36px"
  button-secondary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.control}"
    rounded: "{rounded.square}"
    padding: "0 12px"
    height: "36px"
  button-ghost-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  input:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "0 12px"
    height: "36px"
    width: "100%"
  textarea:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "10px 12px"
    width: "100%"
  navigation-link:
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "12px 0"
  status-badge:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "0 8px"
    height: "24px"
  ruled-container:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "40px 0"
  stage-item:
    textColor: "{colors.ink}"
    rounded: "{rounded.square}"
    padding: "12px 0"
  citation-marker:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.square}"
    padding: "1px 5px"
---

# Design System: ResearchAgent

## Overview

**Creative North Star: "Swiss International Typographic Style"**

ResearchAgent follows the user-approved Swiss International Typographic Style. Large type establishes the page, inherited columns align the work, and numbered rows expose order. The workspace is precise, restrained, and dense enough for research without making every region compete for attention.

The theme is fixed cream with black structure and signal red for actions, current states, errors, links, and focus. Latin text uses local Inter; Chinese text uses the user-selected Source Han Sans CN, self-hosted under the OFL-compliant derivative name Research Agent Han. Content stays left aligned. Hierarchy comes from type, whitespace, and rules rather than imagery or decorative motion.

**Key Characteristics:**

- Three pigments and two font weights.
- Left-aligned type on an inherited twelve-column grid.
- Square controls and one-pixel structural rules.
- Flat surfaces with explicit state changes.
- Numbered navigation and a seven-stage rail during live research.

This record describes the active Next.js implementation in `web/styles/tokens.css`, `web/app/globals.css`, the shared UI primitives, and the welcome, entry, research, report, shell, history, and settings components. The user-approved direction is recorded in `PRODUCT.md` and `.impeccable/surfaces/frontend.md`.

## Colors

The palette combines paper, ink, and one signal accent; semantic aliases do not create additional pigments.

### Primary

- **Signal Red** (`colors.primary`): primary actions, current or running states, errors, citations, links, and keyboard focus. Primary controls change to ink on hover and active states.

### Neutral

- **Ink Black** (`colors.ink`): text, borders, dividers, normal status indicators, and inverted control backgrounds.
- **Cream Paper** (`colors.paper`): the fixed page, surface, control, and dialog background; also text on filled controls.

### Named Rules

**The Three Pigments Rule.** Use only the frontmatter palette. Semantic status aliases resolve to black, cream, or red; do not introduce gray, pastel status fills, opacity-derived shades, or tonal ramps.

Success, warning, and information remain black on cream. Red is an additional cue for urgency or selection, while text and icons communicate the state.

## Typography

**Display Font:** Inter for Latin and Research Agent Han (Source Han Sans CN) for Chinese, with PingFang SC, Microsoft YaHei, and sans-serif fallbacks.

**Body Font:** The same stack, including report prose and code.

**Character:** Coordinated Latin and Chinese sans-serif faces give the workspace one voice. Scale, weight, line length, and whitespace distinguish brand, operation, and reading.

### Hierarchy

- **Brand display** (`display-brand`): the large welcome identity, split across two left-aligned lines.
- **Page headline** (`headline-page`): workspace menu, composer, history, and settings titles. Menu and composer use a line height of 1; history and settings use 0.95.
- **Workspace headline** (`headline-workspace`): live stage, report, and focused-reading titles.
- **Dialog title** (`title-dialog`): dialogs, recovery messages, and substantial empty states; line height is set by the component.
- **Section title** (`title-section`): settings sections, research details, and history task links.
- **Body** (`body`): UI explanations and form content. Research passages use `body-research` and a maximum line length of 65–75ch; reports use `body-report` and a maximum width of 75ch.
- **Home description** (`body-home`): welcome-page right-column explanations use 20px regular type and a 1.55 line height, selected by the user on 2026-10-09. The brand stays at 144px and compact UI text stays at 14px.
- **Control** (`control`): the compact native shared button inherits body typography. Surface CSS modules can explicitly set bold action labels.
- **Metadata** (`metadata`): labels, factual dates, counts, statuses, and numbered indexes. Numeric data uses tabular figures where present.

Report document headings retain their local semantic hierarchy from h1 through h6; they do not reuse the page headline scale inside prose. The unlayered `font: inherit` rule for native buttons, inputs, textareas, and selects takes precedence over Tailwind utility-layer font declarations. Shared native controls therefore inherit their parent's font; the recorded control role describes the body-context default. Unlayered CSS-module rules can override this inheritance. Links styled with button utilities are not subject to the native-control rule.

Inter Regular and Bold are self-hosted in `web/public/fonts/inter/`. [Font provenance](web/public/fonts/inter/README.md) records the official source and retrieval date; [SIL Open Font License](web/public/fonts/inter/LICENSE.txt) accompanies the files. No runtime external font request is made.

Chinese Regular and Bold are self-hosted as WOFF2 in `web/public/fonts/source-han-sans/`, with full original character coverage. [Chinese font provenance](web/public/fonts/source-han-sans/README.md) records the Adobe source, conversion, and renamed derivative; the accompanying [SIL Open Font License](web/public/fonts/source-han-sans/LICENSE.txt) retains the upstream license. Glyph designs remain the selected Source Han Sans. All faces use `font-display: swap`.

### Named Rules

**The Two Weights Rule.** Use regular for reading, metadata, and inherited shared controls; use bold for hierarchy and action labels explicitly styled by their surface. Both Latin and Chinese faces are bundled only at 400 and 700, and font synthesis is disabled.

## Layout

Desktop acceptance is **1366 × 768**. Page canvases use outside margins (48px), gutters (24px), and twelve equal columns. Nested content uses CSS subgrid so titles, labels, fields, numbered rows, and evidence regions share their parent lines.

The workspace occupies the viewport and divides navigation, research body, and evidence into **2 / 7 / 3 columns**. Closing navigation expands the body to **9 / 3**; closing evidence produces **2 / 10**; closing both uses all **12** columns. Focused reading hides both side regions and uses the same complete grid. The shared stream provider surrounds the layout so panel and reading-mode changes preserve the research stream.

The Report tab keeps the two-column left rail occupied by a vertical contents list. Task navigation opens over that rail without moving or resizing the research body. Papers and Run details use the ordinary collapsible task rail; returning to Report restores contents. The contents list scrolls independently and shares stable heading IDs with the document. Locked language controls and the shared task header's query subtitle and ID are omitted.

Report prose uses a horizontally centered reading block with a maximum width of 75ch; text inside remains left aligned. The stage rail is hidden throughout the report page, including Papers, Run details, loading and errors. Normal report reading retains the follow-up control. Report Zen uses the full grid and displays only Report/Papers tabs, the active reading content and Exit Zen; the title/summary/export tools, side regions, run details and conversation are hidden. Its temporary tab selection does not change the normal view. Exiting restores the normal tab, scroll position and draft; papers selected while reading remain selected. Live-research Zen continues to show stage progress and automatically switches to report reading when a result becomes available.

The grid governs recurring alignment; a surface's particular composition remains in its surface brief. Welcome, menu, and composer use full-width ruled headers. History rows and settings sections align their labels, content, metadata, and actions by inherited columns.

The spacing scale is recorded in frontmatter. Small steps organize labels and controls; larger steps separate sections and establish page breathing room. Regions scroll internally where the viewport is fixed. Long user text wraps inside regions instead of pushing neighboring columns out of alignment.

Smaller-screen fallbacks are present in source: global margins and dialogs change at max-width 1023px, entry layouts at 900px, and history/settings page layouts at 760px. The research shell retains a minimum width of 1024px. These are implementation fallbacks; mobile page matching and screenshot calibration are outside this acceptance scope.

## Elevation & Depth

The system is flat. Pages, panels, menus, and dialogs use the same paper background and no shadow. Whitespace and structural rules establish grouping. Menus and dialogs can overlap for interaction, with borders and stacking order rather than simulated lift. Dialogs use an opaque paper overlay.

### Named Rules

**The Rules Before Volume Rule.** Use alignment, whitespace, and one-pixel rules to separate regions. Surfaces have no shadow, gradient, texture, or decorative layer.

## Shapes

Controls, fields, badges, panels, and menus have square corners (`rounded.square`). Structural borders and dividers use a single stroke (1px). Focus is a separate interaction treatment: a red outline (2px), with a component-defined offset (2–5px). Active tabs use a red underline; disabled controls use dashed borders or a line-through where the source defines it.

Small SVG icons communicate action or status. Their shapes are functional symbols and do not replace the square geometry of containers.

## Components

### Buttons

Direct, left-aligned actions with square geometry.

- **Typography:** native shared buttons inherit regular body type. Welcome, composer, and other surface CSS-module rules can explicitly set bold labels.
- **Primary:** red fill with paper text; ink fill on hover or active.
- **Secondary:** paper fill, ink text, and an ink border; ink fill with paper text on hover or active.
- **Ghost:** transparent at rest; ink fill with paper text on hover.
- **Destructive:** the same red-and-paper treatment as primary, distinguished by action wording and context.
- **Sizing:** shared buttons use small (32px), medium (36px), and large (40px) heights. History and settings actions expand to 44px; welcome and composer primary actions use 56px.
- **Focus / Disabled:** visible red outline; disabled controls keep readable ink text on paper and a dashed border. Do not fade the text.

Shared color transitions use the short motion duration (120ms). Navigation dispatches immediately. Reduced motion disables the duration; no decorative movement is part of the system.

### Chips / Status Badges

Compact, square factual labels with a border, paper background, and regular metadata text. Neutral, information, success, and warning variants use ink; accent and error variants use red. Example-query chips are actual buttons: square, paper-filled, ink-bordered, and red on hover. Badges themselves are noninteractive.

### Cards / Containers

Ruled sections and rows organize content. Empty states and recovery messages use open horizontal rules, left-aligned headings, and whitespace instead of an elevated card. Source lists, history rows, and settings sections keep their different content structures while sharing the flat material.

### Inputs / Fields

Paper-filled square fields with ink text and a single border. Single-line shared inputs are compact; history and settings override them to a larger field height (44px). Textareas resize vertically. The main research composer uses a larger question field, while the follow-up composer stays compact.

Focus adds the red outline and, where defined, a red border. Carets are red; placeholders remain readable ink. Invalid fields and supporting error text use red. Disabled fields keep the same paper-and-ink appearance and communicate unavailability through behavior and text.

### Navigation

Left-aligned links use numbered indexes where order matters. Ruled rows change to red on hover; the current task is red and bold. Context and report tabs use a red active label and underline, with a visible keyboard focus outline. Language controls preserve the same compact typographic treatment.

### Seven-Stage Rail

Seven numbered stages occupy the inherited grid. Each item pairs a bold number with a functional state icon, a stage name, and metadata. Running and failed stages use red; the running stage also changes its top rule to red. Interactive items expose hover and focus states. During live research, the rail stays attached to the workspace composer while the main content scrolls. Report pages omit this rail.

### Report / Evidence Controls

The report title occupies the full first header row. Summary metadata and export occupy the second row, avoiding competition with the title. Contents use a native disclosure that starts closed. Quality review results are not displayed on the report page. Export is a square outlined control with a flat ruled menu.

Report prose remains left aligned at the recorded reading width. Citation markers are small red, underlined superscript buttons; hover inverts them to paper on red. Invalid citations retain an ink warning treatment and explanatory labeling. Activating a citation selects its evidence in the context panel.

## Do's and Don'ts

### Do:

- **Do** align text, controls, and section boundaries to inherited columns.
- **Do** use the recorded headline roles, regular reading text, and factual metadata to establish hierarchy.
- **Do** expand the research body by whole columns when navigation or evidence panels close.
- **Do** keep keyboard focus visible with the red outline and preserve readable disabled states.
- **Do** wrap long questions, task titles, citations, and CJK text within their content region.
- **Do** use SVG icons when they communicate an action or state.

### Don't:

- **Don't** add colors, tonal ramps, translucent shades, shadows, gradients, textures, or image ornament.
- **Don't** center or right-align text, round controls, or replace ruled rows with elevated cards.
- **Don't** introduce extra Inter weights, synthesized italics, or remote font loading.
- **Don't** restore theme controls, robots, floating pets, or decorative page transitions.
- **Don't** substitute inactive legacy CSS or image assets for the implemented system.
- **Don't** treat the existing smaller-screen fallbacks as mobile screenshot acceptance.
