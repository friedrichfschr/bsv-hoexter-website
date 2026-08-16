# BSV Höxter Website Architecture

This document is the short orientation guide for maintainers. Product-specific behavior belongs beside its code and tests; durable technical decisions are recorded under `docs/decisions/`.

## Principles

1. Build and change one complete feature slice at a time.
2. Keep `src/app` limited to Next.js routing, layouts, metadata, HTTP adapters, and page composition.
3. Keep domain rules, UI, and server behavior with the feature that owns them.
4. Share only proven cross-feature mechanics, never feature policy.
5. Use Server Components by default; add `"use client"` at the narrowest interactive boundary.
6. Validate all untrusted input with bounded Zod schemas.
7. Keep local-file writes serialized and atomic; treat them as replaceable development adapters.
8. Meet WCAG 2.2 AA and verify keyboard, responsive, reduced-motion, and error behavior.

## Source map

```text
src/
├── app/                    Next.js routes, layouts, route handlers, global CSS entry
├── components/             Content-agnostic layout and UI primitives
├── features/
│   ├── about/              Public About UI and editorial workspace
│   ├── bdk/                BDK participation domain and UI
│   ├── editorial/          Redaktion login and workspace composition
│   ├── news/               Article presentation and article editor
│   └── notice-board/       Events, posters, submissions, moderation
├── shared/
│   ├── domain/             Small domain primitives used by several features
│   ├── server/             Auth, bounded requests, uploads, JSON persistence mechanics
│   └── styles/             Tokens, reset, shell, header, and footer styles
└── lib/                    Legacy/cross-cutting modules pending ownership-based migration
```

Each substantial feature may use these folders when needed:

```text
feature/
├── domain/                 Pure types, schemas, invariants, selectors
├── server/                 Repositories, services, private adapters
├── editor/                 Redaktion-specific client components
├── styles/                 Feature-owned CSS
└── *.tsx                   Public or small feature components
```

Do not create empty folders or one-file-per-trivial-helper structures.

## Dependency direction

```text
app routes ───────► feature UI / feature server services
feature UI ──────► feature domain + shared UI/domain
feature server ──► feature domain + shared server/domain
shared ──────────► no feature modules
```

Client components must not import `server` modules. Route handlers are thin adapters: authorize, bound and parse the request, call a service, and map the result to HTTP.

## Styling

`src/app/foundation.css` is only the CSS entry point. It imports:

- `src/shared/styles/tokens.css` for design tokens and Tailwind theme mapping;
- shared reset/layout styles;
- feature-owned styles under `src/features/*/styles/`.

Change colors, radii, shadows, layout widths, and spacing through the semantic variables in `tokens.css`. Keep a component's responsive and reduced-motion rules with its owning stylesheet. Avoid inline layout styles except for genuinely data-driven values such as poster placement.

## File size and extraction

`npm run check:structure` enforces these review signals:

- over 400 authored lines: review responsibilities;
- over 700 authored lines: fail the quality gate.

Line count is not the extraction boundary by itself. Split along responsibilities such as domain schema, service, repository, state helpers, editor section, and feature styles. Keep small cohesive modules together.

## Persistence and future database

The current JSON/JSONL files and private upload directories are local adapters, not the domain model. Shared mechanics live in `src/shared/server/json-file-store.ts`; feature services own validation, transitions, public selectors, and media-reference policy.

A future database migration must preserve feature-level operations rather than expose SQL or ORM calls to pages and route handlers. Introduce repository interfaces only when a real second adapter or migration is being built. See `docs/decisions/002-persistence-boundaries.md`.

## Future email

Forms and route handlers must not send mail directly. When notifications are implemented, define a feature command/event and a replaceable mail transport, then send only after durable state changes succeed. IMAP is mailbox access, not an outbound delivery transport; SMTP or a provider API must be selected separately. See `docs/decisions/003-email-boundary.md`.

## Security boundaries

- Editorial browser sessions use an HTTP-only signed cookie; secrets never enter browser storage.
- Request streams are bounded before JSON or multipart parsing.
- Uploads are MIME/signature checked, privately stored, and served through controlled routes.
- Public submissions remain private until approved.
- Public selectors, not route-local filtering, determine published content.
- Local storage still needs production replacements for multi-process concurrency, audit history, abuse controls, malware scanning, retention jobs, and individual editor identities.

## Verification

For behavior changes, follow RED → GREEN → REFACTOR. Before a refactor commit, run the focused tests plus:

```text
npm run test
npm run lint
npm run check:structure
npm run typecheck
npm run build
npm run test:e2e
```

Unit tests stay beside modules. Browser tests use accessible roles and isolated ignored storage. Never commit environment files, local editorial data, generated build/test output, screenshots, or credentials.

## Adding a feature

1. Define bounded domain data and invariants.
2. Add failing tests for behavior.
3. Implement a feature service/repository operation.
4. Add a thin route handler only if HTTP mutation is required.
5. Compose a server-rendered page.
6. Add the smallest required client interaction.
7. Add feature-owned styles and accessibility coverage.
8. Update this guide only for architecture; document durable choices in an ADR.

Do not add placeholder factual content or prematurely introduce a database, queue, mail provider, or generic abstraction.
