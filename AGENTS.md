# Repository Guidelines

## Project Structure & Module Organization

ResearchAgent combines a FastAPI/LangGraph backend with a Next.js/TypeScript research workspace.

- `backend/`: API routes and schemas in `api/`, research agents in `agents/`, orchestration in `services/`, academic sources in `sources/`, retrieval in `rag/`, and SQLite persistence in `db/` and `repositories/`. Backend tests live in `backend/tests/`.
- `web/`: routes in `app/`, reusable UI in `components/`, feature logic in `features/`, shared API/event utilities in `lib/`, translations in `messages/`, assets in `public/`, and browser tests in `e2e/`.
- `frontend/`: optional Streamlit client. `scripts/`: launchers and contract utilities.
- `data/`, `logs/`, and `artifacts/`: local runtime output; keep untracked.

## Build, Test, and Development Commands

Run from the repository root using PowerShell. Python 3.12 is recommended.

- Setup: `python -m venv .venv`, `.\.venv\Scripts\python.exe -m pip install -r requirements.txt`, and `npm --prefix web ci`.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start_agent.ps1`: start the API on port 8000 and UI on port 3000.
- `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start_dev.ps1`: start an isolated offline demo.
- `.\.venv\Scripts\python.exe -m pytest backend/tests -q`: run backend tests.
- `npm --prefix web run test -- --run`: run frontend unit/component tests.
- `npm --prefix web run test:e2e`: run browser tests with an automatically launched demo stack.
- `npm --prefix web run <script>`: use `typecheck` for TypeScript, `lint` for ESLint, `format:check` for Prettier, `i18n:check` for translation parity, and `build` for production compilation.

## Coding Style & Naming Conventions

Use four-space Python indentation, snake_case functions/modules, and type hints. Use two-space TypeScript indentation, camelCase functions, PascalCase components, and kebab-case filenames. Keep English and Chinese translation keys synchronized. After API schema changes, run `api:export`, `api:generate`, and `api:check` through `npm --prefix web run`; commit `web/openapi.json` and `web/lib/api/schema.d.ts`.

## Testing Guidelines

Use pytest/pytest-asyncio with `test_*.py`, colocated Vitest/Testing Library `*.test.ts(x)` files, and Playwright `e2e/*.spec.ts`. No numeric coverage threshold is configured. Cover changed behavior and failure paths; preserve temporary database isolation and mock external providers.

## Frontend Design Scope

For the current three-page frontend refactor, match and validate the desktop design at 1366 × 768. Mobile page matching, mobile-specific layout calibration, and mobile screenshot acceptance are not required unless the user explicitly requests them later. This scope takes precedence over mobile acceptance items in the design handoff document.

## Commit & Pull Request Guidelines

History mixes `feat:` prefixes with plain English/Chinese summaries. Use concise, imperative messages describing one coherent change. PRs should explain behavior changes, link relevant issues, record validation commands/results, and include screenshots for UI changes. Call out migrations or configuration changes.

## Security & Configuration

Create `.env` from `.env.example` only when absent; keep credentials private. Run real research with one backend process, without reload or multiple workers. Back up SQLite data before migrations.
