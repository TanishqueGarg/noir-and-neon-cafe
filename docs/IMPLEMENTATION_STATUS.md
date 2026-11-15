# Implementation status

Updated: 2026-10-29

## Frontend

- [x] Premium dark public experience is stable across Home, Menu, product details, Order, Reservations, About, Gallery, Contact, Privacy, and Terms.
- [x] Menu filters, localStorage cart, checkout, live reservation states, forms, gallery lightbox, reduced motion, and responsive layouts remain intact.
- [x] Development and production outputs remain separated as `.next-dev` and `.next`.

## Customer backend

- [x] Neon-ready pooled runtime URL (`DATABASE_URL`) and direct migration URL (`DIRECT_URL`) configuration.
- [x] Two ordered Prisma migrations plus PostgreSQL provider lock, with indexes, unique idempotency/reference/event constraints, foreign keys, database checks, admin sessions, and outbox fields.
- [x] Non-destructive, idempotent development seed for 25 menu items, baseline settings, and table inventory; production execution is refused and non-production use requires `ALLOW_DEVELOPMENT_SEED=true`.
- [x] Order persistence uses database products and prices, rejects inactive/unavailable products, enforces 1–10 units per product, calculates totals server-side, saves transactionally, and returns pay-at-counter pickup receipts.
- [x] Order idempotency replays the original record and rejects reuse with a changed payload.
- [x] Reservation availability uses Asia/Kolkata, configured hours/slot interval/duration/cutoff, active table capacity, overlapping pending/confirmed reservations, and strict calendar-date validation.
- [x] Reservation creation uses a PostgreSQL advisory lock plus a serializable transaction and bounded retry to prevent concurrent overbooking. New requests remain `PENDING` until staff approval.
- [x] Contact inquiries and newsletter subscriptions persist with Zod validation, request-size/origin checks, database-backed rate limiting, safe errors, and explicit duplicate newsletter results.
- [x] Missing database configuration returns `503 SETUP_REQUIRED`; it never falls back to fake persistence.

## Verification performed

| Check | Result |
| --- | --- |
| `npm run typecheck` | Passed |
| `npm run lint` | Passed with zero warnings |
| `npm run build` | Passed; Prisma 6.19.3 generated, 49 pages generated, all public/admin/API routes compiled |
| `npx prisma validate` | Passed with process-scoped placeholder URLs; no connection attempted |
| `npm run verify` | Passed: frontend verification 9/9 and backend/security unit tests 21/21; 3 DB tests skipped |
| `npm run qa` | Passed 14/14; 10 screenshots and 66 route/viewport combinations, including admin login and unauthorized redirect |
| `npm run test:integration` | Executed; 3 PostgreSQL tests skipped because no opted-in test database was configured |
| `npm audit` | Passed: 0 known vulnerabilities after pinning all PostCSS consumers to 8.5.32 |
| Runtime smoke | Health 200, unauthenticated cron 401, admin session 401, missing-Origin login 403, CSP/HSTS/frame headers present |
| `npm run env:check` | Correctly failed with 8 configuration errors in the current local environment; no external connection attempted |

The final visual QA run used `next start` against the compiled production `.next` output on port 3100. That local server was stopped after runtime smoke tests.

## Admin and email phase

- [x] Database-backed opaque admin sessions, bcrypt login, strict cookies, CSRF enforcement, expiry, revocation, logout, rate limiting, and protected layouts/APIs.
- [x] Page-level authorization occurs before every protected dashboard database query, covering Next.js parallel layout/page rendering.
- [x] Non-public owner bootstrap with overwrite protection.
- [x] Functional admin views for orders, reservations, menu, contact inquiries, newsletter consent records, business settings, seating capacity, and email jobs.
- [x] Guarded order/reservation transitions, atomic reservation approval capacity checks, safe capacity reductions, and audit records.
- [x] Transactional PostgreSQL email outbox with stable event IDs, atomic claims, Resend idempotency, bounded exponential retry, and honest accepted-versus-delivered states.
- [x] Customer/staff templates for orders, reservation requests/status changes, and contact inquiries.
- [x] Public menu and configured business details now read active PostgreSQL records when database configuration is present, while retaining the explicit pre-configuration sample state when it is absent.

Final pre-deployment verification: TypeScript passed, ESLint passed with zero warnings, production build passed with 49 pages, combined verification passed frontend 9/9 and unit tests 21/21, and browser QA passed 14/14 across 66 route/viewport combinations. Three PostgreSQL integration tests were skipped because no isolated test database was configured. Live Resend delivery was not tested.

Production hardening now includes CSP/HSTS and related response headers, Node 22 targeting, a secret-free environment template and non-connecting preflight automatically enforced on Vercel production builds, owner-only settings/capacity mutations, fail-closed production rate-limit salts, bounded email provider calls, parallel safe outbox claims, daily Vercel recovery cron, stale security-record cleanup, strict local menu-media validation, public-data cache invalidation, a migration provider lock, and expanded Git exclusions.

## Requires external configuration

- [ ] Create a Neon project/branch and provide a pooled `DATABASE_URL` plus matching direct `DIRECT_URL`.
- [ ] Apply both checked-in migrations to isolated development/test first, then production with `npm run db:deploy` after backup/PITR confirmation.
- [ ] Run `npm run db:seed` only in development, or load reviewed authentic menu/business records through an operational process.
- [ ] Create a disposable Neon test branch, set `TEST_DATABASE_URL` and `ALLOW_DATABASE_TESTS=true`, then run `npm run test:integration`.
- [ ] Replace placeholder/sample business details and verify real opening hours, capacity, menu prices, and availability before launch.
- [ ] Apply `20261029180000_admin_and_email_outbox` to an isolated database and execute admin/outbox integration journeys.
- [ ] Verify a Resend sender domain and configure `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_NOTIFICATION_EMAIL`, and `CRON_SECRET`; optionally configure a frequent external retry scheduler.
- [ ] Run `npm run admin:bootstrap` once with temporary high-entropy bootstrap credentials, then remove those credentials.

## Still outside this phase

- Live provider and database integration testing without external credentials.
- Multi-factor authentication and finer-grained permissions beyond owner-only business/capacity configuration.
- Deployment or production migration execution.

## Workspace note

No usable Git repository exists at the workspace root, so a reliable Git diff/status was unavailable. Existing files and uncommitted workspace changes were preserved and edited in place.
