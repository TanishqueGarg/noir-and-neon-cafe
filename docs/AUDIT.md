# NOIR & NEON audit

Audit date: 2026-10-28. Scope: all application routes, shared components, state, styling, API handlers, Prisma schema, environment template, build configuration, and existing documentation.

## Executive summary

The existing application has a strong editorial foundation, functional local cart, structured menu data, strict TypeScript, responsive layouts, and honest setup-required responses. It is not yet production-operational: orders, reservations, newsletter, and contact are not persisted; availability is hardcoded in the browser; there is no admin authentication; business information is duplicated sample content; and the public health endpoint exposes configuration state.

## Findings and remediation

| Severity | Finding | Remediation in this pass |
| --- | --- | --- |
| Critical | Order and reservation POST handlers always return `503`; no persistence or server-side price/capacity enforcement exists. | Implement transactional Prisma services, server Zod validation, idempotency, database-priced totals, and atomic reservation capacity checks. |
| Critical | No admin authentication or authorization boundary exists. | Add signed, secure session cookies, password verification, protected admin middleware/routes, login rate limiting, logout, and protected management APIs. |
| High | Reservation availability is a client-side constant and one slot is arbitrarily disabled. | Add database-backed availability endpoint; render available, limited, unavailable, loading, and selected states from server data. |
| High | Public submissions lack request-size, origin, duplicate, and rate-limit protection. | Add bounded JSON parsing, same-origin enforcement, idempotency keys, input normalization, and application rate limiting. |
| High | Email contracts exist but no provider, delivery state, or retry-safe record exists. | Add Resend adapter, branded templates, independent delivery records, and failure-safe status updates. |
| High | Public health response reveals which credentials are configured. | Return minimal liveness only; keep dependency diagnostics private. |
| Medium | Palette tokens are incomplete and saturated cobalt/lime/off-white are used as large surfaces. | Centralize the revised dark palette; replace large bright surfaces with layered charcoal/deep-navy compositions and restrained accents. |
| Medium | Business address/social links are invented sample values repeated across pages. | Centralize public business configuration; display an explicit pre-launch state until authentic values are supplied. |
| Medium | Contact, gallery, admin, robots, and sitemap routes are missing. | Add all routes, a keyboard lightbox, validated contact persistence, and protected admin views. |
| Medium | Newsletter form never submits or persists. | Add subscriber schema, route handler, validation, duplicate-safe upsert, and honest UI states. |
| Medium | Menu UI uses the same image for every item and product cards rely on very similar proportions. | Improve crop strategy, card hierarchy, tags, action placement, and gallery assets while preserving menu/cart behavior. |
| Medium | Cart dialog supports Escape but lacks initial focus and focus containment. | Add focus restoration/containment and reduced-motion-aware animation. |
| Medium | Cart quantity is not capped in the persisted store. | Clamp item and aggregate quantities on both client and server. |
| Low | Several files are dense one-line JSX, which impairs review and future maintenance. | Format touched components and extract shared utilities without broad rewrites. |
| Low | Privacy/terms still describe a non-persistent demo. | Update disclosures to reflect configured production behavior and pre-launch limitations. |

## Existing strengths preserved

- Cinematic hero, display/body typography pairing, original local imagery, and NOIR & NEON voice.
- Menu catalogue, category/search/dietary filtering, product pages, cart persistence, drawer, toast feedback, and pay-at-counter flow.
- React Hook Form/Zod form architecture, App Router metadata, loading/error/not-found states, reduced-motion support, and strict TypeScript.
- Existing Prisma model intent and separation between browser data, service contracts, and API responses.

## Deployment constraints

- Real integration tests require a PostgreSQL `DATABASE_URL`.
- Transactional delivery requires a verified Resend sender and `RESEND_API_KEY`.
- Authentic address, contact, hours, map, and social details must be supplied before public launch.
- No production database reset, public deployment, or source upload is performed by this pass.
