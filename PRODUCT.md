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
