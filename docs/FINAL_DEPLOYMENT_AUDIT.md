# Final deployment audit

Date: 2026-10-29

## Production-readiness conclusion

The application code, production build, browser rendering, authorization boundaries, durable outbox design, and deployment controls are substantially ready. It is **not yet safe to publish as a live transactional service** because no authorized isolated PostgreSQL database was available for migrations/integration tests, no live Resend sender was verified, no real admin session was exercised against PostgreSQL, and authentic café data is not configured. These are release blockers, not simulated successes.

## Status by component

| Component | Status | Evidence / next requirement |
| --- | --- | --- |
| Public frontend and cart | VERIFIED | Production Playwright QA passed 14/14 across 66 route/viewport combinations; 10 screenshots captured. |
| Production build | VERIFIED | Prisma Client 6.19.3 generated; Next 15.5.28 compiled and generated 49 pages. |
| Validation and business rules | VERIFIED | 21 unit/mocked tests passed; frontend checks passed 9/9. |
| Security headers and public health | VERIFIED | Runtime smoke returned home/health 200; CSP, HSTS, frame denial present; health response is minimal. |
| Admin route protection | VERIFIED without database session | Unauthenticated dashboard redirected to login; session API returned 401; login without Origin returned 403; every mutation route was statically audited for server authorization. |
| PostgreSQL schema/migrations | CODE COMPLETE BUT UNVERIFIED | Prisma schema validates and migration chain/provider lock exists; migrations were not applied to a real database. |
| Orders/contact/newsletter persistence | CODE COMPLETE BUT UNVERIFIED | Transactional code and mocked tests exist; real PostgreSQL flow was not run. |
| Reservation concurrency | CODE COMPLETE BUT UNVERIFIED | Advisory lock, serializable transaction, capacity logic, and unit tests exist; concurrent database test was skipped. |
| Live admin operations | CODE COMPLETE BUT UNVERIFIED | UI/APIs/role controls/audits exist; login and mutations need an isolated database. |
| Resend email delivery | CODE COMPLETE BUT UNVERIFIED | Templates, outbox, claims, retries, timeout, idempotency, and missing-config behavior are tested; no provider acceptance/delivery was attempted. |
| Environment | REQUIRES CONFIGURATION | `npm run env:check` failed with eight current-environment errors. No values were printed and no connection was attempted. |
| Authentic business data | REQUIRES CONFIGURATION | Address, contact details, hours, capacity, menu and social links require owner review. |
| Production release | BLOCKED | Requires database migration/integration testing, admin bootstrap/QA, verified Resend sender/live tests, passing env preflight, and production smoke test. |

## Changes made in this audit

- Added a migration provider lock and documented pooled `DATABASE_URL` versus direct `DIRECT_URL` use.
- Gated development seeding behind both non-production mode and `ALLOW_DEVELOPMENT_SEED=true`.
- Added a non-connecting environment preflight (automatically enforced by production Vercel builds), secret-free `.env.example`, Node 22 target, Vercel cron manifest, and deployment scripts/documentation.
- Preserved the awaited immediate post-commit email attempt and added bounded provider timeouts, concurrent entity processing, batched retry processing, and authenticated GET/POST retry entry points using `CRON_SECRET`.
- Added daily security-record cleanup. Public and login rate limits remain PostgreSQL-backed and suitable for distributed serverless instances.
- Restricted business settings and table capacity to owners in both UI and API; managers retain operational permissions.
- Added page-level server authorization before every protected dashboard query, preventing Next.js parallel layout/page rendering from starting customer-data reads before an unauthenticated redirect completes.
- Added production CSP/HSTS and retained no-sniff, frame, referrer, permissions, COOP, admin no-store, and no-index controls.
- Made production rate-limit hashing fail closed without a strong salt and prefer the platform's direct client-IP header.
- Restricted admin-created menu categories, badges, and images to supported values/local optimized assets.
- Added tagged public menu/business caching and invalidation after admin updates.
- Removed the unused JWT dependency and resolved PostCSS advisories with a compatible 8.5.32 override rather than a breaking Next.js major upgrade.
- Expanded `.gitignore` for secrets, both Next outputs, dependencies, coverage, Playwright artifacts, Vercel metadata, databases, logs, and caches.
- Expanded browser QA to cover admin login and unauthenticated admin routing.

## Actual verification results

| Command/check | Actual result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed, zero warnings |
| `npm run build` | Passed; 49 pages; Prisma Client 6.19.3 |
| `npm run verify` | Passed: frontend 9/9; unit/mocked 21/21; 3 DB tests skipped |
| `npm run qa` | Passed 14/14; 10 screenshots; 66 route/viewport combinations |
| `npm run test:integration` | Executed; all 3 tests skipped because an opted-in isolated test database was unavailable |
| `npx prisma validate` | Passed using non-connecting process-scoped placeholder URLs |
| `npm audit` | Passed: 0 known vulnerabilities |
| Runtime headers/health/auth smoke | Passed for no-credential cases: 200/200/401/401/403 as expected |
| `npm run env:check` | Failed as designed: eight production configuration errors remain |

The production browser run used `http://localhost:3100` and the compiled `.next` output. Results are in `docs/visual-qa/results.json`; screenshots are in `docs/visual-qa/screenshots/`, including `admin-login-desktop.png`.

## Database safety audit

The schema uses PostgreSQL, environment URLs, foreign keys, indexes, reference/idempotency uniqueness, order/reservation value checks, an email-event uniqueness constraint, and indexed distributed rate-limit buckets. Runtime uses one reusable Prisma Client per warm process and the hosted URL must be pooled. `DIRECT_URL` is reserved for Prisma migration tooling. Migration deployment is a separate operator command and is not invoked from builds or request handlers.

The two checked-in migrations were inspected and ordered. They were **not executed**. Production seed execution is refused, and development seeding requires an explicit opt-in. The Prisma 6 `package.json#prisma.seed` deprecation warning is informational for a future Prisma 7 migration; Prisma 6.19.3 remains intentionally retained.

## Email delivery model

Orders, reservations, status changes, and contacts enqueue stable outbox events in the same transaction as business data. After commit, the request awaits an immediate, bounded processing pass. Resend receives the event ID as an idempotency key. If the provider times out after accepting but before the database update, the durable stale-claim recovery retries with the same key. Provider failure does not invalidate persisted business data.

The daily Vercel Hobby cron is a recovery sweep, not the prompt path. An external authenticated scheduler every 5–10 minutes is optional when the business requires fast retry after provider/network failure. `ACCEPTED` means only API acceptance; no webhook is installed and `DELIVERED` is not fabricated.

## Security findings

- No public admin registration or hardcoded credential was found.
- Admin sessions are opaque, hashed in PostgreSQL, revocable, expiring, user-agent-bound, and stored in Secure/HTTP-only/SameSite Strict `__Host-` cookies in production.
- All admin mutations require a live server session, strict Origin, and CSRF token. Sensitive configuration/capacity also requires owner role.
- Protected pages independently authorize before their first database query; the final unauthenticated browser run redirected without Prisma/customer-query errors.
- Public writes have Zod schemas, byte limits, same-origin checks, safe errors, and database-backed distributed rate limiting. Limiter records and expired/revoked sessions are pruned by authenticated maintenance.
- Prisma tagged queries/ORM usage prevents raw string SQL injection; no unsafe raw query API was found.
- No API key, password, connection string, session token, or customer body is intentionally logged or included in the client bundle.
- Known dependency audit result is zero. The local verification machine used Node 24.19.0 and emitted an engine warning because deployment is intentionally pinned to supported Node 22.x.

Remaining security recommendations are MFA for internet-exposed owner access, periodic credential rotation/session revocation review, real database authorization testing, and deployment-platform monitoring. Shared PostgreSQL rate limiting is implemented; no in-memory limiter remains as a production dependency.

## Required credentials and external setup

- pooled production `DATABASE_URL` and direct production `DIRECT_URL`;
- isolated `TEST_DATABASE_URL` and temporary `ALLOW_DATABASE_TESTS=true` for integration QA;
- verified `RESEND_API_KEY`, `EMAIL_FROM`, and `ADMIN_NOTIFICATION_EMAIL`;
- independent 32+ character `RATE_LIMIT_SALT` and `CRON_SECRET`;
- canonical HTTPS `NEXT_PUBLIC_SITE_URL`;
- temporary owner bootstrap email/password, removed immediately after use;
- authentic address, phone/email, opening/kitchen hours, pickup lead time, table inventory, reservation policy, menu availability/prices, map and social links.

Follow `docs/DEPLOYMENT_CHECKLIST.md` in order. Do not publish until the BLOCKED items in the status table have been completed and recorded.

