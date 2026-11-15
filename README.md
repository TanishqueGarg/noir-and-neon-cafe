# NOIR & NEON

A production-oriented, responsive café experience built with Next.js App Router, TypeScript, Tailwind CSS, Framer Motion, React Hook Form, Zod, Zustand, Prisma 6, PostgreSQL, and Lucide icons.

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:3000`.

Quality commands:

```bash
npm run typecheck
npm run lint
npm run build
npm run verify
npm run env:check
```

The frontend can run without infrastructure, but customer submissions deliberately return `SETUP_REQUIRED` until a real database is configured.

## PostgreSQL setup

The application is prepared for Neon or another PostgreSQL-compatible host. Use a pooled runtime URL for `DATABASE_URL` and the matching direct URL for `DIRECT_URL`. Keep development, preview, test, and production values in their respective environment stores; do not commit them.

For a new development database:

```bash
npm run db:generate
npm run db:deploy
npm run db:seed
```

`db:deploy` applies checked-in migrations without resetting data. `db:seed` is an idempotent development seed, refuses to run when `NODE_ENV=production`, and additionally requires `ALLOW_DEVELOPMENT_SEED=true`. It upserts 25 sample menu records, baseline settings, and sample table inventory. Never enable that switch in production; production menu and business data should be loaded through a reviewed operational process.

If connecting this code to a database that already contains unmanaged tables, do not run the initial migration blindly. Compare the schema and establish a Prisma migration baseline first.

## Implemented

- Cinematic responsive homepage with original project-local photography, editorial sections, marquee, products, atmosphere, illustrative guest-note disclosure, hours, location, reservation CTA, newsletter state, and complete footer
- Interactive menu with 25 structured sample items across seven categories, search, dietary filters, empty state, badges, INR pricing, and animated product cards
- Pre-rendered product-detail pages with ingredients, allergen information, quantity selection, cart actions, and related products
- Persistent localStorage cart, navbar count, animated drawer, quantity updates, empty state, and toast feedback
- Two-step pickup checkout with customer validation, order review, cart summary, pay-at-counter disclosure, loading, success, and server-error states
- Reservation UI with date input, time-slot selection, unavailable-slot presentation, guest selector, validation, loading, confirmation, and setup-required states
- Brand story, founder-vision disclosure, space narrative, privacy, terms, loading, error, and not-found routes
- Keyboard-friendly controls, Escape-to-close cart, reduced-motion-aware reveals, semantic labels, visible focus styles, responsive touch targets, metadata, and Open Graph foundation
- Typed service contracts, API response helpers, client service boundary, health endpoint, database-backed customer APIs, Prisma schema and migration, environment template, and pooled database client
- Transactional pickup orders with server-authoritative pricing, quantity limits, idempotency, unique references, and pay-at-counter status
- Database-backed table availability with Asia/Kolkata conversion, configurable capacity and hours, overlap accounting, advisory locking, serializable transactions, and pending approval status
- Persistent contact inquiries and newsletter subscriptions with Zod validation, rate limits, origin checks, duplicate handling, and honest setup/error states
- Durable transactional email outbox with branded templates, Resend idempotency, atomic claims, bounded retry, and accepted-versus-delivered status separation
- Protected admin operations for orders, reservations, menu, contacts, newsletter consent, business settings, seating capacity, and email jobs
- Opaque database sessions, bcrypt credentials, strict secure cookies, CSRF protection, expiry, revocation, login rate limiting, and audit records

## Sample and illustrative content

- Menu items, prices, address, opening hours, and availability markers are structured demo content.
- Guest quotes are explicitly labelled as illustrative and are not presented as verified reviews.
- The founder quotation is explicitly labelled as an illustrative brand statement.
- The three raster photographs in `public/images` were generated specifically for this project and are referenced centrally in `src/data/images.ts` for later replacement.

## Backend status

Order, reservation, contact, newsletter, email-outbox, and protected admin functionality is implemented. Without valid PostgreSQL credentials customer routes return `503 SETUP_REQUIRED` and admin login cannot proceed. Order totals use active database menu records, reservations are written/approved only after atomic capacity checks, and email acceptance is never reported as final delivery.

## Admin bootstrap

There is no public registration. After migrations are applied, temporarily set `ADMIN_BOOTSTRAP_EMAIL` and a unique password of at least 16 characters in `ADMIN_BOOTSTRAP_PASSWORD`, then run:

```bash
npm run admin:bootstrap
```

The command creates one OWNER and refuses to overwrite an existing account. Remove both bootstrap values immediately afterward. Admin sessions default to eight hours and can be adjusted with `ADMIN_SESSION_HOURS` from 1–24.

## Transactional email

Verify a sender domain in Resend, configure `RESEND_API_KEY`, `EMAIL_FROM`, and `ADMIN_NOTIFICATION_EMAIL`. Customer requests await a bounded, post-commit delivery attempt for prompt notifications; failures remain in the durable PostgreSQL outbox and never undo saved data. `vercel.json` adds an authenticated daily retry sweep using `CRON_SECRET`. On Vercel Hobby this daily sweep is only a safety net, so configure an optional external scheduler every 5–10 minutes when faster retries are required. The provider's accepted state does not mean inbox delivery.

## Environment variables

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL runtime connection string |
| `DIRECT_URL` | Direct PostgreSQL connection string used by Prisma migrations |
| `TEST_DATABASE_URL` | Dedicated, disposable test database or Neon test branch |
| `ALLOW_DATABASE_TESTS` | Must be `true` to opt in to database integration tests |
| `RESEND_API_KEY` | Transactional email provider credential |
| `EMAIL_FROM` | Verified sender identity |
| `ADMIN_NOTIFICATION_EMAIL` | Staff destination for operational notifications |
| `CRON_SECRET` | High-entropy bearer secret used by Vercel Cron/external outbox processing |
| `EMAIL_SEND_TIMEOUT_MS` | Optional provider-attempt timeout, constrained to 1000–15000 ms |
| `ADMIN_SESSION_HOURS` | Admin session lifetime, constrained to 1–24 hours |
| `ADMIN_BOOTSTRAP_EMAIL` | Temporary initial-owner email used only by bootstrap |
| `ADMIN_BOOTSTRAP_PASSWORD` | Temporary initial-owner password used only by bootstrap |
| `RATE_LIMIT_SALT` | Secret salt for submission/login fingerprints |
| `NEXT_PUBLIC_SITE_URL` | Canonical public site origin |
| `ALLOW_DEVELOPMENT_SEED` | Explicit local-only opt-in for the development seed; must be false in production |

No secrets are committed. Use `.env.local` for local development and the hosting platform's encrypted environment configuration in production.

Run `npm run test:integration` only against a dedicated test database. The suite is skipped unless both `TEST_DATABASE_URL` and `ALLOW_DATABASE_TESTS=true` are present, and it refuses to run when the test URL equals the runtime URL.

## Key architecture

```text
src/
  app/             routes, metadata, states, and API route handlers
  components/      layout, menu, cart, home, admin, and reusable UI
  data/            replaceable sample menu and image references
  features/cart/   persisted Zustand cart store
  lib/             validation, formatting, API, and database helpers
  services/        frontend clients and backend-facing contracts
  types/           shared domain and API types
prisma/             PostgreSQL model, migrations, and development seed
public/images/      original project-local café imagery
```

## Notes

- Orders are pickup-only and designed for payment at the café counter. No card fields or fake payment gateway are present.
- Prices are formatted in Indian Rupees.
- With database configuration, the public menu and business details read managed PostgreSQL records; without it, the explicitly pre-launch sample catalog remains visible while submissions stay setup-gated.
- Live Resend delivery, admin browser journeys, and concurrency tests require real isolated credentials and are not claimed as verified by unit tests.
- Node.js 22.x is the deployment target (`.nvmrc` and `engines`). The final audit used Node 24 locally and recorded the engine warning; Vercel should be configured for Node 22.
- See `docs/DEPLOYMENT_CHECKLIST.md` and `docs/FINAL_DEPLOYMENT_AUDIT.md` before publishing.
