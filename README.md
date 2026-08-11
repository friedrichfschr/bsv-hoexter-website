# BSV Höxter Website

Small, expandable Next.js website foundation for the BSV Höxter. The public site currently contains the shared logo/navigation/footer, the visual notice-board foundation, and a simple editorial news section backed by published records only. No production article content is seeded.

Architecture, styling tokens, file ownership, backend boundaries, editorial workflow, and the feature-by-feature continuation process are documented in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Development

```bash
npm install
npm run dev
```

Set `EDITORIAL_API_KEY` and optionally `EDITORIAL_CONTENT_DIRECTORY` from `.env.example` to use the protected `/redaktion` workspace. The local workspace supports article drafts, publishing, and optional validated image uploads. Do not expose or commit the key.

## Quality gate

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Copy `.env.example` into your deployment environment and never commit real secrets, editorial data, or uploaded media.
