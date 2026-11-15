# Customer backend integration report

Date: 2026-10-29

## Existing functionality discovered

The interrupted codebase already contained substantial backend foundations: Prisma models, a singleton client, Zod request schemas, origin/request-size checks, database-backed rate limiting, order and reservation service boundaries, contact/newsletter route handlers, and frontend clients that only show success after a successful API response. Order pricing already used database catalog rows, and reservation creation already used serializable transactions and a PostgreSQL advisory lock.

The principal gaps were the absence of checked-in migrations and a safe seed, incomplete hosted-database environment guidance, incomplete duplicate newsletter behavior, missing automated backend coverage, and several date/error/concurrency hardening details.

## Backend changes implemented

- Added pooled-runtime/direct-migration PostgreSQL environment boundaries for Neon.
- Added bounded retry for serializable transaction conflicts and unique-key races.
- Added stable request hashing and changed-payload idempotency conflict detection.
- Persisted explicit `PICKUP` and `PAY_AT_COUNTER` order modes; totals remain server-authoritative.
- Made reservation slot intervals configurable, started slots at opening time, enforced strict calendar dates, and used an exclusive next-day query boundary.
- Added specific API mappings for invalid dates, cutoffs, guest limits, disabled reservations, missing capacity, and slot conflicts.
- Added race-safe newsletter create/reactivate/duplicate behavior.
- Escaped customer-controlled contact values before optional staff email rendering. Email work was not expanded in this phase.
- Added injectable Prisma clients at service boundaries for isolated database tests.
- Added non-destructive seed, test configuration, and credential-gated database integration scenarios.

## Prisma schema and migration

Schema refinements include `PaymentMethod.PAY_AT_COUNTER`, configurable `reservationSlotMinutes`, and query indexes for customer lookup, table inventory, contacts, and newsletter status. Existing unique constraints for order/reservation references and idempotency keys are preserved.

Checked-in migration:

`prisma/migrations/20261029120000_initial_customer_backend/migration.sql`

The migration creates all enums, tables, indexes, unique keys, and relations and adds database checks for positive prices, 1–10 order quantities, positive seating/durations, non-negative counters/cutoffs, and matching order subtotal/total.

Migration status: **created and reviewed locally; not applied to any database**. No database reset or destructive production command was run.

The development seed at `prisma/seed.ts` is idempotent, uses upserts, deletes nothing, and refuses to run with `NODE_ENV=production`.

## Completed customer API endpoints

| Endpoint | Behavior |
| --- | --- |
| `POST /api/orders` | Validates request/key, rate-limits, re-prices from PostgreSQL, persists customer/order/items transactionally, and returns a persisted reference/status |
| `GET /api/reservations/availability` | Returns live capacity-aware slots for a valid date/party size |
| `POST /api/reservations` | Rechecks capacity atomically, prevents overbooking, stores a `PENDING` request, and returns its persisted reference |
| `POST /api/contact` | Validates, rate-limits, and stores an inquiry |
| `POST /api/newsletter` | Validates, rate-limits, creates/reactivates, and reports duplicates honestly |
| `GET /api/health` | Existing minimal public health response remains unchanged |

All persistence endpoints return `SETUP_REQUIRED` when database configuration is missing or still uses an example value. They do not report a successful save.

## Automated test coverage

Unit tests cover server-authoritative order pricing, ignored client price fields, missing/unavailable products, the maximum quantity of 10, stable idempotency, changed-payload conflicts, reservation overlap/capacity, impossible/past dates, contact validation, newsletter duplicates, and missing database configuration.

Credential-gated PostgreSQL tests cover real order/item persistence and pricing, same-key replay without a second order, unavailable database product rejection, and two concurrent reservation attempts against insufficient capacity with exactly one persisted request.

## Actual verification results

- `npm run typecheck`: passed.
- `npm run lint`: passed with zero warnings.
- `npm run build`: passed; Prisma Client 6.19.3 generated and all Next.js routes compiled.
- `npx prisma validate`: schema passed with process-scoped placeholder URLs; no database connection was attempted. Without `DIRECT_URL`, Prisma correctly reports missing configuration.
- `npm run verify`: passed frontend 9/9 and backend unit tests 9/9.
- `npm run qa`: passed 13/13, capturing 9 screenshots and auditing 60 route/viewport combinations.
- `npm run test:integration`: command executed; 3 tests skipped because no opted-in database was configured.

Real PostgreSQL status: **not tested**. No valid dedicated `TEST_DATABASE_URL` and opt-in flag were available. No claim is made that migrations or live transactions were exercised against Neon.

## External configuration required

1. Create separate Neon branches/databases for development, test, preview, and production as appropriate.
2. Set pooled `DATABASE_URL` for runtime and matching direct `DIRECT_URL` for migrations in each environment.
3. For a new database, run `npm run db:deploy`; in development only, run `npm run db:seed`.
4. Create a disposable test branch, set `TEST_DATABASE_URL`, set `ALLOW_DATABASE_TESTS=true`, and run `npm run test:integration`.
5. Confirm authentic café hours, capacity, menu availability, prices, address, and pickup lead time before accepting customer traffic.

If the target database already has unmanaged tables, compare schemas and establish a Prisma migration baseline instead of applying the initial migration blindly.

## Remaining deployment blockers

- No hosted PostgreSQL credentials or applied production migration.
- No real database integration test run.
- Authentic menu/business/capacity data has not been supplied.
- Transactional email provider rollout and delivery/retry testing remain a separate phase.
- Protected admin management remains a separate phase.
- Nothing was deployed in this phase.
