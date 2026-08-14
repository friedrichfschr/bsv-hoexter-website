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
│   ├── foundation.css           Tailwind theme, tokens, reset, shell, sections
│   ├── aktuelles/page.tsx       Published article index
│   ├── aktuelles/[slug]/        Published article detail route
│   ├── mitmachen/page.tsx       BDK participation and next-date status
│   ├── mitmachen/anmelden/      BDK interest/signup form route
│   ├── schwarzes-brett/page.tsx Visual notice-board foundation
│   ├── schwarzes-brett/einreichen/ Poster/event submission route
│   ├── ueber-uns/page.tsx       Dynamic About, governance, archive, and founding page
│   ├── layout.tsx               Fonts, metadata, shared header/main/footer
│   └── page.tsx                 Minimal homepage
├── components/
│   ├── Footer.tsx               Shared public footer
│   └── layout/
│       └── SiteHeader.tsx       Responsive logo/navigation client boundary
├── features/
│   ├── about/                   Dynamic About/BDK/Vorstand editorial workspace
│   ├── news/                    Public news and editorial workspace components
│   ├── bdk/                     BDK signup client boundary
│   └── notice-board/            Poster/event submission form
├── domain/
│   ├── events.ts                Empty event collection, types, pure selectors
│   └── notice-board.ts          Board and poster placement records
└── lib/
    ├── about-schema.ts          About, board, BDK, and archive schemas
    ├── about-content.ts         About validation, mutation, and public selectors
    ├── calendar.ts              Calendar serialization
    ├── bdk-signup.ts            BDK signup schema and validation
    ├── contact.ts               Contact validation
    ├── articles.ts              Article create/update service boundary
    ├── editorial.ts             Editorial schemas and repository adapter
    ├── editorial-auth.ts        Editorial API authentication boundary
    ├── preview-config.ts        Local form/storage feature flags
    ├── preview-store.ts         Append-only local moderation records
    ├── request-body.ts          Streaming request-size enforcement
    ├── site.ts                  Canonical site URL resolution
    ├── submission.ts            Opportunity submission validation
    └── uploads.ts               File size, MIME, signature, and storage checks
```

The Schwarzes-Brett route renders two copies of
`public/bulletin-board-transparent.png` as responsive canvases. Approved,
unexpired poster records define percentage position, size, rotation, and layer;
there are no hard-coded public posters. Poster wrappers remain transparent and
images use `object-fit: contain` so source artwork is not stretched or given an
artificial white backing.

`/schwarzes-brett/einreichen` accepts poster-only, event-only, or combined
submissions. Every submission requires a title, contact email, and consent.
Event submissions additionally require description, date, location, age range,
website, organizer, and one of `Freizeit`, `Berufsorientierung`, or `Hobbys`.
Poster files remain private pending moderation and use the existing 5 MB upload
validation boundary.

Notice-board moderation is stored in `notice-board.json` beside the editorial
content. `src/lib/notice-board-moderation.ts` owns its Zod schemas, serialized
read-modify-write queue, atomic replacement, moderation transitions, and public
selectors. Submitted events and posters always begin as `pending`; only
`approved` events and approved, unexpired posters pass public selectors.
The public event list has client-side filters for exactly the three validated
categories while preserving an unfiltered server-rendered list initially.

The Redaktion workspace has `Aktuelles`, `Veranstaltungen`, `Poster`, and
`Über uns` tabs.
Editors can correct event fields before approval. Poster approval requires a
board assignment, percentage-based position and size, bounded rotation, and an
expiry date. Combined submissions initialize poster expiry from the event date.
The server assigns increasing layers when posters are first approved or
explicitly moved to the front, so newer placements render above older ones.
Public poster media is delivered only when an approved, currently unexpired
record references its opaque upload ID; pending media is available only through
the authenticated Redaktion endpoint.
Poster submissions require their own expiry date. Rejected events and posters
remain in a separate Redaktion section for 30 days after rejection and are then
removed automatically when the moderation store is loaded; poster payload and
metadata are removed with their record. The public boards contain no hard-coded
posters, and approved posters open in a keyboard-dismissible enlarged view.

`/mitmachen` owns the BDK participation content. Until an official date exists,
its top action presents the explicit state `Termin wird noch bekannt gegeben`
and links to `/mitmachen/anmelden`. The form records an interest/pre-registration,
not a confirmed conference place, through the bounded `/api/bdk-anmeldung` JSON
boundary. Valid records use the existing private append-only preview store and
remain disabled on production deployments unless `PREVIEW_FORMS_ENABLED=true`.
The preview boundary applies a bounded body, per-process client rate limit,
duplicate suppression, and a five-megabyte collection quota. Production still
requires edge/shared abuse controls and durable consent-aware storage.

`/ueber-uns` is backed by the `about` collection inside the serialized editorial
repository. Its schemas and service own introductory text, Vorstand terms and
photos, one explicit active-Vorstand reference, BDK records, statutes with legal
validity periods/numbers, external HTTPS links, document references, founding
galleries, and media existence checks. Attachment and photo publication is derived
from the containing BDK; editors do not manage a second publication state, document
type, or attachment date. A photo's caption is also its alternative text. The
founding BDK metadata and photographs are source-controlled constants; Redaktion
may change only its document attachments. Public archive columns use bounded native
disclosures so only the first
records render initially; Vorstand entries retain their photo/text history while
statutes remain compact legal download rows. The initial archive is
seeded from the supplied founding documents: the Satzung, school invitations,
and agenda for the first BDK on 2 July 2026 at the Schulen der Brede in Brakel.
The source PDFs are bundled outside the public directory under
`content/about-documents/` and served only through the publication-aware document
route; subsequent PDFs and Vorstand photos use validated private uploads and
narrow published media routes. The supplied founding-conference photographs are
metadata-free JPEGs under `content/about-images/`, traced into the deployment,
and served through the same publication-aware media boundary rather than static
public URLs. Redaktion records use native expandable disclosures and pending
uploads are removed when replaced, deleted, or abandoned on normal navigation.
Missing current-board photo/message fields render honest empty states instead of
invented people or statements. Legacy whole-workspace writes preserve About data
when omitted and apply the same About invariants when supplied.

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

The `:root` block is the source of truth for semantic CSS variables, grouped by purpose:

- Core palette: `--color-ink`, `--color-paper`, `--color-surface`, `--color-warm`, `--color-gold`, `--color-gold-text`, `--color-border`, and related semantic colors.
- Component surfaces: `--color-header`, `--color-footer`, `--color-on-dark`, and footer text/border variants.
- Notice-board accents: `--color-board-stage-edge` and `--color-board-pin`.
- Shape and elevation: `--radius-control`, `--border-width-control`, `--shadow-control`, and `--shadow-soft`.
- Interaction: `--color-focus`, `--color-selection`, `--focus-width`, `--focus-offset`, and `--motion-fast`.
- Layout: `--layout-shell` and `--space-section`.

The Tailwind `@theme inline` block maps those semantic variables to utilities:

- `bg-bsv-paper`, `bg-bsv-surface`, `bg-bsv-board`
- `text-bsv-ink`, `text-bsv-gold`, `text-bsv-danger`
- `font-body`, `font-display`
- `rounded-bsv`, `shadow-bsv`

Change brand values in `:root`; do not scatter replacement hex values, radii, border widths, or shadows across components. For example, changing `--radius-control` updates both desktop navigation links and the phone menu button, while changing palette variables updates shared surfaces everywhere.

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

The current notice-board presentation uses `.bulletin-board-page`,
`.bulletin-board-heading`, `.bulletin-board-display`, `.bulletin-board-card`,
`.bulletin-board-canvas`, `.bulletin-board-image`, `.bulletin-board-poster`, and
`.bulletin-board-pin`. Poster placement is data-driven through
`src/domain/notice-board.ts`; CSS custom properties carry those values to the
rendered layer. Its palette, radius, and shadow remain centralized in the
`:root` tokens above so the visual direction can be changed without editing the
route component.

### 4.5 Component rules

- Server Components are the default.
- Add `"use client"` only at the smallest interactive boundary.
- `SiteHeader.tsx` progressively enhances a native `details`/`summary` phone menu,
so navigation remains operable before or without hydration while retaining
Escape handling, focus restoration, and active-route state. Poster links likewise
remain direct media links without JavaScript and upgrade to a modal after hydration.
- Components receive typed content through props; they do not import factual datasets directly.
- A route assembles components; it should not contain a large block of repeated markup.
- Every icon-only action needs an accessible name.
- Images require meaningful alternative text or `alt=""` when decorative.
- Links navigate; buttons perform actions.

## 5. Content and backend boundaries

### 5.1 Public content

`src/domain/events.ts` exports an empty static event array. Editorial articles and
documents default to empty arrays, while the About collection starts with the
verified founding BDK and its supplied source documents.

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

### 5.2.1 News article slice

`src/lib/articles.ts` is the article mutation boundary. It creates and updates one article while preserving documents, rejects duplicate slugs, validates optional media references, and requires image alternative text before an article with an image can be published.

The public news feature is intentionally small:

- `/aktuelles` renders the newest published article as a lead item and the remaining published articles as a chronological list.
- `/aktuelles/[slug]` renders only a published article and returns 404 for drafts or unknown slugs.
- Article bodies are plain text separated into paragraphs; raw HTML and rich-text execution are not supported.
- Empty editorial storage produces a quiet empty state and no seeded article.
- `src/features/news/EditorialDashboard.tsx` provides the first admin utility for creating drafts, publishing articles, and uploading optional images.

The dashboard calls `/api/redaktion/articles`, `/api/redaktion/upload`, and `/api/redaktion/session`. The browser receives only an HTTP-only signed session cookie; it never receives `EDITORIAL_API_KEY`.

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

The current editorial workspace uses `EDITORIAL_API_KEY` as a development login secret. Successful login creates an eight-hour, HTTP-only, SameSite session cookie signed with HMAC. Protected editorial routes accept either the existing Bearer header for automation or that cookie for `/redaktion`.

This is not the final editor identity system. Production should use individual accounts, least-privilege roles, revocation, session expiry, CSRF protection, rate limiting, and an audit trail. Never place an editorial secret in a `NEXT_PUBLIC_*` variable or browser storage.

## 6. Route map

Public news, notice-board, BDK participation, and About/archive routes are
implemented vertical slices. Expand remaining placeholders only when their
complete vertical slice is ready:

| Route | Responsibility |
| --- | --- |
| `/schwarzes-brett` | Moderated board, filters, current opportunities |
| `/schwarzes-brett/[slug]` | Opportunity detail and source trust treatment |
| `/schwarzes-brett/einreichen` | Implemented poster-only, event-only, or combined submission and private upload |
| `/aktuelles` | Reverse-chronological published articles |
| `/aktuelles/[slug]` | Individual article |
| `/fuer-sven` | Editorial guidance and resources |
| `/mitmachen` | BDK status and participation routes |
| `/mitmachen/anmelden` | Interest/signup form for the next BDK |
| `/ueber-uns` | Dynamic purpose, Vorstand, Satzung, archives, and founding records |
| `/impressum` | Approved legal notice |
| `/datenschutz` | Approved privacy information |
| `/barrierefreiheit` | Accessibility statement and feedback route |
| `/redaktion` | Password-gated workspace for articles, moderation, poster placement, About, Vorstand, BDKs, and archive files |

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
src/components/layout/PageHeader.tsx
src/components/ui/Button.tsx
src/components/ui/Notice.tsx
src/components/ui/EmptyState.tsx
src/components/forms/FormField.tsx
src/features/board/NoticeBoard.tsx
src/features/board/OpportunityRow.tsx
src/features/board/OpportunityFilters.tsx
src/features/news/ArticleIndex.tsx
src/features/news/ArticleDetail.tsx
src/features/news/EditorialDashboard.tsx
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
| `EDITORIAL_TRUSTED_PROXY` | Enables per-client rate limiting from trusted proxy headers; keep false unless the proxy overwrites them |
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

- the logo and five primary navigation links in `src/components/layout/SiteHeader.tsx`;
- a compact phone header whose labeled menu button exposes one full-width link column, reports its state with `aria-expanded`, and closes with Escape or route selection;
- one simple `<h1>` on the foundation routes, plus the implemented news index/detail content sourced only from editorial storage;
- the shared footer in `src/components/Footer.tsx`;
- global fonts, metadata, and landmarks in `src/app/layout.tsx`;
- the token system and responsive footer in `src/app/foundation.css`.

The editorial utility at `/redaktion` includes articles, event/poster moderation,
and dynamic About/Vorstand/BDK/archive records. It remains a development scaffold,
not a multi-user CMS.

This is the baseline. Add no generic marketing sections, invented examples, fake statistics, stock imagery, gradients, or placeholder articles to make future pages look complete.
