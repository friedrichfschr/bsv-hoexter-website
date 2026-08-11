# BSV Höxter Website Architecture

This document is the implementation contract for extending the website one feature at a time. The public site intentionally starts with a single heading and the retained footer. No example news, events, legal wording, people, dates, protocols, or statutes are published in the scaffold.

## 1. Architectural goals

1. **One coherent system:** every future page uses the same tokens, shell, typography, spacing, focus treatment, and editorial rhythm.
2. **Feature-by-feature delivery:** add one vertical slice at a time, including its model, validation, API, UI, tests, and accessibility checks.
3. **Content independence:** factual content must come from typed data or the editorial repository, never be embedded in layout components.
4. **Moderation by default:** public submissions are private until explicitly reviewed and published.
5. **Low-maintenance operation:** prefer server-rendered public pages, minimal client JavaScript, and replaceable storage adapters.
6. **WCAG 2.2 AA:** semantics, keyboard operation, focus visibility, contrast, reduced motion, and field-level errors are release requirements.

## 2. Technology stack

| Layer | Technology | Role |
| --- | --- | --- |
| Application | Next.js 16 App Router | Routing, metadata, server rendering, API routes |
| UI | React 19 + TypeScript | Typed components and interactive islands |
| Styling | Tailwind CSS 4 + CSS custom properties | Design tokens, utilities, and stable component classes |
| Validation | Zod 4 | Shared server-side input and content validation |
| Icons | Lucide React | Accessible decorative/action icons |
| Unit tests | Vitest + Testing Library | Domain, validation, and repository behavior |
| Browser tests | Playwright + axe-core | Critical flows, responsive behavior, accessibility |
| Local persistence | JSON/JSONL + private media directory | Development scaffold only |
| Production persistence | To be selected | Database, object storage, identity, audit trail |

Use Node.js 22 LTS or newer. Commands are defined in `package.json`.

## 3. Runtime structure

```text
src/
├── app/                         Next.js routes and global composition
│   ├── api/                     Server-only HTTP boundaries
│   ├── foundation.css           Tailwind theme, tokens, reset, shell, footer
│   ├── layout.tsx               Fonts, metadata, main landmark, footer
│   └── page.tsx                 Current minimal public surface
├── components/
│   └── Footer.tsx               Only retained public component
├── domain/
│   └── events.ts                Empty event collection, types, pure selectors
└── lib/
    ├── calendar.ts              Calendar serialization
    ├── contact.ts               Contact validation
    ├── editorial.ts             Editorial schemas and repository adapter
    ├── editorial-auth.ts        Editorial API authentication boundary
    ├── preview-config.ts        Local form/storage feature flags
    ├── preview-store.ts         Append-only local moderation records
    ├── request-body.ts          Streaming request-size enforcement
    ├── site.ts                  Canonical site URL resolution
    ├── submission.ts            Opportunity submission validation
    └── uploads.ts               File size, MIME, signature, and storage checks
```

Top-level operational files:

- `package.json`: scripts and exact dependency families.
- `.editorconfig` and `.gitattributes`: shared formatting and LF line endings across operating systems.
- `.github/workflows/quality.yml`: the full verification gate on pushes and pull requests.
- `postcss.config.mjs`: Tailwind PostCSS integration.
- `playwright.config.ts`: browser matrix and isolated test storage.
- `vitest.config.ts`: unit-test environment and `@/` alias.
- `.env.example`: supported environment variables without secrets.
- `README.md`: setup, verification, and link to this document.

## 4. Design system

### 4.1 Token ownership

All global visual decisions live in `src/app/foundation.css`.

The `:root` block is the source of truth for semantic CSS variables:

- `--color-ink`, `--color-ink-soft`, `--color-muted`
- `--color-paper`, `--color-surface`, `--color-warm`
- `--color-gold`, `--color-board`, `--color-border`, `--color-danger`
- `--layout-shell`
- `--space-section`
- `--shadow-soft`

The Tailwind `@theme inline` block maps those semantic variables to utilities:

- `bg-bsv-paper`, `bg-bsv-surface`, `bg-bsv-board`
- `text-bsv-ink`, `text-bsv-gold`, `text-bsv-danger`
- `font-body`, `font-display`
- `rounded-bsv`, `shadow-bsv`

Change brand values in `:root`; do not scatter replacement hex values across components.

### 4.2 Typography

Fonts are loaded in `src/app/layout.tsx` with `next/font`:

- `Source Sans 3` through `--font-sans` for navigation, body copy, labels, forms, and metadata.
- `Newsreader` through `--font-serif` for page and section headings.

Heading sizes should use `clamp()` and preserve a compact line height. Body text should normally remain 16–18 px with a line height near 1.6. Avoid all-caps except for short eyebrow labels.

### 4.3 Layout

- `.shell` is the only global width container.
- Full-width backgrounds wrap a nested `.shell`; do not put arbitrary `max-width` values on every section.
- Desktop editorial sections may use two columns when the secondary column is genuinely useful.
- Mobile uses natural single-column document flow.
- Start section spacing with `var(--space-section)` and reduce gaps before reducing type size.
- Interactive targets must be at least 44 px high.

### 4.4 Class naming

Use two class categories:

1. **Tailwind utilities** for local, one-off alignment and spacing.
2. **Stable semantic classes** for reusable components and multi-state styling.

Semantic classes use lowercase kebab-case:

```text
.component
.component-element
.component-modifier
```

Examples for future work:

```text
.site-header
.mobile-navigation
.page-header
.section-heading
.notice-board
.notice-board-flyer
.notice-board-flyer-approved
.document-list
.document-list-row
.form-field
.form-field-error
```

Do not encode page names into reusable classes. Do not use generated-looking class names, numbered visual variants without meaning, or inline style objects for normal layout.

### 4.5 Component rules

- Server Components are the default.
- Add `"use client"` only at the smallest interactive boundary.
- Components receive typed content through props; they do not import factual datasets directly.
- A route assembles components; it should not contain a large block of repeated markup.
- Every icon-only action needs an accessible name.
- Images require meaningful alternative text or `alt=""` when decorative.
- Links navigate; buttons perform actions.

## 5. Content and backend boundaries

### 5.1 Public content

The public scaffold contains no records. `src/domain/events.ts` exports an empty `events` array. Editorial content defaults to empty arrays in `src/lib/editorial.ts`.

Future factual records must include provenance and publication state. Event records already reserve fields for source URL, source-check date, organizer, exactness, sessions, age range, place, and expiry.

### 5.2 Editorial repository

`src/lib/editorial.ts` owns:

- Zod schemas for articles and documents.
- Draft/published state.
- Published selectors.
- Local read/write behavior.
- The seam where a production repository replaces local JSON.

Local writes use unique temporary files, per-process serialization, and atomic replacement, so concurrent requests cannot collide on temporary or destination files. They still use last-write-wins semantics across processes; production editing requires optimistic version checks to prevent one editor from overwriting another editor's changes.

Public routes should call selectors such as `publishedArticles()` and `publishedDocuments()` rather than filtering status ad hoc.

### 5.3 API routes

API routes under `src/app/api/` are transport adapters. They should:

1. Reject unsupported methods/content types.
2. Enforce request-size limits before parsing.
3. Authenticate protected operations.
4. Validate unknown input with Zod.
5. Call a domain/repository function.
6. Return minimal JSON and appropriate HTTP status codes.

Do not put layout logic or React code in API routes. Do not expose filesystem paths.

`src/lib/request-body.ts` reads request streams with a hard byte limit before JSON or multipart parsing. All mutating routes must use it; `Content-Length` alone is not a security boundary because it can be absent or untrusted.

### 5.4 Upload security

`src/lib/uploads.ts` currently enforces:

- 5 MB maximum size.
- Allowlisted MIME types.
- Byte-signature verification for PNG, JPEG, WebP, and PDF.
- Opaque UUID filenames.
- Private storage and metadata sidecars.

Before production, add malware scanning, object storage, retention/deletion jobs, rate limiting, abuse protection, audit events, and role-based moderation. Submitted media must never receive a public URL before approval.

### 5.5 Authentication

The current editorial API uses `EDITORIAL_API_KEY` as a development boundary. It is not the final editor identity system. Production should use individual accounts, least-privilege roles, revocation, session expiry, and an audit trail. Never place an editorial secret in a `NEXT_PUBLIC_*` variable.

## 6. Planned route map

Only `/` is implemented as public content now. Add routes in this order only when their complete vertical slice is ready:

| Route | Responsibility |
| --- | --- |
| `/schwarzes-brett` | Moderated board, filters, current opportunities |
| `/schwarzes-brett/[slug]` | Opportunity detail and source trust treatment |
| `/schwarzes-brett/einreichen` | Structured submission and private upload |
| `/aktuelles` | Reverse-chronological published articles |
| `/aktuelles/[slug]` | Individual article |
| `/bdk` | Process, current status, protocols |
| `/fuer-sven` | Editorial guidance and resources |
| `/mitmachen` | Participation routes and contact |
| `/ueber-uns` | Purpose, governance, current Satzung |
| `/impressum` | Approved legal notice |
| `/datenschutz` | Approved privacy information |
| `/barrierefreiheit` | Accessibility statement and feedback route |
| `/redaktion` | Authenticated editorial workspace |

Do not add a route merely to display placeholder prose. Until content and process are approved, leave it unimplemented.

## 7. Feature delivery sequence

For each aspect, follow this vertical-slice checklist:

1. Define or extend the domain type and Zod schema.
2. Write a failing unit test for the intended behavior.
3. Implement repository/service behavior.
4. Add the API route if the feature mutates data.
5. Build semantic Server Components.
6. Add a minimal Client Component only for interaction.
7. Assemble the route with no embedded factual content.
8. Add responsive and reduced-motion styles using the shared tokens.
9. Add Playwright behavior and axe checks.
10. Run `npm run test`, `npm run lint`, `npm run typecheck`, `npm run build`, and `npm run test:e2e`.
11. Manually inspect desktop and mobile rendering.
12. Document any new environment variable or operational responsibility.

A feature is not complete if it only has UI, only has an API, or only has placeholder data.

## 8. Suggested component boundaries

Create these only as their feature is implemented:

```text
src/components/layout/SiteHeader.tsx
src/components/layout/MobileNavigation.tsx
src/components/layout/PageHeader.tsx
src/components/ui/Button.tsx
src/components/ui/Notice.tsx
src/components/ui/EmptyState.tsx
src/components/forms/FormField.tsx
src/features/board/NoticeBoard.tsx
src/features/board/OpportunityRow.tsx
src/features/board/OpportunityFilters.tsx
src/features/news/ArticleList.tsx
src/features/documents/DocumentList.tsx
```

Feature-specific components belong under `src/features/<feature>/`. Truly shared, content-agnostic primitives belong under `src/components/ui/`. Global composition belongs under `src/components/layout/`.

## 9. Environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Canonical public base URL; safe for the browser |
| `PREVIEW_FORMS_ENABLED` | Explicitly enables local-file form writes in production mode |
| `PREVIEW_SUBMISSIONS_DIR` | Private local moderation directory |
| `EDITORIAL_API_KEY` | Development editorial API secret |
| `EDITORIAL_CONTENT_DIRECTORY` | Local editorial JSON/media directory |

Copy names exactly from `.env.example`. Secret values belong in deployment configuration, never in Git.

## 10. Testing conventions

- Unit tests live next to the module as `*.test.ts` or `*.test.tsx`.
- Tests use constructed fixtures, never production-looking factual records.
- E2E tests live in `e2e/` and verify behavior through accessible roles and labels.
- Avoid brittle selectors tied to DOM depth or visual ordering.
- Accessibility scans cover each implemented public route at desktop and mobile sizes.
- Test storage uses isolated ignored directories so tests cannot overwrite editor data.

## 11. Git and release conventions

- Keep commits focused on one aspect.
- Do not commit `.env`, `.editorial-content/`, `.preview-submissions/`, build output, screenshots, or test artifacts.
- Run the full quality gate before every push.
- Public launch remains blocked until the operator, legal text, privacy process, moderation ownership, storage, retention, and contact responsibilities are approved.

## 12. Current foundation state

The current public render deliberately consists of:

- one `<h1>` in `src/app/page.tsx`;
- the shared footer in `src/components/Footer.tsx`;
- global fonts, metadata, and landmarks in `src/app/layout.tsx`;
- the token system and responsive footer in `src/app/foundation.css`.

This is the baseline. Add no generic marketing sections, invented examples, fake statistics, stock imagery, gradients, or placeholder articles to make future pages look complete.
