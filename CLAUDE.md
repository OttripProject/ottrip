# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Behavioral Guidelines

Behavioral guidelines to reduce common LLM coding mistakes.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.
- All code changes follow: share plan → get confirmation → implement.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- No comments unless the WHY is non-obvious — one line max.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```
Success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

---

## Code Style Rules

- All responses, explanations, and output must be written in Korean.
- Commit messages must be written in Korean.
- Always use design tokens for colors, fonts, spacing, and radii — never hardcode values.
- Always use `textStyles` tokens for font styles — never hardcode font properties.

---

## Monorepo Structure

```
ottrip/
├── client/   # React Native / Expo app (iOS, Android, Web)
├── server/   # FastAPI Python backend
└── ottrip/   # iOS native Xcode project
```

---

## Client (`client/`)

**Stack**: Expo 54, React Native 0.81, TypeScript, Biome, TanStack Query, React Navigation

### Commands

```bash
cd client

pnpm dev           # Expo dev server
pnpm ios           # Run on iOS simulator
pnpm android       # Run on Android emulator
pnpm web           # Run on web

pnpm typecheck     # TypeScript check (tsc --noEmit)
pnpm lint          # Biome lint + auto-fix
pnpm lint:check    # Biome lint without fix
pnpm format        # Biome format

pnpm env:pull      # Pull .env from EAS (development profile)

pnpm build:dev     # EAS dev build
pnpm build:alpha   # EAS alpha build
pnpm build:prod    # EAS prod build
pnpm deploy:prod   # OTA update to prod branch
```

### Architecture

**Navigation** (`src/navigation/RootNavigator.tsx`): Single `Stack.Navigator` — unauthenticated users see the login stack, authenticated users see the main app. Platform-specific screens use `.native` suffix (e.g., `LoginScreen.native.tsx` vs `LoginScreen.tsx`). On web the main screen is `DashboardScreen`; on native it's `MobileNavigator`.

**Auth flow**: `AuthContext` holds `isAuthenticated` / `isLoading`. Tokens are stored in `expo-secure-store` on native and managed via httpOnly cookies + in-memory cache on web. The axios instance in `src/services/api.ts` intercepts requests to refresh tokens proactively when expiry is within 5 minutes using the `X-Auth-Token` header (native) or cookies (web).

**Server state**: TanStack Query via `QueryProvider`. Each domain has a service file in `src/services/` (e.g., `plans.ts`, `expenses.ts`) that wraps axios calls.

**Environment**: All `EXPO_PUBLIC_*` vars are validated via Zod in `src/core/env/schema.ts`. On localhost, the API base URL automatically resolves to `http://localhost:8080`.

---

## Server (`server/`)

**Stack**: FastAPI, Python 3.13+, SQLAlchemy (async), PostgreSQL (asyncpg), Alembic, uv, poe

### Commands

```bash
cd server

uv venv && uv run poe setup   # First-time setup (venv + pre-commit)

uv run poe dev       # Dev server on :8080 (hot reload)
uv run poe typecheck # Pyright
uv run poe lint      # Ruff lint
uv run poe format    # Ruff format

# Database
uv run poe db up -d          # Start local PostgreSQL via Docker
uv run poe migrate           # Apply all pending Alembic migrations
uv run poe downgrade         # Rollback one migration
uv run poe revision -m <name>  # Auto-generate migration from model changes
uv run poe check-migrations  # Verify migrations are up to date
```

After activating the venv (`source .venv/bin/activate`), drop `uv run` prefix.

### Architecture

**Router structure** (`app/api.py`):
- `POST /public/auth/*` — unauthenticated (login, refresh, OAuth callbacks)
- `GET|POST|... /private/*` — requires JWT via `get_current_user` dependency

**Domain modules** (each has `router.py`, `service.py`, `repository.py`, `models.py`, `schemas.py`):
- `auth` — JWT, Google OAuth, Apple Sign-In, token refresh
- `plans` — travel plans (core entity)
- `itinerary` — daily schedule items within a plan
- `flights` — flight records
- `expenses` — expense tracking with attachment support
- `accommodations` — lodging records
- `attachments` — file metadata (stored in S3-compatible storage via aioboto3)
- `ai` — Gemini-powered document OCR and checklist generation
- `users` — user profiles

**ORM**: `app/models.py` defines the `Base` class (SQLAlchemy async + dataclass mixin). All models inherit from it.

**AI module** (`app/ai/`):
- `VisionClient` — Google Cloud Vision OCR for images; PyMuPDF for PDF text extraction
- `GeminiClient` — Google Gemini for structured JSON responses (checklist generation, document analysis). Prompts are stored as `.txt` files in `app/ai/prompt/`.
- AI config (model name, system prompts, API keys) lives in `app/ai/config.py`.

**Environments**: `local` | `dev` | `prod` (set via `ENVIRONMENT` env var). Swagger UI is disabled in prod. The `/dev` router is only mounted in local/dev.

**Migrations**: Always run `uv run poe revision -m <name>` after changing SQLAlchemy models, review the auto-generated file in `migrations/versions/`, then commit it alongside the model change.
