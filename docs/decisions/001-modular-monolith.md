# ADR 001: Modular monolith with feature slices

- Status: Accepted
- Date: 2026-08-16

## Context

The application is a volunteer-maintained Next.js site. Feature code had accumulated across `app`, `features`, `domain`, and generic `lib` folders, making ownership unclear without creating a need for separate services.

## Decision

Keep one Next.js deployment and organize substantial capabilities as vertical slices under `src/features/<feature>`. `src/app` remains the framework boundary. Reusable, content-agnostic mechanics live under `src/shared`; feature policy does not.

Server Components remain the default. Client boundaries are limited to browser interaction. Files are split by responsibility, with 400 lines as a review signal and 700 as a quality-gate failure.

## Consequences

- Maintainers can follow one feature from UI to domain and server behavior.
- Features can be migrated incrementally without route or deployment rewrites.
- Some legacy `src/lib` modules remain until their ownership is clear.
- Cross-feature imports must not turn `shared` into a second miscellaneous folder.
