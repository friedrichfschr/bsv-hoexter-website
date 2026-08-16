# ADR 002: Persistence boundaries before database selection

- Status: Accepted
- Date: 2026-08-16

## Context

Editorial content and submissions currently use private JSON/JSONL files. A production database and object store have not been selected. Coupling routes or components to current files—or to a speculative ORM—would make later migration harder.

## Decision

Feature services own domain operations, validation, transitions, publication rules, and media-reference policy. Shared server code may provide storage mechanics such as serialized mutations, validated reads, and atomic replacement.

Routes and components call feature operations, never filesystem or future ORM primitives directly. Repository interfaces are introduced when a real alternate adapter or migration exists, not pre-emptively.

## Consequences

- Current local storage remains simple and testable.
- Database migration can replace adapters behind stable feature operations.
- Local files are not considered production-safe for multi-process writes, audit history, or horizontal scaling.
- Database technology remains an explicit later operational decision.
