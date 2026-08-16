# ADR 003: Email behind feature commands and a transport port

- Status: Accepted
- Date: 2026-08-16

## Context

Future BDK and contact workflows may send confirmations or information. No outbound provider, sender identity, consent language, template policy, retry strategy, or bounce process has been selected. IMAP alone does not send outbound mail.

## Decision

UI components and route handlers do not send email directly. A feature first commits its durable state change, then invokes a notification operation. That operation uses a replaceable mail transport implemented by SMTP or a provider API.

Message templates and recipient rules belong to the feature; transport mechanics do not. Delivery failures must not silently roll back an already accepted domain operation and need an observable retry/failure policy before production use.

## Consequences

- Forms remain independent from provider credentials and SDKs.
- A provider can be selected or replaced without changing route/UI code.
- Actual mail delivery is deferred until identity, consent, retries, and operations are specified.
