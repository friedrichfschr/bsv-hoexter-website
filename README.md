# BSV Höxter Website

Minimal Next.js foundation for the BSV Höxter website.

The public render intentionally contains one heading and the retained footer. Architecture, styling rules, file ownership, backend boundaries, and the feature-by-feature continuation workflow are documented in [ARCHITECTURE.md](./ARCHITECTURE.md).

## Development

```bash
npm install
npm run dev
```

## Quality gate

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run test:e2e
```

Copy `.env.example` into your deployment environment and never commit real secrets or submitted content.
